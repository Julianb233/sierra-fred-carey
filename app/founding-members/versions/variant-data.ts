import { BadgeCheck, Bolt, Compass, Crown, Handshake, ShieldCheck, Sparkles, TimerReset, Users } from "lucide-react";

export type FounderVariant = {
  slug: string;
  eyebrow: string;
  name: string;
  thesis: string;
  headline: string;
  subhead: string;
  proof: string;
  cta: string;
  secondary: string;
  accent: "orange" | "ink" | "copper";
  layout: "capture" | "seat" | "letter";
  formHeading: string;
  formSubhead: string;
  afterSignup: string;
  bullets: string[];
  steps: string[];
  trust: string[];
  icon: typeof Bolt;
};

export const CTA_HREF = "#founder-form";

export const variants: FounderVariant[] = [
  {
    slug: "fast-account",
    eyebrow: "Version A - Direct Capture",
    name: "Name. Email. Phone.",
    thesis: "Best for the fastest conversion repair: one clear click, three fields, then the tour.",
    headline: "Reserve your Founder seat. Just name, email, phone.",
    subhead:
      "The first screen does one job: collect the minimum information needed to follow up. The tour and founder questions happen after Sahara has the lead.",
    proof: "Updated from Fred's feedback: click, sign up, get a tour, then start with Fred.",
    cta: "Reserve My Founder Seat",
    secondary: "No startup-stage questions before signup.",
    accent: "orange",
    layout: "capture",
    formHeading: "Reserve my Founder seat",
    formSubhead: "Only three fields. The rest happens after you are in.",
    afterSignup: "After signup: get the tour, meet the flow, then Fred asks what actually matters.",
    bullets: [
      "The form is visible immediately on desktop",
      "The CTA scrolls directly to Name, Email, Phone",
      "No benefits maze before the founder is captured",
      "Built to test pure speed against the current drop-off",
    ],
    steps: ["Click reserve", "Enter name, email, phone", "Get the Sahara tour", "Start with Fred"],
    trust: ["No credit card", "Three-field signup", "First 500 access"],
    icon: Bolt,
  },
  {
    slug: "founder-circle",
    eyebrow: "Version B - First 500 Seat",
    name: "Founder Seat",
    thesis: "Best for the email campaign when scarcity and first-500 access should carry the click.",
    headline: "Claim one of the first 500 Sahara seats before the tour opens.",
    subhead:
      "This version feels like a private seat reservation instead of a product page. It keeps the invitation tight and pushes all explanation after the three-field capture.",
    proof: "Built for the waiting-list email: reserve the seat first, explain the rest after signup.",
    cta: "Reserve My Founder Seat",
    secondary: "First 500 only. Details come after the hold.",
    accent: "copper",
    layout: "seat",
    formHeading: "Hold my place",
    formSubhead: "A quick reservation for the first 500 founder group.",
    afterSignup: "After signup: Sahara opens the tour, confirms the seat, and routes the founder to Fred.",
    bullets: [
      "The page behaves like a seat hold, not a brochure",
      "Scarcity is clear without adding extra decisions",
      "The form asks only for contact details",
      "Best fit for warm list traffic from Fred's campaign",
    ],
    steps: ["Open the invite", "Reserve the seat", "Get the Sahara tour", "Start with Fred"],
    trust: ["Limited to 500", "Founder-only access", "Phone follow-up ready"],
    icon: Crown,
  },
  {
    slug: "fred-direct",
    eyebrow: "Version C - Start With Fred",
    name: "Fred Direct",
    thesis: "Best for founders who need human trust before they engage with a new AI platform.",
    headline: "Start with Fred, not another intake form.",
    subhead:
      "The ask is simple: raise your hand, give Sahara the best way to reach you, and let Fred guide the next conversation once you are inside.",
    proof: "Keeps Fred's authority upfront while honoring the no-fluff signup feedback.",
    cta: "Start With Fred",
    secondary: "Three fields first. Real questions later.",
    accent: "ink",
    layout: "letter",
    formHeading: "I want the tour",
    formSubhead: "Tell us how to reach you. Fred can ask the meaningful questions after.",
    afterSignup: "After signup: tour first, then Fred can ask about the idea, stage, and real next move.",
    bullets: [
      "A personal note replaces the old feature stack",
      "The form still stays at three fields",
      "Founder context is saved for the Fred-led process",
      "Best fit for skeptical or higher-intent founders",
    ],
    steps: ["Read Fred's note", "Share name, email, phone", "Take the tour", "Talk through the real founder context"],
    trust: ["Built by Fred Cary", "No credit card", "Questions come later"],
    icon: Users,
  },
];

export const transcriptSignals = [
  {
    icon: BadgeCheck,
    title: "Three fields first",
    text: "Fred's email was explicit: Name, Email, Phone only before anything else.",
  },
  {
    icon: TimerReset,
    title: "No process maze",
    text: "The first click should not lead to questions, benefits, pricing, or product depth.",
  },
  {
    icon: ShieldCheck,
    title: "Everything else after",
    text: "The tour, idea name, founder stage, and deeper questions all move behind signup.",
  },
  {
    icon: Compass,
    title: "Tour next",
    text: "The intended path is click, sign up, get a tour, then start with Fred.",
  },
  {
    icon: Handshake,
    title: "Fred-led context",
    text: "Founder-specific questions matter once Fred can actually treat founders differently.",
  },
  {
    icon: Sparkles,
    title: "Distinct tests",
    text: "The variants now test different creative angles while keeping the same low-friction signup rule.",
  },
];

export function getVariant(slug: string) {
  return variants.find((variant) => variant.slug === slug);
}
