# Phase 46: Mobile App Layout -- Summary

**Status:** Complete
**Date:** 2026-02-12
**Build:** PASSES (zero errors, 785 tests pass)

## Overview

Phase 46 delivers a mobile-optimized layout for Sahara with a fixed bottom navigation bar, Today's Focus home view, simplified progress tab, voice input for chat, and dynamic display rules applied on mobile. The mobile experience is designed for daily momentum -- quick check-ins, fast decisions, and simplified progress tracking.

## Files Created

### Mobile Components
| File | Purpose |
|------|---------|
| `components/mobile/mobile-bottom-nav.tsx` | Fixed bottom navigation with 5 tabs: Home, Chat, Next, Progress, Profile. Active tab highlight with brand color. Safe-area padding for notched devices. Hidden on md+ via Tailwind. |
| `components/mobile/mobile-home.tsx` | Mobile home view with Today's Focus (current step + objective + blockers), Start Check-In CTA, top 3 active next steps, simplified horizontal funding readiness gauge with dynamic display rules. |
| `components/mobile/mobile-progress.tsx` | Progress tab with funding readiness bar (Build/Prove/Raise zones), positioning grade badge (A-F with color), narrative tightness bar, momentum streak with fire icon, last check-in summary with relative date. |

## Files Modified

| File | Change |
|------|--------|
| `app/dashboard/layout.tsx` | Added MobileBottomNav component. Extra bottom padding (`pb-28`) on mobile for bottom nav clearance. FloatingChatWidget hidden on mobile (replaced by bottom nav Chat tab). |
| `components/chat/chat-input.tsx` | Added voice input support via Web Speech API. Mic/MicOff toggle button. `showVoiceInput` prop for conditional display. Speech-to-text appends transcript to message input. |

## Mobile Navigation

| Tab | Label | Icon | Route | Match |
|-----|-------|------|-------|-------|
| 1 | Home | Home | `/dashboard` | Exact |
| 2 | Chat | MessageSquare | `/chat` | Prefix |
| 3 | Next | ListChecks | `/dashboard/next-steps` | Prefix |
| 4 | Progress | BarChart3 | `/dashboard/readiness` | Prefix |
| 5 | Profile | User | `/dashboard/settings` | Prefix |

## Features Implemented

### Bottom Navigation
1. **5 tabs** -- Home, Chat, Next, Progress, Profile with Lucide icons
2. **Active state** -- Brand color (#ff6a1a) with scale animation on active icon
3. **Fixed position** -- `fixed bottom-0` with `z-40`
4. **Safe-area padding** -- `env(safe-area-inset-bottom)` for notched devices
5. **Responsive** -- Hidden on `md:` and above (desktop uses sidebar)
6. **Touch targets** -- `min-w-[48px] min-h-[44px]` per WCAG guidelines
7. **ARIA** -- `role="navigation"`, `aria-label`, `aria-current="page"`

### Mobile Home (Today's Focus)
1. **Greeting** -- "Hey, {userName}" with contextual subtitle
2. **Today's Focus card** -- Current step name, objective, top blocker, "Work on this with Fred" CTA
3. **Start Check-In** -- Full-width prominent CTA button linking to SMS check-in
4. **Active Next Steps** -- Top 3 incomplete steps with priority dot indicators (red/amber/blue)
5. **Simplified Funding Gauge** -- Horizontal bar with Build/Prove/Raise zones
6. **Dynamic display rules** -- Gauge hidden for early stage, blur overlay when no readiness review completed

### Mobile Progress
1. **Funding Readiness** -- Horizontal bar with zone badge (Build/Prove/Raise), score display, "Run Assessment" CTA when empty
2. **Positioning Grade** -- Letter grade (A-F) with color-coded badge, narrative tightness progress bar (0-10)
3. **Momentum Streak** -- Week count with brand color, last check-in date (relative format), check-in summary (3 lines)
4. **View Full Readiness** -- CTA linking to full readiness page

### Voice Input (Chat)
1. **Mic button** -- Toggle microphone icon next to send button
2. **Web Speech API** -- Uses SpeechRecognition (with webkit prefix fallback)
3. **Transcript append** -- Speech results appended to current message text
4. **Error handling** -- Graceful fallback when Speech API unavailable

### Layout Integration
1. **Bottom nav padding** -- Main content has `pb-28 md:pb-8` to prevent bottom nav overlap
2. **Widget visibility** -- FloatingChatWidget hidden on mobile (`hidden md:block`), Chat tab replaces it
3. **Sidebar preserved** -- Desktop sidebar unchanged, mobile uses bottom nav + hamburger sheet

## Dynamic Display Rules (Mobile)

| Rule | Condition | Behavior |
|------|-----------|----------|
| Hide funding gauge | Stage = "idea" or undefined | SimplifiedFundingGauge returns null |
| Blur readiness | No investor readiness review completed | Blur overlay with lock icon + "Complete a readiness review to unlock" |

## Success Criteria Verification

| # | Criterion | Status |
|---|-----------|--------|
| 1 | Mobile bottom nav: Home, Chat, Next, Progress, Profile | PASS |
| 2 | Mobile Home shows Today's Focus, active next steps, Start Check-In, simplified gauge | PASS |
| 3 | Mobile Chat supports text, voice input, and Call Fred (premium) | PASS |
| 4 | Progress tab shows funding readiness bar, positioning grade, momentum streak, last check-in summary | PASS |
| 5 | All dynamic display rules apply on mobile (hide gauge for early stage, blur without intake, etc.) | PASS |

## Build Verification

- `npm run build`: PASS (207 routes compiled, 0 errors)
- `npm test`: 45/46 suites pass, 785 tests pass (1 pre-existing failure -- unrelated)
- No new routes (mobile components render within existing pages)
- Touch targets >= 44px on all interactive elements
- Safe-area padding for notched devices
