import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight, CheckCircle2, Mail, Phone, ShieldCheck, User, Zap } from "lucide-react";

import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Sahara Founding Members | Claim Access",
  description:
    "Become one of Sahara's first 500 Founding Members. No credit card required.",
  alternates: {
    canonical: "https://joinsahara.com/founding-members",
  },
  openGraph: {
    title: "Sahara Founding Members | Claim Access",
    description:
      "Built from 30+ years of founder experience, hundreds of launches, and billions of dollars in value creation.",
    url: "https://joinsahara.com/founding-members",
    images: ["/preview.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "Sahara Founding Members | Claim Access",
    description:
      "Built from 30+ years of founder experience, hundreds of launches, and billions of dollars in value creation.",
    images: ["/preview.png"],
  },
};

const CTA_TEXT = "Claim My Founding Member Access";
const CTA_HREF = "#founder-form";

const founderBenefits = [
  "Gain clarity on what to do next",
  "Identify risks before they cost you months",
  "Build momentum when you're feeling stuck",
  "Make better decisions with guidance from Fred Cary",
];

const guessingAreas = ["Customers", "Markets", "Pricing", "Growth", "Fundraising", "What to do next"];

const playbookItems = [
  "Who you are as a founder",
  "What you're uniquely qualified to build",
  "Who your ideal customer really is",
  "The exact problem you're solving - in their words",
  "Why that problem matters",
  "How your solution is different",
  "What makes your company stand out",
  "Where your biggest risks and blind spots are",
  "What investors will eventually want to know",
  "What you should focus on next",
  "A strategy for turning your idea into a real company",
];

