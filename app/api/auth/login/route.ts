import { NextRequest, NextResponse } from "next/server";
import { signIn } from "@/lib/auth";
import { checkRateLimit, createRateLimitResponse } from "@/lib/api/rate-limit";

export async function POST(request: NextRequest) {
  try {
    // Rate limit: 5 login attempts per minute per IP
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
      || request.headers.get("x-real-ip")
      || "unknown";
    const rateLimitResult = await checkRateLimit(`auth-login:${ip}`, { limit: 5, windowSeconds: 60 });
    if (!rateLimitResult.success) {
      return createRateLimitResponse(rateLimitResult);
    }

    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    const result = await signIn(email, password);

    if (!result.success) {
      const status = result.error === "EMAIL_NOT_CONFIRMED" ? 403 : 401;
      return NextResponse.json(
        { error: result.error, code: result.error === "EMAIL_NOT_CONFIRMED" ? "EMAIL_NOT_CONFIRMED" : undefined },
        { status }
      );
    }

    // Supabase handles session cookies automatically
    // Just return success response
    return NextResponse.json({
      success: true,
      user: {
        id: result.user!.id,
        email: result.user!.email,
        name: result.user!.name,
      },
    });
  } catch (error) {
    console.error("[api/auth/login] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
