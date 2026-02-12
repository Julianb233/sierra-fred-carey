# Phase 40: Dashboard Redesign -- UX Gap Analysis

**Author:** UX Advisor
**Date:** 2026-02-11
**Authority:** `.planning/DASHBOARD-SPEC.md` + `.planning/OPERATING-BIBLE.md`
**Status:** Pre-planning analysis

---

## 1. CURRENT STATE: What the Dashboard Shows Today

### 1.1 Dashboard Home (`app/dashboard/page.tsx`)

The home page consists of five sections:

1. **Welcome Header**: "Welcome back, {name}! Here's what's happening with your startup today."
2. **Onboarding Checklist** (`components/dashboard/onboarding-checklist.tsx`): 5-task getting-started card (Complete onboarding, First chat, Reality Lens, Upload pitch, Explore dashboard). Dismissible. Uses localStorage for state.
3. **Stats Grid**: 4 cards showing vanity metrics:
   - Ideas Analyzed (count of `fred_episodic_memory` conversation entries)
   - Pitch Decks Reviewed (count of `pitch_reviews`, locked below Pro)
   - Check-ins Completed (count of `sms_checkins`, locked below Pro)
   - Active Agents (count of `agent_tasks`, locked below Studio)
4. **Red Flags Widget** (`components/dashboard/red-flags-widget.tsx`): Active risk alerts from `/api/red-flags`, grouped by severity (critical/high/medium/low). Acknowledgeable.
5. **Quick Actions**: 4 cards: Analyze New Idea, Check Investor Readiness (Pro), Review Pitch Deck (Pro), Activate AI Agent (Studio). Locked items show blur overlay with tier badge.
6. **Recent Activity**: Last 5 items across `fred_episodic_memory`, `pitch_reviews`, `strategy_documents`.
7. **Upgrade CTA**: Full-width gradient card for free users to upgrade to Pro.

### 1.2 Dashboard Sub-Pages (Sidebar Navigation)

The sidebar (`app/dashboard/layout.tsx`) exposes 18 navigation items:

**Free tier:**
- Overview, Reality Lens, Your Journey, Startup Process, Decision History, AI Insights, Monitoring, Communities

**Pro tier:**
- Positioning, Investor Lens, Investor Readiness, Investor Evaluation, Pitch Deck Review, Strategy Docs

**Studio tier:**
- Weekly Check-ins, Virtual Team, Boardy Integration

**Always visible:**
- Settings

### 1.3 Key Sub-Pages Reviewed

- **Your Journey** (`app/dashboard/journey/page.tsx`): Shows Idea Score, Investor Readiness %, Execution Streak. Tabs for Insights/Milestones/Timeline. Fetches from `/api/journey/*` endpoints.
- **Startup Process** (`app/dashboard/startup-process/page.tsx`): A 9-step wizard using localStorage for state. Users fill in form data per step and can "validate" with FRED via `/api/fred/analyze`. **Completely disconnected from `fred_conversation_state`** -- uses its own local process state.
- **Profile Snapshot** (`app/dashboard/profile/snapshot/page.tsx`): Displays founder profile fields with proper label formatting (STAGE_LABELS, INDUSTRY_LABELS, etc.). Read-only view of profile data.

### 1.4 Data Sources Feeding the Dashboard

| Widget | Data Source | API Endpoint |
|--------|-----------|--------------|
| Stats Grid | `fred_episodic_memory`, `pitch_reviews`, `sms_checkins`, `agent_tasks` | `GET /api/dashboard/stats` |
| Red Flags | `red_flags` table | `GET /api/red-flags` |
| Recent Activity | `fred_episodic_memory`, `pitch_reviews`, `strategy_documents` | `GET /api/dashboard/stats` |
| Journey Scores | `journey_stats`, `journey_insights`, `journey_milestones`, `journey_timeline` | `GET /api/journey/*` |
| Startup Process | **localStorage only** | `POST /api/fred/analyze` (validation only) |
| Onboarding Checklist | `GET /api/dashboard/stats` + localStorage | Mixed |

