import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Final Sahara Founding Members Landing Page",
  description: "Final Sahara Founding Members landing page direction aligned to the meeting notes.",
  robots: {
    index: false,
    follow: false,
  },
};

const finalRules = [
  "Use Sahara's existing dark/orange brand system.",
  "Ask for only name, email, and phone on the landing page.",
  "Send Founder traffic straight to account creation instead of the old quiz.",
  "Move the tour and Fred-led intake after the hand raise.",
];

export default function FoundingMemberVersionsPage() {
  return (
    <main className="min-h-dvh bg-white text-gray-950 dark:bg-gray-950 dark:text-white">
      <section className="relative overflow-hidden bg-gradient-to-br from-white via-gray-50 to-gray-100 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
        <div className="pointer-events-none absolute -left-24 top-16 size-80 rounded-full bg-[#ff6a1a]/15 blur-[110px]" />
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-5 py-8 sm:px-6 lg:px-8">
          <header className="flex items-center justify-between gap-4">
            <Link href="/founding-members" aria-label="Back to Sahara founding members page">
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
            <span className="rounded-full border border-[#ff6a1a]/25 bg-[#ff6a1a]/10 px-3 py-2 text-sm font-black text-[#c2410c] dark:text-[#ff9a5b]">
              Final direction
            </span>
          </header>

          <div className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
            <div className="space-y-5">
              <p className="text-sm font-black uppercase tracking-normal text-[#c2410c] dark:text-[#ff9a5b]">
                Sahara Founding Members
              </p>
              <h1 className="max-w-4xl text-5xl font-black leading-none tracking-normal sm:text-6xl">
                One final version: brand-consistent and built for fewer clicks.
              </h1>
              <p className="max-w-3xl text-lg leading-8 text-gray-700 dark:text-gray-300">
                The three divergent mockups have been retired as the primary review surface. The final page now follows
                the meeting feedback: Founder capture first, account creation second, then the Sahara tour and Fred-led
                intake.
              </p>
              <Button asChild variant="orange" size="lg" className="h-auto min-h-14 rounded-full px-6 py-4">
                <Link href="/founding-members">
                  Review Final Page
                  <ArrowRight className="size-5" aria-hidden="true" />
                </Link>
              </Button>
            </div>

            <div className="rounded-[2rem] border border-gray-200 bg-white p-5 shadow-xl shadow-black/10 dark:border-white/10 dark:bg-white/[0.04]">
              <p className="text-sm font-black uppercase tracking-normal text-[#c2410c] dark:text-[#ff9a5b]">
                Meeting-note rules
              </p>
              <div className="mt-5 space-y-4">
                {finalRules.map((rule) => (
                  <div key={rule} className="flex gap-3 text-base font-semibold leading-7 text-gray-700 dark:text-gray-200">
                    <CheckCircle2 className="mt-1 size-5 shrink-0 text-[#ff6a1a]" aria-hidden="true" />
                    <span>{rule}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
