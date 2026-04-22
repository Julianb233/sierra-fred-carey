#!/usr/bin/env node

/**
 * Deep Contact Enrichment Pipeline
 *
 * Pulls actual message content/topics for Julian's most interacted contacts
 * and updates both Supabase and Pinecone with rich context.
 *
 * Steps:
 *   1. Fetch top 169 contacts with interactions from Supabase
 *   2. Pull email subjects + snippets from both Gmail accounts
 *   3. Pull iMessage snippets from Mac Mini for top phone contacts
 *   4. Generate relationship summaries via OpenAI (gpt-4o-mini)
 *   5. Update Supabase enrichment_data with topics, summaries, snippets
 *   6. Re-embed enriched contacts in Pinecone with rich text blobs
 *   7. Verify with sample semantic queries
 *
 * Usage:
 *   node scripts/enrich-contacts-deep.mjs
 */

import { readFileSync } from "fs"
import { resolve, dirname } from "path"
import { fileURLToPath } from "url"
import { execSync } from "child_process"

const __dirname = dirname(fileURLToPath(import.meta.url))
const envPath = resolve(__dirname, "../.env.local")

// ── Env loading ─────────────────────────────────────────────────────────────

function loadEnv(path) {
  const content = readFileSync(path, "utf-8")
  for (const line of content.split("\n")) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith("#")) continue
    const eqIdx = trimmed.indexOf("=")
    if (eqIdx === -1) continue
    const key = trimmed.slice(0, eqIdx)
    let val = trimmed.slice(eqIdx + 1)
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1)
    }
    if (!process.env[key]) process.env[key] = val
  }
}

loadEnv(envPath)

// ── Config ──────────────────────────────────────────────────────────────────

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const OPENAI_API_KEY = process.env.OPENAI_API_KEY
const PINECONE_API_KEY = process.env.PINECONE_API_KEY
const PINECONE_HOST = "https://ai-acrobatics-fleet-dczc7gc.svc.aped-4627-b74a.pinecone.io"
const PINECONE_NAMESPACE = "contacts"
const EMBEDDING_MODEL = "text-embedding-3-large"
const EMBEDDING_DIMENSIONS = 1024

const GMAIL_DELAY_MS = 200
const OPENAI_BATCH_SIZE = 50
const PINECONE_UPSERT_SIZE = 100

// ── Helpers ─────────────────────────────────────────────────────────────────

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

function runCmd(cmd) {
  try {
    const result = execSync(cmd, { encoding: "utf-8", timeout: 30000, maxBuffer: 10 * 1024 * 1024 })
    return result.trim()
  } catch (err) {
    return ""
  }
}

function log(msg) {
  const ts = new Date().toISOString().slice(11, 19)
  console.log(`[${ts}] ${msg}`)
}

// ── Supabase ────────────────────────────────────────────────────────────────

async function fetchContactsWithInteractions() {
  log("Fetching top 169 contacts with interactions from Supabase...")
  const url = `${SUPABASE_URL}/rest/v1/contacts?select=id,display_name,first_name,last_name,email_addresses,phone_numbers,organizations,biographies,relationship_type,interaction_score,interaction_count,last_interaction_at,last_email_subject,notes,tags,source_account,enrichment_data&interaction_count=gt.0&order=interaction_score.desc&limit=169`

  const res = await fetch(url, {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
    },
  })

  if (!res.ok) throw new Error(`Supabase fetch failed (${res.status}): ${await res.text()}`)
  const contacts = await res.json()
  log(`  Fetched ${contacts.length} contacts`)
  return contacts
}

async function updateSupabaseEnrichment(contactId, enrichmentData) {
  // Merge with existing enrichment_data
  const url = `${SUPABASE_URL}/rest/v1/contacts?id=eq.${contactId}`
  const res = await fetch(url, {
    method: "PATCH",
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify({ enrichment_data: enrichmentData }),
  })

  return res.ok
}

// ── Gmail ───────────────────────────────────────────────────────────────────

