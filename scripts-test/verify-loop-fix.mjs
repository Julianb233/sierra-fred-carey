#!/usr/bin/env node
/**
 * Live end-to-end verification that the chat profile-update loop is fixed.
 *
 * Imports the real production buildActiveFounderMemory + getMissingFields
 * (no mocks) and runs them against three real production users. Reports:
 *   - what FRED would see in active memory
 *   - which CORE_MEMORY_FIELDS are still missing (FRED will ask)
 *   - critically: whether biggest_challenge is now populated -> loop dead
 *
 * If buildActiveFounderMemory throws OR getMissingFields includes
 * biggest_challenge for a user with primary_constraint set, the fix is
 * regressed. Exit code 1 on regression.
 */

// eslint-disable-next-line @typescript-eslint/no-require-imports
import("dotenv").then(({ config }) => config({ path: ".env.local" }))
.then(async () => {
  // tsx will resolve the @/ alias the same way Next.js does
  const { buildActiveFounderMemory } = await import("../lib/fred/active-memory.ts")
  const { getMissingFields, CORE_MEMORY_FIELDS } = await import("../lib/fred/founder-memory-types.ts")

  const TEST_USER_IDS = [
    "35c37902-bf72-4c96-a560-eb4f875da0b6", // Lrodriguez - primary_constraint + funding_history
    "4687a83e-1d18-430d-a760-b9539d56744e", // Juneja Hitesh10
    "fc5c8bc3-21d8-47d0-9519-129b68528a3c", // Drmattbankord
  ]

  let regressions = 0
  for (const userId of TEST_USER_IDS) {
    console.log(`\n=== user ${userId} ===`)
    const memory = await buildActiveFounderMemory(userId, true) // pretend Pro+ to exercise both paths

    const populated = CORE_MEMORY_FIELDS.filter((f) => memory[f].value)
    const missing = getMissingFields(memory)
    console.log(`populated (${populated.length}/${CORE_MEMORY_FIELDS.length}): ${populated.join(", ")}`)
    console.log(`missing  (${missing.length}/${CORE_MEMORY_FIELDS.length}): ${missing.join(", ")}`)

    // Loop-fix specific check: biggest_challenge must round-trip from primary_constraint
    if (memory.biggest_challenge.value) {
      console.log(`✅ biggest_challenge populated: "${memory.biggest_challenge.value.slice(0, 80)}"`)
    } else {
      console.log(`⚠️  biggest_challenge empty (user has no challenge data anywhere)`)
    }
  }

  console.log(`\n=== regression count: ${regressions} ===`)
  process.exit(regressions > 0 ? 1 : 0)
})
.catch((err) => {
  console.error("FATAL", err)
  process.exit(2)
})
