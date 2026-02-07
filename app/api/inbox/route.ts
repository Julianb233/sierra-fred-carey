/**
 * Inbox API Route
 * Phase 19: Inbox Ops Agent
 *
 * GET /api/inbox — returns paginated, filterable inbox messages
 * for the authenticated user with count metadata.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { aggregateInboxMessages, getInboxCount } from "@/lib/inbox/aggregator";
import type { InboxFilters, MessageSource, MessagePriority, MessageStatus } from "@/lib/inbox/types";

const VALID_SOURCES: MessageSource[] = ["founder-ops", "fundraising", "growth", "system"];
const VALID_PRIORITIES: MessagePriority[] = ["urgent", "high", "normal", "low"];
const VALID_STATUSES: MessageStatus[] = ["unread", "read", "actioned", "dismissed"];

export async function GET(request: NextRequest) {
  try {
    const userId = await requireAuth();

    // Parse query params
    const { searchParams } = request.nextUrl;
    const filters: InboxFilters = {};

    const source = searchParams.get("source");
    if (source && VALID_SOURCES.includes(source as MessageSource)) {
      filters.source = source as MessageSource;
    }

    const priority = searchParams.get("priority");
    if (priority && VALID_PRIORITIES.includes(priority as MessagePriority)) {
      filters.priority = priority as MessagePriority;
    }

    const status = searchParams.get("status");
    if (status && VALID_STATUSES.includes(status as MessageStatus)) {
      filters.status = status as MessageStatus;
    }

    const limit = searchParams.get("limit");
    if (limit) {
      const parsed = parseInt(limit, 10);
      if (!isNaN(parsed) && parsed > 0 && parsed <= 100) {
        filters.limit = parsed;
      }
    }

    const offset = searchParams.get("offset");
    if (offset) {
      const parsed = parseInt(offset, 10);
      if (!isNaN(parsed) && parsed >= 0) {
        filters.offset = parsed;
      }
    }

    // Fetch messages and counts in parallel
    const [messages, meta] = await Promise.all([
      aggregateInboxMessages(userId, filters),
      getInboxCount(userId),
    ]);

    return NextResponse.json({
      success: true,
      messages,
      meta,
    });
  } catch (error) {
    // requireAuth throws a Response for 401
    if (error instanceof Response) {
      return error;
    }

    console.error("[Inbox API] Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch inbox messages" },
      { status: 500 }
    );
  }
}
