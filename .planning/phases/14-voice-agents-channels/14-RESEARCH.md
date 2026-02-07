# Phase 14: Voice -- Agents & Channels - Research

**Researched:** 2026-02-07
**Domain:** AI prompt engineering, persona voice injection, SMS template design, LiveKit voice agent configuration
**Confidence:** HIGH

## Summary

Phase 14 requires rewriting prompts and templates across 5 distinct subsystems to use Fred Cary's voice instead of generic business language. The codebase has a comprehensive `fred-brain.ts` knowledge base and a well-structured `FRED_CAREY_SYSTEM_PROMPT` in `lib/ai/prompts.ts`, but none of the 12 agent tool prompts, SMS templates, or voice agent configuration actually import or reference these resources.

The core problem is a "voice gap" -- the agent prompts say "channeling Fred Cary" in their comments but contain generic business consultant language. The tools themselves have inline `system:` parameters passed to `generateStructuredReliable()` that override any agent-level persona. SMS templates are plain programmatic strings with zero personality. The voice agent has a completely wrong identity ("A Startup Biz") baked into both the code fallback and the database seed migration.

**Primary recommendation:** Import `FRED_COMMUNICATION_STYLE`, `FRED_PHILOSOPHY`, and selected biographical data from `fred-brain.ts` into each prompt file, and rewrite both the agent-level system prompts AND the per-tool `system:` parameters in each tool's `execute()` function. For SMS, rewrite template functions to use Fred's motivational voice. For voice agent, replace `getDefaultSystemPrompt()` entirely and update the database seed.

## Standard Stack

No new libraries are needed. This phase is purely prompt engineering and template rewriting using existing infrastructure.

### Core (Already in Place)
| Library | Purpose | File |
|---------|---------|------|
| `fred-brain.ts` | Fred Cary knowledge base (identity, philosophy, communication style, bio) | `lib/fred-brain.ts` |
| `lib/ai/prompts.ts` | FRED_CAREY_SYSTEM_PROMPT, COACHING_PROMPTS | `lib/ai/prompts.ts` |
| Vercel AI SDK `tool()` | Agent tool definitions with Zod schemas | `ai` package |
| `generateStructuredReliable` | AI structured output with fallback | `lib/ai/fred-client.ts` |
| Twilio SMS | SMS delivery | `lib/sms/client.ts` |
| LiveKit Server SDK | Voice agent token/room management | `livekit-server-sdk` |

### No New Dependencies Required
This phase is entirely about content changes (prompts, templates, system prompts). No new packages needed.

## Architecture Patterns

### Current Architecture (What Exists)

```
Agent Execution Flow:
agent.ts -> runAgent(config) -> base-agent.ts -> generateText({
  system: AGENT_SYSTEM_PROMPT,     <-- Agent-level prompt (generic)
  tools: agentTools                <-- Each tool has its OWN system: param
})

Tool Execution Flow (inside generateText loop):
tool.execute() -> generateStructuredReliable(prompt, schema, {
  system: "You are an expert..."   <-- Tool-level prompt (also generic, OVERRIDES agent persona)
})
```

**Critical insight: There are TWO layers of system prompts.**

1. **Agent-level** (`prompts.ts` -> `FOUNDER_OPS_SYSTEM_PROMPT`, etc.) -- Controls the agent's conversational wrapper text that appears between tool calls
2. **Tool-level** (`tools.ts` -> `system:` param in `generateStructuredReliable()`) -- Controls the actual content generation within each tool

Both layers must be rewritten. The tool-level prompts are arguably MORE important because they directly control the output the user sees.

### Pattern: Voice Injection via Import

The correct pattern is to compose prompts from `fred-brain.ts` exports rather than hardcoding voice characteristics:

```typescript
// Pattern: Import voice constants and compose prompts
import { FRED_COMMUNICATION_STYLE, FRED_PHILOSOPHY, FRED_BIO } from '@/lib/fred-brain';

// Build a voice preamble that can be prepended to any tool's system prompt
const FRED_VOICE_PREAMBLE = `You are Fred Cary speaking directly to a founder you're mentoring.

Voice: ${FRED_COMMUNICATION_STYLE.voice.primary}. ${FRED_COMMUNICATION_STYLE.voice.tone}.

Style:
${FRED_COMMUNICATION_STYLE.characteristics.map(c => `- ${c}`).join('\n')}

Never:
${FRED_COMMUNICATION_STYLE.doNot.map(d => `- ${d}`).join('\n')}

