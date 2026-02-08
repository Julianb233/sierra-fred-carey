/**
 * Push Subscription API
 *
 * Manages browser push notification subscriptions.
 *
 * Routes:
 * POST   /api/push/subscribe - Register a push subscription
 * DELETE /api/push/subscribe - Unregister a push subscription
 * GET    /api/push/subscribe - Check if user has active subscriptions
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";

/**
 * POST /api/push/subscribe
 * Register a new push subscription for the authenticated user.
 */
export async function POST(request: NextRequest) {
  try {
    const userId = await requireAuth();
    const body = await request.json();

    const { endpoint, keys, userAgent } = body;

    if (!endpoint || typeof endpoint !== "string") {
      return NextResponse.json(
        { success: false, error: "endpoint is required" },
        { status: 400 },
      );
    }

    if (!keys?.p256dh || !keys?.auth) {
      return NextResponse.json(
        { success: false, error: "keys.p256dh and keys.auth are required" },
        { status: 400 },
      );
    }

    const supabase = await createClient();

    // Upsert: if the endpoint already exists, update the keys
    const { data, error } = await supabase
      .from("push_subscriptions")
      .upsert(
        {
          user_id: userId,
          endpoint,
          p256dh_key: keys.p256dh,
          auth_key: keys.auth,
          user_agent: userAgent || null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "endpoint" },
      )
      .select("id, endpoint, created_at")
      .single();

    if (error) {
      logger.error("[push/subscribe] Failed to save subscription", error);
      return NextResponse.json(
        { success: false, error: "Failed to save subscription" },
        { status: 500 },
      );
    }

    logger.info("[push/subscribe] Subscription registered", {
      userId,
      subscriptionId: data.id,
    });

    return NextResponse.json({
      success: true,
      data: {
        id: data.id,
        endpoint: data.endpoint,
        createdAt: data.created_at,
      },
    });
  } catch (error: unknown) {
    if (
      error instanceof Response ||
      (error && typeof error === "object" && "status" in error && "json" in error)
    ) {
      return error as Response;
    }
    logger.error("[push/subscribe POST]", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/push/subscribe
 * Unregister a push subscription by endpoint.
 */
export async function DELETE(request: NextRequest) {
  try {
    const userId = await requireAuth();
    const { searchParams } = new URL(request.url);
    const endpoint = searchParams.get("endpoint");

    if (!endpoint) {
      return NextResponse.json(
        { success: false, error: "endpoint query parameter is required" },
        { status: 400 },
      );
    }

    const supabase = await createClient();

    const { data, error } = await supabase
      .from("push_subscriptions")
      .delete()
      .eq("user_id", userId)
      .eq("endpoint", endpoint)
      .select("id")
      .single();

    if (error) {
      // .single() errors when no rows match — treat as 404
      if (error.code === "PGRST116") {
        return NextResponse.json(
          { success: false, error: "Subscription not found" },
          { status: 404 },
        );
      }
      logger.error("[push/subscribe DELETE]", error);
      return NextResponse.json(
        { success: false, error: "Failed to delete subscription" },
        { status: 500 },
      );
    }

    logger.info("[push/subscribe] Subscription removed", {
      userId,
      subscriptionId: data.id,
    });

    return NextResponse.json({
      success: true,
      data: { deleted: true },
    });
  } catch (error: unknown) {
    if (
      error instanceof Response ||
      (error && typeof error === "object" && "status" in error && "json" in error)
    ) {
      return error as Response;
    }
    logger.error("[push/subscribe DELETE]", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * GET /api/push/subscribe
 * Check if the authenticated user has any active push subscriptions.
 */
export async function GET() {
  try {
    const userId = await requireAuth();

    const supabase = await createClient();

    const { data, error, count } = await supabase
      .from("push_subscriptions")
      .select("id, endpoint, user_agent, created_at", { count: "exact" })
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      logger.error("[push/subscribe GET]", error);
      return NextResponse.json(
        { success: false, error: "Failed to fetch subscriptions" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        subscriptions: (data || []).map((sub: { id: string; endpoint: string; user_agent: string | null; created_at: string }) => ({
          id: sub.id,
          endpoint: sub.endpoint,
          userAgent: sub.user_agent,
          createdAt: sub.created_at,
        })),
        count: count ?? data?.length ?? 0,
        isSubscribed: (count ?? data?.length ?? 0) > 0,
      },
    });
  } catch (error: unknown) {
    if (
      error instanceof Response ||
      (error && typeof error === "object" && "status" in error && "json" in error)
    ) {
      return error as Response;
    }
    logger.error("[push/subscribe GET]", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
