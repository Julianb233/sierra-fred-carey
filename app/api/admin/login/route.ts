import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";

/**
 * Constant-time string comparison to prevent timing attacks
 */
function safeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(Buffer.from(a), Buffer.from(b));
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  try {
    const { adminKey } = await request.json();

    if (!adminKey || typeof adminKey !== "string") {
      return NextResponse.json(
        { error: "Admin key is required" },
        { status: 400 }
      );
    }

    const secret = process.env.ADMIN_SECRET_KEY;

    // SECURITY: If ADMIN_SECRET_KEY is not set, deny all access
    if (!secret) {
      console.error("ADMIN_SECRET_KEY is not configured");
      return NextResponse.json(
        { error: "Admin login is not configured" },
        { status: 503 }
      );
    }

    // SECURITY: Use timing-safe comparison to prevent timing attacks
    if (!safeCompare(adminKey, secret)) {
      return NextResponse.json(
        { error: "Invalid admin key" },
        { status: 401 }
      );
    }

    // SECURITY: Store the admin key in the cookie (httpOnly + secure)
    // The cookie value is verified server-side against ADMIN_SECRET_KEY on each request
    const cookieStore = await cookies();
    cookieStore.set("adminKey", adminKey, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 60 * 60 * 24, // 24 hours
      path: "/",
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Admin login error:", error);
    return NextResponse.json(
      { error: "An error occurred" },
      { status: 500 }
    );
  }
}
