import { NextRequest, NextResponse } from "next/server";

// Temporarily disabled - needs SQL refactoring
export async function GET(request: NextRequest) {
  return NextResponse.json(
    { error: "Journey insights endpoint temporarily unavailable" },
    { status: 503 }
  );
}

export async function POST(request: NextRequest) {
  return NextResponse.json(
    { error: "Journey insights endpoint temporarily unavailable" },
    { status: 503 }
  );
}

export async function PATCH(request: NextRequest) {
  return NextResponse.json(
    { error: "Journey insights endpoint temporarily unavailable" },
    { status: 503 }
  );
}
