import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"

/**
 * Auth callback route for Supabase PKCE flow.
 *
 * Supabase password-reset (and email-confirm) links redirect here with a
 * `code` query parameter. This route exchanges the code for a session, sets
 * the session cookies, then redirects the user to the appropriate page.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl
  const code = searchParams.get("code")
  const next = searchParams.get("next") ?? "/reset-password"

  if (code) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

    const response = NextResponse.redirect(new URL(next, origin))

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

    // Provide specific error hints based on failure type
    const errorUrl = new URL("/forgot-password", origin)
    if (error.message.includes("already used") || error.message.includes("consumed")) {
      errorUrl.searchParams.set("error", "used")
    } else {
      errorUrl.searchParams.set("error", "expired")
    }
    return NextResponse.redirect(errorUrl)
  }

  // No `code` param. This happens when Supabase is configured for the
  // implicit flow (legacy default) and delivers the session as a URL
  // fragment (#access_token=...&refresh_token=...). Fragments are not
  // sent to the server, so we redirect to `next` and let the browser
  // carry the fragment over; the client-side Supabase SDK on the
  // destination page picks it up via `detectSessionInUrl`.
  return NextResponse.redirect(new URL(next, origin))
}
