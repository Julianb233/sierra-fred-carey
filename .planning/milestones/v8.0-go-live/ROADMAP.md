# Roadmap — v8.0 Go-Live: Guided Venture Journey

**Milestone:** v8.0
**Phases:** 77-90 (14 phases)
**Waves:** 5 (parallel execution groups)
**Source:** Fred Cary Strategy Sessions (March 4 & 7, 2026)
**Target:** Palo Alto launch to 200 founders

---

## Overview

Transform Sahara from "chatbot with tools" into a structured guided venture journey. The "Oases" 5-stage desert metaphor (Clarity, Validation, Build, Launch, Grow) becomes the backbone of the entire UX. Every FRED interaction is contextualized to the founder's stage, memory, and progress. The event launch kit enables 200 founders to sign up via QR code and begin their journey in under 5 minutes.

---

## Wave 1 — Foundation (must complete first)

### Phase 77: Guided Venture Journey Onboarding
**Goal:** First-time users understand Sahara is a guided journey and complete a structured intake before touching any tools.
**Plans:** 2
**Dependencies:** None (entry point)
**Priority:** CRITICAL
**Status:** Not Started

**Requirements:** ONBOARD-01, ONBOARD-02, ONBOARD-03, ONBOARD-04

**Success Criteria:**
1. New user sees mandatory welcome screen immediately after signup explaining "This is a journey, not a transaction" with desert/Oases metaphor introduction
2. Welcome screen shows once per user and never reappears on subsequent logins
3. User completes 5-question structured intake (idea, stage, challenge, goals, timeline) as free-text fields that FRED captures and stores
4. After intake completion, user is automatically redirected to Reality Lens as their first substantive interaction

---

### Phase 78: Oases Stage Visualization & Gating
**Goal:** Users see their venture journey as a visual 5-stage desert roadmap and understand exactly where they are and what comes next.
**Plans:** 2
**Dependencies:** None (parallel with 77, 79)
**Priority:** CRITICAL
**Status:** Not Started

**Requirements:** JOURNEY-01, JOURNEY-02, JOURNEY-03, JOURNEY-04, JOURNEY-05

**Success Criteria:**
1. Dashboard displays a Sahara-themed horizontal timeline showing 5 Oases stages: Clarity, Validation, Build, Launch, Grow
2. Each stage is clickable and shows what requirements must be completed to progress
3. Users cannot access tools or content gated behind a later stage (e.g., no pitch deck before completing Validation)
4. Overall journey completion percentage is prominently displayed and updates in real-time as steps are completed
5. Fund matching (Boardy) is visually grayed out and locked with "Complete your venture journey first (You're at X%)" messaging until 100% completion

---

### Phase 79: Active Founder Memory Layer
**Goal:** FRED references the founder's specific context (name, company, stage, market, co-founder, biggest challenge) in every single response — no generic answers ever.
**Plans:** 2
**Dependencies:** None (parallel with 77, 78)
**Priority:** CRITICAL
**Status:** Not Started

**Requirements:** MEMORY-01, MEMORY-02, MEMORY-03

**Success Criteria:**
1. Every FRED chat response references at least one founder-specific detail (company name, market, stage, challenge)
2. Founder context is auto-refreshed after each conversation — new information mentioned in chat updates the memory layer
3. Co-founder field is captured during onboarding and available to FRED in all subsequent interactions
4. When memory data is stale or missing, FRED asks a clarifying question rather than guessing or giving generic advice

---

## Wave 2 — Core Experience (depends on Wave 1)

### Phase 80: Structured Stage-Gate Enforcement
**Goal:** FRED conversations are compartmentalized by Oases stage — users work through the venture process in order, not random Q&A.
**Plans:** 2
**Dependencies:** Phase 78 (Oases stages must exist)
**Priority:** CRITICAL
**Status:** Not Started

**Requirements:** JOURNEY-03 (enforcement layer), GUIDE-01 (process-driven chat)

**Success Criteria:**
1. When a user asks about a topic belonging to a later stage (e.g., "help me write a pitch deck" while in Clarity), FRED gently redirects: "Let's finish [current step] first"
2. FRED prompts are updated to enforce stage sequencing — conversation topics are guided by current Oases stage
3. Stage validator checks user's current Oases stage against their intent and blocks premature advancement
4. Chat feels process-driven and structured, not open-ended — FRED leads the conversation flow

---

### Phase 81: Reality Lens as First Interaction
**Goal:** Every new founder's first substantive experience is a reality check that sets their initial Oases stage based on idea readiness.
**Plans:** 2
**Dependencies:** Phase 77 (onboarding redirects here), Phase 78 (sets initial stage)
**Priority:** HIGH
**Status:** Not Started

