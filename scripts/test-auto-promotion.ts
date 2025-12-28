#!/usr/bin/env tsx
/**
 * A/B Testing Auto-Promotion - Integration Test Script
 * Tests the complete auto-promotion workflow
 */

import { sql } from "@/lib/db/neon";
import {
  checkPromotionEligibility,
  promoteWinningVariant,
  rollbackPromotion,
  getPromotionHistory,
} from "@/lib/ab-testing";

// ANSI color codes
const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  gray: "\x1b[90m",
};

function log(message: string, color: keyof typeof colors = "reset") {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function success(message: string) {
  log(`✓ ${message}`, "green");
}

function error(message: string) {
  log(`✗ ${message}`, "red");
}

function info(message: string) {
  log(`ℹ ${message}`, "blue");
}

function warn(message: string) {
  log(`⚠ ${message}`, "yellow");
}

function section(title: string) {
  console.log();
  log("=".repeat(80), "gray");
  log(title, "blue");
  log("=".repeat(80), "gray");
  console.log();
}

// Test state
let testExperimentId: string | null = null;
let testVariantControlId: string | null = null;
let testVariantBId: string | null = null;

async function setup() {
  section("Setup: Creating Test Experiment");

  try {
    // Check if audit log table exists
    info("Checking database schema...");

    const tableCheck = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'ab_promotion_audit_log'
      ) as exists
    `;

    if (!tableCheck[0].exists) {
      error("ab_promotion_audit_log table does not exist");
      warn("Run migration: lib/db/migrations/013_ab_promotion_audit.sql");
      process.exit(1);
    }

    success("Audit log table exists");

    // Create test experiment
    info("Creating test experiment...");

    const experimentResult = await sql`
      INSERT INTO ab_experiments (name, description, created_by)
      VALUES (
        'auto-promotion-test-' || gen_random_uuid()::text,
        'Test experiment for auto-promotion workflow',
        'test-script'
      )
      ON CONFLICT (name) DO NOTHING
      RETURNING id, name
    `;

    if (experimentResult.length === 0) {
      // If conflict, fetch existing
      const existing = await sql`
        SELECT id, name FROM ab_experiments
        WHERE name LIKE 'auto-promotion-test-%'
        ORDER BY created_at DESC
        LIMIT 1
      `;
      testExperimentId = existing[0].id as string;
      info(`Using existing test experiment: ${existing[0].name}`);
    } else {
      testExperimentId = experimentResult[0].id as string;
      success(`Created test experiment: ${experimentResult[0].name}`);
    }

    // Create control variant
    const controlResult = await sql`
      INSERT INTO ab_variants (
        experiment_id,
        variant_name,
        traffic_percentage,
        config_overrides
      )
      VALUES (
        ${testExperimentId},
        'control',
        50,
        '{}'
      )
      RETURNING id
    `;
    testVariantControlId = controlResult[0].id as string;
    success("Created control variant");

    // Create variant B
    const variantBResult = await sql`
      INSERT INTO ab_variants (
        experiment_id,
        variant_name,
        traffic_percentage,
        config_overrides
      )
      VALUES (
        ${testExperimentId},
        'variant-b',
        50,
        '{}'
      )
      RETURNING id
    `;
    testVariantBId = variantBResult[0].id as string;
    success("Created variant-b");

    // Insert test data (simulated requests)
    info("Inserting simulated test data...");

    // Control: 1000 requests, 10% success rate, 500ms latency
    for (let i = 0; i < 1000; i++) {
      await sql`
        WITH request AS (
          INSERT INTO ai_requests (
            user_id,
            variant_id,
            prompt_data,
            created_at
          )
          VALUES (
            'test-user-' || (random() * 100)::int,
            ${testVariantControlId},
            '{"test": true}',
            NOW() - interval '1 day' * random()
          )
          RETURNING id
        )
        INSERT INTO ai_responses (
          request_id,
          latency_ms,
          tokens_used,
          error
        )
        SELECT
          id,
          450 + (random() * 100)::int,
          100,
          CASE WHEN random() < 0.1 THEN 'test error' ELSE NULL END
        FROM request
      `;
    }
    success("Inserted 1000 control requests");

    // Variant B: 1000 requests, 15% success rate (better), 450ms latency (better)
    for (let i = 0; i < 1000; i++) {
      await sql`
        WITH request AS (
          INSERT INTO ai_requests (
            user_id,
            variant_id,
            prompt_data,
            created_at
          )
          VALUES (
            'test-user-' || (random() * 100)::int,
            ${testVariantBId},
            '{"test": true}',
            NOW() - interval '1 day' * random()
          )
          RETURNING id
        )
        INSERT INTO ai_responses (
          request_id,
          latency_ms,
          tokens_used,
          error
        )
        SELECT
          id,
          400 + (random() * 100)::int,
          100,
          CASE WHEN random() < 0.05 THEN 'test error' ELSE NULL END
        FROM request
      `;
    }
    success("Inserted 1000 variant-b requests (with better performance)");

    console.log();
    success("Setup complete!");
    return true;
  } catch (err) {
    error(`Setup failed: ${err}`);
    throw err;
  }
}

async function testCheckEligibility() {
  section("Test 1: Check Promotion Eligibility");

  try {
    // Get experiment name
    const expResult = await sql`
      SELECT name FROM ab_experiments WHERE id = ${testExperimentId}
    `;
    const experimentName = expResult[0].name as string;

    info(`Checking eligibility for: ${experimentName}`);

    const eligibility = await checkPromotionEligibility(experimentName);

    console.log();
    info("Eligibility Results:");
    console.log(`  Eligible: ${eligibility.eligible}`);
    console.log(`  Recommendation: ${eligibility.recommendation}`);
    console.log(`  Reason: ${eligibility.reason}`);

    if (eligibility.winningVariant) {
      console.log(`  Winning Variant: ${eligibility.winningVariant}`);
      console.log(`  Confidence: ${eligibility.confidenceLevel}%`);
      console.log(
        `  Improvement: ${((eligibility.improvement || 0) * 100).toFixed(2)}%`
      );
    }

    console.log(
      `\n  Safety Checks: ${eligibility.safetyChecks.filter((c) => c.passed).length}/${eligibility.safetyChecks.length} passed`
    );

    const failedCritical = eligibility.safetyChecks.filter(
      (c) => !c.passed && c.severity === "critical"
    );
    if (failedCritical.length > 0) {
      warn(`\n  ${failedCritical.length} critical checks failed:`);
      for (const check of failedCritical) {
        console.log(`    - ${check.message}`);
      }
    }

    console.log();
    success("Eligibility check completed");
    return eligibility;
  } catch (err) {
    error(`Test failed: ${err}`);
    throw err;
  }
}

async function testManualPromotion() {
  section("Test 2: Manual Promotion");

  try {
    // Get experiment name
    const expResult = await sql`
      SELECT name FROM ab_experiments WHERE id = ${testExperimentId}
    `;
    const experimentName = expResult[0].name as string;

    info(`Promoting winner for: ${experimentName}`);

    // Use custom rules to allow promotion
    const result = await promoteWinningVariant(experimentName, {
      userId: "test-script",
      triggeredBy: "manual",
      customRules: {
        minSampleSize: 100,
        minConfidenceLevel: 90,
        minImprovement: 0.01,
        requireManualApproval: false,
      },
    });

    console.log();
    if (result.success) {
      success("Promotion successful!");
      console.log(`  Action: ${result.action}`);
      console.log(`  Winner: ${result.winningVariant}`);
      console.log(`  Audit Log ID: ${result.auditLogId}`);
    } else {
      warn("Promotion not performed:");
      console.log(`  Reason: ${result.message}`);
      console.log(`  Action: ${result.action}`);
    }

    // Check traffic distribution
    const variants = await sql`
      SELECT
        variant_name as "variantName",
        traffic_percentage as "trafficPercentage"
      FROM ab_variants
      WHERE experiment_id = ${testExperimentId}
      ORDER BY variant_name
    `;

    console.log("\n  Traffic Distribution:");
    for (const v of variants) {
      console.log(`    ${v.variantName}: ${v.trafficPercentage}%`);
    }

    console.log();
    success("Promotion test completed");
    return result;
  } catch (err) {
    error(`Test failed: ${err}`);
    throw err;
  }
}

async function testPromotionHistory() {
  section("Test 3: Promotion History");

  try {
    // Get experiment name
    const expResult = await sql`
      SELECT name FROM ab_experiments WHERE id = ${testExperimentId}
    `;
    const experimentName = expResult[0].name as string;

    info(`Fetching promotion history for: ${experimentName}`);

    const history = await getPromotionHistory(experimentName);

    console.log();
    console.log(`Found ${history.length} promotion events:\n`);

    for (const entry of history) {
      console.log(`  [${entry.promotedAt.toISOString()}]`);
      console.log(`    Action: ${entry.action}`);
      console.log(`    Winner: ${entry.winningVariantName}`);
      console.log(`    Triggered By: ${entry.triggeredBy}`);
      console.log(`    User: ${entry.userId || "system"}`);

      if (entry.confidenceLevel) {
        console.log(`    Confidence: ${entry.confidenceLevel}%`);
      }

      if (entry.improvement) {
        console.log(
          `    Improvement: ${(entry.improvement * 100).toFixed(2)}%`
        );
      }

      if (entry.rolledBackAt) {
        console.log(`    Rolled Back: ${entry.rolledBackAt.toISOString()}`);
      }

      console.log();
    }

    success("History check completed");
    return history;
  } catch (err) {
    error(`Test failed: ${err}`);
    throw err;
  }
}

async function testRollback() {
  section("Test 4: Rollback Promotion");

  try {
    // Get experiment name
    const expResult = await sql`
      SELECT name FROM ab_experiments WHERE id = ${testExperimentId}
    `;
    const experimentName = expResult[0].name as string;

    info(`Rolling back promotion for: ${experimentName}`);

    const result = await rollbackPromotion(experimentName, {
      userId: "test-script",
      reason: "Testing rollback functionality",
    });

    console.log();
    if (result.success) {
      success("Rollback successful!");
      console.log(`  Message: ${result.message}`);
      console.log(`  Rolled Back To: ${result.rolledBackTo}`);
      console.log(`  Audit Log ID: ${result.auditLogId}`);
    } else {
      error("Rollback failed:");
      console.log(`  Reason: ${result.message}`);
    }

    // Check traffic distribution
    const variants = await sql`
      SELECT
        variant_name as "variantName",
        traffic_percentage as "trafficPercentage"
      FROM ab_variants
      WHERE experiment_id = ${testExperimentId}
      ORDER BY variant_name
    `;

    console.log("\n  Traffic Distribution After Rollback:");
    for (const v of variants) {
      console.log(`    ${v.variantName}: ${v.trafficPercentage}%`);
    }

    console.log();
    success("Rollback test completed");
    return result;
  } catch (err) {
    error(`Test failed: ${err}`);
    throw err;
  }
}

async function cleanup() {
  section("Cleanup: Removing Test Data");

  try {
    if (!testExperimentId) {
      warn("No test experiment to clean up");
      return;
    }

    info("Removing test data...");

    // Delete responses
    await sql`
      DELETE FROM ai_responses
      WHERE request_id IN (
        SELECT id FROM ai_requests WHERE variant_id IN (
          SELECT id FROM ab_variants WHERE experiment_id = ${testExperimentId}
        )
      )
    `;
    success("Deleted test responses");

    // Delete requests
    await sql`
      DELETE FROM ai_requests
      WHERE variant_id IN (
        SELECT id FROM ab_variants WHERE experiment_id = ${testExperimentId}
      )
    `;
    success("Deleted test requests");

    // Delete audit logs
    await sql`
      DELETE FROM ab_promotion_audit_log
      WHERE experiment_id = ${testExperimentId}
    `;
    success("Deleted test audit logs");

    // Delete variants
    await sql`
      DELETE FROM ab_variants WHERE experiment_id = ${testExperimentId}
    `;
    success("Deleted test variants");

    // Delete experiment
    await sql`
      DELETE FROM ab_experiments WHERE id = ${testExperimentId}
    `;
    success("Deleted test experiment");

    console.log();
    success("Cleanup complete!");
  } catch (err) {
    error(`Cleanup failed: ${err}`);
    throw err;
  }
}

async function main() {
  console.log();
  log("=".repeat(80), "blue");
  log("A/B Testing Auto-Promotion - Integration Test", "blue");
  log("=".repeat(80), "blue");
  console.log();

  try {
    await setup();
    await testCheckEligibility();
    await testManualPromotion();
    await testPromotionHistory();
    await testRollback();
    await cleanup();

    console.log();
    log("=".repeat(80), "green");
    log("All Tests Passed!", "green");
    log("=".repeat(80), "green");
    console.log();
  } catch (err) {
    console.log();
    log("=".repeat(80), "red");
    log("Tests Failed!", "red");
    log("=".repeat(80), "red");
    console.log();
    console.error(err);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main().catch(console.error);
}
