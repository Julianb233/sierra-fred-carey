# Requirements — v8.0 Go-Live: Guided Venture Journey

**Milestone:** v8.0
**Defined:** 2026-03-08
**Source:** Fred Cary Strategy Sessions (March 4 & 7, 2026)
**Previous:** v7.0 requirements in `.planning/REQUIREMENTS.md` (phases 71-73 shipped, 74-76 deferred)

---

## v8.0 Scope (36 requirements, 8 categories)

### Onboarding Transformation (ONBOARD) — 5 requirements

- [ ] **ONBOARD-01:** Mandatory welcome screen after signup — "This is a journey, not a transaction" framing, desert metaphor introduction, shows once per user
- [ ] **ONBOARD-02:** Reality lens check as first interaction — assesses idea readiness, surfaces gaps to motivate engagement
- [ ] **ONBOARD-03:** Five-question structured flow — idea, stage, challenge, goals, timeline as free-text fields captured by FRED
- [ ] **ONBOARD-04:** Handholding orientation — concise guide before FRED interaction explaining Mentor + Progress sections
- [ ] **ONBOARD-05:** IdeaPros template mapping — map ~120-step journey as structural template for Sahara's founder workflow

### Oases Journey System (JOURNEY) — 5 requirements

- [ ] **JOURNEY-01:** Five-stage roadmap — Clarity, Validation, Build, Launch, Grow as "Oases" desert milestones
- [ ] **JOURNEY-02:** Journey visualization UI — Sahara-themed horizontal timeline prominently below chat/call on dashboard
- [ ] **JOURNEY-03:** Stage gating — cannot skip ahead; enforced at FRED conversation + UI level
- [ ] **JOURNEY-04:** Stage completion tracking — track roadmap questions answered, compute per-stage and overall completion percentage
- [ ] **JOURNEY-05:** Fund matching gating — Boardy grayed out until 100% journey completion; celebration milestone at unlock

### UI Relabeling & Navigation (UILABEL) — 6 requirements

- [ ] **UILABEL-01:** Rename "Fred AI" to "Mentor" across all UI surfaces
- [ ] **UILABEL-02:** Rename "Journey" to "Progress" across all UI surfaces
- [ ] **UILABEL-03:** Prominent "Chat with Fred" entry point — killer feature positioning, not buried
- [ ] **UILABEL-04:** "Open Roadmap" button — visible and persistently accessible
- [ ] **UILABEL-05:** Four main sections persistently visible on main view (mobile + desktop)
- [ ] **UILABEL-06:** Onboarding checkbox to text field conversion — free-text answers FRED captures, rephrases, stores

### Founder Memory & Intelligence (MEMORY) — 4 requirements

- [ ] **MEMORY-01:** Per-user memory/mini-brain — structured memory from chat data (problem, traction, decisions)
- [ ] **MEMORY-02:** Capture and restate — FRED rephrases inputs and stores for reference; auto-refresh after conversations
- [ ] **MEMORY-03:** Business intelligence radar — actionable blurbs from web research, inline articles, 24hr refresh
- [ ] **MEMORY-04:** Idea-readiness scoring — personalized explanatory copy, sentiment extraction from conversations

### Daily Guidance & Outreach (GUIDE) — 4 requirements

- [ ] **GUIDE-01:** Daily task orchestration — AI-generated "Today, accomplish these 3 things" based on Oases stage + chat history
- [ ] **GUIDE-02:** Mentor-style outbound — tells user what to focus on (proactive, prescriptive tone)
- [ ] **GUIDE-03:** Twilio SMS integration — outbound SMS for daily guidance (extend existing wiring)
- [ ] **GUIDE-04:** Platform return flow — cost-effective strategy to bring users back for full responses

### Chat & Voice Polish (VOICE) — 4 requirements

- [ ] **VOICE-01:** Fix chat freezing/response-chopping — bug causing mid-response freezes
- [ ] **VOICE-02:** Voice ID wiring — Fred Zaharix voice integration (API key + account confirmed)
- [ ] **VOICE-03:** Chat-voice continuity — last N messages in voice preamble, transcript injected back to chat
- [ ] **VOICE-04:** Mobile call/text continuity — voice calls and text work smoothly on mobile

