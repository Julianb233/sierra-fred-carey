import { NextRequest, NextResponse } from "next/server";

// Temporarily disabled - needs SQL refactoring
export async function GET(request: NextRequest) {
  return NextResponse.json(
    { error: "Admin training requests endpoint temporarily unavailable" },
    { status: 503 }
  );
}
