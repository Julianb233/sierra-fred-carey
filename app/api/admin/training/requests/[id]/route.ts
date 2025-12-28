import { NextRequest, NextResponse } from "next/server";

// Temporarily disabled - needs SQL refactoring
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return NextResponse.json(
    { error: "Admin training request detail endpoint temporarily unavailable" },
    { status: 503 }
  );
}
