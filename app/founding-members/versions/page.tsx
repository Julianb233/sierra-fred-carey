import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { transcriptSignals, variants } from "./variant-data";

export const metadata: Metadata = {
  title: "Revised Sahara Founding Members Landing Page Mockups",
  description: "Three revised Sahara Founding Members mockups reflecting the latest team feedback.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function FoundingMemberVersionsPage() {
  return (
    <main className="min-h-dvh bg-[#f7f5f0] text-stone-950 dark:bg-[#080808] dark:text-white">
      <section className="border-b border-stone-200 bg-white dark:border-white/10 dark:bg-[#080808]">
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
                className="h-9 w-auto"
              />
            </Link>
            <span className="rounded-lg border border-[#ff6a1a]/25 bg-[#ff6a1a]/10 px-3 py-2 text-sm font-bold text-[#9a3412] dark:text-[#ffb083]">
              Revised Set
            </span>
          </header>

          <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
            <div className="space-y-5">
              <p className="text-sm font-black uppercase tracking-normal text-[#c2410c] dark:text-[#ff9a5b]">
                Sahara Founding Members
              </p>
              <h1 className="max-w-4xl text-5xl font-black leading-none tracking-normal sm:text-6xl">
                Three revised ways to get the hand raise first.
              </h1>
              <p className="max-w-3xl text-lg leading-8 text-stone-700 dark:text-stone-300">
                The latest team feedback was direct: stop asking for anything before signup except
                Name, Email, and Phone. Each version now makes the first action a three-field capture,
                then moves the tour and Fred-led questions after the founder is in.
              </p>
            </div>

            <div className="rounded-lg border border-stone-200 bg-[#fff7ed] p-5 dark:border-white/10 dark:bg-white/[0.04]">
              <p className="text-sm font-black uppercase tracking-normal text-[#9a3412] dark:text-[#ffb083]">
                Shared rule
              </p>
              <p className="mt-3 text-3xl font-black leading-tight">Click. Sign up. Tour. Start with Fred.</p>
              <p className="mt-3 text-sm leading-6 text-stone-700 dark:text-stone-300">
                The creative directions are intentionally different now: A is pure speed, B is a first-500
                seat hold, and C is a Fred-led trust invitation.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-stone-200 bg-[#f7f5f0] dark:border-white/10 dark:bg-[#080808]">
        <div className="mx-auto grid w-full max-w-6xl gap-4 px-5 py-8 sm:grid-cols-2 sm:px-6 lg:grid-cols-5 lg:px-8">
          {transcriptSignals.map((signal) => (
            <div
              key={signal.title}
              className="rounded-lg border border-stone-200 bg-white p-4 dark:border-white/10 dark:bg-white/[0.04]"
            >
              <signal.icon className="size-5 text-[#c2410c] dark:text-[#ff9a5b]" aria-hidden="true" />
              <h2 className="mt-3 text-base font-black">{signal.title}</h2>
              <p className="mt-2 text-sm leading-6 text-stone-600 dark:text-stone-300">{signal.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-white dark:bg-[#080808]">
        <div className="mx-auto grid w-full max-w-6xl gap-5 px-5 py-10 sm:px-6 lg:grid-cols-3 lg:px-8">
          {variants.map((variant) => (
            <article
              key={variant.slug}
              className={`flex min-h-[540px] flex-col justify-between rounded-lg border p-5 shadow-sm shadow-stone-900/5 ${
                variant.layout === "seat"
                  ? "border-[#ff6a1a]/30 bg-[#120a06] text-white"
                  : variant.layout === "letter"
                    ? "border-stone-300 bg-[#f7f5f0] text-stone-950 dark:border-white/10"
                    : "border-stone-200 bg-white text-stone-950 dark:border-white/10"
              }`}
            >
              <div className="space-y-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-black uppercase tracking-normal text-[#c2410c] dark:text-[#ff9a5b]">
                      {variant.eyebrow}
                    </p>
                    <h2 className="mt-2 text-3xl font-black leading-tight">{variant.name}</h2>
                  </div>
                  <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-[#ff6a1a] text-white">
                    <variant.icon className="size-5" aria-hidden="true" />
                  </div>
                </div>

                <p
                  className={`text-sm leading-6 ${
                    variant.layout === "seat" ? "text-stone-300" : "text-stone-700 dark:text-stone-300"
                  }`}
                >
                  {variant.thesis}
                </p>

                <div
                  className={`rounded-lg border p-4 ${
                    variant.layout === "seat"
                      ? "border-white/10 bg-white/[0.06]"
                      : "border-stone-200 bg-[#fbfaf7] dark:border-white/10"
                  }`}
                >
                  <p className="text-sm font-black uppercase tracking-normal text-[#ff6a1a]">First screen asks</p>
                  <p className="mt-2 text-2xl font-black leading-tight">Name. Email. Phone.</p>
                  <p
                    className={`mt-2 text-sm leading-6 ${
                      variant.layout === "seat" ? "text-stone-300" : "text-stone-600 dark:text-stone-300"
                    }`}
                  >
                    {variant.afterSignup}
                  </p>
                </div>

                <div className="space-y-3">
                  {variant.bullets.map((bullet) => (
                    <div
                      key={bullet}
                      className={`flex gap-3 text-sm leading-6 ${
                        variant.layout === "seat" ? "text-stone-200" : "text-stone-800 dark:text-stone-200"
                      }`}
                    >
                      <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-[#c2410c] dark:text-[#ff9a5b]" />
                      <span>{bullet}</span>
                    </div>
                  ))}
                </div>
              </div>

              <Button asChild variant="orange" className="mt-8 h-auto min-h-12 rounded-lg px-4 py-3">
                <Link href={`/founding-members/versions/${variant.slug}`}>
                  View Full Mockup
                  <ArrowRight className="size-4" aria-hidden="true" />
                </Link>
              </Button>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