function gmailListMessages(email, account = "personal") {
  const params = JSON.stringify({
    userId: "me",
    q: `from:${email} OR to:${email}`,
    maxResults: 10,
  })

  let cmd = `gws gmail users messages list --params '${params}'`
  if (account === "business") {
    cmd = `GOOGLE_WORKSPACE_CLI_CONFIG_DIR=~/.config/gws/profiles/workspace ${cmd}`
  }

  const out = runCmd(cmd)
  try {
    return JSON.parse(out)
  } catch {
    return { messages: [] }
  }
}

function gmailGetMessage(msgId, account = "personal") {
  const params = JSON.stringify({
    userId: "me",
    id: msgId,
    format: "full",
  })

  let cmd = `gws gmail users messages get --params '${params}'`
  if (account === "business") {
    cmd = `GOOGLE_WORKSPACE_CLI_CONFIG_DIR=~/.config/gws/profiles/workspace ${cmd}`
  }

  const out = runCmd(cmd)
  try {
    return JSON.parse(out)
  } catch {
    return null
  }
}

function extractHeader(msg, name) {
  const headers = msg?.payload?.headers || []
  const h = headers.find((h) => h.name?.toLowerCase() === name.toLowerCase())
  return h?.value || ""
}

async function fetchEmailSubjectsForContact(contact) {
  const emails = (contact.email_addresses || []).map((e) => e.value).filter(Boolean)
  if (emails.length === 0) return []

  const allSubjects = []

  for (const email of emails) {
    for (const account of ["personal", "business"]) {
      const listResult = gmailListMessages(email, account)
      const messages = listResult.messages || []

      for (const msg of messages.slice(0, 10)) {
        await sleep(GMAIL_DELAY_MS)
        const fullMsg = gmailGetMessage(msg.id, account)
        if (!fullMsg) continue

        const subject = extractHeader(fullMsg, "Subject")
        const snippet = fullMsg.snippet || ""
        if (subject || snippet) {
          allSubjects.push({
            subject: subject || "(no subject)",
            snippet: snippet.slice(0, 150),
            date: extractHeader(fullMsg, "Date"),
          })
        }
      }
    }
  }

  // Deduplicate by subject
  const seen = new Set()
  const unique = []
  for (const s of allSubjects) {
    const key = s.subject.toLowerCase().trim()
    if (!seen.has(key)) {
      seen.add(key)
      unique.push(s)
    }
  }

  return unique.slice(0, 15) // Cap at 15 unique subjects
}

// ── iMessage ────────────────────────────────────────────────────────────────

function fetchIMessageSnippets(phoneOrEmail) {
  // Normalize phone to +1XXXXXXXXXX format
  let handle = phoneOrEmail
  if (!handle.includes("@")) {
    const digits = handle.replace(/\D/g, "")
    if (digits.length === 10) handle = `+1${digits}`
    else if (digits.length === 11 && digits.startsWith("1")) handle = `+${digits}`
    else handle = `+${digits}`
  }

  const cmd = `mac exec "sqlite3 ~/Library/Messages/chat.db \\"SELECT replace(replace(substr(m.text,1,100), char(10), ' '), char(13), ' ') FROM message m JOIN handle h ON m.handle_id = h.ROWID WHERE h.id = '${handle}' AND m.text IS NOT NULL AND length(m.text) > 1 ORDER BY m.date DESC LIMIT 20\\""`

  const out = runCmd(cmd)
  if (!out) return []

  const lines = out.split("\n").filter((l) => l.trim() && !l.startsWith(">>"))
  return lines.map((l) => l.trim().slice(0, 100)).filter((l) => l.length > 0)
}

// ── OpenAI ──────────────────────────────────────────────────────────────────

