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
import { stripe } from "@/lib/stripe/server";
import { logger } from "@/lib/logger";

export async function DELETE(_request: NextRequest) {
  try {
    const userId = await requireAuth();

    // Delete user data in dependency order (children before parents).
    // Each deletion is wrapped in try/catch so missing tables don't crash the whole operation.
    const tables = [
      // v3.0+ tables (children first)
      { table: "fred_conversation_state", column: "user_id" },
      { table: "fred_step_evidence", column: "user_id" },
      { table: "push_subscriptions", column: "user_id" },
      { table: "push_notification_logs", column: "user_id" },
      { table: "email_sends", column: "user_id" },
      { table: "shared_link_recipients", column: "user_id" },
      { table: "shared_links", column: "user_id" },
      { table: "team_members", column: "user_id" },
      { table: "community_post_reactions", column: "user_id" },
      { table: "community_post_replies", column: "author_id" },
      { table: "community_posts", column: "author_id" },
      { table: "community_members", column: "user_id" },
      // v2.0 tables (children first)
      { table: "red_flags", column: "user_id" },
      { table: "check_ins", column: "user_id" },
      { table: "investor_scores", column: "user_id" },
      { table: "investor_pipeline", column: "user_id" },
      { table: "outreach_sequences", column: "user_id" },
      { table: "inbox_items", column: "user_id" },
      { table: "journey_events", column: "user_id" },
      { table: "pitch_reviews", column: "user_id" },
      { table: "contact_submissions", column: "user_id" },
      { table: "notification_configs", column: "user_id" },
      // v1.0 tables
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
    ];

    for (const { table, column } of tables) {
      try {
        await sql`DELETE FROM ${sql.unsafe(table)} WHERE ${sql.unsafe(column)} = ${userId}`;
      } catch (err) {
        // Log but continue - table may not exist in this environment
        logger.warn({ err, table }, `[user/delete] Failed to delete from ${table}`);
      }
    }

    // Cancel active Stripe subscription before deleting subscription records
    try {
      const subRows = await sql`
        SELECT stripe_subscription_id FROM user_subscriptions
        WHERE user_id = ${userId}
          AND status = 'active'
          AND stripe_subscription_id IS NOT NULL
        LIMIT 1
      `;
      if (subRows.length > 0 && subRows[0].stripe_subscription_id) {
        await stripe.subscriptions.cancel(subRows[0].stripe_subscription_id as string);
        logger.info({ subscriptionId: subRows[0].stripe_subscription_id }, "[user/delete] Stripe subscription cancelled");
      }
    } catch (err) {
      logger.warn({ err }, "[user/delete] Failed to cancel Stripe subscription");
    }

    // Now delete subscription records and profile
    for (const { table, column } of [
      { table: "user_subscriptions", column: "user_id" },
      { table: "profiles", column: "id" },
    ]) {
      try {
        await sql`DELETE FROM ${sql.unsafe(table)} WHERE ${sql.unsafe(column)} = ${userId}`;
      } catch (err) {
        logger.warn({ err, table }, `[user/delete] Failed to delete from ${table}`);
      }
    }

    // Delete auth user via Supabase admin API (service role)
    const supabase = createServiceClient();
    const { error: authError } = await supabase.auth.admin.deleteUser(userId);
    if (authError) {
      logger.error({ err: authError }, "[user/delete] Failed to delete auth user");
      return NextResponse.json(
        { error: "Failed to delete auth user" },
        { status: 500 }
      );
    }

    logger.info({ userId }, "[user/delete] Account deletion completed");
    return NextResponse.json({ success: true });
  } catch (error) {
    // Handle auth errors (thrown as Response by requireAuth)
    if (error instanceof Response) return error;

    logger.error({ err: error }, "[user/delete] Error");
    return NextResponse.json(
      { error: "Failed to delete account" },
      { status: 500 }
    );
  }
}
