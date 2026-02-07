/**
 * DELETE /api/user/delete - Delete user account and all associated data
 * Phase 10: Dashboard Polish - Plan 02
 *
 * Deletes user data from all tables in dependency order (children before parents),
 * then removes the auth user via Supabase admin API.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { sql } from "@/lib/db/supabase-sql";
import { createServiceClient } from "@/lib/supabase/server";

export async function DELETE(_request: NextRequest) {
  try {
    const userId = await requireAuth();

    // Delete user data in dependency order (children before parents).
    // Each deletion is wrapped in try/catch so missing tables don't crash the whole operation.
    const tables = [
      { table: "agent_tasks", column: "user_id" },
      { table: "fred_episodic_memory", column: "user_id" },
      { table: "fred_semantic_memory", column: "user_id" },
      { table: "fred_procedural_memory", column: "user_id" },
      { table: "fred_calibration_records", column: "user_id" },
      { table: "sms_checkins", column: "user_id" },
      { table: "sms_preferences", column: "user_id" },
      { table: "boardy_matches", column: "user_id" },
      { table: "documents", column: "user_id" },
      { table: "strategy_documents", column: "user_id" },
      { table: "user_subscriptions", column: "user_id" },
      { table: "profiles", column: "id" },
    ];

    for (const { table, column } of tables) {
      try {
        await sql`DELETE FROM ${sql.unsafe(table)} WHERE ${sql.unsafe(column)} = ${userId}`;
      } catch (err) {
        // Log but continue - table may not exist in this environment
        console.warn(`[user/delete] Failed to delete from ${table}:`, err);
      }
    }

    // Delete auth user via Supabase admin API (service role)
    const supabase = createServiceClient();
    const { error: authError } = await supabase.auth.admin.deleteUser(userId);
    if (authError) {
      console.error("[user/delete] Failed to delete auth user:", authError);
      return NextResponse.json(
        { error: "Failed to delete auth user" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    // Handle auth errors (thrown as Response by requireAuth)
    if (error instanceof Response) return error;

    console.error("[user/delete] Error:", error);
    return NextResponse.json(
      { error: "Failed to delete account" },
      { status: 500 }
    );
  }
}