function PrimaryCta() {
  return (
    <Button
      asChild
      variant="orange"
      size="lg"
      className="h-auto min-h-14 w-full max-w-md whitespace-normal rounded-full px-6 py-4 text-center text-sm font-black uppercase tracking-normal sm:w-auto"
    >
      <Link href={CTA_HREF}>
        <span>{CTA_TEXT}</span>
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
      className="rounded-lg border border-gray-200 bg-white p-5 shadow-2xl shadow-black/20 dark:border-white/10 dark:bg-gray-950"
    >
      <input type="hidden" name="founder" value="1" />
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-normal text-[#c2410c] dark:text-[#ff9a5b]">
            Reserve Your Founder Seat
          </p>
          <h2 className="mt-2 text-3xl font-black leading-tight text-gray-950 dark:text-white">
            Join the first 500 founders
          </h2>
        </div>
        <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-[#ff6a1a] text-white">
          <Zap className="size-5" aria-hidden="true" />
        </div>
      </div>

      <p className="mt-3 text-sm font-semibold leading-6 text-gray-600 dark:text-gray-300">
        Join the first 500 founders using Sahara to gain clarity, build momentum, and move forward with confidence.
      </p>

      <div className="mt-5 grid gap-3">
        <label className="flex min-h-14 items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 px-4 focus-within:border-[#ff6a1a] dark:border-white/10 dark:bg-white/[0.06]">
          <User className="size-5 shrink-0 text-[#ff6a1a]" aria-hidden="true" />
          <span className="sr-only">Name</span>
          <input
            name="name"
            required
            autoComplete="name"
            placeholder="Name"
            className="min-w-0 flex-1 bg-transparent text-base font-semibold text-gray-950 outline-none placeholder:text-gray-400 dark:text-white"
          />
        </label>
        <label className="flex min-h-14 items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 px-4 focus-within:border-[#ff6a1a] dark:border-white/10 dark:bg-white/[0.06]">
          <Mail className="size-5 shrink-0 text-[#ff6a1a]" aria-hidden="true" />
          <span className="sr-only">Email</span>
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="Email"
            className="min-w-0 flex-1 bg-transparent text-base font-semibold text-gray-950 outline-none placeholder:text-gray-400 dark:text-white"
          />
        </label>
        <label className="flex min-h-14 items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 px-4 focus-within:border-[#ff6a1a] dark:border-white/10 dark:bg-white/[0.06]">
          <Phone className="size-5 shrink-0 text-[#ff6a1a]" aria-hidden="true" />
          <span className="sr-only">Phone</span>
          <input
            name="phone"
            type="tel"
            required
            autoComplete="tel"
            placeholder="Phone"
            className="min-w-0 flex-1 bg-transparent text-base font-semibold text-gray-950 outline-none placeholder:text-gray-400 dark:text-white"
          />
        </label>
      </div>

      <Button
        type="submit"
        variant="orange"
        size="lg"
        className="mt-4 h-auto min-h-14 w-full rounded-full px-5 py-4 text-sm font-black uppercase tracking-normal shadow-lg shadow-[#ff6a1a]/25"
      >
        {CTA_TEXT}
        <ArrowRight className="size-5" aria-hidden="true" />
      </Button>

      <div className="mt-4 flex items-start gap-2 rounded-lg bg-[#ff6a1a]/10 p-3 text-sm font-semibold leading-6 text-gray-700 dark:text-gray-200">
        <ShieldCheck className="mt-0.5 size-4 shrink-0 text-[#ff6a1a]" aria-hidden="true" />
        <span>No credit card required. After signup, you&apos;ll receive access to Sahara and begin your journey with Fred.</span>
      </div>
    </form>
  );
}

function SectionHeading({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="max-w-3xl">
      <p className="text-sm font-black uppercase tracking-normal text-[#c2410c] dark:text-[#ff9a5b]">{eyebrow}</p>
      <h2 className="mt-3 text-3xl font-black leading-tight text-gray-950 sm:text-4xl dark:text-white">{title}</h2>
      {children && <div className="mt-4 text-base font-semibold leading-7 text-gray-700 dark:text-gray-300">{children}</div>}
    </div>
  );
}

export default function FoundingMembersPage() {
  return (
    <main id="main-content" className="min-h-dvh bg-white text-gray-950 dark:bg-gray-950 dark:text-white">
      <section className="bg-gray-950 text-white">
        <div className="mx-auto grid w-full max-w-7xl gap-10 px-5 py-6 sm:px-6 lg:grid-cols-[1.04fr_0.96fr] lg:px-8 lg:py-10">
          <div className="flex flex-col">
            <header className="flex items-center justify-between gap-4">
              <Link href="/" aria-label="Sahara home" className="inline-flex min-h-11 items-center">
                <Image
                  src="/sahara-logo.svg"
                  alt="Sahara"
                  width={142}
                  height={36}
                  priority
                  unoptimized
                  className="h-9 w-auto brightness-0 invert"
                />
              </Link>
              <Link
                href="/login"
                className="rounded-full border border-white/15 px-4 py-2 text-sm font-bold text-gray-200 transition hover:border-[#ff6a1a] hover:text-[#ff9a5b]"
              >
                Sign in
              </Link>
            </header>

            <div className="flex flex-1 flex-col justify-center py-12 lg:py-16">
              <div className="mb-6 inline-flex w-fit items-center gap-2 rounded-full border border-[#ff6a1a]/30 bg-[#ff6a1a]/10 px-3 py-2 text-sm font-black uppercase tracking-normal text-[#ff9a5b]">
                <CheckCircle2 className="size-4" aria-hidden="true" />
                Sahara Founding Members
              </div>

              <h1 className="max-w-4xl text-5xl font-black leading-[0.98] tracking-normal sm:text-6xl lg:text-7xl">
                Become One of Sahara&apos;s First 500 Founding Members
              </h1>

              <div className="mt-6 max-w-2xl space-y-4 text-lg font-semibold leading-8 text-gray-200">
                <p>
                  Built from 30+ years of founder experience, hundreds of launches, and billions of dollars in value
                  creation.
                </p>
                <p>Sahara helps founders gain clarity, uncover blind spots, and move forward with confidence.</p>
                <p>
                  Whether you&apos;re validating an idea, building a company, searching for customers, or preparing to raise
                  capital, Sahara helps you figure out what to do next.
                </p>
              </div>

              <div className="mt-7 flex flex-col gap-4 sm:flex-row sm:items-center">
                <PrimaryCta />
                <p className="text-sm font-black uppercase tracking-normal text-[#ff9a5b]">No Credit Card Required</p>
              </div>
            </div>
          </div>

          <div className="grid gap-5 lg:self-center">
            <div className="rounded-lg border border-white/10 bg-white/[0.06] p-5">
              <div className="flex items-center gap-3">
                <Image
                  src="/fred-cary.jpg"
                  alt="Fred Cary"
                  width={68}
                  height={68}
                  priority
                  className="size-[68px] rounded-full border-2 border-white object-cover shadow-lg shadow-black/25"
                />
                <div>
                  <p className="text-sm font-black text-white">Fred Cary</p>
                  <p className="text-sm font-semibold leading-6 text-gray-300">
                    Founder experience, decision support, and startup guidance inside Sahara.
                  </p>
                </div>
              </div>
            </div>
            <FounderCaptureForm />
          </div>
        </div>
      </section>

      <section className="border-b border-gray-200 bg-white dark:border-white/10 dark:bg-gray-950">
        <div className="mx-auto grid w-full max-w-7xl gap-6 px-5 py-12 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8">
          <SectionHeading eyebrow="Founding Member Access" title="Only 500 spots are being offered during launch.">
            <p>The first 100 founders who upgrade to Builder will receive 50% off for their first 3 months.</p>
          </SectionHeading>

          <div className="grid gap-3 sm:grid-cols-2">
            {founderBenefits.map((benefit) => (
              <div key={benefit} className="flex min-h-16 items-center gap-3 rounded-lg border border-gray-200 p-4 text-sm font-black dark:border-white/10">
                <CheckCircle2 className="size-5 shrink-0 text-[#ff6a1a]" aria-hidden="true" />
                {benefit}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-gray-50 dark:bg-gray-900">
        <div className="mx-auto grid w-full max-w-7xl gap-8 px-5 py-12 sm:px-6 lg:grid-cols-[0.85fr_1.15fr] lg:px-8">
          <SectionHeading eyebrow="I&apos;ve Seen This Story Before" title="Most founders don&apos;t fail because they lack talent.">
            <div className="space-y-4">
              <p>
                Over the last 30 years, I&apos;ve worked with hundreds of founders and helped build companies that have
                created billions of dollars in value.
              </p>
              <p>What I&apos;ve learned is simple:</p>
              <p>They fail because they&apos;re making critical decisions without enough information.</p>
              <p>
                The difference between success and failure is often one insight, one customer conversation, one
                strategic decision, or one blind spot.
              </p>
              <p>That&apos;s why we built Sahara.</p>
              <p className="font-black text-gray-950 dark:text-white">- Fred Cary</p>
            </div>
          </SectionHeading>

          <div className="grid gap-4">
            <div className="rounded-lg border border-gray-200 bg-white p-5 dark:border-white/10 dark:bg-gray-950">
              <h3 className="text-2xl font-black text-gray-950 dark:text-white">What Sahara Helps Founders Do</h3>
              <p className="mt-3 text-base font-semibold leading-7 text-gray-700 dark:text-gray-300">
                Most founders spend too much time guessing. Sahara was built to help founders stop guessing and start
                building.
              </p>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {guessingAreas.map((area) => (
                  <div key={area} className="flex items-center gap-3 rounded-lg bg-gray-50 p-3 text-sm font-black dark:bg-white/[0.06]">
                    <CheckCircle2 className="size-4 shrink-0 text-[#ff6a1a]" aria-hidden="true" />
                    {area}
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-lg border border-gray-200 bg-white p-5 dark:border-white/10 dark:bg-gray-950">
              <h3 className="text-2xl font-black text-gray-950 dark:text-white">The Best Founders Don&apos;t Guess</h3>
              <p className="mt-3 text-base font-semibold leading-7 text-gray-700 dark:text-gray-300">
                They know who they&apos;re building for, what problem they&apos;re solving, why customers care, how they&apos;re
                different, and what comes next. That&apos;s exactly what Sahara helps you discover.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white dark:bg-gray-950">
        <div className="mx-auto grid w-full max-w-7xl gap-8 px-5 py-12 sm:px-6 lg:grid-cols-[0.8fr_1.2fr] lg:px-8">
          <SectionHeading eyebrow="What You&apos;ll Walk Away With" title="By the time you complete the Founder Journey, you&apos;ll have your Founder Playbook.">
            <p>
              Most founders spend years trying to figure these things out. Sahara helps you uncover them step by step.
              Then we help you turn that clarity into momentum, that momentum into growth, and - when the time is right
              - that growth into a company worth funding.
            </p>
          </SectionHeading>

          <div className="grid gap-3 sm:grid-cols-2">
            {playbookItems.map((item) => (
              <div key={item} className="flex min-h-14 items-start gap-3 rounded-lg border border-gray-200 p-4 text-sm font-bold leading-6 dark:border-white/10">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-[#ff6a1a]" aria-hidden="true" />
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-gray-200 bg-gray-50 dark:border-white/10 dark:bg-gray-900">
        <div className="mx-auto grid w-full max-w-7xl gap-8 px-5 py-12 sm:px-6 lg:grid-cols-2 lg:px-8">
          <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-white/10 dark:bg-gray-950">
            <p className="text-sm font-black uppercase tracking-normal text-[#c2410c] dark:text-[#ff9a5b]">
              No Credit Card. No Trial. No Catch.
            </p>
            <h2 className="mt-3 text-3xl font-black leading-tight text-gray-950 dark:text-white">
              Sahara&apos;s Founder Journey is completely free.
            </h2>
            <div className="mt-4 space-y-3 text-base font-semibold leading-7 text-gray-700 dark:text-gray-300">
              <p>Most AI platforms ask for your credit card before they&apos;ve earned your trust.</p>
              <p>We think that&apos;s backwards.</p>
              <p>No payment. No obligation. No risk.</p>
              <p>Use Sahara. Get value from it. Then decide if you want to go further.</p>
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-white/10 dark:bg-gray-950">
            <p className="text-sm font-black uppercase tracking-normal text-[#c2410c] dark:text-[#ff9a5b]">
              And When You&apos;re Ready...
            </p>
            <h2 className="mt-3 text-3xl font-black leading-tight text-gray-950 dark:text-white">
              Build something worth funding.
            </h2>
            <div className="mt-4 space-y-3 text-base font-semibold leading-7 text-gray-700 dark:text-gray-300">
              <p>
                Whether your goal is your first customer, your first $100,000 in revenue, your first million, or your
                first institutional investor, Sahara is designed to help you move forward.
              </p>
              <p>As we build together, Sahara learns your company, your goals, your market, and your story.</p>
              <p>
                When the time is right, we&apos;ll help connect you with investors actively looking for companies like
                yours.
              </p>
              <p>Not because you&apos;re fundraising. Because you&apos;ve built something worth funding.</p>
            </div>
          </div>
        </div>
      </section>

      <footer className="bg-gray-950 px-5 py-12 text-white">
        <div className="mx-auto flex w-full max-w-7xl flex-col items-start justify-between gap-6 sm:px-6 lg:flex-row lg:items-center lg:px-8">
          <div className="max-w-3xl">
            <p className="text-sm font-black uppercase tracking-normal text-[#ff9a5b]">
              Become One of Sahara&apos;s First 500 Founding Members
            </p>
            <p className="mt-3 text-3xl font-black leading-tight">
              The founders who join first will help shape what Sahara becomes.
            </p>
            <p className="mt-3 text-sm font-black uppercase tracking-normal text-[#ff9a5b]">No Credit Card Required</p>
          </div>
          <PrimaryCta />
        </div>
      </footer>
    </main>
  );
}
