import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"

/**
 * Auth callback route for Supabase PKCE flow.
 *
 * Supabase password-reset (and email-confirm) links redirect here with a
 * `code` query parameter. This route exchanges the code for a session, sets
 * the session cookies, then redirects the user to the appropriate page.
 *
 * For password reset: redirectTo includes `?next=/reset-password`
 * For email confirm: redirectTo includes `?next=/dashboard` (or omits next)
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl
  const code = searchParams.get("code")
  const next = searchParams.get("next") ?? "/dashboard"
  const type = searchParams.get("type") // Supabase includes type=recovery, type=signup, etc.

  // Determine the error redirect based on context
  const isPasswordReset = next === "/reset-password" || type === "recovery"

  if (code) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

    const redirectUrl = new URL(next, origin)
    const response = NextResponse.redirect(redirectUrl)

    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options)
          })
        },
      },
    })

    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      return response
    }

    console.error("[auth/callback] Code exchange failed:", error.message)
  }

  // If no code or exchange failed, redirect with error hint
  if (isPasswordReset) {
    const errorUrl = new URL("/forgot-password", origin)
    errorUrl.searchParams.set("error", "expired")
    return NextResponse.redirect(errorUrl)
  }

  // For non-password-reset flows (email confirm, etc.), redirect to login
  const loginUrl = new URL("/login", origin)
  loginUrl.searchParams.set("error", "auth_failed")
  return NextResponse.redirect(loginUrl)
}
