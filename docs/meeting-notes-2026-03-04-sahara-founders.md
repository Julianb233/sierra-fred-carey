# Sahara Founders Meeting Notes
**Date:** March 4, 2026 (11:00 AM PST) + Strategy Session March 7, 2026
**Participants:** Fred Cary, Julian Bradley, Alessandro De La Torre (Alex), Ira Hayes, Gregory (engineering)

---

## Executive Summary

Two key meetings covered Sahara's product readiness, launch strategy, and partnership opportunities. The core theme: Sahara must transform from a chatbot tool into a **guided venture journey** that provides co-founder-level intelligence to pre-seed/seed founders.

---

## Meeting 1: Sahara Founders (March 4, 2026)

### Partnership Opportunity with Gregory
- Gregory's platform connects to **100+ accelerators** and potentially **3 million founders**
- 97% of rejected founders lack scalable coaching — Sahara fills this gap
- Partnership could raise conversion from **3-5% to ~25%** via accelerator referrals
- Options: white-label, merger, or direct integration

### Product Development Focus
- Improved onboarding with structured guidance for founders
- Five-stage flow: **Idea → Validation/Research → Branding → Product Development → Go-to-Market**
- IdeaPros user journey (~120-130 steps) proposed as structural template

### Monetization Model
- Proposed tiered subscriptions starting at **$99/month**
- Two-week free trial for event attendees
- Targeting conversion rates from 3-5% to potentially 25%

### User Engagement Testing
- Close to **1,000 founders** await onboarding
- Focus on active engagement during **Palo Alto event** (~200 founders) for feedback
- Use first 200 attendees to pressure-test the system

### Technical Issues Identified
- Chat freezing/response-chopping bug in demo system
- Voice-thread API issue (confirmed fixed, needs hard reload)
- Compute costs per active user unknown — critical input for pricing

### Action Items (March 4)
1. **Julian Bradley** — Run performance and compute-cost estimates, send via WhatsApp
2. **Julian Bradley** — Integrate agreed onboarding flow once he has API key and voice ID
3. **Julian Bradley** — Message group when pushed updates are deployed for testing
4. **Ira Hayes** — Run cost model for compute and present results
5. **Fred Cary** — Prepare presentation deck for Palo Alto pitch to 200 founders
6. **Fred Cary** — Verify outstanding authorizations/screenshots completed
7. **Alex LaTorre** — Fix chat freezing/response-chopping bug
8. **Alex LaTorre** — Enable subscription flow + two-week free trial for event
9. **Alex LaTorre** — Convert onboarding checkboxes into text fields for free-text answers
10. **Alex LaTorre** — Confirm and provide correct voice ID and account access to Julian
11. **Alex LaTorre** — Rename UI: "Fred AI" → "Mentor", "Journey" → "Progress"
12. **Alex LaTorre** — Add visible "open roadmap" button, make 4 main sections persistently visible
13. **Alex LaTorre** — Implement radar UI copy and inline article/blurb feature
14. **Alex LaTorre** — Ensure mobile call/text continuity works
15. **Alex LaTorre** — Surface simple progress percentage above business-intelligence radar
16. **Gregory + Alex** — Implement storing cleaned chat data as per-user memory/mini-brain
17. **Product team** — Create "chat with Fred" entry point + visible progress tracking
18. **Product team** — Add concise onboarding guide before users interact with Mentor
19. **All participants** — Create new accounts and test Sahara this week

---

## Meeting 2: Sahara Strategy Session (March 7, 2026)

### Key Updates
- Legal matter: respondent has not accepted service
- Visual issues from previous meetings addressed
- Voice feature confirmed working
- Login fixed, login button available for returning users
- Fred says **NOT ready for payments yet**

### Launch Strategy
- Go live with Alex's joinsahara.com version first
- Julian's full version targeting Tuesday readiness
- Experience must feel like gaining a **"co-founder level intelligence layer"**

