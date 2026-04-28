"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Loader2, Mail, Lock, Eye, EyeOff, ArrowRight } from "lucide-react";
import { trackEvent } from "@/lib/analytics";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";

/**
 * Login Page
 *
 * Authenticates users via Supabase auth
 */
function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // Prevent open redirect attacks — only allow safe relative paths
  function getSafeRedirect(raw: string | null): string {
    if (!raw) return "/dashboard";
    // Must start with single forward slash and be a simple path
    // Block: protocol-relative (//), backslash variants (\/), external URLs
    const cleaned = raw.trim();
    if (
      !cleaned.startsWith("/") ||
      cleaned.startsWith("//") ||
      cleaned.includes("\\") ||
      cleaned.includes("://") ||
      cleaned.startsWith("/\\") ||
      /^\/[^/]*:/.test(cleaned)
    ) {
      return "/dashboard";
    }
    // Only allow paths under known safe prefixes
    const safePrefixes = ["/dashboard", "/onboarding", "/pricing", "/settings", "/chat", "/agents", "/documents", "/profile", "/check-ins", "/communities"];
    if (!safePrefixes.some(prefix => cleaned.startsWith(prefix))) {
      return "/dashboard";
    }
    return cleaned;
  }

  const redirect = getSafeRedirect(searchParams.get("redirect"));

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const errors: { email?: string; password?: string } = {};
    if (!email.trim()) errors.email = "Email is required";
    if (!password) errors.password = "Password is required";
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error("Too many login attempts. Please wait a minute before trying again.");
        }
        if (data.code === "EMAIL_NOT_CONFIRMED") {
          throw new Error("EMAIL_NOT_CONFIRMED");
        }
        // On invalid credentials, check whether this is a Firebase-migrated
        // account that hasn't reset its password yet. AI-8887: migrated users
        // were being pushed to re-register because the generic "invalid
        // credentials" error didn't tell them their account exists.
        if (data.error === "Invalid email or password") {
          try {
            const checkRes = await fetch("/api/auth/check-account", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ email: email.trim().toLowerCase() }),
            });
            if (checkRes.ok) {
              const checkData = await checkRes.json();
              if (checkData.migrated) {
                throw new Error("MIGRATED_NEEDS_RESET");
              }
              if (checkData.exists) {
                throw new Error("EXISTS_WRONG_PASSWORD");
              }
            }
          } catch (probeErr) {
            // Re-throw if we set a recognized marker; otherwise fall through
            if (probeErr instanceof Error && (probeErr.message === "MIGRATED_NEEDS_RESET" || probeErr.message === "EXISTS_WRONG_PASSWORD")) {
              throw probeErr;
            }
            // Network/parse error during probe — fall back to generic message
          }
        }
        throw new Error(data.error || "Failed to sign in");
      }

      // Success - track login and redirect
      trackEvent(ANALYTICS_EVENTS.AUTH.LOGIN, { method: "email" });
      router.push(redirect);
      router.refresh();
    } catch (err) {
      console.error("Login error:", err);
      const msg = err instanceof Error ? err.message : "Failed to sign in";
      if (msg === "EMAIL_NOT_CONFIRMED") {
        setError("EMAIL_NOT_CONFIRMED");
      } else if (msg === "MIGRATED_NEEDS_RESET") {
        setError("MIGRATED_NEEDS_RESET");
      } else if (msg === "EXISTS_WRONG_PASSWORD") {
        setError("EXISTS_WRONG_PASSWORD");
      } else if (msg === "Invalid email or password") {
        setError("Invalid email or password. Double-check your credentials or use \"Forgot password?\" below to reset.");
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 px-4">
      {/* Background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none opacity-30">
        <div className="absolute top-20 left-[10%] w-72 h-72 bg-[#ff6a1a]/20 rounded-full blur-[100px]" />
        <div className="absolute bottom-20 right-[15%] w-80 h-80 bg-orange-400/15 rounded-full blur-[120px]" />
      </div>

      <div className="relative z-10 max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Welcome back</h2>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Sign in to continue to your dashboard
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-8 border border-gray-200 dark:border-gray-800 shadow-lg">
            {error && (
              <div role="alert" className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-3 rounded-lg text-sm">
                {error === "EMAIL_NOT_CONFIRMED" ? (
                  <div className="space-y-2">
                    <p className="font-medium">Your email address hasn&apos;t been confirmed yet.</p>
                    <p>Please check your inbox (and spam/junk folder) for the confirmation email.{" "}
                      {email.trim().toLowerCase().endsWith("@saharacompanies.com") && (
                        <>For <strong>@saharacompanies.com</strong> addresses, also check your IT-managed email filters.</>
                      )}
                    </p>
                    <p>
                      Need a new confirmation?{" "}
                      <Link href="/forgot-password" className="text-[#ff6a1a] hover:underline font-medium">
                        Reset your password
                      </Link>{" "}
                      to confirm your account and set a new password.
                    </p>
                  </div>
                ) : error === "MIGRATED_NEEDS_RESET" ? (
                  <div className="space-y-2">
                    <p className="font-medium">Welcome back! We recognize your account.</p>
                    <p>
                      Your account was migrated from our previous platform. For security, you&apos;ll need to set a new password before signing in.
                    </p>
                    <Link
                      href={`/forgot-password?email=${encodeURIComponent(email.trim().toLowerCase())}`}
                      className="inline-block mt-1 px-3 py-1.5 rounded-md bg-[#ff6a1a] text-white text-sm font-medium hover:bg-[#ea580c]"
                    >
                      Set your new password
                    </Link>
                  </div>
                ) : error === "EXISTS_WRONG_PASSWORD" ? (
                  <div className="space-y-2">
                    <p className="font-medium">We found your account, but that password didn&apos;t match.</p>
                    <p>
                      Use{" "}
                      <Link href="/forgot-password" className="text-[#ff6a1a] hover:underline font-medium">
                        Forgot password?
                      </Link>{" "}
                      to reset it. <strong>No need to re-register</strong> — your account is already here.
                    </p>
                  </div>
                ) : (
                  error
                )}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                  Email address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setFieldErrors((prev) => ({ ...prev, email: undefined })); }}
                    className={`w-full pl-11 pr-4 py-3 rounded-lg border ${fieldErrors.email ? "border-red-500" : "border-gray-200 dark:border-gray-700"} bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 focus:border-[#ff6a1a] focus:ring-2 focus:ring-[#ff6a1a]/20 outline-none transition-all text-base`}
                    placeholder="you@saharacompanies.com"
                  />
                </div>
                {fieldErrors.email && (
                  <p className="mt-1 text-sm text-red-500">{fieldErrors.email}</p>
                )}
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setFieldErrors((prev) => ({ ...prev, password: undefined })); }}
                    className={`w-full pl-11 pr-11 py-3 rounded-lg border ${fieldErrors.password ? "border-red-500" : "border-gray-200 dark:border-gray-700"} bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 focus:border-[#ff6a1a] focus:ring-2 focus:ring-[#ff6a1a]/20 outline-none transition-all text-base`}
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {fieldErrors.password && (
                  <p className="mt-1 text-sm text-red-500">{fieldErrors.password}</p>
                )}
              </div>
            </div>

            <div className="flex justify-end mt-2">
              <Link
                href="/forgot-password"
                className="text-sm text-gray-500 dark:text-gray-400 hover:text-[#ff6a1a] transition-colors"
              >
                Forgot password?
              </Link>
            </div>

            <Button
              type="submit"
              disabled={loading}
              // Darker orange (#c2410c = TW orange-700) clears AA 4.5:1 with white;
              // brand #ff6a1a is only 2.86:1. Shadow keeps the brand glow.
              className="w-full mt-4 bg-[#c2410c] hover:bg-[#9a3412] text-white shadow-lg shadow-[#ff6a1a]/25 hover:shadow-[#ff6a1a]/40 transition-all disabled:opacity-50"
              size="lg"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Signing in...
                </>
              ) : (
                <>
                  Sign in
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          </div>

          {/* AI-8887: Migrated users were re-registering because this CTA
              implied they needed to. Lead with a "reset your password"
              affordance, then the new-account link, so existing users have
              a clear path back in. */}
          <div className="text-center text-sm space-y-2">
            <p className="text-gray-600 dark:text-gray-400">
              Migrated from our previous platform?{" "}
              <Link
                href="/forgot-password"
                className="font-medium text-[#9a3412] dark:text-[#ff6a1a] hover:text-[#7c2d12] dark:hover:underline"
              >
                Reset your password
              </Link>
            </p>
            <p className="text-gray-600 dark:text-gray-400">
              Don&apos;t have an account?{" "}
              <Link
                href="https://you.joinsahara.com"
                // orange-800 to clear AA against the soft cream wash. orange-700
                // (#c2410c) measured 4.36:1, just under the 4.5:1 minimum.
                className="font-medium text-[#9a3412] hover:text-[#7c2d12]"
              >
                Get started free
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
          <Loader2 className="h-8 w-8 animate-spin text-[#ff6a1a]" />
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