**Requirements:** ONBOARD-02 (reality lens check), ONBOARD-05 (gap awareness)

**Success Criteria:**
1. After onboarding completion, user is auto-redirected to a lightweight "quick reality check" mode (5-6 focused questions)
2. Reality Lens results determine initial Oases stage placement (low score sets Clarity, high score sets Validation or beyond)
3. Results surface gaps that motivate engagement — "Here's what you need to figure out before investors will listen"
4. A `reality_lens_complete` flag is stored so the system knows the user has been assessed

---

### Phase 82: Chat/Voice Continuity
**Goal:** Text chat and voice calls share full context — switching between them feels like one continuous conversation.
**Plans:** 2
**Dependencies:** Phase 79 (memory layer provides context infrastructure)
**Priority:** HIGH
**Status:** Not Started

**Requirements:** VOICE-03, VOICE-04

**Success Criteria:**
1. Voice agent preamble includes the last N chat messages so FRED picks up where text left off
2. After a voice call ends, the transcript and summary are injected back into the chat history
3. Before a voice call starts, the user sees "Last discussed: [topic]" so they know FRED remembers
4. Switching between text and voice on mobile feels seamless with no context loss

---

## Wave 3 — Intelligence & Engagement

### Phase 83: Founder Mindset Monitor (Sentiment Detection)
**Goal:** FRED detects founder stress and frustration from conversation patterns and proactively intervenes before burnout.
**Plans:** 2
**Dependencies:** Phase 79 (memory layer for logging signals)
**Priority:** HIGH
**Status:** Not Started

**Requirements:** MEMORY-04 (sentiment extraction), GUIDE-02 (proactive intervention)

**Success Criteria:**
1. FRED extracts sentiment signals from every chat message (stress, frustration, excitement, confidence) without explicit user action
2. When stress patterns are detected (not just explicit complaints), FRED proactively intervenes: "You seem frustrated about X. Let's step back..."
3. Stress signals are logged and visible on the admin dashboard for pattern analysis
4. High stress triggers a suggested wellbeing check-in or break recommendation

---

### Phase 84: Daily Mentor Guidance System
**Goal:** Founders open their dashboard and see exactly what to do today — FRED tells them, they don't have to ask.
**Plans:** 2
**Dependencies:** Phase 78 (Oases stage context), Phase 79 (founder memory)
**Priority:** HIGH
**Status:** Not Started

**Requirements:** GUIDE-01, GUIDE-02, GUIDE-03, GUIDE-04

**Success Criteria:**
1. Dashboard displays a "Today, accomplish these 3 things" widget with AI-generated tasks based on current Oases stage and recent chat history
2. Tasks refresh daily and reflect the founder's actual situation (not generic advice)
3. Task completion can be logged and feeds back into journey progress
4. Proactive SMS via Twilio delivers the same prescriptive daily guidance to the founder's phone

---

### Phase 85: Journey-Gated Fund Matching
**Goal:** Fund matching unlocks only when a founder has completed the full venture journey — creating a meaningful milestone celebration.
**Plans:** 1
**Dependencies:** Phase 78 (journey completion tracking)
**Priority:** HIGH
**Status:** Not Started

**Requirements:** JOURNEY-05 (fund matching gating)

**Success Criteria:**
1. Boardy fund matching UI is grayed out with clear messaging showing current journey completion percentage
2. When a user reaches 100% journey completion, a celebration milestone is triggered (banner, confetti, FRED congratulations)
3. FRED references Boardy investor matches in chat when the user is ready (100% complete)
4. Introduction preparation guidance (call scripts, email templates) is available post-unlock

---

## Wave 4 — Polish & Launch

### Phase 86: FRED Response Conciseness & Baby-Stepping
**Goal:** FRED gives short, actionable responses by default and breaks big goals into 1-week micro-steps.
**Plans:** 1
**Dependencies:** Phase 80 (stage-gate enforcement provides conversation structure)
**Priority:** MEDIUM
**Status:** Not Started

**Requirements:** GUIDE-02 (mentor-style), MEMORY-02 (capture and restate)

**Success Criteria:**
1. FRED default responses are 2-3 sentences maximum, with a "Want me to break that down?" follow-up offer
2. When giving action items, FRED prescribes 1-week micro-steps (never multi-month asks)
3. Voice (TTS) responses sound natural and concise — no walls of text read aloud
4. Prompt verbosity is measurably reduced across all coaching topics