async function generateRelationshipSummary(contactName, emailData, imessageSnippets) {
  const messageContext = []

  if (emailData.length > 0) {
    messageContext.push("Recent email subjects:")
    for (const e of emailData.slice(0, 10)) {
      messageContext.push(`  - ${e.subject}${e.snippet ? ` (${e.snippet.slice(0, 80)})` : ""}`)
    }
  }

  if (imessageSnippets.length > 0) {
    messageContext.push("\nRecent iMessage snippets:")
    for (const s of imessageSnippets.slice(0, 15)) {
      messageContext.push(`  - ${s}`)
    }
  }

  if (messageContext.length === 0) return null

  const prompt = `Given these message subjects/snippets between Julian and ${contactName || "this contact"}, write a 2-3 sentence summary of their relationship and what they typically discuss. Include key topics, any business context, and the nature of the relationship. Also extract 3-6 topic tags (lowercase, short phrases).

${messageContext.join("\n")}

Respond in JSON format:
{
  "relationship_summary": "...",
  "topics": ["topic1", "topic2", ...]
}`

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You are a CRM analyst summarizing contact relationships. Output valid JSON only." },
        { role: "user", content: prompt },
      ],
      temperature: 0.3,
      max_tokens: 300,
      response_format: { type: "json_object" },
    }),
  })

  if (!res.ok) {
    const body = await res.text()
    console.error(`  OpenAI error (${res.status}): ${body.slice(0, 200)}`)
    return null
  }

  const json = await res.json()
  const content = json.choices?.[0]?.message?.content
  try {
    return JSON.parse(content)
  } catch {
    return null
  }
}

// ── Embedding & Pinecone ────────────────────────────────────────────────────

function buildRichTextBlob(contact, enrichment) {
  const parts = []

  if (contact.display_name) parts.push(contact.display_name + ".")
  if (contact.first_name || contact.last_name) {
    const name = [contact.first_name, contact.last_name].filter(Boolean).join(" ")
    if (name !== contact.display_name) parts.push(name + ".")
  }

  // Organization
  if (Array.isArray(contact.organizations) && contact.organizations.length > 0) {
    const org = contact.organizations[0]
    if (org.name) parts.push(org.name + ".")
    if (org.title) parts.push(org.title + ".")
  }

  // Relationship
  if (contact.relationship_type) parts.push(`Relationship: ${contact.relationship_type}.`)
  if (typeof contact.interaction_score === "number") parts.push(`Score: ${contact.interaction_score}.`)

  // Topics from enrichment
  if (enrichment.topics?.length > 0) {
    parts.push(`Topics: ${enrichment.topics.join(", ")}.`)
  }

  // Relationship summary
  if (enrichment.relationship_summary) {
    parts.push(`Summary: ${enrichment.relationship_summary}`)
  }

  // Recent email subjects
  if (enrichment.recent_email_subjects?.length > 0) {
    parts.push(`Recent subjects: ${enrichment.recent_email_subjects.slice(0, 8).join(". ")}.`)
  }

  // Bio
  if (contact.biographies) parts.push(`Bio: ${contact.biographies}.`)

  // Tags
  if (Array.isArray(contact.tags) && contact.tags.length > 0) {
    parts.push(`Tags: ${contact.tags.join(", ")}.`)
  }

  // Notes
  if (contact.notes) parts.push(`Notes: ${contact.notes.slice(0, 200)}.`)

  return parts.join(" ") || contact.display_name || contact.id
}

function buildMetadata(contact, enrichment) {
  const meta = {}

  if (contact.display_name) meta.display_name = contact.display_name
  if (contact.first_name) meta.first_name = contact.first_name
  if (contact.last_name) meta.last_name = contact.last_name

  meta.email = contact.email_addresses?.[0]?.value || ""
  meta.phone = contact.phone_numbers?.[0]?.value || contact.phone_numbers?.[0]?.canonicalForm || ""

  if (Array.isArray(contact.organizations) && contact.organizations.length > 0) {
    meta.organization = contact.organizations[0]?.name || ""
    meta.organization_title = contact.organizations[0]?.title || ""
  } else {
    meta.organization = ""
    meta.organization_title = ""
  }

  meta.source_account = contact.source_account || ""
  meta.relationship_type = contact.relationship_type || "unknown"
  meta.interaction_score = typeof contact.interaction_score === "number" ? contact.interaction_score : 0
  meta.interaction_count = typeof contact.interaction_count === "number" ? contact.interaction_count : 0
  meta.tags = Array.isArray(contact.tags) ? contact.tags : []

  // New enriched metadata
  if (enrichment.topics?.length > 0) {
    meta.topics = enrichment.topics
  }
  if (enrichment.relationship_summary) {
    meta.relationship_summary = enrichment.relationship_summary.slice(0, 500)
  }

  return meta
}