Credentials: ${FRED_BIO.yearsExperience}+ years, ${FRED_BIO.companiesFounded}+ companies founded, ${FRED_BIO.ipos} IPOs.`;
```

### Pattern: Domain + Voice Composition

Each tool needs both domain expertise AND Fred's voice. The system prompt should layer both:

```typescript
const system = `${FRED_VOICE_PREAMBLE}

DOMAIN EXPERTISE:
[Original domain-specific instructions here]

VOICE RULES:
- Refer to personal experience when relevant ("When I built Imagine Communications...")
- Use direct, actionable language ("Here's what you need to do...")
- Reference specific numbers from your track record
- Maintain tough love with genuine care`;
```

### Pattern: SMS Voice Templates

SMS templates are under 160 chars so full prompt injection is impractical. Instead, pre-write the templates in Fred's voice as static strings with interpolation slots:

```typescript
// Instead of: "Hey {name}! Weekly check-in from Sahara."
// Use: "Hey {name}, it's Fred. How's the week going? What's your #1 win?"
```

### Anti-Patterns to Avoid

- **Over-stuffing prompts:** Agent tool prompts don't need Fred's full bio. A concise voice preamble (5-8 lines) is sufficient. The full FRED_CAREY_SYSTEM_PROMPT is 180+ lines -- too long for tool-level system prompts.
- **Losing functional precision:** Fred's voice must enhance, not replace, domain expertise. A fundraising tool still needs to produce precise investor research. Don't sacrifice structured output quality for personality.
- **Inconsistent voice depth:** All 12 tools should use the same voice preamble module, not 12 slightly different Fred impressions.
- **SMS over-personality:** SMS messages are 160 chars max. Don't try to cram Fred's tagline AND a CTA AND personalization. Keep it tight.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Fred's voice characteristics | Hardcoded strings per agent | Import from `fred-brain.ts` | Single source of truth, already comprehensive |
| System prompt for voice agent | Inline default in `getDefaultSystemPrompt()` | Build from `FRED_CAREY_SYSTEM_PROMPT` or `fred-brain.ts` | Already exists, battle-tested |
| Agent voice preamble | 12 separate voice blocks | Shared `FRED_AGENT_VOICE` constant | Consistency, maintainability |

## Common Pitfalls

### Pitfall 1: Only Rewriting Agent Prompts, Missing Tool Prompts
**What goes wrong:** Developer rewrites `FOUNDER_OPS_SYSTEM_PROMPT` in `prompts.ts` to use Fred's voice, but the tools in `tools.ts` still have `system: "You are an expert email writer..."` -- so the actual generated content is still generic.
**Why it happens:** The architecture has two layers of system prompts. The `prompts.ts` file is the obvious target, but the tool-level `system:` params inside each `execute()` function are where the real content voice is set.
**How to avoid:** Audit all 12 tool `execute()` functions. Each `generateStructuredReliable()` call has a `system:` parameter that must be rewritten.
**Warning signs:** Tool outputs sound generic even after agent prompt rewrite.

### Pitfall 2: Voice Agent Has Database AND Code Fallbacks
**What goes wrong:** Developer fixes `getDefaultSystemPrompt()` in code but the database seed (migration 009) still has "A Startup Biz" content. Or vice versa.
**Why it happens:** The voice agent config has 3 sources of prompt content: (a) database `voice_agent_config` table, (b) `getDefaultSystemPrompt()` code fallback, (c) admin API defaults in `app/api/admin/voice-agent/config/route.ts`. All three must be updated.
**How to avoid:** Update all three: the code fallback function, the database migration seed, and the admin API default config object.
**Warning signs:** Voice agent works correctly after DB update but reverts to "A Startup Biz" when DB row is missing.

### Pitfall 3: SMS Character Limit Violations
**What goes wrong:** Fred's voice is verbose ("When I started my first company at 17..."). SMS has a strict 160-char limit per segment. Overshoot means multi-segment billing or truncation.
**Why it happens:** Fred's natural voice is storytelling-oriented, but SMS needs to be tight.
**How to avoid:** Write SMS templates first, measure character count, then adjust. Fred's voice in SMS = motivational and direct, not storytelling.
**Warning signs:** `message.length > MAX_SMS_LENGTH` causing `.slice()` truncation of meaningful content.

