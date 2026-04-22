#!/usr/bin/env node

/**
 * Embed all Supabase contacts into Pinecone for semantic search.
 *
 * Usage:
 *   node scripts/embed-contacts-pinecone.mjs
 *
 * Reads env vars from .env.local (NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
 * OPENAI_API_KEY, PINECONE_API_KEY).
 */

import { readFileSync } from "fs"
import { resolve, dirname } from "path"
import { fileURLToPath } from "url"

// ── Env loading ──────────────────────────────────────────────────────────────

const __dirname = dirname(fileURLToPath(import.meta.url))
const envPath = resolve(__dirname, "../.env.local")

function loadEnv(path) {
  const content = readFileSync(path, "utf-8")
  for (const line of content.split("\n")) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith("#")) continue
    const eqIdx = trimmed.indexOf("=")
    if (eqIdx === -1) continue
    const key = trimmed.slice(0, eqIdx)
    let val = trimmed.slice(eqIdx + 1)
    // strip surrounding quotes
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1)
    }
    if (!process.env[key]) process.env[key] = val
  }
}

loadEnv(envPath)

// ── Config ───────────────────────────────────────────────────────────────────

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const OPENAI_API_KEY = process.env.OPENAI_API_KEY
const PINECONE_API_KEY = process.env.PINECONE_API_KEY
const PINECONE_HOST = "https://ai-acrobatics-fleet-dczc7gc.svc.aped-4627-b74a.pinecone.io"
const PINECONE_NAMESPACE = "contacts"
const EMBEDDING_MODEL = "text-embedding-3-large"
const EMBEDDING_DIMENSIONS = 1024

const SUPABASE_BATCH_SIZE = 500    // contacts per Supabase fetch
const OPENAI_BATCH_SIZE = 100      // texts per embedding call
const PINECONE_UPSERT_SIZE = 100   // vectors per upsert call
const OPENAI_DELAY_MS = 100        // delay between embedding calls

// ── Helpers ──────────────────────────────────────────────────────────────────

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

/**
 * Build a rich text blob for a contact. Only includes fields with data.
 */
function buildTextBlob(c) {
  const parts = []

  if (c.display_name) parts.push(c.display_name + ".")
  if (c.first_name || c.last_name) {
    const name = [c.first_name, c.last_name].filter(Boolean).join(" ")
    if (name !== c.display_name) parts.push(name + ".")
  }

  // Organization
  if (Array.isArray(c.organizations) && c.organizations.length > 0) {
    const org = c.organizations[0]
    const orgParts = [org.name, org.title].filter(Boolean).join(", ")
    if (orgParts) parts.push("Organization: " + orgParts + ".")
  }

  // Email
  if (Array.isArray(c.email_addresses) && c.email_addresses.length > 0) {
    const email = c.email_addresses[0]?.value
    if (email) parts.push("Email: " + email + ".")
  }

  // Phone
  if (Array.isArray(c.phone_numbers) && c.phone_numbers.length > 0) {
    const phone = c.phone_numbers[0]?.value || c.phone_numbers[0]?.canonicalForm
    if (phone) parts.push("Phone: " + phone + ".")
  }

  // Bio
  if (c.biographies) parts.push("Bio: " + c.biographies + ".")

  // Relationship
  if (c.relationship_type) parts.push("Relationship: " + c.relationship_type + ".")
  if (typeof c.interaction_score === "number" && c.interaction_score > 0) {
    parts.push("Score: " + c.interaction_score + ".")
  }

  // Last contact
  if (c.last_interaction_at) parts.push("Last contact: " + c.last_interaction_at + ".")
  if (c.last_email_subject) parts.push(c.last_email_subject + ".")

  // Notes
  if (c.notes) parts.push("Notes: " + c.notes + ".")

  // Tags
  if (Array.isArray(c.tags) && c.tags.length > 0) {
    parts.push("Tags: " + c.tags.join(", ") + ".")
  }

  // Enrichment data — organization names if present
  if (c.enrichment_data?.organization_names) {
    parts.push("Organizations: " + c.enrichment_data.organization_names + ".")
  }

  return parts.join(" ") || c.display_name || c.id
}

/**
 * Build metadata object for Pinecone. Only includes non-empty fields.
 */
function buildMetadata(c) {
  const meta = {}

  if (c.display_name) meta.display_name = c.display_name
  if (c.first_name) meta.first_name = c.first_name
  if (c.last_name) meta.last_name = c.last_name

  if (Array.isArray(c.email_addresses) && c.email_addresses.length > 0) {
    meta.email = c.email_addresses[0]?.value || ""
  } else {
    meta.email = ""
  }

  if (Array.isArray(c.phone_numbers) && c.phone_numbers.length > 0) {
    meta.phone = c.phone_numbers[0]?.value || c.phone_numbers[0]?.canonicalForm || ""
  } else {
    meta.phone = ""
  }

  if (Array.isArray(c.organizations) && c.organizations.length > 0) {
    meta.organization = c.organizations[0]?.name || ""
    meta.organization_title = c.organizations[0]?.title || ""
  } else {
    meta.organization = ""
    meta.organization_title = ""
  }

  meta.source_account = c.source_account || ""
  meta.relationship_type = c.relationship_type || "unknown"
  meta.interaction_score = typeof c.interaction_score === "number" ? c.interaction_score : 0
  meta.interaction_count = typeof c.interaction_count === "number" ? c.interaction_count : 0
  meta.tags = Array.isArray(c.tags) ? c.tags : []

  return meta
}

