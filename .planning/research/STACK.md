# Technology Stack

**Project:** Sahara - AI-Powered Founder Operating System
**Researched:** 2026-01-28
**Overall confidence:** HIGH

## Executive Summary

The 2026 stack for an AI-powered founder operating system should center on the **Vercel AI SDK 6** for all AI interactions, replacing the current custom multi-provider implementation. The existing Next.js 16 + Supabase + Stripe infrastructure is solid and should remain. New additions: **Twilio** for SMS, **XState v5** for FRED's decision state machine, and **Zod 4** for schema validation.

---

## Recommended Stack

### Core Framework (Keep Existing)

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Next.js | 16.1.1 | Full-stack React framework | Already deployed, App Router mature, excellent Vercel integration | HIGH |
| React | 19.1.1 | UI library | Latest stable, already in use | HIGH |
| TypeScript | 5.9+ | Type safety | Already in use, required for AI SDK type inference | HIGH |
| Tailwind CSS | 4.x | Styling | Already in use, v4 with CSS-first config | HIGH |

**Rationale:** The existing framework stack is current and production-ready. No changes needed.

### AI Layer (UPGRADE RECOMMENDED)

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Vercel AI SDK | 6.x | Unified AI interface | **Replace custom multi-provider code.** 2.8M weekly downloads, native Next.js integration, streaming-first, ToolLoopAgent for FRED | HIGH |
| @ai-sdk/openai | 3.x | OpenAI provider | Official provider package | HIGH |
| @ai-sdk/anthropic | 3.x | Anthropic provider | Official provider package | HIGH |
| @ai-sdk/google | 3.x | Google provider | Official provider package | HIGH |
| Zod | 4.x | Schema validation | **Upgrade from implicit.** 14x faster, @zod/mini for frontend, built-in JSON Schema conversion for AI structured outputs | HIGH |

**Why Vercel AI SDK 6 over current custom implementation:**
1. **Agent abstraction:** `ToolLoopAgent` is purpose-built for FRED's decision engine pattern
2. **Human-in-the-loop:** Native `needsApproval` flag for escalation logic
3. **Type-safe streaming:** UIMessage persistence pattern solves chat history complexity
4. **Tools API:** Define FRED's 7-factor scoring as typed tools with Zod schemas
5. **Provider switching:** One-line swap between OpenAI/Anthropic/Google
6. **DevTools:** Debug LLM calls, token usage, timing in development

**Migration path:** The codemod `npx @ai-sdk/codemod v6` automates migration with minimal code changes.

### Agent Framework (NEW)

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| XState | 5.x | State machine for FRED | Decision engine states, escalation logic, memory persistence, visual debugging | HIGH |
| @stately/agent | 0.x | LLM + state machine integration | Bridges XState with Vercel AI SDK, learning from feedback, observation recording | MEDIUM |

**Why XState v5 for FRED's cognitive engine:**
1. **State machine guidance:** FRED's 7-factor decision scoring maps naturally to states
2. **Escalation logic:** "Auto-decide vs escalate" is a state transition
3. **Memory persistence:** Observations and feedback stored per-state
4. **Visual debugging:** Stately Studio for designing/debugging FRED's logic
5. **TypeScript-first:** v5 has dramatically improved type inference via `setup()`
6. **Vercel AI SDK integration:** @stately/agent provides first-class integration

**Note on @stately/agent:** This is newer (MEDIUM confidence). Evaluate during implementation. Fallback: Use XState directly with AI SDK tools.

### Database (Keep Existing)

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Supabase | 2.89+ | Auth, Postgres, Realtime | Already deployed, handles auth + database + realtime in one | HIGH |
| @supabase/ssr | 0.8+ | SSR auth helpers | Already in use | HIGH |
| Neon | 1.x | Serverless Postgres | Already in use for AI request logging | HIGH |

**Realtime best practices (2026):**
- Use **Broadcast** over Postgres Changes for scalability
- Apply filters to subscriptions (avoid subscribing without filters)
- RLS policies respected in realtime channels
- Initial data load pattern: SELECT first, then subscribe

### SMS Integration (NEW)

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| twilio | 5.12+ | SMS sending/receiving | Industry standard, Node.js SDK, webhook support | HIGH |

**Installation:**
```bash
npm install twilio@^5.12.0
```

**Critical: 10DLC Registration Required**
As of 2025, US SMS requires 10DLC registration for A2P messaging. Process:
1. Register business/brand in Twilio Console
2. Submit campaign info (use case, message samples, expected volume)
3. Wait 1-2 weeks for approval (low-volume) or 6 weeks (high-volume)
4. Associate campaign with phone numbers

**Alternative:** Use Twilio toll-free number for immediate sending without registration.

**Implementation pattern for weekly check-ins:**
```typescript
// lib/sms/twilio.ts
import Twilio from 'twilio';

const client = new Twilio(
  process.env.TWILIO_ACCOUNT_SID!,
  process.env.TWILIO_AUTH_TOKEN!
);

export async function sendSMS(to: string, body: string) {
  return client.messages.create({
    to,
    from: process.env.TWILIO_PHONE_NUMBER!,
    body
  });
}
```

**Webhook for replies:**
```typescript
// app/api/sms/webhook/route.ts
import { MessagingResponse } from 'twilio/lib/twiml/MessagingResponse';

export async function POST(req: Request) {
  const formData = await req.formData();
  const body = formData.get('Body') as string;
  const from = formData.get('From') as string;

  // Process with FRED agent
  const response = await processWithFRED(from, body);

  const twiml = new MessagingResponse();
  twiml.message(response);

  return new Response(twiml.toString(), {
    headers: { 'Content-Type': 'text/xml' }
  });
}
```

