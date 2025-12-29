import { NextRequest, NextResponse } from "next/server";
import { signUp } from "@/lib/auth";

const COOKIE_NAME = "sahara_auth";

export async function POST(request: NextRequest) {
  try {
    const { email, password, name, stage, challenges } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters" },
        { status: 400 }
      );
    }

    const result = await signUp(email, password, name, stage, challenges);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    const response = NextResponse.json({
      success: true,
      user: {
        id: result.user!.id,
        email: result.user!.email,
        name: result.user!.name,
      },
    });

    // Set auth cookie
    if (result.token) {
      response.cookies.set(COOKIE_NAME, result.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 60 * 60 * 24 * 7, // 7 days
        path: "/",
      });
    }

    return response;
  } catch (error: any) {
    console.error("[api/auth/signup] Error:", error);
    return NextResponse.json(
      { error: error?.message || "Internal server error", details: error?.toString() },
      { status: 500 }
    );
  }
}