**Critical observation:** None of the dashboard widgets currently read from `fred_conversation_state`, `fred_step_evidence`, or the diagnostic tags / founder snapshot from Phase 34. The dashboard is disconnected from FRED's actual understanding of the founder.

---

## 2. TARGET STATE: What the Dashboard Spec Says

From `.planning/DASHBOARD-SPEC.md`:

### 2.1 HOME -- Founder Command Center

**Top: Founder Snapshot Card**
- Stage
- Primary Constraint
- 90-Day Goal
- Runway

**Center: "Right Now" Decision Box**
- Most important decision
- Short explanation
- Button: "Work on this with Fred"

**Right Column: Funding Readiness Gauge**
- Red (Build) / Yellow (Prove) / Green (Raise) zone
- Score (if unlocked)
- Top 2 blockers
- Button: "Run Readiness Review"

**Bottom: Weekly Momentum**
- Last check-in summary
- Streak indicator
- Button: "Start Weekly Check-In"

### 2.2 Sidebar Navigation (Spec)

1. Home
2. Chat with Fred
3. Next Steps
4. Readiness
5. Documents
6. Community
7. Profile

(7 items vs current 18)

### 2.3 Dynamic Display Rules

- **Early stage**: Hide funding gauge, show Positioning first
- **No intake completed**: Blur readiness gauge with unlock prompt
- **Growth stage**: Show Primary Constraint instead of positioning grade
- **High stress detected**: Surface stabilization guidance before growth tactics

### 2.4 Funding Gauge Principles

- Zones: Red=Build, Yellow=Prove, Green=Raise
- Never gamify
- Always tie improvements to specific actions

---

## 3. GAPS: What's Missing, What Violates the Operating Bible

### 3.1 Missing Widgets (Not Implemented)

| Target Widget | Current State | Gap Severity |
|--------------|---------------|--------------|
| Founder Snapshot Card | Does NOT exist on home. Exists at `/dashboard/profile/snapshot` as a separate page. | **P0** -- This is the foundation of personalized dashboard |
| "Right Now" Decision Box | Does NOT exist. Nothing tells the founder what to work on next. | **P0** -- This is the dashboard's core purpose per spec |
| Funding Readiness Gauge | Does NOT exist. Journey page shows Investor Readiness % but it's a different page, not the home dashboard. | **P1** |
| Weekly Momentum | Does NOT exist. Check-in count is in stats grid but there's no last check-in summary or streak. | **P1** |
| Next Steps Hub | Does NOT exist as a standalone section. | **P2** |

### 3.2 Operating Bible Violations

**Violation 1: Showing Investor Readiness to Idea-Stage Founders**
The dashboard's Quick Actions show "Check Investor Readiness" to ALL users, gated only by tier (Pro). A free-tier idea-stage founder sees this locked but visible. Per Operating Bible Section 2.3 (Decision Sequencing Rule): "Never optimize downstream artifacts (decks, patents, hiring, fundraising, scaling) before upstream truth is established." Investor readiness is a downstream artifact. Showing it prominently to idea-stage founders violates this rule.

**Violation 2: "Upload a Pitch Deck" in Onboarding Checklist**
The onboarding checklist task #4 is "Upload a pitch deck." Operating Bible Section 8 says: "Do not ask for a deck by default. Provide a provisional verdict first." An early-stage founder should not be prompted to upload a deck as a getting-started action.

**Violation 3: Sidebar Shows All Investor Tools to All Users**
The sidebar lists Positioning, Investor Lens, Investor Readiness, Investor Evaluation, Pitch Deck Review -- all visible (locked or not) to every user. Operating Bible Section 6.2 says investor mode should only activate "when fundraising is explicitly on the table." Showing these in the sidebar creates a mental model that fundraising tools are central to the product.

**Violation 4: No Stage-Aware Content Filtering**
The Dynamic Display Rules say to hide the funding gauge for early-stage founders and show Positioning first. Currently there is zero stage-aware filtering. Every user sees the identical dashboard regardless of their stage, step, or diagnostic tags.

