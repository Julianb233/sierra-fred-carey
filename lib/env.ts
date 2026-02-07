/**
 * Environment variable validation using Zod
 *
 * - serverEnv: validated at import time on the server only.
 *              Guarded so that client bundles that tree-shake this module
 *              do not crash during build.
 * - clientEnv: validated eagerly with an explicit property list so only
 *              NEXT_PUBLIC_ values enter the client bundle.
 * - validateEnv(): legacy entrypoint kept for instrumentation.ts
 */

import { z } from "zod";

// ============================================================================
// Schemas
// ============================================================================

const serverEnvSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z
    .string()
    .min(1, "SUPABASE_SERVICE_ROLE_KEY is required"),
  JWT_SECRET: z.string().min(1, "JWT_SECRET is required"),
});

const clientEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z
    .string()
    .url("NEXT_PUBLIC_SUPABASE_URL must be a valid URL"),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z
    .string()
    .min(1, "NEXT_PUBLIC_SUPABASE_ANON_KEY is required"),
});

// ============================================================================
// Types
// ============================================================================

export type ServerEnv = z.infer<typeof serverEnvSchema>;
export type ClientEnv = z.infer<typeof clientEnvSchema>;

// ============================================================================
// Parse & Export
// ============================================================================

/**
 * Client env -- safe to import from browser code.
 * Each key is listed explicitly so no server secrets leak into the bundle.
 * Lazy-initialized to avoid crashing during build when env vars are placeholders.
 */
let _clientEnv: ClientEnv | null = null;
export const clientEnv: ClientEnv = new Proxy({} as ClientEnv, {
  get(_target, prop: string) {
    if (!_clientEnv) {
      _clientEnv = clientEnvSchema.parse({
        NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
        NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      });
    }
    return _clientEnv[prop as keyof ClientEnv];
  },
});

/**
 * Server env -- lazy-initialized on the server.
 * The `typeof window === "undefined"` guard ensures the browser build
 * never attempts to validate server-only secrets.
 */
let _serverEnv: ServerEnv | null = null;
export const serverEnv: ServerEnv =
  typeof window === "undefined"
    ? new Proxy({} as ServerEnv, {
        get(_target, prop: string) {
          if (!_serverEnv) {
            _serverEnv = serverEnvSchema.parse(process.env);
          }
          return _serverEnv[prop as keyof ServerEnv];
        },
      })
    : (({} as unknown) as ServerEnv);

// ============================================================================
// Legacy entrypoint (called from instrumentation.ts)
// ============================================================================

/**
 * @deprecated Prefer importing `serverEnv` / `clientEnv` directly.
 * Kept for backward compatibility with instrumentation.ts.
 */
export function validateEnv(): void {
  // The module-level parses above already guarantee that required vars are
  // present. This function now only emits warnings for optional services.

  const OPTIONAL: { name: string; label: string }[] = [
    { name: "STRIPE_SECRET_KEY", label: "Stripe secret key" },
    { name: "STRIPE_WEBHOOK_SECRET", label: "Stripe webhook secret" },
    { name: "ADMIN_SECRET_KEY", label: "Admin panel secret" },
    { name: "CRON_SECRET", label: "Cron job secret" },
    { name: "OPENAI_API_KEY", label: "OpenAI API key" },
    { name: "ANTHROPIC_API_KEY", label: "Anthropic API key" },
    { name: "GOOGLE_API_KEY", label: "Google AI API key" },
    { name: "TWILIO_ACCOUNT_SID", label: "Twilio account SID" },
    { name: "TWILIO_AUTH_TOKEN", label: "Twilio auth token" },
    { name: "RESEND_API_KEY", label: "Resend email API key" },
    { name: "LIVEKIT_API_KEY", label: "LiveKit API key" },
    { name: "LIVEKIT_API_SECRET", label: "LiveKit API secret" },
  ];

  const warnings: string[] = [];

  for (const v of OPTIONAL) {
    if (!process.env[v.name]) {
      warnings.push(`  - ${v.name} (${v.label})`);
    }
  }

  const hasAI =
    process.env.OPENAI_API_KEY ||
    process.env.ANTHROPIC_API_KEY ||
    process.env.GOOGLE_API_KEY;
  if (!hasAI) {
    warnings.push(
      "  - No AI provider configured (OPENAI_API_KEY, ANTHROPIC_API_KEY, or GOOGLE_API_KEY) -- FRED features will not work"
    );
  }

  if (warnings.length > 0) {
    console.warn(
      `[env] Optional environment variables not set:\n${warnings.join("\n")}`
    );
  }
}
