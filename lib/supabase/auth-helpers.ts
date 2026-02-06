import { createClient } from "./server";
import type { User as SupabaseUser, Session } from "@supabase/supabase-js";

/**
 * User interface matching the existing app's user model
 */
export interface User {
  id: string;
  email: string;
  name: string | null;
  stage: string | null;
  challenges: string[];
  created_at: Date;
}

/**
 * Auth result interface
 */
export interface AuthResult {
  success: boolean;
  user?: User;
  session?: Session;
  error?: string;
}

/**
 * Convert Supabase user + profile to app User
 */
export function toAppUser(
  supabaseUser: SupabaseUser,
  profile?: {
    name?: string | null;
    stage?: string | null;
    challenges?: string[];
  }
): User {
  return {
    id: supabaseUser.id,
    email: supabaseUser.email || "",
    name: profile?.name || supabaseUser.user_metadata?.name || null,
    stage: profile?.stage || supabaseUser.user_metadata?.stage || null,
    challenges: profile?.challenges || supabaseUser.user_metadata?.challenges || [],
    created_at: new Date(supabaseUser.created_at),
  };
}

/**
 * Sign up a new user with Supabase Auth
 */
export async function supabaseSignUp(
  email: string,
  password: string,
  metadata?: {
    name?: string;
    stage?: string;
    challenges?: string[];
  }
): Promise<AuthResult> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase.auth.signUp({
      email: email.toLowerCase(),
      password,
      options: {
        data: {
          name: metadata?.name || null,
          stage: metadata?.stage || null,
          challenges: metadata?.challenges || [],
        },
      },
    });

    if (error) {
      // Handle specific Supabase errors
      if (error.message.includes("already registered")) {
        return { success: false, error: "An account with this email already exists" };
      }
      return { success: false, error: error.message };
    }

    if (!data.user) {
      return { success: false, error: "Failed to create account" };
    }

    // Create or update user profile in profiles table
    await createOrUpdateProfile(data.user.id, {
      email: email.toLowerCase(),
      name: metadata?.name || null,
      stage: metadata?.stage || null,
      challenges: metadata?.challenges || [],
    });

    return {
      success: true,
      user: toAppUser(data.user, metadata),
      session: data.session || undefined,
    };
  } catch (error: unknown) {
    console.error("[supabase-auth] Sign up error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to create account" };
  }
}

/**
 * Sign in an existing user with Supabase Auth
 */
export async function supabaseSignIn(
  email: string,
  password: string
): Promise<AuthResult> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.toLowerCase(),
      password,
    });

    if (error) {
      if (error.message.includes("Invalid login credentials")) {
        return { success: false, error: "Invalid email or password" };
      }
      return { success: false, error: error.message };
    }

    if (!data.user || !data.session) {
      return { success: false, error: "Failed to sign in" };
    }

    // Fetch user profile
    const profile = await getProfile(data.user.id);

    return {
      success: true,
      user: toAppUser(data.user, profile || undefined),
      session: data.session,
    };
  } catch (error: unknown) {
    console.error("[supabase-auth] Sign in error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to sign in" };
  }
}

/**
 * Sign out the current user
 */
export async function supabaseSignOut(): Promise<void> {
  try {
    const supabase = await createClient();
    await supabase.auth.signOut();
  } catch (error) {
    console.error("[supabase-auth] Sign out error:", error);
  }
}

/**
 * Get current session from server
 */
export async function getSession(): Promise<Session | null> {
  try {
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();
    return session;
  } catch (error) {
    console.error("[supabase-auth] Get session error:", error);
    return null;
  }
}

/**
 * Get current user from session
 */
export async function getCurrentUser(): Promise<User | null> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return null;

    // Fetch user profile
    const profile = await getProfile(user.id);

    return toAppUser(user, profile || undefined);
  } catch (error) {
    console.error("[supabase-auth] Get current user error:", error);
    return null;
  }
}

/**
 * Get user ID from session
 */
export async function getUserId(): Promise<string | null> {
  const user = await getCurrentUser();
  return user?.id || null;
}

/**
 * Check if user is authenticated
 */
export async function isAuthenticated(): Promise<boolean> {
  const session = await getSession();
  return session !== null;
}

/**
 * Require authentication - throws Response if not authenticated
 */
export async function requireAuth(): Promise<string> {
  const userId = await getUserId();

  if (!userId) {
    throw new Response(
      JSON.stringify({
        success: false,
        error: "Authentication required",
        code: "AUTH_REQUIRED",
      }),
      {
        status: 401,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  return userId;
}

/**
 * Create or update user profile in profiles table
 */
async function createOrUpdateProfile(
  userId: string,
  profile: {
    email?: string;
    name?: string | null;
    stage?: string | null;
    challenges?: string[];
  }
): Promise<void> {
  try {
    const supabase = await createClient();

    const { error } = await supabase.from("profiles").upsert(
      {
        id: userId,
        email: profile.email,
        name: profile.name,
        stage: profile.stage,
        challenges: profile.challenges || [],
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    );

    if (error) {
      console.error("[supabase-auth] Profile upsert error:", error);
    }
  } catch (error) {
    console.error("[supabase-auth] Create/update profile error:", error);
  }
}

/**
 * Get user profile from profiles table
 */
async function getProfile(userId: string): Promise<{
  name: string | null;
  stage: string | null;
  challenges: string[];
} | null> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("profiles")
      .select("name, stage, challenges")
      .eq("id", userId)
      .single();

    if (error || !data) {
      return null;
    }

    return {
      name: data.name,
      stage: data.stage,
      challenges: data.challenges || [],
    };
  } catch (error) {
    console.error("[supabase-auth] Get profile error:", error);
    return null;
  }
}

/**
 * Update user profile
 */
export async function updateProfile(
  userId: string,
  updates: {
    name?: string | null;
    stage?: string | null;
    challenges?: string[];
  }
): Promise<boolean> {
  try {
    const supabase = await createClient();

    const { error } = await supabase
      .from("profiles")
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId);

    if (error) {
      console.error("[supabase-auth] Update profile error:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("[supabase-auth] Update profile error:", error);
    return false;
  }
}

/**
 * Refresh session token
 */
export async function refreshSession(): Promise<Session | null> {
  try {
    const supabase = await createClient();
    const { data: { session }, error } = await supabase.auth.refreshSession();

    if (error) {
      console.error("[supabase-auth] Refresh session error:", error);
      return null;
    }

    return session;
  } catch (error) {
    console.error("[supabase-auth] Refresh session error:", error);
    return null;
  }
}
