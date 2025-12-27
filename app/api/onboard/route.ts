import { sql } from "@/lib/db/neon";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { name, email, stage, challenges } = await request.json();

    // Validate required fields
    if (!name || !email) {
      return NextResponse.json(
        { error: "Name and email are required" },
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

    // Create or update user in database
    const result = await sql`
      INSERT INTO users (name, email, stage, challenges, created_at)
      VALUES (${name}, ${email}, ${stage}, ${JSON.stringify(challenges)}, NOW())
      ON CONFLICT (email) DO UPDATE SET
        name = ${name},
        stage = ${stage},
        challenges = ${JSON.stringify(challenges)},
        updated_at = NOW()
      RETURNING id, email, name
    `;

    const user = result[0];

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
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
