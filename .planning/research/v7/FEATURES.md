# Feature Landscape -- v7.0 Closed-Loop UX Feedback System

**Domain:** AI SaaS feedback collection and analysis
**Researched:** 2026-03-04

---

## Table Stakes

Features users (and the internal team) expect from a feedback system. Missing = system feels incomplete.

| Feature | Why Expected | Complexity | Notes |
|---|---|---|---|
| Thumbs up/down on AI responses | Universal pattern in AI products (ChatGPT, Perplexity, etc.) | Low | Custom component + PostHog event + Langfuse score |
| Optional text follow-up after thumbs down | Users need to explain WHY it was bad | Low | Expandable text area on negative feedback |
| NPS survey (periodic) | Standard product health metric, investors expect it | Low | PostHog Surveys handles this out of the box |
| Feedback stored and queryable | Must persist beyond analytics dashboards | Low | Supabase `feedback` table |
| Admin dashboard showing feedback | Team needs to see what users are saying | Medium | Server component + Supabase queries + Recharts |
| Feedback categorization | Raw feedback is useless without categories | Medium | AI classification via Vercel AI SDK |
| Email notification on resolution | Users need to know their feedback was heard | Low | Resend email with template |

## Differentiators

Features that set Sahara apart. Not expected, but create a self-improving product loop.

| Feature | Value Proposition | Complexity | Notes |
|---|---|---|---|
| FRED self-improvement loop | Negative feedback triggers prompt refinement suggestions; FRED gets better over time | High | Langfuse prompt versioning + feedback scoring + automated eval pipeline |
| Prompt A/B testing with feedback correlation | Know which prompt version produces better user satisfaction | High | Langfuse A/B + PostHog feature flags for traffic splitting |
| Auto-triage to Linear from feedback clusters | Feedback clusters auto-create prioritized issues, not just individual items | Medium | Trigger.dev task: cluster similar feedback -> create Linear issue |
| Close-the-loop WhatsApp reply | When a WhatsApp-reported issue is resolved, reply to the sender directly | Medium | WhatsApp Cloud API outbound messages |
| Session replay linked to feedback | Click negative feedback -> watch what happened in the session | Medium | PostHog session ID linked to feedback record |
| Multi-channel feedback unification | WhatsApp, SMS, in-app, NPS all in one view with consistent classification | Medium | Unified Supabase schema + source-agnostic classification |
| Friction detection from analytics | PostHog funnel drop-offs auto-flagged as potential UX issues | High | PostHog API + Trigger.dev analysis task |

## Anti-Features

Features to explicitly NOT build. Common mistakes in feedback systems.

| Anti-Feature | Why Avoid | What to Do Instead |
|---|---|---|
| Public feedback forum / voting board | Too early for community dynamics; creates expectation of delivery; hard to moderate | Keep feedback private to admin dashboard; share roadmap updates via email |
| Real-time sentiment dashboard with live updating graphs | Vanity metric; team obsesses over moment-to-moment scores instead of trends | Daily/weekly aggregate views only; Trigger.dev batch analysis |
| Automated prompt deployment from feedback | Auto-deploying prompt changes without human review is dangerous | Flag prompt improvement suggestions; human reviews and deploys |
| User-visible feedback status tracker | Creates support ticket expectations for a product that is not a support tool | Close-the-loop email is sufficient; no need for a "My Tickets" page |
| Complex feedback reward system (points, badges) | Gamification of feedback creates noise and low-quality submissions | Simple "Thank you for your feedback" toast is enough |
| Separate analytics dashboard (custom-built) | Duplicates PostHog capabilities; maintenance burden | Embed PostHog dashboards or use PostHog API for specific views |

## Feature Dependencies

```
PostHog Surveys Setup --> In-App Feedback Collection
                              |
                              v
Feedback Supabase Schema --> AI Classification (Vercel AI SDK)
                              |
                              v
                         Feedback Admin Dashboard
                              |
                              +---> Auto-Triage to Linear (@linear/sdk)
                              +---> Close-the-Loop Notifications (Resend + WhatsApp)
                              |
Langfuse Integration ------> Prompt A/B Testing
       |                          |
       v                          v
Trace-to-Feedback Linking -> FRED Self-Improvement Loop
```

Key dependency chain: You cannot do prompt A/B testing without Langfuse tracing. You cannot close the loop without having classified and triaged feedback first. The admin dashboard is the central view that everything flows through.

## MVP Recommendation

For MVP (first phase), prioritize:

1. **Thumbs up/down on FRED chat responses** -- highest signal, lowest effort
2. **Feedback storage in Supabase** -- foundation for everything else
3. **AI classification via Vercel AI SDK** -- immediate value from raw feedback
4. **Basic admin dashboard** -- team needs visibility immediately

Defer to later phases:
- **Prompt A/B testing:** Requires Langfuse integration maturity and sufficient feedback volume
- **FRED self-improvement loop:** Requires A/B testing to measure whether "improvements" actually improve
- **WhatsApp Cloud API migration:** Meta approval timeline; keep BrowserBase approach for now
- **Friction detection from PostHog funnels:** Requires established baseline analytics