### 3.3 Structural Issues

**Issue 1: Two Parallel Startup Processes**
The `/dashboard/startup-process` page uses localStorage to track a completely separate 9-step wizard with its own step data, validation, and status. Meanwhile, `fred_conversation_state` tracks the same 9-step process through FRED's conversations. These two systems are entirely disconnected. A founder could be at Step 3 in FRED's conversation state but Step 1 in the dashboard wizard (or vice versa). This is confusing and wastes the investment in Phase 34's conversation state.

**Issue 2: Dashboard-Shell Duplication**
Both `app/dashboard/layout.tsx` and `app/dashboard/dashboard-shell.tsx` define nearly identical sidebar components with slightly different nav items (layout.tsx has "Startup Process" and "Communities" that dashboard-shell.tsx doesn't, and dashboard-shell.tsx has "Notifications" that layout.tsx has in a different position). Only one is actually used (layout.tsx wraps the dashboard routes). The dashboard-shell.tsx appears to be dead code.

**Issue 3: Vanity Metrics on Home**
"Ideas Analyzed" counts `fred_episodic_memory` conversation entries -- this is just "number of conversations." It's labeled misleadingly. "Active Agents" is a Studio feature that will be 0 for 99% of users. These stats don't help a founder decide what to work on next.

---

## 4. DATA DEPENDENCIES: What Feeds the Target Widgets

### 4.1 Founder Snapshot Card

| Field | Source | Available Now? |
|-------|--------|---------------|
| Stage | `profiles.stage` | Yes (from onboarding) |
| Primary Constraint | `fred_conversation_state.founder_snapshot.primaryConstraint` OR `profiles.primary_constraint` | **Phase 34** (conversation state), **Phase 50** (profile column, migration 050) |
| 90-Day Goal | `fred_conversation_state.founder_snapshot.ninetyDayGoal` OR `profiles.ninety_day_goal` | **Phase 34** (conversation state), **Phase 50** (profile column) |
| Runway | `fred_conversation_state.founder_snapshot.runway` OR `profiles.runway` | **Phase 34** (conversation state), **Phase 50** (profile column) |

**Dependency:** Phase 34 (conversation state + founder snapshot). Data exists in schema but is only populated through FRED conversations, not directly editable. The profile columns from migration 050 exist but are not collected during onboarding.

### 4.2 "Right Now" Decision Box

| Data | Source | Available Now? |
|------|--------|---------------|
| Current step in 9-step process | `fred_conversation_state.current_step` | **Phase 34** |
| Current step name + objective | `STARTUP_STEPS[currentStep]` in `lib/ai/frameworks/startup-process.ts` | **Phase 34** |
| Current blockers | `fred_conversation_state.current_blockers` | **Phase 34** |
| Step-specific guidance questions | `STARTUP_STEPS[currentStep].questions` | **Phase 34** |

**Dependency:** Phase 34 (conversation state). The data exists. Needs a new API endpoint to expose it to the frontend.

### 4.3 Funding Readiness Gauge

| Data | Source | Available Now? |
|------|--------|---------------|
| Readiness zone (Red/Yellow/Green) | Derived from `diagnostic_tags.stage` + `diagnostic_tags.investorReadinessSignal` + step progress | **Phase 34** (raw tags), **Phase 37** (Reality Lens gate tracking would refine this) |
| Readiness score (0-100) | `investor_readiness_scores` table (existing) OR computed from conversation state | **Partially** -- existing investor readiness feature, but disconnected from conversation state |
| Top 2 blockers | `fred_conversation_state.current_blockers` OR `fred_step_evidence` kill signals | **Phase 34** |

**Dependency:** Phase 34 for basic data. Phase 37 (Reality Lens Gate) for refined scoring. The zone logic (Red=Build, Yellow=Prove, Green=Raise) needs to be computed from diagnostic tags:
- Red (Build): stage=idea or stage=pre-seed, positioning=low
- Yellow (Prove): stage=pre-seed or seed, validation not complete
- Green (Raise): stage=seed+, validation+gtm validated, investor readiness signal=med+

### 4.4 Weekly Momentum

| Data | Source | Available Now? |
|------|--------|---------------|
| Last check-in summary | `sms_checkins` table | Yes (existing) |
| Streak indicator | Computed from check-in dates | Yes (journey page has `executionStreak`) |
| Last check-in date | `sms_checkins.created_at` | Yes |

**Dependency:** No new phase needed. Data already exists.

### 4.5 Dynamic Display Rules

| Rule | Data Needed | Source | Available Now? |
|------|-------------|--------|---------------|
| Hide funding gauge for early stage | `diagnostic_tags.stage` or `profiles.stage` | **Phase 34** / onboarding | Yes |
| Blur readiness without intake | Whether investor readiness intake has been run | `investor_readiness_scores` existence | Yes |
| Show constraint for growth | `diagnostic_tags.stage === "growth"` | **Phase 34** | Yes |
| High stress detection | Conversation signals (burnout, stress keywords) | **Phase 36** (diagnostic tag extraction) | After Phase 36 |

**Dependency:** Phase 34 for stage tags. Phase 36 for stress detection. Most rules can be implemented with current data.

---

## 5. UX RECOMMENDATIONS

### 5.1 New Founder (Just Completed Onboarding)

**What they should see:**
1. **Founder Snapshot Card** with the data they just provided (name, stage, industry, challenge). Fields they didn't provide show "Ask FRED" links.
2. **"Right Now" Decision Box**: "You're at Step 1: Define the Real Problem. Let's get clear on what problem you're solving." Button: "Start with FRED"
3. **Getting Started Checklist** (replace current onboarding checklist with one that maps to the 9-step process rather than product features)
4. **NO funding gauge** (early stage -- hidden per Dynamic Display Rules)
5. **NO investor readiness** (not on the table yet)

**What they should NOT see:**
- Vanity stats showing all zeros
- Investor Readiness, Pitch Deck Review, or any fundraising-related quick actions
- 18 sidebar items, most of which are locked

### 5.2 Returning Idea-Stage Founder (Step 2-3, Few Conversations)

**What they should see:**
1. **Founder Snapshot Card** with data accumulated from conversations (stage, industry, challenge, primary constraint if detected)
2. **"Right Now" Decision Box**: Shows current step with the most important question FRED wants answered. Example: "Step 2: Identify Your Buyer. Who specifically is the economic buyer for this?" Button: "Continue with FRED"
3. **Progress Indicator**: Simple visual showing 9 steps with current position highlighted
4. **Recent Conversation Summary**: Last FRED interaction summary, not raw episodic memory entries
5. **NO funding gauge** (still early stage)

### 5.3 Seed-Stage Founder (Step 5-6, Active Mentoring Relationship)

**What they should see:**
1. **Founder Snapshot Card** (fully populated: stage, constraint, 90-day goal, runway)
2. **"Right Now" Decision Box**: Current step focus with blockers highlighted
3. **Funding Readiness Gauge**: Yellow zone ("Prove") with top 2 blockers and action items
4. **Weekly Momentum**: Last check-in summary, streak
5. **Positioning Grade** if positioning has been assessed
6. **Progress Indicator**: 9 steps with validated steps checked off

### 5.4 Growth-Stage Founder (Step 7-9)

**What they should see:**
1. **Founder Snapshot Card** with Primary Constraint prominently featured
2. **"Right Now" Decision Box**: Focused on execution discipline, pilot results, or scale decision
3. **Funding Readiness Gauge**: Green zone ("Raise") if metrics support it, with specific investor readiness score
4. **Weekly Momentum**: Emphasize streak and accountability
5. **Investor tools visible** in sidebar (Investor Lens, Deck Review) -- only NOW appropriate

### 5.5 Sidebar Simplification

The spec calls for 7 nav items. The current sidebar has 18. Recommendation:

**Tier 0 (Always visible):**
1. Home (command center)
2. Chat with Fred (the core product)
3. Your Progress (replaces both "Your Journey" and "Startup Process" -- unified with conversation state)
4. Next Steps (extracted from FRED's Next 3 Actions across conversations)
5. Community
6. Profile / Settings

**Conditionally visible (based on diagnostic tags + tier):**
7. Readiness (only when stage >= seed OR investor readiness signal detected)
8. Documents (only when documents exist)
9. Positioning (only when positioning lens has been activated)
10. Investor Lens (only when investor mode has been activated)

This reduces cognitive load dramatically. Early-stage founders see 6 items. Growth-stage founders see 8-10.

### 5.6 Unify the Two Startup Processes

The `/dashboard/startup-process` localStorage wizard must be merged with `fred_conversation_state`. Recommendation:
- The dashboard progress view becomes a READ-ONLY visualization of conversation state
- Step validation happens through FRED conversations, not a separate form wizard
- The "Validate" button on each step opens FRED chat pre-loaded with the step's context
- Evidence from conversations feeds the step completion status
- The wizard form fields become optional "notes" that the founder can save alongside the conversation-driven evidence

### 5.7 Transition Strategy

To avoid a jarring change, consider a phased rollout:

**Phase 40a: Core Command Center**
- Add Founder Snapshot Card (reads from `fred_conversation_state.founder_snapshot` + `profiles`)
- Add "Right Now" Decision Box (reads from `fred_conversation_state.current_step`)
- Remove vanity stats grid
- Add stage-aware Quick Actions (hide investor tools for early stage)

**Phase 40b: Readiness Gauge + Dynamic Display**
- Add Funding Readiness Gauge with zone logic
- Implement Dynamic Display Rules
- Blur/hide widgets based on stage + intake status

**Phase 40c: Sidebar Simplification + Process Unification**
- Reduce sidebar to 7 core items with conditional visibility
- Merge Startup Process wizard with conversation state
- Remove `dashboard-shell.tsx` dead code

---

## 6. API ENDPOINTS NEEDED

### New Endpoints for Phase 40

1. **`GET /api/dashboard/command-center`** -- Returns everything the home dashboard needs in a single call:
   - Founder snapshot (from `fred_conversation_state.founder_snapshot` merged with `profiles`)
   - Current step info (step name, objective, questions, blockers)
   - Process progress (step statuses, evidence counts)
   - Diagnostic tags (for Dynamic Display Rules)
   - Readiness zone computation (Red/Yellow/Green)
   - Last check-in summary
   - Execution streak

2. **`GET /api/dashboard/next-actions`** -- Returns the founder's active Next 3 Actions from recent FRED conversations (requires storing Next 3 Actions in a structured format, not just in response text).

### Existing Endpoints to Deprecate/Merge

- `GET /api/dashboard/stats` -- Replace with command-center endpoint
- `GET /api/journey/stats` -- Merge relevant fields into command-center
- The `/api/journey/*` endpoints may still serve the Journey sub-page but should not be the primary dashboard data source

---

## 7. SUMMARY: PRIORITY ORDER

| Priority | Item | Blocker? |
|----------|------|----------|
| **P0** | Founder Snapshot Card on home | Needs Phase 34 data (available) |
| **P0** | "Right Now" Decision Box | Needs Phase 34 data (available) |
| **P0** | Remove/hide investor tools for early-stage founders | Just config changes |
| **P1** | Funding Readiness Gauge | Needs zone computation logic |
| **P1** | Dynamic Display Rules | Needs diagnostic tags (Phase 34/36) |
| **P1** | Sidebar simplification | Design decision + refactor |
| **P2** | Startup Process unification | Significant refactor |
| **P2** | Weekly Momentum widget | Data already exists |
| **P2** | Next Steps Hub | Needs structured storage of Next 3 Actions |
| **P3** | Remove dashboard-shell.tsx dead code | Cleanup |
| **P3** | Replace onboarding checklist with process-aligned tasks | Design decision |
