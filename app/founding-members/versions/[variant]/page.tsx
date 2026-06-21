import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, Mail, Phone, Quote, User } from "lucide-react";

import { Button } from "@/components/ui/button";
import { CTA_HREF, type FounderVariant, getVariant, variants } from "../variant-data";

interface PageProps {
  params: Promise<{ variant: string }>;
}

export function generateStaticParams() {
  return variants.map((variant) => ({ variant: variant.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { variant: slug } = await params;
  const variant = getVariant(slug);

  if (!variant) {
    return {
      title: "Sahara Founding Members Mockup",
      robots: { index: false, follow: false },
    };
  }

  return {
    title: `${variant.name} | Sahara Founding Members Mockup`,
    description: variant.thesis,
    robots: { index: false, follow: false },
  };
}

function Header({ dark = false }: { dark?: boolean }) {
  return (
    <header className="flex items-center justify-between gap-4">
      <Link href="/founding-members/versions" className="inline-flex min-h-11 items-center gap-2 text-sm font-bold">
        <ArrowLeft className="size-4" aria-hidden="true" />
        Back to versions
      </Link>
      <Image
        src="/sahara-logo.svg"
        alt="Sahara"
        width={132}
        height={34}
        priority
        unoptimized
        className={`h-8 w-auto ${dark ? "brightness-0 invert" : ""}`}
      />
    </header>
  );
}

function PrimaryAnchor({ variant, dark = false }: { variant: FounderVariant; dark?: boolean }) {
  return (
    <Button
      asChild
      variant="orange"
      size="lg"
      className="h-auto min-h-14 rounded-lg px-6 py-4 text-sm font-black uppercase tracking-normal"
    >
      <Link href={CTA_HREF}>
        {variant.cta}
        <ArrowRight className="size-5" aria-hidden="true" />
        <span className="sr-only">{dark ? " on this dark Sahara mockup" : ""}</span>
      </Link>
    </Button>
  );
}

function LeadCaptureCard({
  variant,
  dark = false,
  label = "First step",
}: {
  variant: FounderVariant;
  dark?: boolean;
  label?: string;
}) {
  const fieldWrap = dark
    ? "border-white/10 bg-white/[0.06] text-white focus-within:border-[#ff6a1a]"
    : "border-stone-200 bg-white text-stone-950 focus-within:border-[#ff6a1a]";
  const input = dark
    ? "text-white placeholder:text-stone-500"
    : "text-stone-950 placeholder:text-stone-400";

  return (
    <form
      id="founder-form"
      action="/start-now"
      method="get"
      className={`rounded-lg border p-5 shadow-2xl ${
        dark
          ? "border-white/10 bg-[#101010] text-white shadow-black/30"
          : "border-stone-200 bg-[#fbfaf7] text-stone-950 shadow-stone-950/10"
      }`}
    >
      <p className="text-xs font-black uppercase tracking-normal text-[#ff6a1a]">{label}</p>
      <h2 className="mt-3 text-3xl font-black leading-tight">{variant.formHeading}</h2>
      <p className={`mt-3 text-sm leading-6 ${dark ? "text-stone-300" : "text-stone-600"}`}>
        {variant.formSubhead}
      </p>

      <div className="mt-5 grid gap-3">
        <label className={`flex min-h-14 items-center gap-3 rounded-lg border px-4 ${fieldWrap}`}>
          <User className="size-5 shrink-0 text-[#ff6a1a]" aria-hidden="true" />
          <span className="sr-only">Full name</span>
          <input
            name="name"
            required
            autoComplete="name"
            placeholder="Full name"
            className={`min-w-0 flex-1 bg-transparent text-base font-semibold outline-none ${input}`}
          />
        </label>
        <label className={`flex min-h-14 items-center gap-3 rounded-lg border px-4 ${fieldWrap}`}>
          <Mail className="size-5 shrink-0 text-[#ff6a1a]" aria-hidden="true" />
          <span className="sr-only">Email address</span>
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="Email address"
            className={`min-w-0 flex-1 bg-transparent text-base font-semibold outline-none ${input}`}
          />
        </label>
        <label className={`flex min-h-14 items-center gap-3 rounded-lg border px-4 ${fieldWrap}`}>
          <Phone className="size-5 shrink-0 text-[#ff6a1a]" aria-hidden="true" />
          <span className="sr-only">Phone number</span>
          <input
            name="phone"
            type="tel"
            required
            autoComplete="tel"
            placeholder="Phone number"
            className={`min-w-0 flex-1 bg-transparent text-base font-semibold outline-none ${input}`}
          />
        </label>
      </div>

      <Button
        variant="orange"
        size="lg"
        className="mt-4 h-auto min-h-14 w-full rounded-lg px-5 py-4 text-sm font-black uppercase tracking-normal"
      >
        {variant.cta}
        <ArrowRight className="size-5" aria-hidden="true" />
      </Button>

      <p className={`mt-4 text-sm font-semibold leading-6 ${dark ? "text-stone-300" : "text-stone-600"}`}>
        {variant.afterSignup}
      </p>
    </form>
  );
}

function TrustStrip({ variant, dark = false }: { variant: FounderVariant; dark?: boolean }) {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {variant.trust.map((item) => (
        <div
          key={item}
          className={`flex min-h-14 items-center gap-3 rounded-lg border px-4 py-3 text-sm font-black ${
            dark ? "border-white/10 bg-white/[0.06] text-white" : "border-stone-200 bg-white text-stone-900"
          }`}
        >
          <Check className="size-4 shrink-0 text-[#ff6a1a]" aria-hidden="true" />
          {item}
        </div>
      ))}
    </div>
  );
}

function PathSteps({ variant, dark = false }: { variant: FounderVariant; dark?: boolean }) {
  return (
    <div className="grid gap-3 md:grid-cols-4">
      {variant.steps.map((step, index) => (
        <div
          key={step}
          className={`rounded-lg border p-4 ${
            dark ? "border-white/10 bg-white/[0.05]" : "border-stone-200 bg-white"
          }`}
        >
          <div className="flex size-9 items-center justify-center rounded-lg bg-[#ff6a1a] text-sm font-black text-white">
            {index + 1}
          </div>
          <p className="mt-4 text-lg font-black leading-tight">{step}</p>
        </div>
      ))}
    </div>
  );
}

function DirectCapturePage({ variant }: { variant: FounderVariant }) {
  return (
    <main className="min-h-dvh bg-[#fbfaf7] text-stone-950">
      <section className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-5 py-7 sm:px-6 lg:px-8">
          <Header />

          <div className="grid gap-10 lg:grid-cols-[1fr_0.82fr] lg:items-center">
            <div className="space-y-6">
              <div className="inline-flex rounded-lg border border-[#ff6a1a]/25 bg-[#ff6a1a]/10 px-3 py-2 text-sm font-black text-[#9a3412]">
                {variant.eyebrow}
              </div>
              <h1 className="max-w-3xl text-5xl font-black leading-none tracking-normal sm:text-6xl">
                {variant.headline}
              </h1>
              <p className="max-w-2xl text-lg leading-8 text-stone-700">{variant.subhead}</p>
              <div className="flex flex-col gap-3 sm:flex-row">
                <PrimaryAnchor variant={variant} />
                <div className="flex min-h-14 items-center rounded-lg border border-stone-200 px-4 text-sm font-black text-stone-700">
                  {variant.secondary}
                </div>
              </div>
              <TrustStrip variant={variant} />
            </div>

            <LeadCaptureCard variant={variant} label="Immediate signup" />
          </div>
        </div>
      </section>

      <section className="bg-[#fbfaf7]">
        <div className="mx-auto grid w-full max-w-6xl gap-8 px-5 py-10 sm:px-6 lg:grid-cols-[0.75fr_1.25fr] lg:px-8">
          <div>
            <p className="text-sm font-black uppercase tracking-normal text-[#c2410c]">Corrected path</p>
            <h2 className="mt-3 text-4xl font-black leading-tight">No qualification before contact.</h2>
            <p className="mt-4 text-base leading-7 text-stone-700">{variant.proof}</p>
          </div>
          <PathSteps variant={variant} />
        </div>
      </section>
    </main>
  );
}

function SeatReservationPage({ variant }: { variant: FounderVariant }) {
  return (
    <main className="min-h-dvh bg-[#120a06] text-white">
      <section className="border-b border-white/10">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-5 py-7 sm:px-6 lg:px-8">
          <Header dark />

          <div className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
            <div className="space-y-6">
              <div className="inline-flex rounded-lg border border-[#ff6a1a]/30 bg-[#ff6a1a]/15 px-3 py-2 text-sm font-black text-[#ffb083]">
                {variant.eyebrow}
              </div>
              <div className="flex items-end gap-4">
                <span className="text-8xl font-black leading-none text-[#ff6a1a] sm:text-9xl">500</span>
                <p className="pb-3 text-xl font-black leading-tight">founder seats</p>
              </div>
              <h1 className="max-w-3xl text-5xl font-black leading-none tracking-normal sm:text-6xl">
                {variant.headline}
              </h1>
              <p className="max-w-2xl text-lg leading-8 text-stone-300">{variant.subhead}</p>
              <PrimaryAnchor variant={variant} dark />
            </div>

            <LeadCaptureCard variant={variant} label="Sahara seat hold" />
          </div>
        </div>
      </section>

      <section className="bg-[#080808]">
        <div className="mx-auto grid w-full max-w-6xl gap-8 px-5 py-10 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8">
          <div>
            <p className="text-sm font-black uppercase tracking-normal text-[#ff9a5b]">Why this version differs</p>
            <h2 className="mt-3 text-4xl font-black leading-tight">It feels like a seat hold, not a brochure.</h2>
            <div className="mt-5 grid gap-3">
              {variant.bullets.map((bullet) => (
                <div key={bullet} className="flex gap-3 rounded-lg border border-white/10 bg-white/[0.05] p-3 text-sm font-bold leading-6">
                  <Check className="mt-0.5 size-4 shrink-0 text-[#ff6a1a]" aria-hidden="true" />
                  {bullet}
                </div>
              ))}
            </div>
          </div>
          <PathSteps variant={variant} dark />
        </div>
      </section>
    </main>
  );
}

function FredLetterPage({ variant }: { variant: FounderVariant }) {
  return (
    <main className="min-h-dvh bg-[#f7f5f0] text-stone-950">
      <section className="bg-stone-950 text-white">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-9 px-5 py-7 sm:px-6 lg:px-8">
          <Header dark />
          <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
            <div className="space-y-5">
              <div className="inline-flex rounded-lg border border-white/15 bg-white/10 px-3 py-2 text-sm font-black">
                {variant.eyebrow}
              </div>
              <h1 className="max-w-3xl text-5xl font-black leading-none tracking-normal sm:text-6xl">
                {variant.headline}
              </h1>
              <p className="max-w-2xl text-lg leading-8 text-stone-300">{variant.subhead}</p>
            </div>

            <LeadCaptureCard variant={variant} dark label="Start here" />
          </div>
        </div>
      </section>

      <section className="border-b border-stone-200">
        <div className="mx-auto grid w-full max-w-6xl gap-8 px-5 py-10 sm:px-6 lg:grid-cols-[1fr_0.85fr] lg:px-8">
          <div className="space-y-6">
            <p className="text-sm font-black uppercase tracking-normal text-[#c2410c]">A cleaner invitation</p>
            <h2 className="text-4xl font-black leading-tight">Give Fred the hand raise first. Save the real questions for later.</h2>
            <p className="text-lg leading-8 text-stone-700">{variant.proof}</p>
            <div className="grid gap-3 sm:grid-cols-2">
              {variant.bullets.map((bullet) => (
                <div key={bullet} className="rounded-lg border border-stone-200 bg-white p-4 text-sm font-bold leading-6">
                  {bullet}
                </div>
              ))}
            </div>
            <PrimaryAnchor variant={variant} />
          </div>

          <div className="rounded-lg border border-stone-200 bg-white p-5">
            <Quote className="size-8 text-[#ff6a1a]" aria-hidden="true" />
            <p className="mt-4 text-2xl font-black leading-tight">
              The old flow asked founders to explain themselves before Sahara had earned the right to ask.
            </p>
            <div className="mt-5 flex items-center gap-3">
              <Image
                src="/fred-cary.jpg"
                alt="Fred Cary"
                width={56}
                height={56}
                priority
                className="size-14 rounded-full border-2 border-white object-cover shadow-md shadow-stone-900/10"
              />
              <div>
                <p className="font-black">Fred Cary</p>
                <p className="text-sm text-stone-600">Sahara Founding Members</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section>
        <div className="mx-auto w-full max-w-6xl px-5 py-10 sm:px-6 lg:px-8">
          <PathSteps variant={variant} />
        </div>
      </section>
    </main>
  );
}

export default async function FoundingMemberVariantPage({ params }: PageProps) {
  const { variant: slug } = await params;
  const variant = getVariant(slug);

  if (!variant) notFound();

  if (variant.layout === "seat") {
    return <SeatReservationPage variant={variant} />;
  }

  if (variant.layout === "letter") {
    return <FredLetterPage variant={variant} />;
  }

  return <DirectCapturePage variant={variant} />;
}
