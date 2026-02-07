# Phase 17: Founder Wellbeing - Research

**Researched:** 2026-02-07
**Domain:** Burnout detection, wellbeing check-in UI, mindset coaching mode, Fred's 6 philosophy principles
**Confidence:** HIGH

## Phase Overview

Phase 17 adds proactive founder mental health support through three capabilities: burnout/stress detection during chat conversations, a dedicated wellbeing check-in page for self-assessment, and a mindset coaching mode grounded in Fred Cary's six philosophy principles (mindset, honesty, perseverance, learn from failure, achievable goals, overcome self-doubt).

### Requirements

| ID | Description | Tier |
|----|-------------|------|
| FREE-04 | Detect burnout/stress signals during chat and proactively offer support | Free |
| FREE-05 | Dedicated check-in page for founder self-assessment of mental state | Free |
| FREE-06 | Mindset coaching mode using Fred's 6 philosophy principles | Free |

### Success Criteria

1. During conversation, FRED detects burnout/stress signals and proactively offers support
2. Founders can visit a dedicated check-in page to self-assess their mental state
3. Mindset coaching mode is available using Fred's 6 philosophy principles (grit, resilience, etc.)

## What Exists in the Codebase

### Sentiment Analysis (lib/fred/actors/validate-input.ts)

The `analyzeSentiment()` function (lines 291-332) performs basic positive/negative/neutral/mixed detection using keyword matching:

```typescript
const negativeWords = [
  "bad", "terrible", "worried", "concerned", "problem",
  "issue", "fail", "lose", "struggle", "difficult",
];
```

This is a starting point but lacks burnout-specific signals like exhaustion, isolation, anxiety, or sustained negative patterns.

### Urgency Detection (lib/fred/actors/validate-input.ts)

The `detectUrgency()` function (lines 337-368) catches critical-level indicators like "asap", "urgent", "emergency". High urgency combined with negative sentiment is a burnout correlation signal.

### Topic Detection with Mindset (lib/fred/actors/validate-input.ts)

The `detectTopic()` function (lines 404-428) already has a `mindset` topic with relevant keywords:

```typescript
mindset: ["mindset", "motivat", "stuck", "overwhelm", "doubt",
          "confidence", "fear", "burnout", "stressed", "anxious"],
```

When the mindset topic is detected, the chat route uses `COACHING_PROMPTS.mindset` to guide the conversation.

### COACHING_PROMPTS.mindset (lib/ai/prompts.ts)

The mindset coaching prompt (lines 222-229) already references Fred's philosophy:

```typescript
mindset: `Draw on Fred's philosophy for mindset coaching:
- "Mindset is the pillar to success"
- Address self-doubt directly with facts
- Create micro-victories to build momentum
- Focus on what they CAN control
- Share relevant failure-to-success stories from 50+ years of experience

Remember: Tough love with genuine encouragement. No sugarcoating.`,
```

This is adequate for a mindset topic conversation but does not explicitly route through each of Fred's 6 principles or offer structured wellbeing assessment.

### FRED_PHILOSOPHY (lib/fred-brain.ts)

Fred's six core philosophy principles are defined in the FRED_CAREY_SYSTEM_PROMPT (lib/ai/prompts.ts lines 72-109):

1. **Mindset is Everything** -- Focus on what you CAN control
2. **Honesty & Accountability** -- Non-negotiable truth-telling
3. **Perseverance is Everything** -- Continue through repeated setbacks
4. **Learn from Failure** -- Every setback contains wisdom
5. **Achievable Goals & Micro Victories** -- Incremental progress compounds
6. **Overcome Self-Doubt** -- Address doubts with facts, not feelings

These are embedded in the system prompt as text but are not exported as structured data. The `fred-brain.ts` file exports `FRED_PHILOSOPHY` as an object.

### Existing Check-In Pages (app/check-ins/)

The check-ins system already has:
- `app/check-ins/page.tsx` -- List page with mock check-in data (motivation, progress, blockers types)
- `app/check-ins/[checkInId]/` -- Detail page for individual check-ins
- `app/check-ins/configure/` -- Configuration page
- `components/check-ins/CheckInCard.tsx` -- Card component for check-in entries
- `components/check-ins/StreakCounter.tsx` -- Streak tracking component

These are currently SMS-focused weekly accountability check-ins (Studio tier). The wellbeing check-in is a different concept -- it is a self-assessment form available to Free tier users, not tied to SMS scheduling.

### Database Tables

- `check_ins` table -- stores check-in responses (from SMS flow)
- `sms_checkins` table -- SMS configuration and scheduling

Neither table is designed for structured wellbeing self-assessment data (mood scores, energy levels, stress factors, etc.). A new table or extension is needed.

### Chat Route (app/api/fred/chat/route.ts)

