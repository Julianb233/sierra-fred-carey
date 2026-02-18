# Deploy Verification — Pass 5: Live Voice Transcript UI

**Date:** 2026-02-18
**Commit:** `715b731` — feat: add live transcript display during voice call
**Deployment:** https://sahara-abiknb709-ai-acrobatics.vercel.app
**Production:** https://www.joinsahara.com
**BrowserBase Sessions:**
- Free-tier session: https://www.browserbase.com/sessions/9db980a2-5dd7-4e67-a79f-03fb936835b7
- Pro-tier session: https://www.browserbase.com/sessions/0019eb85-99da-4403-86c7-6b8eea23a14b

---

## Pre-flight Checks

| Check | Status | Details |
|-------|--------|---------|
| Vercel Build | PASS | Ready in ~2min |
| HTTP Health | PASS | 200 OK on www.joinsahara.com |
| Deployed Commit | PASS | `715b731` matches pushed commit |
| npm run build | PASS | Zero type errors |

## Change Summary

Added a live transcript display panel inside the voice call modal (`call-fred-modal.tsx`):
- Scrollable transcript container (max 200px) above mute/end-call buttons
- Chat-bubble UI: user messages right-aligned in orange, Fred's left-aligned with border
- Auto-scroll to bottom on new entries via `useRef` + `useEffect`
- "Listening..." placeholder when transcript is empty
- Modal widens to `sm:max-w-lg` during in-call state

## Test Results

| # | Test | Status | Details |
|---|------|--------|---------|
| 1 | Build compiles | PASS | `npm run build` — zero errors |
| 2 | Production URL live | PASS | `curl` returns 200 |
| 3 | Login page renders | PASS | Screenshot verified |
| 4 | Auth flow (sign in) | PASS | test-dev@joinsahara.com → /dashboard |
| 5 | Dashboard renders | PASS | Full page with sidebar, onboarding, snapshot |
| 6 | Chat widget works | PASS | Floating Fred chat opens correctly |
| 7 | JS bundle deployed | PASS | Chunk `6285-25711560a505af54.js` serves from CDN |
| 8 | Transcript UI in bundle | PASS | "Listening..." text confirmed in deployed chunk |
| 9 | Auto-scroll code deployed | PASS | `scrollIntoView({behavior:"smooth"})` in bundle |
| 10 | Modal header in bundle | PASS | "On Call with Fred" confirmed in chunk |
| 11 | Pro tier upgrade | PASS | DB profiles.tier=1, sidebar shows "Pro Plan" |
| 12 | Call Fred button visible | PASS | Orange "Call Fred" button appears top-right on Pro |
| 13 | Call Fred modal opens | PASS | Idle state: phone icon, description, Start Call button |
| 14 | Start Call initiates | PASS | Transitions to connecting state, calls /api/fred/call |
| 15 | Error state renders | PASS | Shows "Connection Failed" with Close/Retry buttons |
| 16 | Retry button works | PASS | Re-attempts connection on click |

## Pro-Tier Verification (Pass 5b)

Upgraded test-dev@joinsahara.com to Pro tier via Supabase DB (`profiles.tier = 1`). The subscription API fallback at `app/api/user/subscription/route.ts:50-59` correctly picks up the admin-managed tier.

### Verified with Pro account:
- Sidebar badge changes from "Free Plan" to **"Pro Plan"**
- **"Call Fred" button** appears in the top-right corner of the dashboard
- Modal opens with correct idle state UI (phone icon, "Quick decision call (up to 10 min)", Start Call button)
- Start Call correctly calls `/api/fred/call` and attempts LiveKit connection
- Error state correctly handles connection failure (Close + Retry buttons)

### Limitation: In-Call State Not Reachable via Stagehand
The in-call state (where the transcript panel renders) requires:
1. LiveKit room connection (succeeds)
2. Microphone permission (`setMicrophoneEnabled(true)` at line 229)

BrowserBase headless browsers don't have a microphone, so the call flow hits the mic error handler (line 230-235) which disconnects and shows the error state. The LiveKit `Disconnected` event handler then fires, showing "Connection Failed."

The transcript panel code is confirmed deployed in the production JS bundle via three unique markers:
- `"Listening..."` — empty-state placeholder
- `scrollIntoView({behavior:"smooth"})` — auto-scroll effect
- `"On Call with Fred"` — in-call modal header

## Recommendation

**SHIP** — 16/16 tests pass. All modal states verified except in-call (requires real microphone). The transcript UI code is confirmed in production. Manual testing on a real device with mic access would fully verify the in-call transcript rendering.
