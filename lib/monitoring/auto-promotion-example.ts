/**
 * Auto-Promotion System - Example Usage
 * Demonstrates how to use the experiment winner auto-promotion system
 */

import {
  checkPromotionEligibility,
  promoteWinner,
  rollbackPromotion,
  getPromotionHistory,
  autoCheckPromotions,
  DEFAULT_PROMOTION_CONFIG,
  type PromotionConfig,
} from "./auto-promotion";

/**
 * Example 1: Check if an experiment is eligible for promotion
 */
async function example1_CheckEligibility() {
  const experimentName = "reality-lens-v2";

  // Check with default config
  const eligibility = await checkPromotionEligibility(experimentName);

  if (eligibility.isEligible) {
    console.log(`✅ ${experimentName} is eligible for promotion!`);
    console.log(`Winner: ${eligibility.winner}`);
    console.log(`Confidence: ${eligibility.confidence?.toFixed(1)}%`);
    console.log(`Improvement: ${eligibility.improvement?.toFixed(1)}%`);
  } else {
    console.log(`❌ ${experimentName} is NOT eligible for promotion`);
    console.log("Reasons:");
    eligibility.reasons.forEach((reason) => console.log(`  - ${reason}`));
  }

  if (eligibility.warnings.length > 0) {
    console.log("\n⚠️  Warnings:");
    eligibility.warnings.forEach((warning) => console.log(`  - ${warning}`));
  }

  return eligibility;
}

/**
 * Example 2: Manual promotion with custom safety thresholds
 */
async function example2_ManualPromotionWithCustomConfig() {
  const experimentName = "reality-lens-v2";
  const userId = "user-123";

  // Custom config with stricter requirements
  const customConfig: PromotionConfig = {
    minSampleSize: 2000, // Higher than default
    minConfidenceLevel: 99.0, // 99% confidence instead of 95%
    minImprovementPercent: 10.0, // Must be 10%+ better
    minRuntimeHours: 96, // 4 days instead of 2
    maxErrorRate: 0.02, // 2% max error rate
    requireManualApproval: true,
  };

  // Check eligibility with custom config
  const eligibility = await checkPromotionEligibility(
    experimentName,
    customConfig
  );

  if (!eligibility.isEligible) {
    console.log("Experiment not ready for promotion");
    return;
  }

  // Manually promote
  const promotion = await promoteWinner(
    experimentName,
    "manual",
    userId,
    customConfig
  );

  console.log(`
    🚀 Promotion Successful!
    Experiment: ${promotion.experimentName}
    Winner: ${promotion.promotedVariantName}
    Confidence: ${promotion.confidence.toFixed(1)}%
    Improvement: ${promotion.improvement.toFixed(1)}%
    Promotion ID: ${promotion.id}
  `);

  return promotion;
}

/**
 * Example 3: Auto-promotion (system-triggered)
 */
async function example3_AutoPromotion() {
  const experimentName = "reality-lens-v2";

  // Promoter automatically if eligible (no manual approval needed)
  const config = {
    ...DEFAULT_PROMOTION_CONFIG,
    requireManualApproval: false, // Allow auto-promotion
  };

  const eligibility = await checkPromotionEligibility(experimentName, config);

  if (eligibility.isEligible) {
    // Auto-promote
    const promotion = await promoteWinner(experimentName, "auto", undefined, config);

    console.log(`✅ Auto-promoted ${promotion.promotedVariantName}`);
    return promotion;
  }

  return null;
}

/**
 * Example 4: Rollback a promotion
 */
async function example4_RollbackPromotion() {
  const experimentName = "reality-lens-v2";
  const userId = "user-123";

  await rollbackPromotion(
    experimentName,
    "Winner variant showing increased error rate in production",
    userId
  );

  console.log(`⏪ Rolled back promotion for ${experimentName}`);

  // Get updated history
  const history = await getPromotionHistory(experimentName);
  console.log(`Total promotions: ${history.length}`);
  console.log(
    `Latest rollback reason: ${history[0]?.rollbackReason || "N/A"}`
  );
}

/**
 * Example 5: View promotion history
 */
async function example5_ViewPromotionHistory() {
  const experimentName = "reality-lens-v2";

  const history = await getPromotionHistory(experimentName);

  console.log(`\n📊 Promotion History for ${experimentName}`);
  console.log(`Total promotions: ${history.length}\n`);

  history.forEach((record, index) => {
    console.log(`#${index + 1}`);
    console.log(`  Promoted: ${record.promotedVariantName}`);
    console.log(`  Type: ${record.promotionType}`);
    console.log(`  Confidence: ${record.confidence.toFixed(1)}%`);
    console.log(`  Improvement: ${record.improvement.toFixed(1)}%`);
    console.log(`  Promoted at: ${record.promotedAt.toISOString()}`);

    if (record.rollbackAt) {
      console.log(`  ⏪ Rolled back: ${record.rollbackAt.toISOString()}`);
      console.log(`  Reason: ${record.rollbackReason}`);
    }

    console.log("");
  });
}