The chat route streams SSE events but has no mechanism to inject proactive offers mid-conversation. Currently, the flow is:
1. User sends message
2. FRED pipeline processes (validate -> models -> synthesize -> decide)
3. Response is sent back

Proactive burnout detection would need to:
- Analyze the validated input for burnout signals
- If detected, append a supportive preamble or additional coaching context to the response
- Optionally emit a separate SSE event (e.g., `wellbeing_alert`) for the client to handle

## What Needs to Be Built

### 1. Burnout Detection Engine (lib/fred/wellbeing/detection.ts)

Advanced burnout/stress signal detection beyond basic sentiment:

**Signal categories:**
- **Exhaustion indicators:** "burnt out", "exhausted", "can't keep going", "running on fumes", "no energy"
- **Isolation signals:** "doing everything alone", "no one understands", "can't talk to anyone"
- **Anxiety markers:** "can't sleep", "constant worry", "overwhelmed", "drowning"
- **Decision fatigue:** "can't decide anything", "paralyzed", "everything feels wrong"
- **Sustained negativity:** 3+ consecutive messages with negative sentiment (requires memory)
- **Self-doubt escalation:** "maybe I'm not cut out for this", "imposter", "fraud"

**Detection approach:**
- Pattern matching on burnout-specific phrases (fast, runs on every message)
- Sentiment trend analysis from recent episodes in memory (3-5 message window)
- Weighted scoring: combine keyword hits + sentiment + urgency for a `burnoutScore` (0-1)
- Threshold-based response: 0.3-0.5 = gentle check-in, 0.5-0.7 = direct support offer, 0.7+ = priority intervention

**Output:**
```typescript
interface WellbeingAssessment {
  burnoutScore: number;          // 0-1
  signals: string[];             // detected indicators
  recommendedApproach: 'none' | 'gentle_checkin' | 'direct_support' | 'priority_intervention';
  suggestedPrinciple: PhilosophyPrinciple; // which of Fred's 6 is most relevant
}
```

### 2. Proactive Chat Integration

When burnout is detected mid-conversation:
- Inject wellbeing context into the FRED system prompt for that response
- FRED's response should acknowledge the emotional state before addressing the business question
- Include a soft CTA: "Want to take a quick wellbeing check-in?" with a link to the check-in page
- Emit a `wellbeing_alert` SSE event so the client can render a supportive banner/toast

### 3. Wellbeing Check-In Page (app/dashboard/wellbeing/page.tsx)

A standalone self-assessment page (Free tier):

**Assessment form:**
- Energy level (1-5 scale)
- Stress level (1-5 scale)
- Sleep quality (1-5 scale)
- Confidence/self-belief (1-5 scale)
- Top stressor (free text or category selection)
- One thing going well (free text)

**After submission:**
- FRED provides a personalized response using the most relevant philosophy principle
- Results stored in database for trend tracking
- Simple trend chart showing the last 5 check-ins

### 4. Wellbeing Database (fred_wellbeing_checkins table or extend check_ins)

```sql
CREATE TABLE fred_wellbeing_checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  energy_level INT NOT NULL CHECK (energy_level BETWEEN 1 AND 5),
  stress_level INT NOT NULL CHECK (stress_level BETWEEN 1 AND 5),
  sleep_quality INT NOT NULL CHECK (sleep_quality BETWEEN 1 AND 5),
  confidence_level INT NOT NULL CHECK (confidence_level BETWEEN 1 AND 5),
  top_stressor TEXT,
  positive_note TEXT,
  fred_response TEXT,
  principle_applied TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_wellbeing_user ON fred_wellbeing_checkins(user_id, created_at DESC);
```

### 5. Mindset Coaching Mode

An enhanced coaching experience when the `mindset` topic is detected or the user explicitly asks for mindset help:

**Structured approach using Fred's 6 principles:**
1. Identify which principle is most relevant to the user's current struggle
2. Share the principle with Fred's specific framing
3. Provide an actionable exercise (e.g., "Write down 3 micro-victories from this week")
4. Reference relevant failure-to-success stories from Fred's experience
5. End with clear next steps and an encouraging statement

**Implementation:** A `getMindsetCoachingPrompt(principle, userContext)` function that generates a targeted system prompt addition drawing from the specific principle.

### 6. Wellbeing API Endpoints

**GET /api/wellbeing/check-ins** -- Fetch user's recent wellbeing check-ins
**POST /api/wellbeing/check-ins** -- Submit a new wellbeing self-assessment
**GET /api/wellbeing/trends** -- Aggregated trend data (last 30 days)

### 7. Wellbeing Alert UI Component

A toast/banner component that appears in the chat interface when burnout is detected:
- Warm, non-alarming styling (soft orange/amber, not red)
- Message: "It sounds like you're dealing with a lot right now. Want to do a quick check-in?"
- CTA button linking to `/dashboard/wellbeing`
- Dismissible

