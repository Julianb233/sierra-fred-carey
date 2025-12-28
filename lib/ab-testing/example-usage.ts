/**
 * A/B Testing Auto-Promotion - Example Usage
 * Complete examples for all promotion workflows
 */

import {
  checkPromotionEligibility,
  promoteWinningVariant,
  rollbackPromotion,
  getPromotionHistory,
  checkAllExperimentsForPromotion,
  DEFAULT_PROMOTION_RULES,
  AGGRESSIVE_PROMOTION_RULES,
} from "./index";

// ============================================================================
// Example 1: Check if an experiment is ready for promotion
// ============================================================================

async function example1_CheckEligibility() {
  console.log("Example 1: Check Promotion Eligibility\n");

  const experimentName = "hero-cta-test";

  try {
    const eligibility = await checkPromotionEligibility(experimentName);

    console.log("Eligibility Status:");
    console.log(`  Eligible: ${eligibility.eligible}`);
    console.log(`  Recommendation: ${eligibility.recommendation}`);
    console.log(`  Reason: ${eligibility.reason}`);

    if (eligibility.winningVariant) {
      console.log(`\nWinning Variant: ${eligibility.winningVariant}`);
      console.log(`  Confidence: ${eligibility.confidenceLevel}%`);
      console.log(
        `  Improvement: ${((eligibility.improvement || 0) * 100).toFixed(2)}%`
      );
    }

    console.log(`\nSafety Checks (${eligibility.safetyChecks.length} total):`);
    const passed = eligibility.safetyChecks.filter((c) => c.passed).length;
    const failed = eligibility.safetyChecks.filter((c) => !c.passed).length;
    console.log(`  Passed: ${passed}`);
    console.log(`  Failed: ${failed}`);

    // Show failed checks
    const failedChecks = eligibility.safetyChecks.filter((c) => !c.passed);
    if (failedChecks.length > 0) {
      console.log(`\nFailed Checks:`);
      for (const check of failedChecks) {
        console.log(`  - [${check.severity.toUpperCase()}] ${check.message}`);
      }
    }
  } catch (error) {
    console.error("Error checking eligibility:", error);
  }
}

// ============================================================================
// Example 2: Manually promote a winning variant
// ============================================================================

async function example2_ManualPromotion() {
  console.log("Example 2: Manual Promotion\n");

  const experimentName = "hero-cta-test";
  const userId = "admin-user-123";

  try {
    const result = await promoteWinningVariant(experimentName, {
      userId,
      triggeredBy: "manual",
    });

    if (result.success) {
      console.log("Promotion Successful!");
      console.log(`  Experiment: ${result.experimentName}`);
      console.log(`  Winner: ${result.winningVariant}`);
      console.log(`  Action: ${result.action}`);
      console.log(`  Audit Log ID: ${result.auditLogId}`);
      console.log(`\nMessage: ${result.message}`);
    } else {
      console.log("Promotion Failed:");
      console.log(`  Reason: ${result.message}`);
      console.log(`  Action: ${result.action}`);

      if (result.eligibility) {
        console.log(`  Recommendation: ${result.eligibility.recommendation}`);
      }
    }
  } catch (error) {
    console.error("Error promoting variant:", error);
  }
}

// ============================================================================
// Example 3: Force promotion (skip safety checks)
// ============================================================================

async function example3_ForcePromotion() {
  console.log("Example 3: Force Promotion (USE WITH CAUTION!)\n");

  const experimentName = "hero-cta-test";
  const userId = "admin-user-123";

  try {
    console.warn(
      "⚠️  WARNING: Skipping safety checks. Use only in emergencies!"
    );

    const result = await promoteWinningVariant(experimentName, {
      userId,
      triggeredBy: "manual",
      force: true, // Skip all safety checks
    });

    if (result.success) {
      console.log("Force Promotion Successful!");
      console.log(`  Winner: ${result.winningVariant}`);
      console.log(`  Audit Log ID: ${result.auditLogId}`);
    } else {
      console.log("Force Promotion Failed:");
      console.log(`  Reason: ${result.message}`);
    }
  } catch (error) {
    console.error("Error forcing promotion:", error);
  }
}

// ============================================================================
// Example 4: Promote with custom rules
// ============================================================================

async function example4_CustomRulesPromotion() {
  console.log("Example 4: Promotion with Custom Rules\n");

  const experimentName = "hero-cta-test";
  const userId = "admin-user-123";

  // Custom rules: Lower thresholds for this specific experiment
  const customRules = {
    minSampleSize: 500, // Lower from default 1000
    minConfidenceLevel: 90, // Lower from default 95
    minImprovement: 0.01, // Lower from default 0.02
    requireManualApproval: false, // Override manual approval
  };

  try {
    console.log("Using Custom Rules:");
    console.log(`  Min Sample Size: ${customRules.minSampleSize}`);
    console.log(`  Min Confidence: ${customRules.minConfidenceLevel}%`);
    console.log(
      `  Min Improvement: ${(customRules.minImprovement * 100).toFixed(2)}%`
    );

    const result = await promoteWinningVariant(experimentName, {
      userId,
      triggeredBy: "manual",
      customRules,
    });

    if (result.success) {
      console.log("\nPromotion Successful with Custom Rules!");
      console.log(`  Winner: ${result.winningVariant}`);
    } else {
      console.log("\nPromotion Failed:");
      console.log(`  Reason: ${result.message}`);
    }
  } catch (error) {
    console.error("Error promoting with custom rules:", error);
  }
}