/**
 * Example 6: Batch auto-check all active experiments
 */
async function example6_BatchAutoCheck() {
  const userId = "admin-user-123";

  // Check all active experiments and auto-promote eligible ones
  const results = await autoCheckPromotions(userId, {
    ...DEFAULT_PROMOTION_CONFIG,
    requireManualApproval: false, // Auto-promote immediately
  });

  console.log(`
    🔍 Auto-Check Results:
    Total experiments checked: ${results.checked}
    Eligible for promotion: ${results.eligible.length}
    Auto-promoted: ${results.promoted}
  `);

  if (results.eligible.length > 0) {
    console.log("\nEligible experiments:");
    results.eligible.forEach((exp) => console.log(`  - ${exp}`));
  }

  if (results.promoted_experiments.length > 0) {
    console.log("\nAuto-promoted experiments:");
    results.promoted_experiments.forEach((exp) => console.log(`  - ${exp}`));
  }

  return results;
}

/**
 * Example 7: Environment-based configuration
 */
async function example7_EnvironmentConfig() {
  // Read config from environment variables
  const config: PromotionConfig = {
    minSampleSize: parseInt(
      process.env.AUTO_PROMOTION_MIN_SAMPLE_SIZE || "1000",
      10
    ),
    minConfidenceLevel: parseFloat(
      process.env.AUTO_PROMOTION_MIN_CONFIDENCE || "95.0"
    ),
    minImprovementPercent: parseFloat(
      process.env.AUTO_PROMOTION_MIN_IMPROVEMENT || "5.0"
    ),
    minRuntimeHours: parseFloat(
      process.env.AUTO_PROMOTION_MIN_RUNTIME_HOURS || "48"
    ),
    maxErrorRate: parseFloat(process.env.AUTO_PROMOTION_MAX_ERROR_RATE || "0.05"),
    requireManualApproval: process.env.AUTO_PROMOTION_REQUIRE_MANUAL === "true",
  };

  console.log("Auto-Promotion Configuration from Environment:");
  console.log(JSON.stringify(config, null, 2));

  return config;
}

/**
 * Example 8: API endpoint usage
 */
async function example8_ApiUsage() {
  const experimentName = "reality-lens-v2";

  // Check eligibility via API
  const checkResponse = await fetch(
    `/api/monitoring/experiments/${experimentName}/promote`
  );
  const checkData = await checkResponse.json();

  console.log("Eligibility check:", checkData);

  if (checkData.data.isEligible) {
    // Promote via API
    const promoteResponse = await fetch(
      `/api/monitoring/experiments/${experimentName}/promote`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          promotionType: "manual",
          promotedBy: "user-123",
          userId: "user-123", // For notifications
        }),
      }
    );

    const promoteData = await promoteResponse.json();
    console.log("Promotion result:", promoteData);
  }

  // Get promotion history via API
  const historyResponse = await fetch(
    `/api/monitoring/experiments/${experimentName}/history`
  );
  const historyData = await historyResponse.json();

  console.log("Promotion history:", historyData);
}

/**
 * Example 9: Scheduled cron job
 */
async function example9_ScheduledCronJob() {
  // This would be called by a cron job (e.g., Vercel Cron)
  const response = await fetch("/api/monitoring/auto-promotion/check", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      userId: "admin-user-123",
      cronSecret: process.env.AUTO_PROMOTION_CRON_SECRET,
      config: {
        ...DEFAULT_PROMOTION_CONFIG,
        requireManualApproval: false,
      },
    }),
  });

  const data = await response.json();
  console.log("Cron job result:", data);
}

/**
 * Example 10: Integration with alert notifier
 */
async function example10_AlertIntegration() {
  // This would typically be in a scheduled job
  const { scheduleAutoPromotionChecks } = await import("./alert-notifier");

  await scheduleAutoPromotionChecks("admin-user-123");

  console.log("Auto-promotion check with notifications completed");
}

// Export examples for testing
export {
  example1_CheckEligibility,
  example2_ManualPromotionWithCustomConfig,
  example3_AutoPromotion,
  example4_RollbackPromotion,
  example5_ViewPromotionHistory,
  example6_BatchAutoCheck,
  example7_EnvironmentConfig,
  example8_ApiUsage,
  example9_ScheduledCronJob,
  example10_AlertIntegration,
};