### Pitfall 4: Agent Name in Token Metadata Still "AI Support Assistant"
**What goes wrong:** LiveKit room shows "AI Support Assistant" as the agent name instead of "Fred Cary".
**Why it happens:** Line 88 of `voice-agent.ts` hardcodes `name: 'AI Support Assistant'` in the AccessToken creation.
**How to avoid:** Change the token `name` field to something like "Fred Cary" or "Fred".
**Warning signs:** UI displays wrong name in voice call interface.

### Pitfall 5: Prompt Bloat from Full fred-brain.ts Import
**What goes wrong:** Importing the entire FRED_CAREY_SYSTEM_PROMPT (180+ lines) as the tool-level system prompt makes each tool call expensive (high token usage) and potentially confusing to the model.
**Why it happens:** Treating tool-level prompts like chat-level prompts. Tools need focused instructions.
**How to avoid:** Create a concise `FRED_AGENT_VOICE` constant (10-15 lines) that captures voice essentials without the full bio/frameworks. Tools need Fred's STYLE, not his complete LinkedIn profile.
**Warning signs:** Token usage spikes, generation quality decreases, model tries to use coaching frameworks when asked to draft an email.

## Code Examples

### File Inventory: All Changes Needed

```
FILES TO MODIFY (with line-level specifics):

1. lib/agents/founder-ops/prompts.ts
   - Rewrite FOUNDER_OPS_SYSTEM_PROMPT (line 9-24)
   - Import fred-brain.ts exports

2. lib/agents/founder-ops/tools.ts
   - draftEmail: system param (line 109) -- "expert email writer" -> Fred voice
   - createTask: no AI call (pure function, no system param) -- SKIP
   - scheduleMeeting: system param (line 179) -- "expert meeting facilitator" -> Fred voice
   - weeklyPriorities: system param (line 241-243) -- already partial Fred ("You are Fred Cary, a veteran venture builder") but needs full voice preamble

3. lib/agents/fundraising/prompts.ts
   - Rewrite FUNDRAISING_SYSTEM_PROMPT (line 9-25)
   - Import fred-brain.ts exports

4. lib/agents/fundraising/tools.ts
   - investorResearch: system param NOT present (line 102-104) -- add one with Fred voice
   - outreachDraft: system param NOT present (line 166-168) -- add one with Fred voice
   - pipelineAnalysis: system param NOT present (line 221-223) -- add one with Fred voice
   - meetingPrep: system param NOT present (line 290-292) -- add one with Fred voice

5. lib/agents/growth/prompts.ts
   - Rewrite GROWTH_SYSTEM_PROMPT (line 9-25)
   - Import fred-brain.ts exports

6. lib/agents/growth/tools.ts
   - channelAnalysis: system param (line 176-178) -- "growth strategy expert" -> Fred voice
   - experimentDesign: system param (line 200-202) -- "growth experimentation expert" -> Fred voice
   - funnelAnalysis: system param (line 228-230) -- "conversion optimization expert" -> Fred voice
   - contentStrategy: system param (line 252-254) -- "content marketing strategist" -> Fred voice

7. lib/sms/templates.ts
   - getCheckinTemplate (line 18-47) -- rewrite messages in Fred's voice
   - getWelcomeTemplate (line 55-60) -- rewrite in Fred's voice
   - getStopConfirmation (line 67-69) -- rewrite (minor)

8. lib/voice-agent.ts
   - getDefaultSystemPrompt (line 400-424) -- replace entirely with Fred Cary persona
   - AccessToken name (line 88) -- "AI Support Assistant" -> "Fred Cary"
   - buildSystemPrompt (line 429-441) -- update base to use Fred prompt

9. lib/db/migrations/009_voice_agent_tables.sql
   - Default INSERT system_prompt (line 157-166) -- update to Fred persona
   - Default greeting_message (line 167) -- update to Fred greeting
   - Default after_hours_message (line 174) -- update to Fred voice
   - Default fallback_message (line 175) -- update to Fred voice

10. app/api/admin/voice-agent/config/route.ts
    - Default config system_prompt (line 31-40) -- update to Fred persona
    - Default greeting_message (line 41) -- update to Fred greeting
    - Default after_hours_message (line 57) -- update to Fred voice
    - Default fallback_message (line 58) -- update to Fred voice
```

### Example: Shared Fred Agent Voice Preamble

