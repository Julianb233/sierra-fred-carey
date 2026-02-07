# Summary: 14-01 Agent Tool Prompt Voice Rewrite

## What Changed

**Created `lib/agents/fred-agent-voice.ts`** -- Shared `FRED_AGENT_VOICE` constant that imports from fred-brain.ts. Concise preamble suitable for tool system: params.

**Updated 3 agent system prompts:**
- `lib/agents/founder-ops/prompts.ts` -- Now speaks as "Fred Cary's Founder Ops Agent" with FRED_BIO.yearsExperience
- `lib/agents/fundraising/prompts.ts` -- References Fred's IPOs, acquisitions, and investor experience
- `lib/agents/growth/prompts.ts` -- References FRED_BIO.companiesFounded and Fred's growth philosophy

**Updated 11 tool system params (3 existing + 4 added + 4 existing):**
- Founder Ops: draftEmail, scheduleMeeting, weeklyPriorities -- replaced generic "expert" with FRED_AGENT_VOICE
- Fundraising: investorResearch, outreachDraft, pipelineAnalysis, meetingPrep -- ADDED system: params (none existed before)
- Growth: channelAnalysis, experimentDesign, funnelAnalysis, contentStrategy -- replaced generic "expert" with FRED_AGENT_VOICE

createTask (Founder Ops) skipped -- pure function, no AI call.

## Verification

- `tsc --noEmit`: 0 errors
- All Zod schemas, prompt content, temperature values, and tool descriptions unchanged
- Zero generic "expert" persona strings remain in any agent tool file

## Files Changed

| File | Change |
|------|--------|
| `lib/agents/fred-agent-voice.ts` | NEW -- shared FRED_AGENT_VOICE constant |
| `lib/agents/founder-ops/prompts.ts` | System prompt with Fred voice |
| `lib/agents/founder-ops/tools.ts` | 3 tool system params updated |
| `lib/agents/fundraising/prompts.ts` | System prompt with Fred voice |
| `lib/agents/fundraising/tools.ts` | 4 tool system params ADDED |
| `lib/agents/growth/prompts.ts` | System prompt with Fred voice |
| `lib/agents/growth/tools.ts` | 4 tool system params updated |
