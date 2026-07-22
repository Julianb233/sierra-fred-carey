/**
 * In-App Notifications API
 * AI-7368: in-app notification fallback channel for milestone reminders
 *
 * GET   /api/notifications/in-app            → list current user's notifications
 *        ?unread=1   only unread
 *        ?limit=N    cap (default 30, max 100)
 * PATCH /api/notifications/in-app            → mark read
 *        body: { id: "<uuid>" }  or  { all: true }
 *
 * Auth: server-side session (userId never trusted from the client). RLS is
 * additionally enforced by the user-scoped Supabase client.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  getInAppNotifications,
  getUnreadInAppCount,
  markInAppNotificationRead,
  markAllInAppNotificationsRead,
} from "@/lib/db/in-app-notifications";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  let userId: string;
  try {
    userId = await requireAuth();
  } catch (resp) {
    if (resp instanceof NextResponse) return resp;
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const unreadOnly = searchParams.get("unread") === "1";
    const limit = Math.min(
      Math.max(parseInt(searchParams.get("limit") || "30", 10) || 30, 1),
      100
    );

    const [notifications, unreadCount] = await Promise.all([
      getInAppNotifications(supabase, userId, { unreadOnly, limit }),
      getUnreadInAppCount(supabase, userId),
    ]);

    return NextResponse.json({ success: true, notifications, unreadCount });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[API: in-app notifications] GET error:", msg);
    return NextResponse.json(
      { error: "Failed to load notifications" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  let userId: string;
  try {
    userId = await requireAuth();
  } catch (resp) {
    if (resp instanceof NextResponse) return resp;
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = await createClient();
    const body = (await request.json().catch(() => ({}))) as {
      id?: string;
      all?: boolean;
    };

    if (body.all) {
      const updated = await markAllInAppNotificationsRead(supabase, userId);
      return NextResponse.json({ success: true, updated });
    }

    if (!body.id || typeof body.id !== "string") {
      return NextResponse.json(
        { error: "Provide { id } or { all: true }" },
        { status: 400 }
      );
    }

    await markInAppNotificationRead(supabase, userId, body.id);
    return NextResponse.json({ success: true, updated: 1 });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[API: in-app notifications] PATCH error:", msg);
    return NextResponse.json(
      { error: "Failed to update notification" },
      { status: 500 }
    );
  }
}