// ── Supabase ─────────────────────────────────────────────────────────────────

async function fetchContacts(offset, limit) {
  const url = `${SUPABASE_URL}/rest/v1/contacts?select=id,display_name,first_name,last_name,email_addresses,phone_numbers,organizations,biographies,relationship_type,interaction_score,interaction_count,last_interaction_at,last_email_subject,notes,tags,source_account,enrichment_data&order=id&offset=${offset}&limit=${limit}`

  const res = await fetch(url, {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
    },
  })

  if (!res.ok) {
    throw new Error(`Supabase fetch failed (${res.status}): ${await res.text()}`)
  }

  return res.json()
}

// ── OpenAI ───────────────────────────────────────────────────────────────────

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

// ── Pinecone ─────────────────────────────────────────────────────────────────

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

async function queryPinecone(vector, topK = 5) {
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

async function getPineconeStats() {
  const res = await fetch(`${PINECONE_HOST}/describe_index_stats`, {
    method: "POST",
    headers: {
      "Api-Key": PINECONE_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({}),
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Pinecone stats failed (${res.status}): ${body}`)
  }

  return res.json()
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("=== Contact Embedding Pipeline ===")
  console.log(`Pinecone host: ${PINECONE_HOST}`)
  console.log(`Namespace: ${PINECONE_NAMESPACE}`)
  console.log(`Embedding model: ${EMBEDDING_MODEL} (dim=${EMBEDDING_DIMENSIONS})`)
  console.log()

  let totalProcessed = 0
  let totalFailed = 0
  let offset = 0
  let hasMore = true

  while (hasMore) {
    // 1. Fetch batch from Supabase
    console.log(`Fetching contacts ${offset}–${offset + SUPABASE_BATCH_SIZE}...`)
    let contacts
    try {
      contacts = await fetchContacts(offset, SUPABASE_BATCH_SIZE)
    } catch (err) {
      console.error(`  ERROR fetching contacts at offset ${offset}: ${err.message}`)
      totalFailed += SUPABASE_BATCH_SIZE
      offset += SUPABASE_BATCH_SIZE
      continue
    }

    if (contacts.length === 0) {
      hasMore = false
      break
    }

    if (contacts.length < SUPABASE_BATCH_SIZE) {
      hasMore = false
    }

    // 2. Build text blobs
    const textBlobs = contacts.map(buildTextBlob)
    const metadatas = contacts.map(buildMetadata)
    const ids = contacts.map((c) => c.id)

    // 3. Embed in sub-batches of OPENAI_BATCH_SIZE
    const allEmbeddings = []

    for (let i = 0; i < textBlobs.length; i += OPENAI_BATCH_SIZE) {
      const batch = textBlobs.slice(i, i + OPENAI_BATCH_SIZE)
      try {
        const embeddings = await embedTexts(batch)
        allEmbeddings.push(...embeddings)
      } catch (err) {
        console.error(`  ERROR embedding batch at ${i}: ${err.message}`)
        // Fill with nulls so indices stay aligned
        for (let j = 0; j < batch.length; j++) allEmbeddings.push(null)
        totalFailed += batch.length
      }
      await sleep(OPENAI_DELAY_MS)
    }

    // 4. Build Pinecone vectors (skip any that failed embedding)
    const vectors = []
    for (let i = 0; i < ids.length; i++) {
      if (allEmbeddings[i] === null) continue
      vectors.push({
        id: ids[i],
        values: allEmbeddings[i],
        metadata: metadatas[i],
      })
    }

    // 5. Upsert into Pinecone in sub-batches
    for (let i = 0; i < vectors.length; i += PINECONE_UPSERT_SIZE) {
      const batch = vectors.slice(i, i + PINECONE_UPSERT_SIZE)
      try {
        await upsertVectors(batch)
      } catch (err) {
        console.error(`  ERROR upserting batch at ${i}: ${err.message}`)
        totalFailed += batch.length
      }
    }

    totalProcessed += vectors.length
    offset += contacts.length
    console.log(`  Embedded ${totalProcessed}/${offset} contacts so far...`)
  }

  console.log()
  console.log(`=== Embedding complete ===`)
  console.log(`Total processed: ${totalProcessed}`)
  console.log(`Total failed: ${totalFailed}`)

  // 6. Verify — index stats
  console.log()
  console.log("=== Pinecone Index Stats ===")
  try {
    const stats = await getPineconeStats()
    console.log(JSON.stringify(stats, null, 2))
  } catch (err) {
    console.error("Could not fetch Pinecone stats:", err.message)
  }

  // 7. Sample semantic query
  console.log()
  console.log('=== Sample Query: "real estate investors" ===')
  try {
    const [queryEmbedding] = await embedTexts(["real estate investors"])
    const results = await queryPinecone(queryEmbedding, 5)
    for (const match of results.matches || []) {
      console.log(
        `  ${match.score.toFixed(4)} — ${match.metadata?.display_name || match.id} (${match.metadata?.organization || "no org"})`
      )
    }
  } catch (err) {
    console.error("Sample query failed:", err.message)
  }
}

main().catch((err) => {
  console.error("Fatal error:", err)
  process.exit(1)
})
