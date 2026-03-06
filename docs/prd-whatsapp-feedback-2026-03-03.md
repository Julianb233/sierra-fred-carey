# PRD: Sahara Founder Feedback Sprint (March 2026)

**Source**: Sahara Founders WhatsApp Group — Messages from Feb 28 - Mar 3, 2026
**Priority**: Critical — Demo to 250 founders in Palo Alto next Tuesday + Gregory alliance (80k founders)
**Author**: Auto-generated from WhatsApp feedback extraction

---

## Context

Fred Cary and the Sahara Founders group surfaced multiple issues and feature requests over the past week. With an imminent demo to 250 founders in Palo Alto and a potential alliance with Gregory's platform (80k founders, 100 investor groups), these issues are **launch-blocking** and must be resolved ASAP.

---

## Issues & Requirements

### 1. BUG: Voice Chat Cuts Off on Samsung Devices
**Priority**: P1 — Urgent
**Reporter**: Fred Tec Partner (Fred Cary)
**Date**: Saturday ~2:56 PM

**Problem**: Voice chat cuts off after the user gets a couple of words in. Works well on Apple devices and computers, but Samsung phones are "finnicky."

**Acceptance Criteria**:
- Voice calls with Fred AI should maintain connection on Samsung devices (Chrome/Samsung Internet)
- Test on Samsung Galaxy S23/S24 and older models
- Minimum 5-minute sustained voice connection without drops

**Technical Notes**: LiveKit WebRTC may have Samsung browser compatibility issues. Check codec support and ICE candidate handling.

---

### 2. BUG: No Password Reset Option on Login Page
**Priority**: P1 — Urgent
**Reporter**: Fred Tec Partner
**Date**: Sunday ~4:37 PM

**Problem**: Login page shows "Incorrect password. Please try again." for `cary.fred@gmail.com` but there is NO "forgot password" or "reset password" link/button anywhere on the page.

**Acceptance Criteria**:
- Add "Forgot password?" link below the password field on the login page
- Link triggers Supabase password reset email flow
- User receives reset email and can set a new password
- Reset flow works end-to-end

---

### 3. IMPROVEMENT: Fred AI Gives Vague, Unstructured Responses
**Priority**: P2 — High
**Reporter**: Fred Tec Partner
**Date**: Saturday ~3:13 PM

**Problem**: When a user says their biggest issue is "unit economics," Fred goes down an exhausting series of questions without first collecting business fundamentals (business name, sector, positioning, revenue, etc.). The conversation lacks structure and feels overwhelming.

**Acceptance Criteria**:
- Fred should collect business fundamentals FIRST during onboarding conversation:
  - Business name, sector, positioning, revenue, team size, funding stage
- Only THEN dive into specific issues like unit economics
- Responses should be structured and presentable, not overwhelming
- Information gathered should populate the founder's dashboard profile

---

### 4. FEATURE: Structured Goal Sets by Funding Stage
**Priority**: P2 — High
**Reporter**: Fred Tec Partner
**Date**: Saturday ~3:13 PM

**Problem**: Sahara needs different goal sets depending on where a founder is in their journey:
- **Beginners**: Idea → fundable company (clear path)
- **Pre-seed/Seed**: Analyze readiness, what to change to be fundable, analyze/create pitch deck, intro to Boardy
- **Series A+**: Good old-fashioned advice for now (V3 will add more tools)

**Acceptance Criteria**:
- After onboarding, Fred identifies the founder's stage (beginning, friends/family, pre-seed, seed)
- Custom goal set appears on homepage/dashboard after chatting with Fred
- Each goal set has clear milestones and actionable next steps
- V2 focuses on beginners through seed; Series A+ gets advisory-only path

---

### 5. BUG: Fred AI Not Responding / Broken State
**Priority**: P1 — Urgent
**Reporter**: Fred Tec Partner
**Date**: Today ~2:37 PM

**Problem**: Fred shared a screenshot saying "Fred isn't working. I need you tech experts to get together please." The AI appears to be in a non-responsive or broken state.

**Acceptance Criteria**:
- Investigate and fix the root cause of Fred AI becoming unresponsive
- Add health monitoring / error recovery for the Fred chat agent
- If Fred is down, show a user-friendly error message (not a blank/broken state)

---

### 6. FEATURE: Train Model on Investor Firm Data
**Priority**: P3 — Normal
**Reporter**: Fred Tec Partner
**Date**: Sunday ~9:00 AM

**Problem**: Fred wants the AI trained to understand investor firms in three ways:
1. What makes specific firms say "yes" at each investment round
2. Find similar firms with comparable investment theses at each round level
3. Use that data to structure founders' projects as "haystacks full of needles"

Fred also wants Sahara itself to be the "crash test dummy" — use the platform to prepare for their own fundraise.

**Acceptance Criteria**:
- Knowledge base of investor firms with investment criteria, round preferences, and thesis
- Fred AI can reference this data when advising founders
- Matching algorithm: founder profile → relevant investors
- Sahara's own fundraise data used as proof-of-concept

---

### 7. LAUNCH PREP: 250 Founders Demo + Gregory Alliance
**Priority**: P0 — Critical
**Reporter**: Fred Tec Partner
**Date**: Today ~4:28 PM

**Problem**: Two major events imminent:
1. Fred has been asked to offer Sahara to **250 founders in Palo Alto next Tuesday**
2. Meeting with Gregory tomorrow to discuss alliance — he has **80k founders and 100 investor groups**

All P1 bugs must be resolved before the demo. The platform must be stable, polished, and impressive.

**Acceptance Criteria**:
- All P1 bugs resolved (voice, password reset, Fred responsiveness)
- Platform handles concurrent usage from demo attendees
- Onboarding flow is smooth and impressive for first-time users
- Sign-up → chat with Fred → see value within 3 minutes

---

## Technical Approach

| Issue | Area | Key Files |
|-------|------|-----------|
| Voice cutoff (Samsung) | LiveKit / WebRTC | `workers/`, `app/chat/` |
| Password reset | Supabase Auth | `app/login/`, `lib/auth/` |
| Fred vague responses | AI prompts / agent | `lib/ai/`, `lib/agents/` |
| Goal sets by stage | AI + Dashboard | `lib/agents/`, `app/dashboard/` |
| Fred not responding | AI agent health | `lib/ai/`, `app/api/` |
| Investor firm data | Knowledge base | `lib/ai/`, new knowledge base |
| Launch readiness | All of the above | Cross-cutting |

---

## Timeline

- **Today (Mon Mar 3)**: Fix P1 bugs — password reset, Fred responsiveness
- **Tomorrow (Tue Mar 4)**: Fix voice Samsung issue, test full onboarding flow
- **Wed Mar 5-6**: Structured goal sets, Fred conversation improvements
- **Before Tuesday demo**: All P0/P1 complete, load testing done