## Integration Points

| Component | Integrates With | How |
|-----------|----------------|-----|
| Detection engine | validate-input.ts | Extends sentiment/keyword analysis with burnout signals |
| Detection engine | fred-memory.ts | Reads recent episodes for sentiment trend analysis |
| Chat route | Detection engine | Runs after validation, injects context into prompt |
| Chat UI | Wellbeing alert component | Renders alert when `wellbeing_alert` SSE event received |
| Wellbeing page | FRED chat API | Submits assessment, gets Fred's coaching response |
| Wellbeing page | fred_wellbeing_checkins table | Stores and retrieves assessments |
| Coaching mode | prompts.ts COACHING_PROMPTS.mindset | Extends existing mindset prompt with structured principles |
| Coaching mode | fred-brain.ts FRED_PHILOSOPHY | Imports structured philosophy data |

## Suggested Plan Structure

### Plan 17-01: Burnout Detection + Wellbeing Page + Coaching Mode

**Scope:** Full phase in one plan (components are closely coupled)

1. Create burnout detection engine (`lib/fred/wellbeing/detection.ts`)
2. Create `fred_wellbeing_checkins` migration
3. Create DB access layer (`lib/db/wellbeing.ts`)
4. Create wellbeing check-in page (`app/dashboard/wellbeing/page.tsx`)
5. Create wellbeing API routes (GET/POST check-ins, GET trends)
6. Integrate detection into chat route (inject context + emit SSE event)
7. Create wellbeing alert UI component for chat
8. Enhance `COACHING_PROMPTS.mindset` with structured principle routing
9. Create `getMindsetCoachingPrompt()` utility
10. Add wellbeing nav link to dashboard navigation
11. Tests for detection engine and API routes

## Key Files to Reference

| File | Purpose | Lines of Interest |
|------|---------|-------------------|
| `lib/fred/actors/validate-input.ts` | Sentiment, urgency, topic detection | 291-428 |
| `lib/ai/prompts.ts` | COACHING_PROMPTS.mindset, FRED_CAREY_SYSTEM_PROMPT philosophy section | 186-234, 72-109 |
| `lib/fred-brain.ts` | FRED_PHILOSOPHY structured data | Exported constant |
| `app/api/fred/chat/route.ts` | SSE pipeline, where detection hooks in | 190-310 |
| `app/check-ins/page.tsx` | Existing check-in page pattern (UI reference) | Full file |
| `components/check-ins/CheckInCard.tsx` | Card pattern for check-in entries | Full file |
| `lib/db/fred-memory.ts` | DB access layer patterns (CRUD, transforms) | Full file |
| `lib/fred/service.ts` | FRED service wrapper (where prompts are assembled) | Full file |
| `lib/constants.ts` | TIER_FEATURES includes "Founder wellbeing support" at Free tier | Line 73 |

## Open Questions

1. **Separate page vs. dashboard tab:** Should the wellbeing check-in be at `/dashboard/wellbeing` (new page) or a tab within the existing check-ins section? Recommendation: New page at `/dashboard/wellbeing` since check-ins are SMS-focused and Studio tier, while wellbeing is Free tier.

2. **Crisis detection:** Should we detect genuinely concerning mental health signals (suicidal ideation, self-harm) and show crisis resources? Recommendation: Yes, include a crisis detection layer that shows hotline numbers (988 Suicide & Crisis Lifeline) for high-severity signals. This is a safety requirement.

3. **Frequency limits:** Should the proactive burnout check-in offer be rate-limited to avoid being annoying? Recommendation: Maximum once per session or once per 24 hours, whichever is longer.

4. **Trend sharing:** Should Fred reference past wellbeing check-in data in coaching conversations? Recommendation: Yes, if the user has recent check-ins, the coaching prompt should include their trend data for personalized advice.

## Sources

### Primary (HIGH confidence)
- `lib/fred/actors/validate-input.ts` -- sentiment, urgency, topic detection (direct reading)
- `lib/ai/prompts.ts` -- COACHING_PROMPTS.mindset, philosophy section (direct reading)
- `app/api/fred/chat/route.ts` -- SSE pipeline (direct reading)
- `app/check-ins/page.tsx` -- existing check-in UI patterns (direct reading)
- `lib/constants.ts` -- TIER_FEATURES showing wellbeing at Free tier (direct reading)

### Secondary (MEDIUM confidence)
- `lib/fred-brain.ts` -- FRED_PHILOSOPHY export (direct reading of first 100 lines)
- `.planning/ROADMAP.md` -- Phase scope and success criteria

**Research date:** 2026-02-07
**Valid until:** Next major FRED pipeline refactor
