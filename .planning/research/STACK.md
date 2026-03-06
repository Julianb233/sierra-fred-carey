# Technology Stack -- v7.0 UX Feedback Loop

**Project:** Sahara v7.0
**Researched:** 2026-03-04

## Recommended Stack

No new major dependencies needed. v7.0 extends existing Sahara infrastructure.

### Core (Already in Sahara)

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Next.js | 16 | App framework, API routes for feedback endpoints | Already the foundation |
| Supabase | Latest | Database for feedback tables, RLS policies | Already used for all data |
| Vercel AI SDK | 6 | Sentiment piggyback on LLM calls | Already used for FRED |
| Trigger.dev | v3 | Scheduled feedback analysis jobs | Already used for WhatsApp monitor |
| PostHog | Latest | Feedback event tracking, funnel analysis | Already integrated (Phase 30) |
| Resend | Latest | Close-the-loop notification emails | Already used for email engagement |

### Existing Infrastructure Being Extended

| Component | Current Use | v7.0 Extension |
|-----------|-------------|----------------|
| `lib/ai/ab-testing.ts` | Experiment variants, latency/error metrics | Add feedback metrics (thumbs ratio, sentiment) |
| `trigger/sahara-whatsapp-monitor.ts` | WhatsApp -> Linear pipeline | Extend to tag as feedback signals |
| `lib/channels/conversation-context.ts` | Cross-channel conversation memory | Add feedback channel tagging |
| `app/admin/` | Admin panel | Add feedback dashboard section |
| `lib/email/` | Weekly digests, re-engagement | Add close-the-loop notifications |

### New Supporting Libraries (If Needed)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `simple-statistics` | Latest | Statistical significance for A/B tests | When D-5 (A/B + feedback) is implemented |
| None else | -- | -- | The existing stack covers all needs |

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| Feedback storage | Supabase (existing) | Dedicated feedback SaaS (Canny, UserVoice) | Adds external dependency, data lives outside Sahara, overkill for internal improvement loop |
| Sentiment analysis | LLM piggyback (existing Vercel AI SDK) | Dedicated NLP service (AWS Comprehend, Google NLP) | Extra cost, extra latency, less context-aware than FRED's own LLM |
| Feedback dashboard | Custom in existing admin panel | Retool, Metabase, or similar | Another tool to maintain, another login for Fred Cary, overkill |
| Prompt evaluation | Extend existing A/B testing | Braintrust, PromptLayer, Promptfoo | Adds external dependency for what is essentially "add a column to variant stats" |
| Scheduled analysis | Trigger.dev (existing) | Custom cron, Vercel cron | Already using Trigger.dev, proven pattern with WhatsApp monitor |

## Installation

```bash
# Only new dependency (if statistical significance needed)
npm install simple-statistics

# Everything else is already installed
```

## Key Principle

**Do not add new tools to solve problems the existing stack already handles.** Sahara has Supabase for data, Vercel AI SDK for LLM calls, Trigger.dev for scheduled jobs, PostHog for analytics, and a custom A/B testing framework. v7.0 adds new tables, new API routes, and new UI components -- not new infrastructure.

## Sources

- Sahara `package.json` and existing codebase -- HIGH, first-party
- [Braintrust](https://www.braintrust.dev/articles/best-prompt-evaluation-tools-2025) -- considered but not recommended (external dependency)
