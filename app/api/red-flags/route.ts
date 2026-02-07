/**
 * Red Flags API - List & Create
 *
 * GET  /api/red-flags?status=active  — List red flags for authenticated user
 * POST /api/red-flags                — Create a new red flag
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getRedFlags, createRedFlag } from "@/lib/db/red-flags";
import type { FlagStatus, RedFlagCategory, Severity } from "@/lib/fred/types";

const VALID_STATUSES: FlagStatus[] = ["active", "acknowledged", "resolved", "dismissed"];
const VALID_CATEGORIES: RedFlagCategory[] = ["market", "financial", "team", "product", "legal", "competitive"];
const VALID_SEVERITIES: Severity[] = ["low", "medium", "high", "critical"];

export async function GET(req: NextRequest) {
  try {
    const userId = await requireAuth();

    const statusParam = req.nextUrl.searchParams.get("status");
    const status = statusParam && VALID_STATUSES.includes(statusParam as FlagStatus)
      ? (statusParam as FlagStatus)
      : undefined;

    const flags = await getRedFlags(userId, status);
    return NextResponse.json({ success: true, data: flags });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("[RedFlagsAPI] GET error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await requireAuth();

    const body = await req.json();
    const { category, severity, title, description, sourceMessageId } = body;

    // Validate required fields
    if (!category || !severity || !title || !description) {
      return NextResponse.json(
        { success: false, error: "category, severity, title, and description are required" },
        { status: 400 }
      );
    }

    if (!VALID_CATEGORIES.includes(category)) {
      return NextResponse.json(
        { success: false, error: `Invalid category. Must be one of: ${VALID_CATEGORIES.join(", ")}` },
        { status: 400 }
      );
    }

    if (!VALID_SEVERITIES.includes(severity)) {
      return NextResponse.json(
        { success: false, error: `Invalid severity. Must be one of: ${VALID_SEVERITIES.join(", ")}` },
        { status: 400 }
      );
    }

    const flag = await createRedFlag({
      userId,
      category,
      severity,
      title,
      description,
      status: "active",
      sourceMessageId: sourceMessageId ?? undefined,
    });

    return NextResponse.json({ success: true, data: flag }, { status: 201 });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("[RedFlagsAPI] POST error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
