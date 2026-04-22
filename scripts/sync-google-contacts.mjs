#!/usr/bin/env node

/**
 * Sync Google Contacts from both personal and business accounts into Supabase.
 *
 * Usage: node scripts/sync-google-contacts.mjs
 *
 * Environment: reads SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY from .env.local
 */

import { execSync } from "child_process"
import { readFileSync } from "fs"
import { resolve, dirname } from "path"
import { fileURLToPath } from "url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const projectRoot = resolve(__dirname, "..")

// ---------------------------------------------------------------------------
// Load env from .env.local
// ---------------------------------------------------------------------------
function loadEnv() {
  const envPath = resolve(projectRoot, ".env.local")
  const lines = readFileSync(envPath, "utf-8").split("\n")
  const env = {}
  for (const line of lines) {
    const m = line.match(/^([A-Z_]+)\s*=\s*"?([^"]*)"?/)
    if (m) env[m[1]] = m[2]
  }
  return env
}

const env = loadEnv()
const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL || env.SUPABASE_URL
const SUPABASE_KEY = env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local")
  process.exit(1)
}

// ---------------------------------------------------------------------------
// Fetch all contacts from one Google account using gws CLI
// ---------------------------------------------------------------------------
function fetchAllContacts(source) {
  const personFields =
    "names,emailAddresses,phoneNumbers,organizations,biographies,memberships,metadata"
  const pageSize = 1000 // max allowed by People API
  const maxPages = 100 // safety limit (100 * 1000 = 100k contacts max)

  const params = JSON.stringify({
    resourceName: "people/me",
    personFields,
    pageSize,
  })

  const envPrefix =
    source === "business"
      ? "GOOGLE_WORKSPACE_CLI_CONFIG_DIR=~/.config/gws/profiles/workspace "
      : ""

  console.log(`\nFetching ${source} contacts with --page-all ...`)

  const cmd = `${envPrefix}gws people people connections list --params '${params}' --page-all --page-limit ${maxPages}`

  let stdout
  try {
    stdout = execSync(cmd, {
      encoding: "utf-8",
      maxBuffer: 500 * 1024 * 1024, // 500 MB
      timeout: 600_000, // 10 min
      shell: "/bin/bash",
    })
  } catch (err) {
    console.error(`gws command failed for ${source}:`, err.message)
    process.exit(1)
  }

  // NDJSON: one JSON object per line
  const pages = stdout
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line))

  const all = []
  for (const page of pages) {
    if (page.connections) all.push(...page.connections)
  }
  console.log(`  Fetched ${all.length} raw contacts from ${source}`)
  return all
}

// ---------------------------------------------------------------------------
// Transform a Google contact into our DB row
// ---------------------------------------------------------------------------
function transformContact(c, source) {
  const names = c.names?.[0] || {}
  const emails = (c.emailAddresses || []).map((e) => ({
    value: e.value,
    type: e.type || null,
  }))
  const phones = (c.phoneNumbers || []).map((p) => ({
    value: p.value,
    canonicalForm: p.canonicalForm || null,
    type: p.type || null,
  }))
  const orgs = (c.organizations || []).map((o) => ({
    name: o.name || null,
    title: o.title || null,
    department: o.department || null,
  }))
  const bio = c.biographies?.[0]?.value || null

  return {
    google_resource_name: c.resourceName,
    source_account: source,
    display_name: names.displayName || null,
    first_name: names.givenName || null,
    last_name: names.familyName || null,
    email_addresses: emails,
    phone_numbers: phones,
    organizations: orgs,
    biographies: bio,
    tags: [],
    raw_data: c,
  }
}

// ---------------------------------------------------------------------------
// Upsert a batch into Supabase via REST API
// ---------------------------------------------------------------------------
async function upsertBatch(rows) {
  const url = `${SUPABASE_URL}/rest/v1/contacts`
  const res = await fetch(url, {
    method: "POST",
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates",
    },
    body: JSON.stringify(rows),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Supabase upsert failed (${res.status}): ${text}`)
  }
}

// ---------------------------------------------------------------------------
// Dedup: if same email exists in both, business wins
// ---------------------------------------------------------------------------
function deduplicateContacts(personalRows, businessRows) {
  // Build set of emails from business contacts
  const businessEmails = new Set()
  for (const row of businessRows) {
    for (const e of row.email_addresses) {
      if (e.value) businessEmails.add(e.value.toLowerCase())
    }
  }

  // Filter personal contacts: skip those whose ANY email is already in business
  let skipped = 0
  const filtered = personalRows.filter((row) => {
    const dominated = row.email_addresses.some(
      (e) => e.value && businessEmails.has(e.value.toLowerCase())
    )
    if (dominated) skipped++
    return !dominated
  })

  console.log(
    `\nDedup: ${skipped} personal contacts removed (email overlap with business)`
  )
  return [...businessRows, ...filtered]
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  console.log("=== Google Contacts → Supabase Sync ===")

  // 1. Fetch from both accounts
  const personalRaw = fetchAllContacts("personal")
  const businessRaw = fetchAllContacts("business")

  // 2. Transform
  const personalRows = personalRaw.map((c) => transformContact(c, "personal"))
  const businessRows = businessRaw.map((c) => transformContact(c, "business"))

  // 3. Dedup
  const allRows = deduplicateContacts(personalRows, businessRows)
  console.log(`\nTotal contacts to upsert: ${allRows.length}`)

  // 4. Upsert in batches
  const BATCH_SIZE = 500
  let done = 0
  for (let i = 0; i < allRows.length; i += BATCH_SIZE) {
    const batch = allRows.slice(i, i + BATCH_SIZE)
    await upsertBatch(batch)
    done += batch.length
    console.log(`  Upserted ${done}/${allRows.length}`)
  }

  console.log(`\nSync complete! ${done} contacts in Supabase.`)

  // 5. Verify
  const countRes = await fetch(
    `${SUPABASE_URL}/rest/v1/contacts?select=id&limit=1`,
    {
      method: "HEAD",
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        Prefer: "count=exact",
      },
    }
  )
  const total = countRes.headers.get("content-range")
  console.log(`Verification — content-range: ${total}`)
}

main().catch((err) => {
  console.error("Fatal:", err)
  process.exit(1)
})