// ============================================================================
// Example 5: Rollback a promotion
// ============================================================================

async function example5_RollbackPromotion() {
  console.log("Example 5: Rollback Promotion\n");

  const experimentName = "hero-cta-test";
  const userId = "admin-user-123";

  try {
    const result = await rollbackPromotion(experimentName, {
      userId,
      reason: "Elevated error rate detected in production monitoring",
    });

    if (result.success) {
      console.log("Rollback Successful!");
      console.log(`  Experiment: ${result.experimentName}`);
      console.log(`  Rolled Back To: ${result.rolledBackTo}`);
      console.log(`  Reason: ${result.message}`);
      console.log(`  Audit Log ID: ${result.auditLogId}`);
    } else {
      console.log("Rollback Failed:");
      console.log(`  Reason: ${result.message}`);
    }
  } catch (error) {
    console.error("Error rolling back promotion:", error);
  }
}

// ============================================================================
// Example 6: Rollback with custom traffic distribution
// ============================================================================

async function example6_RollbackWithCustomTraffic() {
  console.log("Example 6: Rollback with Custom Traffic Distribution\n");

  const experimentName = "hero-cta-test";
  const userId = "admin-user-123";

  try {
    // Restore specific traffic split instead of equal distribution
    const customTraffic = {
      "variant-control-id": 70, // 70% to control
      "variant-b-id": 30, // 30% to variant B
    };

    console.log("Custom Traffic Distribution:");
    console.log(`  Control: 70%`);
    console.log(`  Variant B: 30%`);

    const result = await rollbackPromotion(experimentName, {
      userId,
      reason: "Partial rollback to reduce exposure while monitoring",
      restoreTraffic: customTraffic,
    });

    if (result.success) {
      console.log("\nRollback Successful!");
      console.log(`  Message: ${result.message}`);
    } else {
      console.log("\nRollback Failed:");
      console.log(`  Reason: ${result.message}`);
    }
  } catch (error) {
    console.error("Error rolling back with custom traffic:", error);
  }
}

// ============================================================================
// Example 7: View promotion history
// ============================================================================

async function example7_ViewHistory() {
  console.log("Example 7: View Promotion History\n");

  const experimentName = "hero-cta-test";

  try {
    const history = await getPromotionHistory(experimentName);

    console.log(`Found ${history.length} promotion events:\n`);

    for (const entry of history) {
      console.log(`[${entry.promotedAt.toISOString()}]`);
      console.log(`  Action: ${entry.action}`);
      console.log(`  Winner: ${entry.winningVariantName}`);
      console.log(`  Triggered By: ${entry.triggeredBy}`);
      console.log(`  User: ${entry.userId || "system"}`);

      if (entry.confidenceLevel) {
        console.log(`  Confidence: ${entry.confidenceLevel}%`);
      }

      if (entry.improvement) {
        console.log(
          `  Improvement: ${(entry.improvement * 100).toFixed(2)}%`
        );
      }

      if (entry.rolledBackAt) {
        console.log(`  Rolled Back: ${entry.rolledBackAt.toISOString()}`);
        console.log(`  Rollback Reason: ${entry.rollbackReason}`);
      }

      console.log(`  Audit ID: ${entry.id}\n`);
    }
  } catch (error) {
    console.error("Error fetching promotion history:", error);
  }
}

// ============================================================================
// Example 8: Auto-promotion for all experiments (scheduled job)
// ============================================================================

async function example8_AutoPromoteAll() {
  console.log("Example 8: Auto-Promote All Eligible Experiments\n");

  try {
    console.log("Checking all active experiments for auto-promotion...\n");

    const results = await checkAllExperimentsForPromotion();

    console.log("Results:");
    console.log(`  Total Checked: ${results.checked}`);
    console.log(`  Eligible for Promotion: ${results.eligible.length}`);
    console.log(`  Successfully Promoted: ${results.promoted.length}`);
    console.log(`  Errors: ${results.errors.length}`);

    if (results.eligible.length > 0) {
      console.log(`\nEligible Experiments:`);
      for (const exp of results.eligible) {
        console.log(`  - ${exp}`);
      }
    }

    if (results.promoted.length > 0) {
      console.log(`\nPromoted Experiments:`);
      for (const exp of results.promoted) {
        console.log(`  ✓ ${exp}`);
      }
    }

    if (results.errors.length > 0) {
      console.log(`\nErrors:`);
      for (const error of results.errors) {
        console.log(`  ✗ ${error.experimentName}: ${error.error}`);
      }
    }
  } catch (error) {
    console.error("Error in auto-promotion check:", error);
  }
}

// ============================================================================
// Example 9: Custom promotion workflow
// ============================================================================