### Fred's Vision: Core Platform Philosophy
The platform must be a **"guided venture journey"**, NOT a chatbot:
- Users should feel they've entered a structured journey, not opened a chat box
- AI (Sahara) guides founders **step by step** through building an investor-ready company
- Target: pre-seed and seed stage founders
- Users CANNOT skip ahead (e.g., can't build pitch deck before validating problem)

### Core Features Required

1. **Founder Memory Layer** — Platform remembers user's idea, progress, mindset; captures and rephrases inputs for later updates
2. **Chat or Call with Fred** — Killer feature, must be upfront; continuity between text chat and voice call
3. **Structured Founder Guidance** — Compartmentalized process, methodical task lists
4. **Reality Lens** — Test market demand; initial "reality lens check" assesses idea readiness
5. **Founder Mindset Monitor** — Address emotional/physical health when user seems frustrated
6. **Daily Guidance** — Orchestrated, methodical tasks via outbound text (needs Twilio integration); tell user what to focus on rather than asking what they need
7. **Pitch Deck Review** — Upload and analyze documents; score on problem clarity, market size, investability; suggest improvements and create investor-grade deck
8. **VC Introductions** — Integrate Bordy's API for direct VC/angel introductions (scalable)

### Onboarding Redesign
- Missing crucial **"handholding aspect"** at beginning
- Mandatory educational screen on first sign-up explaining purpose, how it works, "journey not transaction"
- Five-question onboarding flow for new accounts
- Start with **"reality lens check"** to assess founder's idea readiness
- "Spook them in onboarding" — show gaps to motivate engagement
- Fund matching grayed out until 100% journey completion

### Journey Visualization: "Oases" Concept
Fred proposed milestones called **"Oases"** (matches Sahara branding):
- **Clarity** → **Validation** → **Build** → **Launch** → **Grow**
- Progress roadmap graphic prominently displayed below chat/call function
- Progress percentage visible above business-intelligence radar
- Gamification elements to drive engagement

### UI/UX Changes
- Rename "Fred AI" → **"Mentor"**
- Rename "Journey" → **"Progress"**
- Prominent "chat with Fred" entry point
- Visible progress/checklist with text answers (not just checkboxes)
- "Open roadmap" button persistently visible
- Business intelligence radar with actionable blurbs/headlines
- Idea-readiness scoring updates every 24 hours with personalized copy

### AI Behavior
- Current version intentionally concise (trained to foster conversation, not essays)
- Fred treats user input as truthful — risk if users enter joking/inaccurate data
- Need onboarding guide or first-statement orientation before interaction

### Suggested Next Steps (March 7)
1. **Fred Cary** — Determine content for 3-4 slides for QR code; share presentation slides
2. **Alex LaTorre** — Refine onboarding with 'helping hand' aspect, onboarding message, and progress roadmap graphic

---

## Robert Williams User Testing Loop
*(To be implemented for launch readiness)*

The team needs a systematic user testing feedback loop:
- Create new test accounts and go through full onboarding
- Validate the interest/five-question system
- Test on mobile devices for call/text continuity
- Collect learnings from first 200 event attendees
- Iterate based on real user behavior before scaling

---

## Fred's 7 FRED Brain Enhancements (WhatsApp, March 7, 4:28-4:53 PM)

Fred posted these enhancements to the WhatsApp group and said Alex should "cut and paste" them and "these should be added to the brain":

1. **Founder Wellbeing** — Normalize insecurity/burnout, reduce to controllable actions, offer practical exits, be steady not therapeutic
2. **Answer Completeness Rule** — Complete answer in one response, no drip-feeding, no "would you like to know..."
3. **Question Discipline Rule** — Only ask when decision-critical, max 3 questions, no curiosity questions, state assumptions and proceed
4. **Compression Rule (Fred Voice)** — High signal, clear headers, short paragraphs, bullet points, plain language, no repetition
5. **Founder Pattern Recognition** — Detect: Idea Without Customer, Tech First, Everyone Is Customer, Distribution Fantasy, Premature Fundraising, Feature Not Business, Consulting Disguised as Startup, Vanity Traction, Overbuilt Product
6. **Reality Check Trigger** — Detect delusion signals, challenge calmly, translate to testable hypothesis, recommend smallest experiment
7. **Decision Framework Library** — 10 structured tests: Problem, Customer, Wedge, Distribution, Build vs Validate, Fundraising, Focus, Founder Edge, Timing, Scalability
8. **Traction Coaching Mode** — 0→10→100 customer stages: founder-led outreach → repeatable acquisition → retention/PMF

---

## ElevenLabs Voice Credentials (WhatsApp, Feb 27-28)

- **Voice name**: "Fred Sahara" (in ElevenLabs account)
- **Voice ID**: `uxq5gLBpu73uF1Aqzb2t`
- **API Key**: `sk_debc2a467e21c7458e596a6fb06e83d0db6410b9ca5c9f2e`
- **Note**: Voice needs re-authentication — Fred should record via https://elevenlabs.io/app/voice-lab?action=edit

---

## Known Issues (WhatsApp)

- **deck.joinsahara.com broken images** — Fred reported Mar 6, "still not working" Mar 7 morning
- **you.joinsahara.com** — Alex's lite version for interim launch
- **Voice cuts off** — Fred reported voice cuts after a few words (Feb 28), Alex said Samsung devices are finnicky
- **Scoring without data** — Fred noticed scoring shows before user has input data (Feb 28)

---

## Team Contact Info (from WhatsApp screenshot, Mar 7)

| Name | Email | Role |
|------|-------|------|
| Fred Cary | fred@fredcary.com (760-651-2570) | CEO/Product Owner |
| Julian Bradley | julianb233@gmail.com | Developer |
| Alex LaTorre | alex@buildifyhq.com | Developer (joins.com version) |
| Ira Hayes | ira@marxed.com | AI/Operations |
| William Hood | williamlhood@gmail.com | Advisor |

---

## Key Decisions Made
1. Launch with Alex's version first; Julian's full version follows
2. NO payment integration until Julian's full version is ready
3. Platform philosophy: guided journey, not chatbot
4. Users cannot skip stages
5. "Oases" milestone naming convention (Sahara-themed)
6. Two-week free trial for event attendees (when ready)
7. $99/month target price point
8. Pre-seed/seed focus only — not serving Series A+ yet (Fred, Mar 1)
9. Fred's 7 brain enhancements must be incorporated into FRED prompts (Fred, Mar 7)