```typescript
// lib/agents/fred-agent-voice.ts (NEW FILE)
import {
  FRED_COMMUNICATION_STYLE,
  FRED_BIO,
  FRED_COMPANIES,
} from '@/lib/fred-brain';

/**
 * Concise Fred Cary voice preamble for agent tools.
 * NOT the full system prompt -- just enough voice identity
 * for structured output tools to adopt Fred's style.
 */
export const FRED_AGENT_VOICE = `You are Fred Cary -- serial entrepreneur with ${FRED_BIO.yearsExperience}+ years of experience, ${FRED_BIO.companiesFounded}+ companies founded, ${FRED_BIO.ipos} IPOs, and over 10,000 founders coached.

Voice: ${FRED_COMMUNICATION_STYLE.voice.primary}. ${FRED_COMMUNICATION_STYLE.voice.tone}.

How you communicate:
- Use stories from your experience when relevant
- Emphasize action over theory
- Balance tough love with genuine care
- Reference specific numbers and outcomes
- Every recommendation should have a clear "why"

What you never do:
${FRED_COMMUNICATION_STYLE.doNot.map(d => `- ${d}`).join('\n')}`;
```

### Example: Rewritten Agent System Prompt

```typescript
// lib/agents/founder-ops/prompts.ts (REWRITTEN)
import { FRED_AGENT_VOICE } from '../fred-agent-voice';

export const FOUNDER_OPS_SYSTEM_PROMPT = `${FRED_AGENT_VOICE}

DOMAIN: Operational excellence for startup founders.
You help founders execute -- emails, tasks, meetings, weekly priorities.

Operating principles:
- Be actionable and specific. No vague advice.
- Every output should be immediately usable.
- Prioritize ruthlessly -- founders have limited bandwidth.
- Frame operational work in terms of business outcomes.
- Keep outputs concise. Founders don't read essays.

When using tools, prefer structured outputs. Always explain WHY you're recommending something, not just WHAT. Draw from your decades of experience building and running companies.`;
```

### Example: Rewritten Tool System Prompt

```typescript
// Inside founder-ops/tools.ts, draftEmail execute():
const result = await generateStructuredReliable(prompt, emailSchema, {
  system: `${FRED_AGENT_VOICE}

You are drafting an email for a founder you're mentoring. Write like Fred would write -- direct, purposeful, no corporate fluff. Every email should feel like it came from someone who has sent thousands of business emails across 40+ companies.

Requirements:
- Concise and actionable
- Match the requested tone
- Include a clear call-to-action
- Suggest a follow-up if appropriate`,
  temperature: 0.6,
});
```

### Example: Rewritten SMS Templates

```typescript
// lib/sms/templates.ts (REWRITTEN)

export function getCheckinTemplate(
  founderName: string,
  highlights?: string[]
): string {
  // Fred's voice: motivational, direct, personal
  const messages = [
    `${founderName} -- it's Fred. What's your biggest win this week? Reply with your top 3 priorities.`,
    `Hey ${founderName}, Fred here. Quick check-in: what moved the needle this week? Top 3 priorities -- go.`,
    `${founderName}, how's the grind? Tell me your #1 win and your biggest blocker. --Fred`,
  ];

  // Rotate messages for variety
  const index = founderName.length % messages.length;
  const message = messages[index];
  return message.slice(0, MAX_SMS_LENGTH);
}

export function getWelcomeTemplate(founderName: string): string {
  return `${founderName}, it's Fred Cary. I'll text you weekly for a quick accountability check. Think of me as your digital co-founder. Reply STOP to opt out.`.slice(
    0,
    MAX_SMS_LENGTH
  );
}

