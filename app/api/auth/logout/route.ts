import { NextResponse } from "next/server";
import { signOut } from "@/lib/auth";

export async function POST() {
  try {
    await signOut();
    return NextResponse.json({
      success: true,
      clearStorage: ["sahara-onboarding", "startup_process"],
    });
  } catch (error) {
    console.error("[api/auth/logout] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    await signOut();
    return NextResponse.redirect(new URL("/", process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"));
  } catch (error) {
    console.error("[api/auth/logout] Error:", error);
    return NextResponse.redirect(new URL("/", process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"));
  }
}
