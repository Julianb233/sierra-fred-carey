import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Check, Mail, Phone, ShieldCheck, User, Zap } from "lucide-react";

import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Sahara Founding Members | Start Free",
  description:
    "Join the first 500 Sahara Founding Members with a direct two-step path: contact details, then account creation.",
  alternates: {
    canonical: "https://joinsahara.com/founding-members",
  },
  openGraph: {
    title: "Sahara Founding Members | Start Free",
    description: "Name, email, phone. Then create your account and start with Fred.",
    url: "https://joinsahara.com/founding-members",
    images: ["/preview.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "Sahara Founding Members | Start Free",
    description: "Name, email, phone. Then create your account and start with Fred.",
    images: ["/preview.png"],
  },
};

const CTA_HREF = "#founder-form";

const proofPoints = [
  "First 500 Founder access",
  "No credit card before signup",
  "Tour and Fred questions happen after account creation",
];

const meetingRules = [
  {
    title: "Reduce clicks",
    text: "The public path is now the landing form, then account creation. The old stage and challenge quiz is skipped for Founder traffic.",
  },
  {
    title: "Keep the Sahara brand",
    text: "This version uses Sahara's current logo, dark surface, orange CTA system, Fred card, and product framing.",
  },
  {
    title: "Capture the hand raise first",
    text: "The page asks for name, email, and phone before moving founders into the Sahara account flow.",
  },
];

function PrimaryCta() {
  return (
    <Button
      asChild
      variant="orange"
      size="lg"
      className="h-auto min-h-14 w-full max-w-sm whitespace-normal rounded-full px-6 py-4 text-center text-sm font-black uppercase tracking-normal sm:w-auto"
    >
      <Link href={CTA_HREF}>
        <span>Start Free</span>
        <ArrowRight className="size-5" aria-hidden="true" />
      </Link>
    </Button>
  );
}

