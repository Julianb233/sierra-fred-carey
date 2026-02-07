import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { checkRateLimit, createRateLimitResponse } from "@/lib/api/rate-limit";
import { createAdminSession } from "@/lib/auth/admin-sessions";

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
    // Rate limit: 3 admin login attempts per minute per IP (stricter than user login)
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
      || request.headers.get("x-real-ip")
      || "unknown";
    const rateLimitResult = await checkRateLimit(`admin-login:${ip}`, { limit: 3, windowSeconds: 60 });
    if (!rateLimitResult.success) {
      return createRateLimitResponse(rateLimitResult);
    }

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

    // SECURITY: Create a session token instead of storing the raw admin key
    // The session token is a random UUID that maps to an in-memory session
    const sessionToken = createAdminSession();
    const cookieStore = await cookies();
    cookieStore.set("adminSession", sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 86400, // 24 hours
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
