import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const { name, email, stage, challenges, teammateEmails, isQuickOnboard, password } = await request.json();

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

    const supabase = await createClient();

    // Check if user already exists
    const { data: existingUser } = await supabase
      .from("profiles")
      .select("id, email")
      .eq("email", email.toLowerCase())
      .single();

    let userId: string;

    if (existingUser) {
      // Update existing profile
      userId = existingUser.id;

      await supabase
        .from("profiles")
        .update({
          name: userName,
          stage: stage || null,
          challenges: challenges || [],
          teammate_emails: teammateEmails || [],
          onboarding_completed: true,
          updated_at: new Date().toISOString(),
        })
        .eq("id", userId);

      // Try to sign in the user (if they have a password set)
      if (password) {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: email.toLowerCase(),
          password,
        });

        if (signInError) {
          console.error("[onboard] Sign in failed for existing user:", signInError.message);
        }
      }
    } else {
      // Create new user with Supabase Auth
      // Generate a random password if not provided (user can set it later)
      const userPassword = password || crypto.randomUUID();

      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: email.toLowerCase(),
        password: userPassword,
        options: {
          data: {
            name: userName,
            stage: stage || null,
            challenges: challenges || [],
          },
        },
      });

      if (signUpError) {
        console.error("[onboard] Supabase auth signup error:", signUpError);
        return NextResponse.json(
          { error: signUpError.message || "Failed to create account" },
          { status: 400 }
        );
      }

      if (!authData.user) {
        return NextResponse.json(
          { error: "Failed to create user account" },
          { status: 500 }
        );
      }

      userId = authData.user.id;

      // Create profile record
      const { error: profileError } = await supabase.from("profiles").upsert({
        id: userId,
        email: email.toLowerCase(),
        name: userName,
        stage: stage || null,
        challenges: challenges || [],
        teammate_emails: teammateEmails || [],
        onboarding_completed: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      if (profileError) {
        console.error("[onboard] Profile creation error:", profileError);
        // Don't fail - auth user was created
      }
    }

    // Get user profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, email, name, stage, challenges")
      .eq("id", userId)
      .single();

    return NextResponse.json({
      success: true,
      user: profile || {
        id: userId,
        email: email.toLowerCase(),
        name: userName,
        stage: stage || null,
        challenges: challenges || [],
      },
    });
  } catch (error) {
    console.error("[onboard] Error:", error);

    return NextResponse.json(
      { error: "Failed to create account. Please try again." },
      { status: 500 }
    );
  }
}