### Event Launch Kit (EVENT) — 4 requirements

- [ ] **EVENT-01:** QR code landing flow — mobile-optimized signup for Palo Alto event (200 founders)
- [ ] **EVENT-02:** Two-week free trial — activated for event attendees, no credit card required
- [ ] **EVENT-03:** Subscription flow — Stripe checkout wired ($99/month), NOT activated until ready
- [ ] **EVENT-04:** Pitch deck upload — PDF upload, AI scoring pipeline (Pro+ tier)

### User Testing Loop (TEST) — 4 requirements

- [ ] **TEST-01:** Systematic test accounts — create and validate full onboarding flow
- [ ] **TEST-02:** Mobile device testing — call/text continuity, responsive behavior validation
- [ ] **TEST-03:** Event feedback collection — structured framework for first 200 attendees
- [ ] **TEST-04:** Iteration workflow — analyze behavior, prioritize fixes, iterate before scaling

---

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| ONBOARD-01 | Phase 77 | Not Started |
| ONBOARD-02 | Phase 81 | Not Started |
| ONBOARD-03 | Phase 77 | Not Started |
| ONBOARD-04 | Phase 77 | Not Started |
| ONBOARD-05 | Phase 81 | Not Started |
| JOURNEY-01 | Phase 78 | Not Started |
| JOURNEY-02 | Phase 78 | Not Started |
| JOURNEY-03 | Phase 78, 80 | Not Started |
| JOURNEY-04 | Phase 78 | Not Started |
| JOURNEY-05 | Phase 85, 89 | Not Started |
| UILABEL-01 | Phase 77 | Not Started |
| UILABEL-02 | Phase 78 | Not Started |
| UILABEL-03 | Phase 78 | Not Started |
| UILABEL-04 | Phase 78 | Not Started |
| UILABEL-05 | Phase 78 | Not Started |
| UILABEL-06 | Phase 77 | Not Started |
| MEMORY-01 | Phase 79 | Not Started |
| MEMORY-02 | Phase 79, 86 | Not Started |
| MEMORY-03 | Phase 84 | Not Started |
| MEMORY-04 | Phase 83 | Not Started |
| GUIDE-01 | Phase 84 | Not Started |
| GUIDE-02 | Phase 84 | Not Started |
| GUIDE-03 | Phase 84 | Not Started |
| GUIDE-04 | Phase 84 | Not Started |
| VOICE-01 | Phase 82 | Not Started |
| VOICE-02 | Phase 82 | Not Started |
| VOICE-03 | Phase 82 | Not Started |
| VOICE-04 | Phase 82 | Not Started |
| EVENT-01 | Phase 88 | Not Started |
| EVENT-02 | Phase 88 | Not Started |
| EVENT-03 | Phase 89 | Not Started |
| EVENT-04 | Phase 87 | Not Started |
| TEST-01 | Phase 90 | Not Started |
| TEST-02 | Phase 90 | Not Started |
| TEST-03 | Phase 90 | Not Started |
| TEST-04 | Phase 90 | Not Started |

**Coverage: 36/36 requirements mapped. No orphans.**

---

## Cross-Cutting Constraints

1. **FRED Voice Preservation:** All FRED prompt changes validate mentor tone and blunt truth-telling
2. **Stage-Gate Enforcement:** No feature can bypass Oases stage gating — UI + API enforced
3. **Memory Injection:** Every FRED prompt includes founder context via middleware — no generic responses
4. **Mobile-First:** All new UI (Oases, onboarding, daily guidance) must work on mobile
5. **Event-Ready:** Phases 77, 78, 81, 88 form the critical path for Palo Alto launch
6. **Existing Patterns:** FeatureLock, buildFredVoicePreamble(), detectTopic() reused and extended

---

## Deferred

- v7.0 Phases 74-76 (Feedback Intelligence): pattern detection, auto-triage, self-improvement loop
- Real Boardy API integration: blocked pending partnership and API credentials
- Mux admin routes: blocked pending Mux credentials
- Full RLHF / model fine-tuning: wrong scale for Sahara
- WhatsApp Business API: separate infrastructure effort

---

*Created: 2026-03-08*