### PDF Processing (Keep Existing, Consider Upgrade)

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| pdf-parse | 2.4.5 | PDF text extraction | Already in use, simple API | HIGH |
| @react-pdf/renderer | 4.3.1 | PDF generation | Already in use for exports | HIGH |

**Consider for future:** `unpdf` - modern serverless-optimized alternative to pdf-parse with better TypeScript support, multiple extraction strategies. Current pdf-parse is adequate for pitch deck analysis.

### Scheduling (NEW)

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Vercel Cron | N/A | Weekly SMS check-ins | Native Vercel integration, no external service | HIGH |

**Configuration for weekly check-ins:**
```json
// vercel.json
{
  "crons": [
    {
      "path": "/api/cron/weekly-checkin",
      "schedule": "0 9 * * 1"  // 9 AM UTC every Monday
    }
  ]
}
```

**Important:** Add `export const dynamic = 'force-dynamic'` to prevent caching.

### Payments & Storage (Keep Existing)

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Stripe | 20.x | Billing | Already in use | HIGH |
| @stripe/stripe-js | 8.x | Client-side Stripe | Already in use | HIGH |
| @vercel/blob | 2.x | File storage | Already in use for uploads | HIGH |

### Real-time Features

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Supabase Realtime | N/A | Chat updates, notifications | Already available via Supabase | HIGH |
| LiveKit | 2.x | Voice features | Already integrated | HIGH |

**Supabase Realtime pricing:**
- $2.50 per 1M messages
- $10 per 1,000 peak connections

---

## Complete Installation

### New Dependencies
```bash
# AI SDK (upgrade from custom implementation)
npm install ai@^6.0.58 @ai-sdk/openai@^3.0 @ai-sdk/anthropic@^3.0 @ai-sdk/google@^3.0

# State machine for FRED
npm install xstate@^5.0

# Schema validation (upgrade)
npm install zod@^4.0

# SMS
npm install twilio@^5.12.0
```

### Optional (Evaluate First)
```bash
# XState + LLM integration (newer, evaluate during implementation)
npm install @stately/agent
```

### Remove (After Migration)
```bash
# After migrating to Vercel AI SDK, these become provider packages
# npm uninstall @anthropic-ai/sdk openai @google/generative-ai
# (Keep installed - AI SDK uses these under the hood)
```

---

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| AI framework | Vercel AI SDK 6 | LangChain.js | LangChain heavier, less Next.js integration, Vercel AI SDK has massive adoption (2.8M downloads) |
| AI framework | Vercel AI SDK 6 | Mastra | Newer, less proven, though worth watching |
| State machine | XState v5 | LangGraph.js | LangGraph better for complex multi-agent, but FRED is single-agent; XState more mature, visual studio |
| SMS | Twilio | MessageBird, Vonage | Twilio has best Node.js SDK, largest ecosystem, proven reliability |
| PDF parsing | pdf-parse (existing) | unpdf | unpdf more modern, but existing works; switch if issues arise |
| Scheduling | Vercel Cron | QStash, Inngest | Vercel Cron native, no external service; QStash if need guaranteed delivery |

---

## What NOT to Use

| Technology | Why Avoid |
|------------|-----------|
| LangChain.js for simple agents | Overkill for FRED's use case, Vercel AI SDK simpler |
| Custom streaming implementation | AI SDK handles this natively with UIMessage |
| External cron services | Vercel Cron sufficient, simpler |
| Firebase for realtime | Already have Supabase, no need to add complexity |
| GraphQL | REST/tRPC simpler for this use case |
| MongoDB | Already have Postgres via Supabase/Neon |

---

## Migration Priority

1. **Phase 1:** Add Zod 4 for schema validation (foundation for AI structured outputs)
2. **Phase 2:** Add Twilio for SMS infrastructure
3. **Phase 3:** Migrate AI client to Vercel AI SDK 6 (use codemod)
4. **Phase 4:** Add XState v5 for FRED state machine
5. **Phase 5:** Integrate XState with AI SDK tools

---

## Environment Variables (New)

```env
# Twilio SMS
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+1234567890

# Vercel Cron (automatically set by Vercel)
CRON_SECRET=your_cron_secret
```

---

## Sources

### AI SDK & Agents
- [Vercel AI SDK Documentation](https://ai-sdk.dev/docs/introduction) - HIGH confidence
- [AI SDK 6 Release](https://vercel.com/blog/ai-sdk-6) - HIGH confidence
- [Vercel AI GitHub](https://github.com/vercel/ai) - HIGH confidence
- [XState v5 Documentation](https://stately.ai/docs/xstate) - HIGH confidence
- [Stately Agent](https://github.com/statelyai/agent) - MEDIUM confidence
- [Top 5 TypeScript AI Agent Frameworks 2026](https://techwithibrahim.medium.com/top-5-typescript-ai-agent-frameworks-you-should-know-in-2026-5a2a0710f4a0) - MEDIUM confidence

### SMS
- [Twilio Node.js SDK](https://github.com/twilio/twilio-node) - HIGH confidence
- [Twilio SMS Tutorial](https://www.twilio.com/docs/messaging/tutorials/how-to-receive-and-reply/node-js) - HIGH confidence

### Validation
- [Zod 4 Release](https://zod.dev/v4) - HIGH confidence
- [Zod 4 Performance](https://www.infoq.com/news/2025/08/zod-v4-available/) - HIGH confidence

### Scheduling
- [Vercel Cron Jobs](https://vercel.com/docs/cron-jobs) - HIGH confidence

### Realtime
- [Supabase Realtime](https://supabase.com/docs/guides/realtime) - HIGH confidence

### PDF
- [PDF Processing Comparison](https://strapi.io/blog/7-best-javascript-pdf-parsing-libraries-nodejs-2025) - MEDIUM confidence
