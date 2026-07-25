"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ArrowRight, CheckCircle2, Loader2, Lock, Mail, Phone, ShieldCheck, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { trackEvent } from "@/lib/analytics";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";

type Step = "lead" | "account" | "done";

const CONSENT_DISCLAIMER =
  "By submitting, you agree Sahara may contact you by email, text, or call about your membership and startup progress. Message and data rates may apply. Reply STOP to opt out.";

const inputClass =
  "h-12 w-full rounded-lg border border-gray-300 bg-white px-4 text-base text-gray-900 outline-none transition focus:border-[#ff6a1a] focus:ring-4 focus:ring-[#ff6a1a]/10 dark:border-gray-700 dark:bg-gray-950 dark:text-white";

function normalizePhone(value: string) {
  const trimmed = value.trim();
  const digits = trimmed.replace(/\D/g, "");
  if (trimmed.startsWith("+") && digits.length >= 10 && digits.length <= 15) return `+${digits}`;
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return trimmed;
}

function phoneLooksValid(value: string) {
  const digits = value.replace(/\D/g, "");
  return digits.length >= 10 && digits.length <= 15;
}

function emailLooksValid(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export default function StartNowPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("lead");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [consent, setConsent] = useState(false);
  const [source, setSource] = useState("start-now");
  const [leadId, setLeadId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setSource(params.get("source") || params.get("utm_source") || "start-now");
    trackEvent(ANALYTICS_EVENTS.ONBOARDING.STARTED, { step: "capture" });
  }, []);

  const leadMetadata = () => {
    const params = new URLSearchParams(window.location.search);
    return {
      source,
      ref: params.get("ref"),
      utmSource: params.get("utm_source"),
      utmMedium: params.get("utm_medium"),
      utmCampaign: params.get("utm_campaign"),
      path: window.location.pathname,
      consentText: CONSENT_DISCLAIMER,
    };
  };

  const handleLeadSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();
    const cleanPhone = normalizePhone(phone);

    if (!cleanName) {
      setError("Name is required");
      return;
    }
    if (!emailLooksValid(cleanEmail)) {
      setError("Valid email is required");
      return;
    }
    if (!phoneLooksValid(cleanPhone)) {
      setError("Valid phone number is required");
      return;
    }
    if (!consent) {
      setError("Consent is required before we can reserve your seat");
      return;
    }

    setIsSubmitting(true);

    try {
      const metadata = leadMetadata();
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: cleanName,
          email: cleanEmail,
          phone: cleanPhone,
          company: "Sahara Founding Members",
          source: "sahara_start_now",
          metadata,
          message: JSON.stringify({
            intent: "reserve_founder_seat",
            phone: cleanPhone,
            consentToContact: true,
            disclaimer: CONSENT_DISCLAIMER,
            metadata,
          }),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to reserve your seat");

      setName(cleanName);
      setEmail(cleanEmail);
      setPhone(cleanPhone);
      setLeadId(data.id ?? null);
      setStep("account");
      trackEvent(ANALYTICS_EVENTS.ONBOARDING.STEP_COMPLETED, {
        step: "capture",
        stepIndex: 1,
        totalSteps: 2,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to reserve your seat");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAccountSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

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
          name,
          email,
          phone,
          password,
          challenges: [],
          isQuickOnboard: true,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to create your account");

      localStorage.removeItem("sahara_onboarding_wizard");
      setStep("done");
      trackEvent(ANALYTICS_EVENTS.AUTH.SIGNUP, { method: "email", referrer: source });
      trackEvent(ANALYTICS_EVENTS.ONBOARDING.COMPLETED, { step: "account" });
      setTimeout(() => {
        router.push("/welcome");
        router.refresh();
      }, 700);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create your account");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-white text-gray-900 dark:bg-gray-950 dark:text-white">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-5 sm:px-6">
        <Link href="/" aria-label="Sahara home">
          <Image
            src="/sahara-logo.svg"
            alt="Sahara"
            width={132}
            height={34}
            className="h-8 w-auto"
            priority
            unoptimized
          />
        </Link>
        <Link
          href="/login"
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:border-[#ff6a1a] hover:text-[#c2410c] dark:border-gray-700 dark:text-gray-200 dark:hover:text-[#ff6a1a]"
        >
          Log in
        </Link>
      </header>

      <section className="mx-auto grid w-full max-w-6xl items-center gap-10 px-4 pb-12 pt-8 sm:px-6 lg:grid-cols-[1fr_440px] lg:gap-14 lg:pb-20 lg:pt-16">
        <div className="max-w-3xl">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#ff6a1a]/25 bg-[#ff6a1a]/10 px-4 py-2 text-sm font-semibold text-[#c2410c] dark:text-[#ff8c42]">
            <ShieldCheck className="h-4 w-4" />
            Sahara Founding Members
          </div>
          <h1 className="text-4xl font-bold leading-tight tracking-normal text-gray-950 dark:text-white sm:text-5xl lg:text-6xl">
            Reserve your founder seat.
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-gray-600 dark:text-gray-300">
            Start with Fred Cary&apos;s founder operating system: startup momentum,
            investor readiness, and personal growth tracked in one place.
          </p>
          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            {[
              "Built from Fred's founder playbook",
              "Email and SMS milestone nudges",
              "Dashboard first, deeper questions later",
            ].map((item) => (
              <div key={item} className="flex items-start gap-2 rounded-lg border border-gray-200 p-3 text-sm font-medium text-gray-700 dark:border-gray-800 dark:text-gray-300">
                <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#ff6a1a]" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-xl shadow-gray-900/5 dark:border-gray-800 dark:bg-gray-900 sm:p-6">
          {step === "lead" && (
            <form onSubmit={handleLeadSubmit} className="space-y-4">
              <div>
                <h2 className="text-2xl font-bold text-gray-950 dark:text-white">
                  Save your spot
                </h2>
                <p className="mt-2 text-sm leading-6 text-gray-500 dark:text-gray-400">
                  First we capture your contact info. Your startup profile starts after your account is created.
                </p>
              </div>

              <label className="block space-y-2">
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">Name</span>
                <span className="relative block">
                  <User className="pointer-events-none absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
                  <input
                    className={`${inputClass} pl-11`}
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    autoComplete="name"
                    required
                  />
                </span>
              </label>

              <label className="block space-y-2">
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">Email</span>
                <span className="relative block">
                  <Mail className="pointer-events-none absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
                  <input
                    type="email"
                    className={`${inputClass} pl-11`}
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    autoComplete="email"
                    required
                  />
                </span>
              </label>

              <label className="block space-y-2">
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">Phone</span>
                <span className="relative block">
                  <Phone className="pointer-events-none absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
                  <input
                    type="tel"
                    inputMode="tel"
                    className={`${inputClass} pl-11`}
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                    autoComplete="tel"
                    required
                  />
                </span>
              </label>

              <label className="flex gap-3 rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm leading-5 text-gray-600 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-300">
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={(event) => setConsent(event.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-gray-300 text-[#ff6a1a] focus:ring-[#ff6a1a]"
                  required
                />
                <span>{CONSENT_DISCLAIMER}</span>
              </label>

              {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">{error}</p>}

              <Button
                type="submit"
                disabled={isSubmitting}
                className="h-12 w-full bg-[#c2410c] text-base font-bold text-white shadow-lg shadow-[#ff6a1a]/25 hover:bg-[#9a3412]"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Reserving...
                  </>
                ) : (
                  <>
                    RESERVE MY FOUNDER SEAT
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </>
                )}
              </Button>
            </form>
          )}

          {step === "account" && (
            <form onSubmit={handleAccountSubmit} className="space-y-4">
              <div className="rounded-lg border border-[#ff6a1a]/25 bg-[#ff6a1a]/10 p-3 text-sm font-medium text-[#9a3412] dark:text-[#ffb083]">
                Lead captured{leadId ? `: ${leadId.slice(0, 8)}` : ""}. Create your Sahara account to start with Fred.
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-950 dark:text-white">
                  Create your account
                </h2>
                <p className="mt-2 text-sm leading-6 text-gray-500 dark:text-gray-400">
                  {email}
                </p>
              </div>
              <label className="block space-y-2">
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">Password</span>
                <span className="relative block">
                  <Lock className="pointer-events-none absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
                  <input
                    type="password"
                    className={`${inputClass} pl-11`}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    autoComplete="new-password"
                    minLength={8}
                    required
                  />
                </span>
              </label>
              <p className="text-xs leading-5 text-gray-500 dark:text-gray-400">
                Use at least 8 characters with one uppercase letter and one number.
              </p>

              {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">{error}</p>}

              <Button
                type="submit"
                disabled={isSubmitting}
                className="h-12 w-full bg-[#c2410c] text-base font-bold text-white shadow-lg shadow-[#ff6a1a]/25 hover:bg-[#9a3412]"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    Start with Fred
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </>
                )}
              </Button>
            </form>
          )}

          {step === "done" && (
            <div className="space-y-4 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#ff6a1a]/10 text-[#ff6a1a]">
                <CheckCircle2 className="h-7 w-7" />
              </div>
              <h2 className="text-2xl font-bold text-gray-950 dark:text-white">You&apos;re in.</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">Opening your Sahara welcome path now.</p>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
