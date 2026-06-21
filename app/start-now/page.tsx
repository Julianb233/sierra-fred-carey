"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  Phone,
  ShieldCheck,
  User,
  Zap,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import { trackEvent } from "@/lib/analytics";

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function StartNowForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [name, setName] = useState(() => searchParams.get("name") || "");
  const [email, setEmail] = useState(() => searchParams.get("email") || "");
  const [phone, setPhone] = useState(() => searchParams.get("phone") || "");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setName(searchParams.get("name") || "");
    setEmail(searchParams.get("email") || "");
    setPhone(searchParams.get("phone") || "");
  }, [searchParams]);

  const submit = async () => {
    setError(null);

    if (!name.trim()) {
      setError("Please enter your name");
      return;
    }

    if (!isValidEmail(email.trim())) {
      setError("Please enter a valid email");
      return;
    }

    if (!phone.trim()) {
      setError("Please enter your phone number");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    if (!/[A-Z]/.test(password)) {
      setError("Password must contain at least one uppercase letter");
      return;
    }

    if (!/[0-9]/.test(password)) {
      setError("Password must contain at least one number");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/onboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          phone: phone.trim(),
          password,
          challenges: [],
          isQuickOnboard: true,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Something went wrong");
      }

      trackEvent(ANALYTICS_EVENTS.AUTH.SIGNUP, { method: "email" });
      router.push("/welcome");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setIsSubmitting(false);
    }
  };

  return (
    <form
      className="rounded-[2rem] border border-white/10 bg-white p-5 shadow-2xl shadow-black/30 dark:bg-gray-950/90"
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
    >
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-normal text-[#c2410c] dark:text-[#ff9a5b]">
            Founder access
          </p>
          <h1 className="mt-2 text-3xl font-black leading-tight text-gray-950 dark:text-white">
            Create your Sahara account
          </h1>
        </div>
        <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-[#ff6a1a] text-white">
          <Zap className="size-5" aria-hidden="true" />
        </div>
      </div>

      <p className="mt-3 text-sm font-semibold leading-6 text-gray-600 dark:text-gray-300">
        Founder details are prefilled when available. Add a password and start free.
      </p>

      <div className="mt-5 grid gap-3">
        <label className="flex min-h-14 items-center gap-3 rounded-2xl border border-gray-200 bg-gray-50 px-4 focus-within:border-[#ff6a1a] dark:border-white/10 dark:bg-white/[0.06]">
          <User className="size-5 shrink-0 text-[#ff6a1a]" aria-hidden="true" />
          <span className="sr-only">Full name</span>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            autoComplete="name"
            placeholder="Full name"
            className="min-w-0 flex-1 bg-transparent text-base font-semibold text-gray-950 outline-none placeholder:text-gray-400 dark:text-white"
          />
        </label>

        <label className="flex min-h-14 items-center gap-3 rounded-2xl border border-gray-200 bg-gray-50 px-4 focus-within:border-[#ff6a1a] dark:border-white/10 dark:bg-white/[0.06]">
          <Mail className="size-5 shrink-0 text-[#ff6a1a]" aria-hidden="true" />
          <span className="sr-only">Email address</span>
          <input
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            type="email"
            autoComplete="email"
            placeholder="Email address"
            className="min-w-0 flex-1 bg-transparent text-base font-semibold text-gray-950 outline-none placeholder:text-gray-400 dark:text-white"
          />
        </label>

        <label className="flex min-h-14 items-center gap-3 rounded-2xl border border-gray-200 bg-gray-50 px-4 focus-within:border-[#ff6a1a] dark:border-white/10 dark:bg-white/[0.06]">
          <Phone className="size-5 shrink-0 text-[#ff6a1a]" aria-hidden="true" />
          <span className="sr-only">Phone number</span>
          <input
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            type="tel"
            autoComplete="tel"
            placeholder="Phone number"
            className="min-w-0 flex-1 bg-transparent text-base font-semibold text-gray-950 outline-none placeholder:text-gray-400 dark:text-white"
          />
        </label>

        <label className="flex min-h-14 items-center gap-3 rounded-2xl border border-gray-200 bg-gray-50 px-4 focus-within:border-[#ff6a1a] dark:border-white/10 dark:bg-white/[0.06]">
          <Lock className="size-5 shrink-0 text-[#ff6a1a]" aria-hidden="true" />
          <span className="sr-only">Password</span>
          <input
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            placeholder="Create a password"
            className="min-w-0 flex-1 bg-transparent text-base font-semibold text-gray-950 outline-none placeholder:text-gray-400 dark:text-white"
          />
          <button
            type="button"
            onClick={() => setShowPassword((value) => !value)}
            className="text-gray-400 transition hover:text-gray-700 dark:hover:text-gray-200"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
          </button>
        </label>
      </div>

      <div className="mt-3 grid gap-1 text-xs font-semibold">
        <p className={password.length >= 8 ? "text-green-600" : "text-gray-400"}>
          {password.length >= 8 ? "Pass" : "Need"} at least 8 characters
        </p>
        <p className={/[A-Z]/.test(password) ? "text-green-600" : "text-gray-400"}>
          {/[A-Z]/.test(password) ? "Pass" : "Need"} one uppercase letter
        </p>
        <p className={/[0-9]/.test(password) ? "text-green-600" : "text-gray-400"}>
          {/[0-9]/.test(password) ? "Pass" : "Need"} one number
        </p>
      </div>

      {error && <p className="mt-3 text-sm font-semibold text-red-500">{error}</p>}

      <Button
        type="submit"
        variant="orange"
        size="lg"
        disabled={isSubmitting}
        className="mt-4 h-auto min-h-14 w-full rounded-full px-5 py-4 text-sm font-black uppercase tracking-normal shadow-lg shadow-[#ff6a1a]/25"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="size-5 animate-spin" aria-hidden="true" />
            Creating
          </>
        ) : (
          <>
            Start Free
            <ArrowRight className="size-5" aria-hidden="true" />
          </>
        )}
      </Button>

      <div className="mt-4 flex items-start gap-2 rounded-2xl bg-[#ff6a1a]/10 p-3 text-sm font-semibold leading-6 text-gray-700 dark:text-gray-200">
        <ShieldCheck className="mt-0.5 size-4 shrink-0 text-[#ff6a1a]" aria-hidden="true" />
        <span>No credit card required. Tour and Fred intake happen after account creation.</span>
      </div>
    </form>
  );
}