---

### Phase 87: Pitch Deck Upload & AI Scoring
**Goal:** Pro+ founders can upload a pitch deck PDF and receive structured AI scoring with VC-perspective feedback.
**Plans:** 2
**Dependencies:** Phase 80 (stage-gating — must be in Build stage or later)
**Priority:** MEDIUM
**Status:** Not Started

**Requirements:** EVENT-04 (pitch deck upload), JOURNEY-03 (stage-gated access)

**Success Criteria:**
1. User uploads a PDF pitch deck and receives AI-generated scores across 7 categories: problem clarity, market size, team, traction, GTM, narrative, investability
2. Each category shows specific feedback and "What VCs want to see" recommendations
3. Feature is gated to Pro+ tier (FeatureLock enforced)
4. Upload, parsing, and scoring complete within 60 seconds for a standard 15-slide deck

---

### Phase 88: Event Launch Kit
**Goal:** 200 founders at the Palo Alto event can scan a QR code, sign up, and start their guided journey in under 5 minutes.
**Plans:** 2
**Dependencies:** Phase 77 (onboarding flow must work), Phase 81 (Reality Lens as first interaction)
**Priority:** MEDIUM
**Status:** Not Started

**Requirements:** EVENT-01, EVENT-02, EVENT-03

**Success Criteria:**
1. QR code resolves to a mobile-optimized landing page with instant signup flow
2. Two-week free trial is automatically activated for event attendees (no credit card required)
3. Signup-to-first-Reality-Lens-interaction takes under 5 minutes on mobile
4. Event conversion analytics track QR scans, signups, onboarding completions, and first FRED interactions

---

### Phase 89: Boardy Integration Polish & Journey Celebration
**Goal:** Completing the venture journey feels like a real milestone, and fund matching transitions seamlessly into investor preparation.
**Plans:** 1
**Dependencies:** Phase 85 (journey-gated fund matching)
**Priority:** MEDIUM
**Status:** Not Started

**Requirements:** JOURNEY-05 (fund matching), EVENT-03 (subscription flow)

**Success Criteria:**
1. "Congratulations! You've completed the Venture Journey" banner displays with celebration UX
2. FRED proactively references investor matches in chat after journey completion
3. Intro preparation guidance (call script, email template) is generated and accessible
4. The entire Boardy experience feels in-platform (not "go to Boardy.com")

---

## Wave 5 — Post-Launch

### Phase 90: User Testing Loop (Robert Williams Protocol)
**Goal:** Systematic testing and feedback collection from the first 200 founders drives rapid iteration.
**Plans:** 1
**Dependencies:** Phase 88 (event launch kit deployed)
**Priority:** LOW
**Status:** Not Started

**Requirements:** TEST-01, TEST-02, TEST-03, TEST-04

**Success Criteria:**
1. Test accounts can be created systematically to validate the full onboarding-to-journey flow
2. Mobile device testing confirms call/text continuity and responsive behavior
3. Feedback collection framework captures structured input from event attendees
4. Iteration workflow processes feedback into prioritized fixes within 48 hours of collection

---

## Requirement Coverage

