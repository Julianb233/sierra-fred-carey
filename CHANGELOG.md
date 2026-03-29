# Sahara Changelog

Simplified summary of recent updates for team review.

---

## March 24, 2026

### SMS & Twilio Integration
- Complete Twilio SMS integration for launch readiness

### Reality Lens
- Reality Lens is now the first interaction after onboarding — grounds users in real business assessment before mentoring begins

---

## March 23, 2026

### Dashboard Improvements
- Added stage-based goal focus banner to dashboard — shows users what to focus on based on their current stage
- Added business fundamentals step to onboarding wizard

### Branding & Copy
- Renamed UI labels: "Mentor" replaces "Fred", "Progress" replaces "Journey" — clearer language for new users

### AI Backend
- Switched AI backend from OpenAI to Gemini 3 Flash Preview (OpenAI credits exhausted)
- Fixed repeated identical responses in mentor chat

---

## March 21–22, 2026

### Pricing & Monetization
- Added Builder tier at $39/month
- Updated dedicated pricing page with Builder tier and Fred's copy
- Corrected all inflated stats and fixed social sharing image

### AI Mentor Brain v2.0
- 7 new Fred Cary brain upgrades from WhatsApp feedback
- Strengthened pattern recognition and reality check triggers
- Autoresearch optimization iteration applied

### UX Fixes
- Removed floating mic that was covering the send button on mobile
- Fixed mobile voice input

### Infrastructure
- Added missing whatsapp-reply module for sync-linear-status cron

---

## March 18–19, 2026

### Investor Deck
- New investor deck page with team section, revenue chart, and PDF download

### Bug Fixes
- Resolved data ingestion pipeline crashes
- Removed admin dashboard password for easier stakeholder sharing
- Expanded stress detection keywords and enhanced wellness interventions
- Replaced "assistant" with "mentor" in all user-facing text

---

## March 10–11, 2026

### Payments
- Stripe checkout integration for funnel

### Funnel Launch
- Completed funnel version for u.joinsahara.com
- Repositioned Fred AI chat above the fold on homepage
- Funnel-to-platform data persistence sync service

### Stability
- Fixed duplicate episodes bug in Fred AI
- Resolved database column mismatches causing Fred AI latency
- Fixed crash loops and resolved 129 test failures

---

## March 9, 2026 — v8.0 Go-Live

### Guided Venture Journey (Major Release)
- Mapped IdeaPros ~120-step user journey to 5 Oases stages
- Full v8.0 Go-Live milestone shipped

### Payments & Trials
- 14-day free trial with $99/month subscription via Stripe

### Contact Intelligence
- Embedded 17,100 contacts into Pinecone for semantic search
- Deep enrichment pipeline with email/iMessage content and AI summaries
- Added interaction enrichment columns and Gmail/iMessage sync

### Chat & UX
- Floating chat-with-Fred overlay accessible on mobile
- Repositioned chat/talk interface above the fold
- Fixed login with inline validation and clearer password placeholders

### AI Improvements
- Added deduplication to Fred's episodic memory storage
- Eliminated duplicate DB queries in Fred memory load pipeline

### Auth
- Added PKCE callback route and fixed password reset flow

### Testing
- Full E2E regression suite for funnel version launch
- Mobile responsive test suite for launch readiness

---

## March 8, 2026

### Code Quality
- Resolved all TypeScript errors and lint blockers
- Fixed pricing page blank page caused by opacity:0 animations