function StartNowFallback() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-white px-5 dark:bg-gray-950">
      <div className="flex items-center gap-3 text-[#ff6a1a]">
        <Loader2 className="size-5 animate-spin" aria-hidden="true" />
        <span className="text-sm font-black">Loading Sahara...</span>
      </div>
    </main>
  );
}

export default function StartNowPage() {
  return (
    <main className="min-h-dvh bg-white text-gray-950 dark:bg-gray-950 dark:text-white">
      <section className="relative overflow-hidden bg-gradient-to-br from-white via-gray-50 to-gray-100 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
        <div className="pointer-events-none absolute -left-24 top-20 size-80 rounded-full bg-[#ff6a1a]/15 blur-[110px]" />
        <div className="pointer-events-none absolute bottom-0 right-0 size-96 rounded-full bg-orange-400/10 blur-[130px]" />

        <div className="relative mx-auto flex min-h-dvh w-full max-w-6xl flex-col px-5 py-6 sm:px-6 lg:px-8">
          <header className="flex items-center justify-between gap-4">
            <Link href="/" aria-label="Sahara home" className="inline-flex min-h-11 items-center">
              <Image
                src="/sahara-logo.svg"
                alt="Sahara"
                width={142}
                height={36}
                priority
                unoptimized
                className="h-9 w-auto dark:brightness-0 dark:invert"
              />
            </Link>
            <Link
              href="/login"
              className="rounded-full border border-gray-200 px-4 py-2 text-sm font-bold text-gray-700 transition hover:border-[#ff6a1a] hover:text-[#ff6a1a] dark:border-white/10 dark:text-gray-300"
            >
              Sign in
            </Link>
          </header>

          <div className="grid flex-1 gap-10 py-12 lg:grid-cols-[0.95fr_1.05fr] lg:items-center lg:py-16">
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <Image
                  src="/fred-cary.jpg"
                  alt="Fred Cary"
                  width={64}
                  height={64}
                  priority
                  className="size-16 rounded-full border-2 border-white object-cover shadow-lg shadow-black/20"
                />
                <div>
                  <p className="text-sm font-black text-gray-950 dark:text-white">Fred Cary</p>
                  <p className="text-sm font-semibold text-gray-600 dark:text-gray-400">
                    Startup operator and Sahara guide
                  </p>
                </div>
              </div>

              <div className="space-y-5">
                <h2 className="max-w-3xl text-5xl font-black leading-[0.96] tracking-normal text-gray-950 sm:text-6xl dark:text-white">
                  Your Founder seat is ready.
                </h2>
                <p className="max-w-xl text-lg leading-8 text-gray-700 dark:text-gray-300">
                  Create your account now. The tour, Fred questions, and startup setup happen after you are inside.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {["No old stage quiz", "No credit card required", "Founder access path", "Fred intake after signup"].map(
                  (item) => (
                    <div
                      key={item}
                      className="flex min-h-14 items-center gap-3 rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-black shadow-sm shadow-black/5 dark:border-white/10 dark:bg-white/[0.04]"
                    >
                      <CheckCircle2 className="size-4 shrink-0 text-[#ff6a1a]" aria-hidden="true" />
                      {item}
                    </div>
                  )
                )}
              </div>
            </div>

            <Suspense fallback={<StartNowFallback />}>
              <StartNowForm />
            </Suspense>
          </div>
        </div>
      </section>
    </main>
  );
}
