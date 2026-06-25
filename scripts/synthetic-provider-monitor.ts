#!/usr/bin/env ts-node

/**
 * AI Provider Synthetic Monitor
 * 
 * Verifies health of configured AI providers (OpenAI, Anthropic, Google)
 * by making a lightweight API call. Fires a Slack notification if any
 * configured provider fails.
 * 
 * Run via:
 *   npx ts-node scripts/synthetic-provider-monitor.ts
 */

import { generateText } from "ai";
import { getPrimaryModel, getFallback1Model, getFallback2Model, hasGoogle, hasAnthropic, hasOpenAI } from "../lib/ai/providers";
import { sendSlackNotification } from "../lib/notifications/slack";
import { NotificationPayload } from "../lib/notifications/types";

async function runMonitor() {
  console.log("🚀 Starting AI Provider Synthetic Monitor");
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;
  if (!webhookUrl) {
    console.warn("⚠️ Warning: SLACK_WEBHOOK_URL not configured. Alerts will only be logged to console.");
  }

  const checks = [
    { name: "Google (Primary/Fallback2)", has: hasGoogle, getModel: getPrimaryModel },
    { name: "Anthropic (Fallback1)", has: hasAnthropic, getModel: getFallback1Model },
    { name: "OpenAI (Fallback/Embedding)", has: hasOpenAI, getModel: () => {
        // OpenAI case
        try {
          const { openai } = require("@ai-sdk/openai");
          return openai("gpt-4o-mini");
        } catch {
          return null;
        }
      } 
    }
  ];

  let overallPassed = true;
  const failures: string[] = [];

  for (const check of checks) {
    if (!check.has()) {
      console.log(`ℹ️  ${check.name}: Not configured (skipping check)`);
      continue;
    }

    console.log(`🔍 Checking ${check.name}...`);
    const model = check.getModel();
    if (!model) {
      console.error(`❌ ${check.name}: Failed to resolve model from providers`);
      failures.push(`${check.name}: Failed to resolve model`);
      overallPassed = false;
      continue;
    }

    try {
      const start = Date.now();
      const result = await generateText({
        model,
        prompt: "Say 'healthy' and nothing else.",
        maxOutputTokens: 5,
        temperature: 0.1,
      });

      const duration = Date.now() - start;
      const responseText = result.text.trim();
      console.log(`✅ ${check.name}: Passed in ${duration}ms (Response: "${responseText}")`);
    } catch (error: any) {
      console.error(`❌ ${check.name}: API call failed:`, error.message || error);
      failures.push(`${check.name}: ${error.message || JSON.stringify(error)}`);
      overallPassed = false;
    }
  }

  if (!overallPassed) {
    console.error("\n🚨 Synthetic Monitor FAILED!");
    
    if (webhookUrl) {
      const payload: NotificationPayload = {
        userId: "synthetic-monitor",
        level: "critical",
        type: "errors",
        title: "🚨 AI Provider Failure Detected!",
        message: `Synthetic monitor detected issues with configured AI providers:\n${failures.map(f => `- ${f}`).join("\n")}`,
        metric: "provider_failures",
        value: failures.length,
        threshold: 1,
        metadata: {
          timestamp: new Date().toISOString(),
          failures
        }
      };

      try {
        await sendSlackNotification(webhookUrl, payload);
        console.log("📨 Slack alert dispatched successfully");
      } catch (err) {
        console.error("❌ Failed to send Slack notification:", err);
      }
    }
    process.exit(1);
  } else {
    console.log("\n🎉 All configured AI providers are healthy!");
    process.exit(0);
  }
}

runMonitor().catch(err => {
  console.error("Fatal monitor error:", err);
  process.exit(1);
});
