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
declare const serverEnvSchema: z.ZodObject<{
    SUPABASE_SERVICE_ROLE_KEY: z.ZodString;
    JWT_SECRET: z.ZodString;
    STRIPE_SECRET_KEY: z.ZodDefault<z.ZodOptional<z.ZodString>>;
    STRIPE_WEBHOOK_SECRET: z.ZodDefault<z.ZodOptional<z.ZodString>>;
    UPSTASH_REDIS_REST_URL: z.ZodDefault<z.ZodOptional<z.ZodString>>;
    UPSTASH_REDIS_REST_TOKEN: z.ZodDefault<z.ZodOptional<z.ZodString>>;
}, z.core.$strip>;
declare const clientEnvSchema: z.ZodObject<{
    NEXT_PUBLIC_SUPABASE_URL: z.ZodString;
    NEXT_PUBLIC_SUPABASE_ANON_KEY: z.ZodString;
    NEXT_PUBLIC_APP_URL: z.ZodDefault<z.ZodOptional<z.ZodString>>;
}, z.core.$strip>;
export type ServerEnv = z.infer<typeof serverEnvSchema>;
export type ClientEnv = z.infer<typeof clientEnvSchema>;
export declare const clientEnv: ClientEnv;
export declare const serverEnv: ServerEnv;
/**
 * @deprecated Prefer importing `serverEnv` / `clientEnv` directly.
 * Kept for backward compatibility with instrumentation.ts.
 */
export declare function validateEnv(): void;
export {};