async function example9_CustomWorkflow() {
  console.log("Example 9: Custom Promotion Workflow\n");

  const experimentName = "hero-cta-test";
  const userId = "admin-user-123";

  try {
    // Step 1: Check eligibility
    console.log("Step 1: Checking eligibility...");
    const eligibility = await checkPromotionEligibility(experimentName);

    console.log(`  Recommendation: ${eligibility.recommendation}`);

    // Step 2: Decide based on recommendation
    if (eligibility.recommendation === "promote") {
      console.log("\nStep 2: Auto-promoting (all checks passed)...");

      const result = await promoteWinningVariant(experimentName, {
        userId,
        triggeredBy: "auto",
      });

      console.log(`  Result: ${result.message}`);
    } else if (eligibility.recommendation === "manual_review") {
      console.log(
        "\nStep 2: Flagged for manual review - notifying admin..."
      );

      // In real code, send notification here
      console.log("  ✉️  Email sent to admin");
      console.log(`  Reason: ${eligibility.reason}`);

      // Show which checks need attention
      const needsAttention = eligibility.safetyChecks.filter(
        (c) => !c.passed && c.severity !== "info"
      );
      if (needsAttention.length > 0) {
        console.log(`\nChecks requiring attention:`);
        for (const check of needsAttention) {
          console.log(`  - [${check.severity}] ${check.message}`);
        }
      }
    } else {
      console.log("\nStep 2: Not ready for promotion");
      console.log(`  Reason: ${eligibility.reason}`);
      console.log("  Action: Continue monitoring");
    }
  } catch (error) {
    console.error("Error in custom workflow:", error);
  }
}

// ============================================================================
// Example 10: View promotion rules
// ============================================================================

async function example10_ViewRules() {
  console.log("Example 10: View Promotion Rules\n");

  console.log("Default (Production) Rules:");
  console.log(`  Min Sample Size: ${DEFAULT_PROMOTION_RULES.minSampleSize}`);
  console.log(
    `  Min Confidence: ${DEFAULT_PROMOTION_RULES.minConfidenceLevel}%`
  );
  console.log(
    `  Min Improvement: ${(DEFAULT_PROMOTION_RULES.minImprovement * 100).toFixed(2)}%`
  );
  console.log(
    `  Max Error Rate: ${(DEFAULT_PROMOTION_RULES.maxErrorRate * 100).toFixed(2)}%`
  );
  console.log(
    `  Max P95 Latency: ${DEFAULT_PROMOTION_RULES.maxP95LatencyMs}ms`
  );
  console.log(
    `  Min Duration: ${DEFAULT_PROMOTION_RULES.minTestDurationHours}h`
  );
  console.log(
    `  Max Duration: ${DEFAULT_PROMOTION_RULES.maxTestDurationHours}h`
  );
  console.log(
    `  Manual Approval: ${DEFAULT_PROMOTION_RULES.requireManualApproval}`
  );

  console.log("\nAggressive (Development) Rules:");
  console.log(
    `  Min Sample Size: ${AGGRESSIVE_PROMOTION_RULES.minSampleSize}`
  );
  console.log(
    `  Min Confidence: ${AGGRESSIVE_PROMOTION_RULES.minConfidenceLevel}%`
  );
  console.log(
    `  Min Improvement: ${(AGGRESSIVE_PROMOTION_RULES.minImprovement * 100).toFixed(2)}%`
  );
  console.log(
    `  Max Error Rate: ${(AGGRESSIVE_PROMOTION_RULES.maxErrorRate * 100).toFixed(2)}%`
  );
  console.log(
    `  Max P95 Latency: ${AGGRESSIVE_PROMOTION_RULES.maxP95LatencyMs}ms`
  );
  console.log(
    `  Min Duration: ${AGGRESSIVE_PROMOTION_RULES.minTestDurationHours}h`
  );
  console.log(
    `  Max Duration: ${AGGRESSIVE_PROMOTION_RULES.maxTestDurationHours}h`
  );
  console.log(
    `  Manual Approval: ${AGGRESSIVE_PROMOTION_RULES.requireManualApproval}`
  );
}

// ============================================================================
// Run examples
// ============================================================================

async function main() {
  console.log("=".repeat(80));
  console.log("A/B Testing Auto-Promotion - Example Usage");
  console.log("=".repeat(80));
  console.log();

  // Uncomment the examples you want to run:

  // await example1_CheckEligibility();
  // await example2_ManualPromotion();
  // await example3_ForcePromotion();
  // await example4_CustomRulesPromotion();
  // await example5_RollbackPromotion();
  // await example6_RollbackWithCustomTraffic();
  // await example7_ViewHistory();
  // await example8_AutoPromoteAll();
  // await example9_CustomWorkflow();
  await example10_ViewRules();
}

// Run if executed directly
if (require.main === module) {
  main().catch(console.error);
}

export {
  example1_CheckEligibility,
  example2_ManualPromotion,
  example3_ForcePromotion,
  example4_CustomRulesPromotion,
  example5_RollbackPromotion,
  example6_RollbackWithCustomTraffic,
  example7_ViewHistory,
  example8_AutoPromoteAll,
  example9_CustomWorkflow,
  example10_ViewRules,
};
