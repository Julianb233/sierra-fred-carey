/**
 * Red Flags API - Update & Delete
 *
 * PATCH  /api/red-flags/[id]  — Update red flag status
 * DELETE /api/red-flags/[id]  — Delete a red flag
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { updateRedFlag, deleteRedFlag } from "@/lib/db/red-flags";
import type { FlagStatus } from "@/lib/fred/types";

const VALID_STATUSES: FlagStatus[] = ["active", "acknowledged", "resolved", "dismissed"];

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await requireAuth();
    const { id } = await params;

    const body = await req.json();
    const { status } = body;

    if (!status || !VALID_STATUSES.includes(status)) {
      return NextResponse.json(
        { success: false, error: `status is required and must be one of: ${VALID_STATUSES.join(", ")}` },
        { status: 400 }
      );
    }

    const updates: { status: FlagStatus; resolvedAt?: string } = { status };
    if (status === "resolved") {
      updates.resolvedAt = new Date().toISOString();
    }

    const flag = await updateRedFlag(id, userId, updates);
    return NextResponse.json({ success: true, data: flag });
  } catch (error) {
    if (error instanceof Response) return error;
    const message = error instanceof Error ? error.message : "Internal server error";
    if (message.includes("not found") || message.includes("no rows")) {
      return NextResponse.json({ success: false, error: "Red flag not found" }, { status: 404 });
    }
    console.error("[RedFlagsAPI] PATCH error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await requireAuth();
    const { id } = await params;

    await deleteRedFlag(id, userId);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if (error instanceof Response) return error;
    const message = error instanceof Error ? error.message : "Internal server error";
    if (message.includes("not found") || message.includes("no rows")) {
      return NextResponse.json({ success: false, error: "Red flag not found" }, { status: 404 });
    }
    console.error("[RedFlagsAPI] DELETE error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