export function getStopConfirmation(): string {
  return "Got it -- you're unsubscribed from check-ins. Text START anytime to re-enable. --Fred";
}
```

### Example: Voice Agent Default Prompt Replacement

```typescript
// lib/voice-agent.ts -- getDefaultSystemPrompt() replacement
function getDefaultSystemPrompt(): string {
  return `You are Fred Cary, serial entrepreneur, CEO, attorney, and business coach with over 50 years of experience.

Your role on this call:
- Help founders with questions about Sahara and entrepreneurship
- Provide direct, actionable guidance based on your experience
- Be conversational but purposeful -- this is a voice call, not an essay

About you:
- Founded 40+ companies, taken 3 public, had 2 acquired
- Created technology used in 75% of the world's TV households
- Coached 10,000+ founders through IdeaPros and now Sahara
- Your motto: F**k average, be legendary.

About Sahara (your current venture):
- AI-driven mentorship platform for founders
- 24/7 proactive guidance -- not reactive advice
- Three tiers: Free (FRED chat), Pro (Reality Lens, frameworks), Studio (virtual agent team)

Voice style:
- Direct and no-BS, but warm
- Use personal stories when relevant
- Emphasize action over theory
- Never sugarcoat -- founders need the truth
- Keep responses concise for voice -- 2-3 sentences max per turn

Never refer to yourself as an "AI assistant" or "A Startup Biz." You are Fred Cary, co-founder of Sahara.`;
}
```

## State of the Art

| Old Approach (Current) | New Approach (Phase 14) | Impact |
|------------------------|------------------------|--------|
| Agent prompts say "channeling Fred Cary" but contain no Fred data | Agent prompts import and compose from `fred-brain.ts` | Authentic Fred voice in all 12 tools |
| Tool-level system prompts use generic expert personas | Tool-level prompts use shared `FRED_AGENT_VOICE` preamble | Consistent voice across all structured outputs |
| SMS templates use bland SaaS language | SMS templates written in Fred's direct, motivational voice | Personal accountability feel, not corporate |
| Voice agent identifies as "A Startup Biz" support assistant | Voice agent identifies as Fred Cary | Correct brand identity |
| Database seed has generic support prompt | Database seed has Fred Cary persona | Consistent even on fresh deploy |

## Scope Boundaries

### What This Phase IS:
- Rewriting prompt content (the words) in 10 files
- Creating 1 new shared module (`fred-agent-voice.ts`)
- Updating database migration and API defaults
- Content work, not infrastructure work

### What This Phase Is NOT:
- NOT changing agent architecture or execution flow
- NOT adding new tools or removing tools
- NOT changing Zod schemas or structured output shapes
- NOT wiring up unused `fred-brain.ts` helpers (that's Phase 15)
- NOT adding `getRandomQuote()` or `getExperienceStatement()` calls (Phase 15)
- NOT changing the main FRED chat prompt (that's Phase 13)
- NOT adding `COACHING_PROMPTS` routing (Phase 15)

## Open Questions

1. **Database migration idempotency**
   - What we know: Migration 009 has `ON CONFLICT DO NOTHING` on the INSERT. If the default row already exists in production, the migration won't update it.
   - What's unclear: Is this migration already run in production? If so, we may need a separate UPDATE migration or manual DB update.
   - Recommendation: Create a new migration (e.g., `014_voice_agent_fred_persona.sql`) that UPDATEs the existing default row rather than relying on the INSERT seed.

2. **Fundraising tool prompts have no system param**
   - What we know: All 4 fundraising tools pass `temperature` but not `system` to `generateStructuredReliable()`. The prompt text is embedded in the `prompt` parameter inline.
   - What's unclear: Will adding a `system:` parameter to these tools conflict with the inline prompt instructions?
   - Recommendation: Add `system:` parameter with Fred voice. The inline prompt already contains domain instructions; the system param should carry only voice identity. This is the standard pattern used by the other agents' tools.

3. **Voice agent: code fallback vs. database primary**
   - What we know: `buildEnhancedSystemPrompt()` fetches from DB first, falls back to `getDefaultSystemPrompt()`. The admin API also has hardcoded defaults.
   - What's unclear: In production, does the DB config exist? If so, the code fallback may rarely execute.
   - Recommendation: Update all three sources (code fallback, DB seed, admin API defaults) for completeness. The code fallback is the safety net.

## Sources

### Primary (HIGH confidence)
- **Codebase analysis** -- Direct reading of all 10 target files, base-agent.ts, fred-client.ts
- `lib/fred-brain.ts` -- Complete Fred Cary knowledge base (411 lines)
- `lib/ai/prompts.ts` -- FRED_CAREY_SYSTEM_PROMPT (246 lines)
- `lib/agents/base-agent.ts` -- Agent execution flow (103 lines)
- `lib/ai/fred-client.ts` -- `generateStructuredReliable` API (569 lines)

### Secondary (MEDIUM confidence)
- `lib/db/migrations/009_voice_agent_tables.sql` -- Database schema and default seed data
- `.planning/ROADMAP.md` -- Phase scope boundaries and dependencies

### Tertiary (LOW confidence)
- None. All findings are from direct codebase analysis.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- No new libraries, all existing infrastructure
- Architecture: HIGH -- Direct codebase analysis of all execution paths
- Pitfalls: HIGH -- Identified from reading actual code structure
- Code examples: HIGH -- Based on existing codebase patterns

**Research date:** 2026-02-07
**Valid until:** Indefinite (purely content-level changes, no dependency versions involved)
