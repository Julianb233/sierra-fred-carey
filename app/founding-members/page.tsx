import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Check, Mail, Phone, User } from "lucide-react";

import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Reserve Your Sahara Founding Member Seat | First 500",
  description: "Reserve one of Sahara's first 500 Founding Member seats with name, email, and phone only.",
  alternates: {
    canonical: "https://joinsahara.com/founding-members",
  },
  openGraph: {
    title: "Reserve One of Sahara's First 500 Founding Member Seats",
    description: "Name, email, phone. Then get the Sahara tour and start with Fred.",
    url: "https://joinsahara.com/founding-members",
    images: ["/preview.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "Reserve One of Sahara's First 500 Founding Member Seats",
    description: "Name, email, phone. Then get the Sahara tour and start with Fred.",
    images: ["/preview.png"],
  },
};

const CTA_HREF = "#founder-form";

const steps = ["Click reserve", "Enter name, email, phone", "Get the Sahara tour", "Start with Fred"];

function PrimaryCta() {
  return (
    <Button
      asChild
      variant="orange"
      size="lg"
      className="h-auto min-h-14 w-full max-w-md whitespace-normal rounded-lg px-6 py-4 text-center text-sm font-black uppercase tracking-normal sm:w-auto"
    >
      <Link href={CTA_HREF}>
        <span>Reserve My Founder Seat</span>
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
      className="rounded-lg border border-stone-200 bg-[#fbfaf7] p-5 shadow-2xl shadow-stone-950/10"
    >
      <p className="text-xs font-black uppercase tracking-normal text-[#c2410c]">First step</p>
      <h2 className="mt-3 text-3xl font-black leading-tight text-stone-950">Hold my Founder seat</h2>
      <p className="mt-3 text-sm font-semibold leading-6 text-stone-600">
        Only three fields before the tour. No startup-stage questions, no idea worksheet, no credit card.
      </p>

      <div className="mt-5 grid gap-3">
        <label className="flex min-h-14 items-center gap-3 rounded-lg border border-stone-200 bg-white px-4 focus-within:border-[#ff6a1a]">
          <User className="size-5 shrink-0 text-[#ff6a1a]" aria-hidden="true" />
          <span className="sr-only">Full name</span>
          <input
            name="name"
            required
            autoComplete="name"
            placeholder="Full name"
            className="min-w-0 flex-1 bg-transparent text-base font-semibold text-stone-950 outline-none placeholder:text-stone-400"
          />
        </label>
        <label className="flex min-h-14 items-center gap-3 rounded-lg border border-stone-200 bg-white px-4 focus-within:border-[#ff6a1a]">
          <Mail className="size-5 shrink-0 text-[#ff6a1a]" aria-hidden="true" />
          <span className="sr-only">Email address</span>
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="Email address"
            className="min-w-0 flex-1 bg-transparent text-base font-semibold text-stone-950 outline-none placeholder:text-stone-400"
          />
        </label>
        <label className="flex min-h-14 items-center gap-3 rounded-lg border border-stone-200 bg-white px-4 focus-within:border-[#ff6a1a]">
          <Phone className="size-5 shrink-0 text-[#ff6a1a]" aria-hidden="true" />
          <span className="sr-only">Phone number</span>
          <input
            name="phone"
            type="tel"
            required
            autoComplete="tel"
            placeholder="Phone number"
            className="min-w-0 flex-1 bg-transparent text-base font-semibold text-stone-950 outline-none placeholder:text-stone-400"
          />
        </label>
      </div>

      <Button
        variant="orange"
        size="lg"
        className="mt-4 h-auto min-h-14 w-full rounded-lg px-5 py-4 text-sm font-black uppercase tracking-normal"
      >
        Reserve My Founder Seat
        <ArrowRight className="size-5" aria-hidden="true" />
      </Button>

      <p className="mt-4 text-sm font-semibold leading-6 text-stone-600">
        After signup: tour first, then Fred asks about your idea, stage, and next move.
      </p>
    </form>
  );
}

export default function FoundingMembersPage() {
  return (
    <main id="main-content" className="min-h-dvh bg-[#fbfaf7] text-stone-950">
      <section className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-5 py-8 sm:px-6 lg:px-8">
          <header className="flex items-center justify-between gap-4">
            <Link href="/" aria-label="Sahara home" className="inline-flex min-h-11 items-center">
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
            <div className="rounded-lg border border-[#ff6a1a]/25 bg-[#ff6a1a]/10 px-3 py-2 text-sm font-black text-[#9a3412]">
              First 500
            </div>
          </header>

          <div className="grid gap-10 lg:grid-cols-[1fr_0.82fr] lg:items-center">
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <Image
                  src="/fred-cary.jpg"
                  alt="Fred Cary"
                  width={56}
                  height={56}
                  priority
                  className="size-14 rounded-full border-2 border-white object-cover shadow-md shadow-stone-900/10"
                />
                <div>
                  <p className="text-sm font-black text-stone-950">Fred Cary</p>
                  <p className="text-sm font-semibold text-stone-600">Sahara Founding Members</p>
                </div>
              </div>

              <p className="text-sm font-black uppercase tracking-normal text-[#c2410c]">Sahara Founding Members</p>
              <h1 className="max-w-3xl text-5xl font-black leading-none tracking-normal text-stone-950 sm:text-6xl">
                Reserve your Founder seat. Just name, email, phone.
              </h1>
              <p className="max-w-2xl text-lg leading-8 text-stone-700">
                We&apos;re opening the first 500 seats for founders who want a faster way to get clarity. Hold your
                place first, then get the tour and start with Fred.
              </p>
              <div className="flex flex-col gap-3 sm:flex-row">
                <PrimaryCta />
                <div className="flex min-h-14 items-center rounded-lg border border-stone-200 px-4 text-sm font-black text-stone-700">
                  No questions before signup.
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                {["No credit card", "Three-field signup", "First 500 access"].map((item) => (
                  <div
                    key={item}
                    className="flex min-h-14 items-center gap-3 rounded-lg border border-stone-200 bg-[#fbfaf7] px-4 py-3 text-sm font-black"
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

      <section className="bg-[#fbfaf7]">
        <div className="mx-auto grid w-full max-w-6xl gap-8 px-5 py-10 sm:px-6 lg:grid-cols-[0.75fr_1.25fr] lg:px-8">
          <div>
            <p className="text-sm font-black uppercase tracking-normal text-[#c2410c]">Corrected path</p>
            <h2 className="mt-3 text-4xl font-black leading-tight">The tour happens after the hand raise.</h2>
            <p className="mt-4 text-base leading-7 text-stone-700">
              The public page now avoids the old friction. Sahara captures the founder first, then uses the tour and
              Fred-led process to ask meaningful questions.
            </p>
          </div>
          <div className="grid gap-3 md:grid-cols-4">
            {steps.map((step, index) => (
              <div key={step} className="rounded-lg border border-stone-200 bg-white p-4">
                <div className="flex size-9 items-center justify-center rounded-lg bg-[#ff6a1a] text-sm font-black text-white">
                  {index + 1}
                </div>
                <p className="mt-4 text-lg font-black leading-tight">{step}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-stone-200 bg-stone-950 px-5 py-10 text-white">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-start justify-between gap-5 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm font-black uppercase tracking-normal text-[#ff9a5b]">First 500 Founding Members</p>
            <p className="mt-2 text-2xl font-black">Reserve the seat first. Let Fred handle the rest.</p>
          </div>
          <PrimaryCta />
        </div>
      </footer>
    </main>
  );
}
