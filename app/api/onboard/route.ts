import { sql } from "@/lib/db/neon";
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { signJWT } from "@/lib/auth/token";

export async function POST(request: NextRequest) {
  try {
    const { name, email, stage, challenges, teammateEmails, isQuickOnboard } = await request.json();

    // Validate required fields - for quick onboard, only email is required
    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    // For full onboard, name is required
    if (!isQuickOnboard && !name) {
      return NextResponse.json(
        { error: "Name is required" },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      );
    }

    // For quick onboard, derive name from email
    const userName = name || email.split("@")[0].replace(/[._-]/g, " ").replace(/\b\w/g, (l: string) => l.toUpperCase());

    // Create or update user in database
    const result = await sql`
      INSERT INTO users (name, email, stage, challenges, teammate_emails, onboarding_completed, created_at)
      VALUES (${userName}, ${email}, ${stage}, ${JSON.stringify(challenges || [])}, ${JSON.stringify(teammateEmails || [])}, true, NOW())
      ON CONFLICT (email) DO UPDATE SET
        name = COALESCE(NULLIF(${userName}, ''), users.name),
        stage = COALESCE(${stage}, users.stage),
        challenges = COALESCE(${JSON.stringify(challenges || [])}, users.challenges),
        teammate_emails = COALESCE(${JSON.stringify(teammateEmails || [])}, users.teammate_emails),
        onboarding_completed = true,
        updated_at = NOW()
      RETURNING id, email, name, stage, challenges
    `;

    const user = result[0];

    // Create session token for the user
    const token = await signJWT({
      userId: user.id,
      email: user.email,
    });

    // Set the auth cookie
    const cookieStore = await cookies();
    cookieStore.set("auth_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: "/",
    });

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        stage: user.stage,
        challenges: user.challenges,
      },
    });
  } catch (error) {
    console.error("Onboarding error:", error);

    // Check if it's a database connection error
    if (error instanceof Error && error.message.includes("DATABASE_URL")) {
      return NextResponse.json(
        { error: "Database configuration error" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: "Failed to create account. Please try again." },
      { status: 500 }
    );
  }
}
