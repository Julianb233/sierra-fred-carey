import { NextRequest, NextResponse } from "next/server";
import { signUp } from "@/lib/auth";
import { checkRateLimit, createRateLimitResponse } from "@/lib/api/rate-limit";

export async function POST(request: NextRequest) {
  try {
    // Rate limit: 3 signups per minute per IP
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
      || request.headers.get("x-real-ip")
      || "unknown";
    const rateLimitResult = await checkRateLimit(`auth-signup:${ip}`, { limit: 3, windowSeconds: 60 });
    if (!rateLimitResult.success) {
      return createRateLimitResponse(rateLimitResult);
    }

    const { email, password, name } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 }
      );
    }

    const result = await signUp(email, password, name);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      user: {
        id: result.user!.id,
        email: result.user!.email,
        name: result.user!.name,
      },
    });
  } catch (error) {
    console.error("[api/auth/signup] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
