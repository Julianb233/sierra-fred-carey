"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Loader2, Lock, CheckCircle2, AlertCircle, Check, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

/** Password must match signup requirements */
const PASSWORD_RULES = [
  { label: "At least 8 characters", test: (p: string) => p.length >= 8 },
  { label: "One uppercase letter", test: (p: string) => /[A-Z]/.test(p) },
  { label: "One number", test: (p: string) => /\d/.test(p) },
];

/** Time in ms to wait before showing the expired link message */
const SESSION_VERIFY_TIMEOUT_MS = 15_000;

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [linkExpired, setLinkExpired] = useState(false);

  const allRulesPass = PASSWORD_RULES.every((r) => r.test(password));

  // Supabase handles the token exchange automatically via the URL hash
  useEffect(() => {
    const supabase = createClient();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setSessionReady(true);
      }
    });

    // Also check if we already have a session (user clicked link while logged in)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setSessionReady(true);
      }
    });

    // Timeout: if session doesn't resolve, the link is likely expired or invalid
    const timeout = setTimeout(() => {
      setLinkExpired(true);
    }, SESSION_VERIFY_TIMEOUT_MS);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);

      if (!allRulesPass) {
        setError("Password does not meet all requirements.");
        return;
      }

      if (password !== confirmPassword) {
        setError("Passwords do not match.");
        return;
      }

      setLoading(true);

      try {
        const supabase = createClient();
        const { error: updateError } = await supabase.auth.updateUser({
          password,
        });

        if (updateError) {
          if (updateError.message.includes("same password") || updateError.message.includes("should be different")) {
            throw new Error("New password must be different from your current password.");
          }
          if (updateError.message.includes("session") || updateError.message.includes("expired")) {
            throw new Error("Your reset link has expired. Please request a new one.");
          }
          throw updateError;
        }

        setSuccess(true);
        setTimeout(() => {
          router.push("/dashboard");
        }, 3000);
      } catch (err) {
        console.error("Password update error:", err);
        setError(
          err instanceof Error
            ? err.message
            : "Failed to update password. Your reset link may have expired."
        );
      } finally {
        setLoading(false);
      }
    },
    [password, confirmPassword, allRulesPass, router]
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 px-4">
      {/* Background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none opacity-30">
        <div className="absolute top-20 left-[10%] w-72 h-72 bg-[#ff6a1a]/20 rounded-full blur-[100px]" />
        <div className="absolute bottom-20 right-[15%] w-80 h-80 bg-orange-400/15 rounded-full blur-[120px]" />
      </div>

      <div className="relative z-10 max-w-md w-full space-y-8">
        <div className="text-center">
          <Image
            src="/sahara-logo.svg"
            alt="Sahara"
            width={180}
            height={40}
            className="mx-auto mb-6"
            priority
          />
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
            Set new password
          </h2>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            {success
              ? "Your password has been updated"
              : "Choose a new password for your account"}
          </p>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-2xl p-8 border border-gray-200 dark:border-gray-800 shadow-lg">
          {success ? (
            <div className="text-center space-y-4">
              <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto" />
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Your password has been updated successfully. Redirecting to
                dashboard...
              </p>
            </div>
          ) : !sessionReady ? (
            <div className="text-center space-y-4">
              {linkExpired ? (
                <>
                  <AlertCircle className="h-10 w-10 text-amber-500 mx-auto" />
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    This reset link appears to be expired or invalid.
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Password reset links expire after a short time for security.
                    Please request a new one.
                  </p>
                  <Button
                    asChild
                    className="w-full bg-[#ff6a1a] hover:bg-[#ea580c] text-white"
                  >
                    <Link href="/forgot-password">Request a new reset link</Link>
                  </Button>
                </>
              ) : (
                <>
                  <Loader2 className="h-8 w-8 animate-spin text-[#ff6a1a] mx-auto" />
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Verifying your reset link...
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500">
                    If this takes too long, your link may have expired.{" "}
                    <Link
                      href="/forgot-password"
                      className="text-[#ff6a1a] hover:underline"
                    >
                      Request a new one
                    </Link>
                  </p>
                </>
              )}
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div
                  role="alert"
                  className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-3 rounded-lg text-sm"
                >
                  {error}
                </div>
              )}

              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300"
                >
                  New password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="new-password"
                    required
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 focus:border-[#ff6a1a] focus:ring-2 focus:ring-[#ff6a1a]/20 outline-none transition-all text-base"
                    placeholder="New password"
                  />
                </div>
                {/* Live password requirements checklist */}
                {password.length > 0 && (
                  <ul className="mt-2 space-y-1">
                    {PASSWORD_RULES.map((rule) => {
                      const passes = rule.test(password);
                      return (
                        <li
                          key={rule.label}
                          className={`flex items-center gap-1.5 text-xs ${
                            passes
                              ? "text-green-600 dark:text-green-400"
                              : "text-gray-400 dark:text-gray-500"
                          }`}
                        >
                          {passes ? (
                            <Check className="w-3.5 h-3.5" />
                          ) : (
                            <X className="w-3.5 h-3.5" />
                          )}
                          {rule.label}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>

              <div>
                <label
                  htmlFor="confirm-password"
                  className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300"
                >
                  Confirm new password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    id="confirm-password"
                    name="confirm-password"
                    type="password"
                    autoComplete="new-password"
                    required
                    minLength={8}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className={`w-full pl-11 pr-4 py-3 rounded-lg border bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 focus:ring-2 outline-none transition-all text-base ${
                      confirmPassword.length > 0 && password !== confirmPassword
                        ? "border-red-300 dark:border-red-700 focus:border-red-400 focus:ring-red-200/30"
                        : "border-gray-200 dark:border-gray-700 focus:border-[#ff6a1a] focus:ring-[#ff6a1a]/20"
                    }`}
                    placeholder="Confirm new password"
                  />
                </div>
                {confirmPassword.length > 0 && password !== confirmPassword && (
                  <p className="mt-1 text-xs text-red-500 dark:text-red-400">
                    Passwords do not match.
                  </p>
                )}
              </div>

              <Button
                type="submit"
                disabled={loading || !allRulesPass || password !== confirmPassword}
                className="w-full bg-[#ff6a1a] hover:bg-[#ea580c] text-white shadow-lg shadow-[#ff6a1a]/25 hover:shadow-[#ff6a1a]/40 transition-all disabled:opacity-50"
                size="lg"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Updating...
                  </>
                ) : (
                  "Update password"
                )}
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
