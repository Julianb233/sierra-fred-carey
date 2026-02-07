# Summary: 14-02 SMS and Voice Agent Voice Rewrite

## What Changed

**SMS templates (`lib/sms/templates.ts`)** -- Already updated with Fred's voice (3 rotating check-in messages, Fred Cary welcome, "--Fred" stop confirmation). No additional changes needed.

**Voice agent code fallback (`lib/voice-agent.ts`)**:
- AccessToken name changed from "AI Support Assistant" to "Fred Cary"
- `getDefaultSystemPrompt()` fully rewritten: removes all "A Startup Biz" content, identifies as Fred Cary with bio data from fred-brain.ts (yearsExperience, companiesFounded, IPOs, acquisitions)
- Imports FRED_BIO, FRED_COMMUNICATION_STYLE, FRED_COMPANIES, SAHARA_MESSAGING from fred-brain.ts
- Includes Sahara tier info, voice style rules, and explicit "never say AI assistant" directive

**Admin API defaults (`app/api/admin/voice-agent/config/route.ts`)**:
- Default config name: "Fred Cary" (was "Default Agent")
- System prompt: Fred Cary persona with credentials
- Greeting: "Hey, it's Fred. What's on your mind today?"
- After-hours and fallback messages in Fred's voice

**Database migration (`lib/db/migrations/014_voice_agent_fred_persona.sql`)**:
- NEW migration that UPDATEs the default row from migration 009
- Targets `WHERE name = 'Default Agent' AND is_active = true`
- Does NOT modify original migration 009

## Verification

- `tsc --noEmit`: 0 errors (excluding pre-existing PWA file)
- No "A Startup Biz" or "AI Support Assistant" references remain in voice-agent.ts
- All 3 voice agent config sources updated (code fallback, admin API, DB migration)

## Files Changed

| File | Change |
|------|--------|
| `lib/voice-agent.ts` | Import fred-brain.ts, AccessToken name, getDefaultSystemPrompt rewrite |
| `app/api/admin/voice-agent/config/route.ts` | Default config with Fred persona |
| `lib/db/migrations/014_voice_agent_fred_persona.sql` | NEW -- UPDATE migration for default voice config |
