import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const { name, email, stage, challenges, teammateEmails, isQuickOnboard, password, qualifying, ref } = await request.json();

    // Validate required fields - for quick onboard, only email is required
    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    // For full onboard, name is required
    if (!isQuickOnboard && stage !== "waitlist" && !name) {
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

    // Waitlist signups: no account needed, just record the interest
    if (stage === "waitlist") {
      // Look up referrer if a ref code was provided
      let referredByEmail: string | null = null;
      if (ref && typeof ref === "string" && ref.length >= 6) {
        const refClean = ref.replace(/-/g, "").slice(0, 8);
        const { data: referrer } = await supabase
          .from("contact_submissions")
          .select("email")
          .eq("source", "waitlist")
          .like("id::text", `${refClean}%`)
          .limit(1)
          .single();
        if (referrer) {
          referredByEmail = referrer.email;
        }
      }

      const qualifyingObj: Record<string, string | null> = {
        startupStage: qualifying?.startupStage || null,
        firstBusiness: qualifying?.firstBusiness || null,
        fundingInterest: qualifying?.fundingInterest || null,
        teamStatus: qualifying?.teamStatus || null,
      };
      if (referredByEmail) {
        qualifyingObj.referredBy = referredByEmail;
      }

      const qualifyingData = qualifying || referredByEmail
        ? JSON.stringify(qualifyingObj)
        : "Waitlist signup";

      const { data: inserted } = await supabase.from("contact_submissions").insert({
        name: userName,
        email: email.toLowerCase(),
        company: challenges?.[0] || null,
        message: qualifyingData,
        source: "waitlist",
      }).select("id").single();

      // Build refCode from first 8 hex chars of the new row's UUID
      const refCode = inserted
        ? inserted.id.replace(/-/g, "").slice(0, 8)
        : null;

      return NextResponse.json({
        success: true,
        refCode,
        user: {
          email: email.toLowerCase(),
          name: userName,
          stage: "waitlist",
        },
      });
    }

    // Check if user already exists
    const { data: existingUser } = await supabase
      .from("profiles")
      .select("id, email")
      .eq("email", email.toLowerCase())
      .single();

    let userId: string;

    if (existingUser) {
      // Update existing profile — requires password authentication first
      userId = existingUser.id;

      // SECURITY: Verify password before allowing profile updates on existing accounts
      if (!password) {
        return NextResponse.json(
          { error: "Password is required for existing accounts" },
          { status: 401 }
        );
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.toLowerCase(),
        password,
      });

      if (signInError) {
        console.error("[onboard] Sign in failed for existing user:", signInError.message);
        return NextResponse.json(
          { error: "Invalid password for existing account" },
          { status: 401 }
        );
      }

      // Only update profile after successful authentication
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
    } else {
      // Create new user with Supabase Auth
      // Server-side password validation
      if (!password || typeof password !== "string" || password.length < 8) {
        return NextResponse.json(
          { error: "Password must be at least 8 characters" },
          { status: 400 }
        );
      }
      if (!/[A-Z]/.test(password)) {
        return NextResponse.json(
          { error: "Password must contain at least one uppercase letter" },
          { status: 400 }
        );
      }
      if (!/[0-9]/.test(password)) {
        return NextResponse.json(
          { error: "Password must contain at least one number" },
          { status: 400 }
        );
      }
      const userPassword = password;

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
        // Retry once — profile is critical for the app to work
        const { error: retryError } = await supabase.from("profiles").upsert({
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
        if (retryError) {
          console.error("[onboard] Profile creation retry failed:", retryError);
          return NextResponse.json(
            { error: "Account created but profile setup failed. Please try logging in." },
            { status: 500 }
          );
        }
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
