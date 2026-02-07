#!/usr/bin/env npx tsx
/**
 * Production Environment Variable Validation
 *
 * Run before deploy: npx tsx scripts/validate-env.ts
 * Exits with code 1 if any required vars are missing.
 */

import { z } from "zod";

const productionEnvSchema = z.object({
  // Core (always required)
  NEXT_PUBLIC_SUPABASE_URL: z.string().url("Must be a valid URL"),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  JWT_SECRET: z
    .string()
    .min(32, "JWT_SECRET must be at least 32 characters"),

  // Stripe (required for billing)
  STRIPE_SECRET_KEY: z.string().startsWith("sk_"),
  STRIPE_WEBHOOK_SECRET: z.string().startsWith("whsec_"),
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().startsWith("pk_"),
  NEXT_PUBLIC_STRIPE_FUNDRAISING_PRICE_ID: z.string().startsWith("price_"),
  NEXT_PUBLIC_STRIPE_VENTURE_STUDIO_PRICE_ID: z
    .string()
    .startsWith("price_"),

  // Upstash (required for rate limiting)
  UPSTASH_REDIS_REST_URL: z.string().url("Must be a valid URL"),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(1),

  // App URL (required for CORS, emails, webhooks)
  NEXT_PUBLIC_APP_URL: z.string().url("Must be a valid URL"),

  // AI (at least one required -- checked separately)
  OPENAI_API_KEY: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
  GOOGLE_API_KEY: z.string().optional(),
});

function validate() {
  console.log("Validating production environment variables...\n");

  const result = productionEnvSchema.safeParse(process.env);

  if (!result.success) {
    console.error("VALIDATION FAILED\n");
    for (const issue of result.error.issues) {
      console.error(`  ${issue.path.join(".")}: ${issue.message}`);
    }
    console.error(`\n${result.error.issues.length} issue(s) found.`);
    process.exit(1);
  }

  // Check AI provider (at least one needed)
  const hasAI =
    result.data.OPENAI_API_KEY ||
    result.data.ANTHROPIC_API_KEY ||
    result.data.GOOGLE_API_KEY;
  if (!hasAI) {
    console.error("VALIDATION FAILED\n");
    console.error(
      "  At least one AI provider key is required (OPENAI_API_KEY, ANTHROPIC_API_KEY, or GOOGLE_API_KEY)"
    );
    process.exit(1);
  }

  console.log("All required environment variables present.");

  // Report optional vars
  const optional = [
    "ADMIN_SECRET_KEY",
    "CRON_SECRET",
    "TWILIO_ACCOUNT_SID",
    "TWILIO_AUTH_TOKEN",
    "TWILIO_MESSAGING_SERVICE_SID",
    "LIVEKIT_API_KEY",
    "LIVEKIT_API_SECRET",
    "LIVEKIT_URL",
    "NEXT_PUBLIC_LIVEKIT_URL",
    "RESEND_API_KEY",
    "SLACK_WEBHOOK_URL",
  ];

  const missing = optional.filter((v) => !process.env[v]);
  if (missing.length > 0) {
    console.log(`\nOptional vars not set (features may be limited):`);
    for (const v of missing) {
      console.log(`  - ${v}`);
    }
  }

  console.log("\nValidation passed.");
}

validate();