async function embedTexts(texts) {
  const res = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: EMBEDDING_MODEL,
      dimensions: EMBEDDING_DIMENSIONS,
      input: texts,
    }),
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`OpenAI embeddings failed (${res.status}): ${body}`)
  }

  const json = await res.json()
  return json.data.map((d) => d.embedding)
}

async function upsertVectors(vectors) {
  const res = await fetch(`${PINECONE_HOST}/vectors/upsert`, {
    method: "POST",
    headers: {
      "Api-Key": PINECONE_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      namespace: PINECONE_NAMESPACE,
      vectors,
    }),
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Pinecone upsert failed (${res.status}): ${body}`)
  }
  return res.json()
}

async function queryPinecone(queryText, topK = 5) {
  const [vector] = await embedTexts([queryText])
  const res = await fetch(`${PINECONE_HOST}/query`, {
    method: "POST",
    headers: {
      "Api-Key": PINECONE_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      namespace: PINECONE_NAMESPACE,
      vector,
      topK,
      includeMetadata: true,
    }),
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Pinecone query failed (${res.status}): ${body}`)
  }
  return res.json()
}

// ── Main Pipeline ───────────────────────────────────────────────────────────

async function main() {
  console.log("=".repeat(70))
  console.log("  DEEP CONTACT ENRICHMENT PIPELINE")
  console.log("=".repeat(70))
  console.log()

  // ─── Step 1: Fetch contacts ───────────────────────────────────────────
  const contacts = await fetchContactsWithInteractions()
  log(`Total contacts to enrich: ${contacts.length}`)

  // ─── Step 2 & 3: Collect message data per contact ─────────────────────
  const enrichments = new Map() // contactId -> enrichment data

  // Determine which contacts have email addresses (for Gmail queries)
  const contactsWithEmail = contacts.filter(
    (c) => c.email_addresses?.length > 0 && c.email_addresses.some((e) => e.value)
  )
  log(`Contacts with email addresses: ${contactsWithEmail.length}`)

  // Determine which contacts have phone numbers (for iMessage queries)
  const contactsWithPhone = contacts.filter(
    (c) => c.phone_numbers?.length > 0 && c.phone_numbers.some((p) => p.value || p.canonicalForm)
  )
  log(`Contacts with phone numbers: ${contactsWithPhone.length}`)
  console.log()

  // ─── Step 2: Pull email subjects in batches ───────────────────────────
  log("--- PHASE 2: Fetching email subjects from Gmail (both accounts) ---")
  let emailBatchNum = 0
  const GMAIL_BATCH_SIZE = 10

  for (let i = 0; i < contactsWithEmail.length; i += GMAIL_BATCH_SIZE) {
    emailBatchNum++
    const batch = contactsWithEmail.slice(i, i + GMAIL_BATCH_SIZE)
    log(`  Gmail batch ${emailBatchNum}: contacts ${i + 1}-${Math.min(i + GMAIL_BATCH_SIZE, contactsWithEmail.length)} of ${contactsWithEmail.length}`)

    for (const contact of batch) {
      const name = contact.display_name || contact.first_name || "(unknown)"
      try {
        const emailData = await fetchEmailSubjectsForContact(contact)
        if (emailData.length > 0) {
          const existing = enrichments.get(contact.id) || {}
          existing.recent_email_subjects = emailData.map((e) => e.subject)
          existing.email_snippets = emailData.map((e) => e.snippet).filter(Boolean)
          enrichments.set(contact.id, existing)
          log(`    ${name}: ${emailData.length} email subjects`)
        }
      } catch (err) {
        log(`    ${name}: Gmail error - ${err.message?.slice(0, 80)}`)
      }
    }
  }

  log(`  Email data collected for ${[...enrichments.values()].filter((e) => e.recent_email_subjects).length} contacts`)
  console.log()

  // ─── Step 3: Pull iMessage snippets for top 50 phone contacts ─────────
  log("--- PHASE 3: Fetching iMessage snippets from Mac Mini ---")
  const topPhoneContacts = contactsWithPhone.slice(0, 50)

  for (let i = 0; i < topPhoneContacts.length; i++) {
    const contact = topPhoneContacts[i]
    const name = contact.display_name || contact.first_name || "(unknown)"
    const phone = contact.phone_numbers[0]?.canonicalForm || contact.phone_numbers[0]?.value
    if (!phone) continue

    try {
      const snippets = fetchIMessageSnippets(phone)
      if (snippets.length > 0) {
        const existing = enrichments.get(contact.id) || {}
        existing.recent_imessage_snippets = snippets.slice(0, 20).map((s) => s.slice(0, 100))
        enrichments.set(contact.id, existing)
        log(`  [${i + 1}/${topPhoneContacts.length}] ${name}: ${snippets.length} iMessage snippets`)
      } else {
        log(`  [${i + 1}/${topPhoneContacts.length}] ${name}: no text messages found`)
      }
    } catch (err) {
      log(`  [${i + 1}/${topPhoneContacts.length}] ${name}: iMessage error - ${err.message?.slice(0, 80)}`)
    }
  }

  const withImessage = [...enrichments.values()].filter((e) => e.recent_imessage_snippets?.length > 0).length
  log(`  iMessage data collected for ${withImessage} contacts`)
  console.log()

  // ─── Step 4: Generate AI summaries ────────────────────────────────────
  log("--- PHASE 4: Generating relationship summaries via OpenAI ---")
  const contactsToSummarize = contacts.filter((c) => enrichments.has(c.id))
  log(`  Contacts with message data to summarize: ${contactsToSummarize.length}`)

  let summaryCount = 0
  let summaryFailed = 0

  for (let i = 0; i < contactsToSummarize.length; i++) {
    const contact = contactsToSummarize[i]
    const name = contact.display_name || contact.first_name || "(unknown)"
    const enrichment = enrichments.get(contact.id)

    const emailData = (enrichment.recent_email_subjects || []).map((s) => ({ subject: s }))
    const imessageSnippets = enrichment.recent_imessage_snippets || []

    if (emailData.length === 0 && imessageSnippets.length === 0) continue

    try {
      const result = await generateRelationshipSummary(name, emailData, imessageSnippets)
      if (result) {
        enrichment.relationship_summary = result.relationship_summary || ""
        enrichment.topics = result.topics || []
        summaryCount++
        if ((i + 1) % 10 === 0 || i === contactsToSummarize.length - 1) {
          log(`  Summarized ${summaryCount} contacts... (${i + 1}/${contactsToSummarize.length})`)
        }
      } else {
        summaryFailed++
      }
    } catch (err) {
      log(`  ${name}: summary error - ${err.message?.slice(0, 80)}`)
      summaryFailed++
    }

    // Brief delay to avoid rate limits
    await sleep(100)
  }

  log(`  Summaries generated: ${summaryCount}, failed: ${summaryFailed}`)
  console.log()

  // ─── Step 5: Update Supabase enrichment_data ──────────────────────────
  log("--- PHASE 5: Updating Supabase enrichment_data ---")
  let supabaseUpdated = 0
  let supabaseFailed = 0

  for (const contact of contacts) {
    const enrichment = enrichments.get(contact.id)
    if (!enrichment) continue

    // Parse existing enrichment_data
    let existing = {}
    if (contact.enrichment_data) {
      try {
        existing = typeof contact.enrichment_data === "string"
          ? JSON.parse(contact.enrichment_data)
          : contact.enrichment_data
      } catch { /* ignore parse errors */ }
    }

    // Merge new data
    const updated = {
      ...existing,
      ...(enrichment.recent_email_subjects && { recent_email_subjects: enrichment.recent_email_subjects }),
      ...(enrichment.recent_imessage_snippets && { recent_imessage_snippets: enrichment.recent_imessage_snippets }),
      ...(enrichment.relationship_summary && { relationship_summary: enrichment.relationship_summary }),
      ...(enrichment.topics && { topics: enrichment.topics }),
      message_analyzed_at: new Date().toISOString(),
    }

    const ok = await updateSupabaseEnrichment(contact.id, updated)
    if (ok) {
      supabaseUpdated++
    } else {
      supabaseFailed++
    }

    if ((supabaseUpdated + supabaseFailed) % 20 === 0) {
      log(`  Updated ${supabaseUpdated}/${supabaseUpdated + supabaseFailed} contacts...`)
    }
  }

  log(`  Supabase updates: ${supabaseUpdated} success, ${supabaseFailed} failed`)
  console.log()

  // ─── Step 6: Re-embed in Pinecone ─────────────────────────────────────
  log("--- PHASE 6: Re-embedding contacts in Pinecone ---")

  // Build rich text blobs and metadata for ALL 169 contacts
  const textBlobs = []
  const metadatas = []
  const ids = []

  for (const contact of contacts) {
    const enrichment = enrichments.get(contact.id) || {}
    const blob = buildRichTextBlob(contact, enrichment)
    const meta = buildMetadata(contact, enrichment)

    textBlobs.push(blob)
    metadatas.push(meta)
    ids.push(contact.id)
  }

  log(`  Embedding ${textBlobs.length} contacts...`)

  // Embed in batches
  const allEmbeddings = []
  for (let i = 0; i < textBlobs.length; i += OPENAI_BATCH_SIZE) {
    const batch = textBlobs.slice(i, i + OPENAI_BATCH_SIZE)
    try {
      const embeddings = await embedTexts(batch)
      allEmbeddings.push(...embeddings)
      log(`  Embedded batch ${Math.floor(i / OPENAI_BATCH_SIZE) + 1}/${Math.ceil(textBlobs.length / OPENAI_BATCH_SIZE)}`)
    } catch (err) {
      log(`  Embedding error at batch ${i}: ${err.message?.slice(0, 100)}`)
      for (let j = 0; j < batch.length; j++) allEmbeddings.push(null)
    }
    await sleep(200)
  }

  // Build vectors
  const vectors = []
  for (let i = 0; i < ids.length; i++) {
    if (!allEmbeddings[i]) continue
    vectors.push({
      id: ids[i],
      values: allEmbeddings[i],
      metadata: metadatas[i],
    })
  }

  // Upsert in batches
  let upserted = 0
  for (let i = 0; i < vectors.length; i += PINECONE_UPSERT_SIZE) {
    const batch = vectors.slice(i, i + PINECONE_UPSERT_SIZE)
    try {
      await upsertVectors(batch)
      upserted += batch.length
      log(`  Upserted ${upserted}/${vectors.length} vectors`)
    } catch (err) {
      log(`  Upsert error: ${err.message?.slice(0, 100)}`)
    }
  }

  log(`  Pinecone: ${upserted} vectors upserted`)
  console.log()

  // ─── Step 7: Verify with sample queries ───────────────────────────────
  log("--- PHASE 7: Verification queries ---")
  const testQueries = [
    "real estate investors",
    "family members",
    "business partners I talk to frequently",
  ]

  for (const query of testQueries) {
    console.log()
    console.log(`  Query: "${query}"`)
    console.log("  " + "-".repeat(50))
    try {
      const results = await queryPinecone(query, 5)
      for (const match of results.matches || []) {
        const m = match.metadata || {}
        const topics = m.topics?.length > 0 ? ` [${m.topics.join(", ")}]` : ""
        const summary = m.relationship_summary ? `\n      Summary: ${m.relationship_summary.slice(0, 120)}` : ""
        console.log(
          `    ${match.score.toFixed(4)} — ${m.display_name || match.id} (${m.organization || "no org"})${topics}${summary}`
        )
      }
    } catch (err) {
      console.error(`    Query failed: ${err.message}`)
    }
    await sleep(200)
  }

  // ─── Final Summary ────────────────────────────────────────────────────
  console.log()
  console.log("=".repeat(70))
  console.log("  ENRICHMENT COMPLETE")
  console.log("=".repeat(70))
  console.log(`  Total contacts processed: ${contacts.length}`)
  console.log(`  Contacts with email data: ${[...enrichments.values()].filter((e) => e.recent_email_subjects?.length > 0).length}`)
  console.log(`  Contacts with iMessage data: ${withImessage}`)
  console.log(`  Relationship summaries generated: ${summaryCount}`)
  console.log(`  Supabase records updated: ${supabaseUpdated}`)
  console.log(`  Pinecone vectors upserted: ${upserted}`)
  console.log()
}

main().catch((err) => {
  console.error("Fatal error:", err)
  process.exit(1)
})