| Requirement | Description | Phase | Status |
|-------------|-------------|-------|--------|
| ONBOARD-01 | Welcome screen — mandatory educational screen | 77 | Not Started |
| ONBOARD-02 | Reality lens check — first interaction assesses readiness | 81 | Not Started |
| ONBOARD-03 | Five-question structured flow | 77 | Not Started |
| ONBOARD-04 | Handholding orientation before FRED | 77 | Not Started |
| ONBOARD-05 | IdeaPros template mapping (gap awareness) | 81 | Not Started |
| JOURNEY-01 | Five-stage roadmap (Oases) | 78 | Not Started |
| JOURNEY-02 | Journey visualization UI | 78 | Not Started |
| JOURNEY-03 | Stage gating enforcement | 78, 80 | Not Started |
| JOURNEY-04 | Stage completion tracking | 78 | Not Started |
| JOURNEY-05 | Fund matching gating | 85, 89 | Not Started |
| UILABEL-01 | Rename "Fred AI" to "Mentor" | 77 | Not Started |
| UILABEL-02 | Rename "Journey" to "Progress" | 78 | Not Started |
| UILABEL-03 | Prominent "Chat with Fred" entry point | 78 | Not Started |
| UILABEL-04 | "Open Roadmap" button visible | 78 | Not Started |
| UILABEL-05 | Four main sections on main view | 78 | Not Started |
| UILABEL-06 | Onboarding checkbox to text field conversion | 77 | Not Started |
| MEMORY-01 | Per-user memory/mini-brain | 79 | Not Started |
| MEMORY-02 | Capture and restate | 79, 86 | Not Started |
| MEMORY-03 | Business intelligence radar | 84 | Not Started |
| MEMORY-04 | Idea-readiness scoring (24hr refresh) | 83 | Not Started |
| GUIDE-01 | Daily task orchestration | 84 | Not Started |
| GUIDE-02 | Mentor-style outbound | 84 | Not Started |
| GUIDE-03 | Twilio integration for daily guidance | 84 | Not Started |
| GUIDE-04 | Platform return flow | 84 | Not Started |
| VOICE-01 | Fix chat freezing/response-chopping | 82 | Not Started |
| VOICE-02 | Voice ID wiring (Fred Zaharix) | 82 | Not Started |
| VOICE-03 | Chat-voice continuity | 82 | Not Started |
| VOICE-04 | Mobile call/text continuity | 82 | Not Started |
| EVENT-01 | QR code landing flow | 88 | Not Started |
| EVENT-02 | Two-week free trial | 88 | Not Started |
| EVENT-03 | Subscription flow | 89 | Not Started |
| EVENT-04 | Pitch deck upload | 87 | Not Started |
| TEST-01 | Systematic test accounts | 90 | Not Started |
| TEST-02 | Mobile device testing | 90 | Not Started |
| TEST-03 | Event feedback collection | 90 | Not Started |
| TEST-04 | Iteration workflow | 90 | Not Started |

**Coverage: 36/36 requirements mapped. No orphans.**

---

## Progress

| Phase | Name | Plans | Wave | Priority | Status |
|-------|------|-------|------|----------|--------|
| 77 | Guided Venture Journey Onboarding | 2 | 1 | CRITICAL | Not Started |
| 78 | Oases Stage Visualization & Gating | 2 | 1 | CRITICAL | Not Started |
| 79 | Active Founder Memory Layer | 2 | 1 | CRITICAL | Not Started |
| 80 | Structured Stage-Gate Enforcement | 2 | 2 | CRITICAL | Not Started |
| 81 | Reality Lens as First Interaction | 2 | 2 | HIGH | Not Started |
| 82 | Chat/Voice Continuity | 2 | 2 | HIGH | Not Started |
| 83 | Founder Mindset Monitor | 2 | 3 | HIGH | Not Started |
| 84 | Daily Mentor Guidance System | 2 | 3 | HIGH | Not Started |
| 85 | Journey-Gated Fund Matching | 1 | 3 | HIGH | Not Started |
| 86 | FRED Response Conciseness | 1 | 4 | MEDIUM | Not Started |
| 87 | Pitch Deck Upload & AI Scoring | 2 | 4 | MEDIUM | Not Started |
| 88 | Event Launch Kit | 2 | 4 | MEDIUM | Not Started |
| 89 | Boardy Integration Polish | 1 | 4 | MEDIUM | Not Started |
| 90 | User Testing Loop | 1 | 5 | LOW | Not Started |

**Total: 14 phases, 24 plans, 5 waves**

---

## Architecture Decisions

| Decision | Rationale |
|----------|-----------|
| `oases_stage` column on `profiles` table | Single source of truth for user's current stage; avoids join complexity |
| Journey completion derived from stage + step completion | No separate "progress" table needed; computed from existing data |
| Stage transitions triggered by FRED conversation analysis | Natural progression as users complete coaching conversations, not manual checkboxes |
| FeatureLock extended with `requiredStage` prop | Reuses existing gating pattern (tier-based) for stage-based gating |
| All FRED prompts get founder context via middleware | Centralized injection point; no per-feature wiring needed |
| SMS guidance shares DailyAgenda API with dashboard widget | Single source of truth for daily tasks; SMS is just a delivery channel |
| UI relabeling bundled into relevant phases (not separate phase) | "Mentor" and "Progress" labels ship with the features they describe |

---

## Key Milestones

| Milestone | Trigger | Meaning |
|-----------|---------|---------|
| Wave 1 Complete | Phases 77-79 shipped | Foundation is live: onboarding, Oases, memory |
| Wave 2 Complete | Phases 80-82 shipped | Core journey experience works end-to-end |
| Launch Ready | Waves 1-3 + Phase 88 shipped | Palo Alto event can proceed |
| Full v8.0 | All 14 phases shipped | Complete guided venture journey with polish |

---

*Created: 2026-03-08*
*Source: Fred Cary Strategy Sessions (March 4 & 7, 2026)*