function FounderCaptureForm() {
  return (
    <form
      id="founder-form"
      action="/start-now"
      method="get"
      className="rounded-[2rem] border border-white/10 bg-white p-5 shadow-2xl shadow-black/30 dark:bg-gray-950/90"
    >
      <input type="hidden" name="founder" value="1" />
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-normal text-[#c2410c] dark:text-[#ff9a5b]">
            Founder access
          </p>
          <h2 className="mt-2 text-3xl font-black leading-tight text-gray-950 dark:text-white">Start in two clicks</h2>
        </div>
        <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-[#ff6a1a] text-white">
          <Zap className="size-5" aria-hidden="true" />
        </div>
      </div>

      <p className="mt-3 text-sm font-semibold leading-6 text-gray-600 dark:text-gray-300">
        Enter the three contact fields. The next screen is account creation, not the old quiz.
      </p>

      <div className="mt-5 grid gap-3">
        <label className="flex min-h-14 items-center gap-3 rounded-2xl border border-gray-200 bg-gray-50 px-4 focus-within:border-[#ff6a1a] dark:border-white/10 dark:bg-white/[0.06]">
          <User className="size-5 shrink-0 text-[#ff6a1a]" aria-hidden="true" />
          <span className="sr-only">Full name</span>
          <input
            name="name"
            required
            autoComplete="name"
            placeholder="Full name"
            className="min-w-0 flex-1 bg-transparent text-base font-semibold text-gray-950 outline-none placeholder:text-gray-400 dark:text-white"
          />
        </label>
        <label className="flex min-h-14 items-center gap-3 rounded-2xl border border-gray-200 bg-gray-50 px-4 focus-within:border-[#ff6a1a] dark:border-white/10 dark:bg-white/[0.06]">
          <Mail className="size-5 shrink-0 text-[#ff6a1a]" aria-hidden="true" />
          <span className="sr-only">Email address</span>
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="Email address"
            className="min-w-0 flex-1 bg-transparent text-base font-semibold text-gray-950 outline-none placeholder:text-gray-400 dark:text-white"
          />
        </label>
        <label className="flex min-h-14 items-center gap-3 rounded-2xl border border-gray-200 bg-gray-50 px-4 focus-within:border-[#ff6a1a] dark:border-white/10 dark:bg-white/[0.06]">
          <Phone className="size-5 shrink-0 text-[#ff6a1a]" aria-hidden="true" />
          <span className="sr-only">Phone number</span>
          <input
            name="phone"
            type="tel"
            required
            autoComplete="tel"
            placeholder="Phone number"
            className="min-w-0 flex-1 bg-transparent text-base font-semibold text-gray-950 outline-none placeholder:text-gray-400 dark:text-white"
          />
        </label>
      </div>

      <Button
        variant="orange"
        size="lg"
        className="mt-4 h-auto min-h-14 w-full rounded-full px-5 py-4 text-sm font-black uppercase tracking-normal shadow-lg shadow-[#ff6a1a]/25"
      >
        Start Free
        <ArrowRight className="size-5" aria-hidden="true" />
      </Button>

      <div className="mt-4 flex items-start gap-2 rounded-2xl bg-[#ff6a1a]/10 p-3 text-sm font-semibold leading-6 text-gray-700 dark:text-gray-200">
        <ShieldCheck className="mt-0.5 size-4 shrink-0 text-[#ff6a1a]" aria-hidden="true" />
        <span>Meeting-note path: contact capture first, tour and Fred intake after the account is created.</span>
      </div>
    </form>
  );
}

export default function FoundingMembersPage() {
  return (
    <main id="main-content" className="min-h-dvh bg-white text-gray-950 dark:bg-gray-950 dark:text-white">
      <section className="relative overflow-hidden bg-gradient-to-br from-white via-gray-50 to-gray-100 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
        <div className="pointer-events-none absolute -left-24 top-20 size-80 rounded-full bg-[#ff6a1a]/15 blur-[110px]" />
        <div className="pointer-events-none absolute bottom-0 right-0 size-96 rounded-full bg-orange-400/10 blur-[130px]" />

        <div className="relative mx-auto flex min-h-dvh w-full max-w-7xl flex-col px-5 py-6 sm:px-6 lg:px-8">
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

          <div className="grid flex-1 gap-10 py-12 lg:grid-cols-[1.06fr_0.94fr] lg:items-center lg:py-16">
            <div className="space-y-7">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#ff6a1a]/25 bg-[#ff6a1a]/10 px-3 py-2 text-sm font-black text-[#c2410c] dark:text-[#ff9a5b]">
                <Check className="size-4" aria-hidden="true" />
                First 500 Founding Members
              </div>

              <div className="flex items-center gap-3">
                <Image
                  src="/fred-cary.jpg"
                  alt="Fred Cary"
                  width={60}
                  height={60}
                  priority
                  className="size-[60px] rounded-full border-2 border-white object-cover shadow-lg shadow-black/20"
                />
                <div>
                  <p className="text-sm font-black text-gray-950 dark:text-white">Fred Cary</p>
                  <p className="text-sm font-semibold text-gray-600 dark:text-gray-400">Startup operator and Sahara guide</p>
                </div>
              </div>

              <div className="space-y-5">
                <h1 className="max-w-4xl text-5xl font-black leading-[0.96] tracking-normal text-gray-950 sm:text-6xl lg:text-7xl dark:text-white">
                  Reserve your Founder seat. Start free in two clicks.
                </h1>
                <p className="max-w-2xl text-lg leading-8 text-gray-700 dark:text-gray-300">
                  Sahara is opening the first 500 Founder seats with the shortest possible path: name, email, phone,
                  then account creation. The tour and Fred-led questions happen after you are in.
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <PrimaryCta />
                <p className="max-w-sm text-sm font-bold leading-6 text-gray-600 dark:text-gray-400">
                  No stage quiz, no worksheet, no extra screens before the hand raise.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                {proofPoints.map((item) => (
                  <div
                    key={item}
                    className="flex min-h-16 items-center gap-3 rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-black shadow-sm shadow-black/5 dark:border-white/10 dark:bg-white/[0.04]"
                  >
                    <Check className="size-4 shrink-0 text-[#ff6a1a]" aria-hidden="true" />
                    {item}
                  </div>
                ))}
              </div>
            </div>

            <FounderCaptureForm />
          </div>
        </div>
      </section>

      <section className="border-y border-gray-200 bg-white dark:border-white/10 dark:bg-gray-950">
        <div className="mx-auto grid w-full max-w-7xl gap-5 px-5 py-10 sm:px-6 lg:grid-cols-3 lg:px-8">
          {meetingRules.map((rule) => (
            <article key={rule.title} className="rounded-3xl border border-gray-200 p-5 dark:border-white/10">
              <p className="text-sm font-black uppercase tracking-normal text-[#c2410c] dark:text-[#ff9a5b]">
                {rule.title}
              </p>
              <p className="mt-3 text-base font-semibold leading-7 text-gray-700 dark:text-gray-300">{rule.text}</p>
            </article>
          ))}
        </div>
      </section>

      <footer className="bg-gray-950 px-5 py-10 text-white">
        <div className="mx-auto flex w-full max-w-7xl flex-col items-start justify-between gap-5 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm font-black uppercase tracking-normal text-[#ff9a5b]">Final Founder path</p>
            <p className="mt-2 text-2xl font-black">Contact capture first. Account creation second.</p>
          </div>
          <PrimaryCta />
        </div>
      </footer>
    </main>
  );
}
