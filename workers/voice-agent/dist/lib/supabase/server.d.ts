import type { SupabaseClient } from "@supabase/supabase-js";
export declare function createClient(): Promise<SupabaseClient<any, "public", "public", any, any>>;
/** Alias for createClient — emphasises user-scoped intent. */
export declare const createUserClient: typeof createClient;
/**
 * Service role client for admin / background operations (webhooks, crons, etc.).
 * Uses createClient from @supabase/supabase-js directly — no cookie adapter needed
 * because the service role key bypasses RLS and has no per-user session.
 */
export declare function createServiceClient(): SupabaseClient;
export type { SupabaseClient };
