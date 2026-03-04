# Domain Pitfalls -- v7.0 Closed-Loop UX Feedback System

**Domain:** AI SaaS feedback collection and auto-triage
**Researched:** 2026-03-04

---

## Critical Pitfalls

Mistakes that cause rewrites or major issues.

### Pitfall 1: Feedback Loop Creates Prompt Regression

**What goes wrong:** The self-improvement loop detects negative feedback on prompt version A, auto-suggests changes, team deploys prompt version B. But version B is worse for a different user segment. No A/B test was run. Now TWO user groups are unhappy.

**Why it happens:** Optimizing for one feedback signal without controlled testing. Feedback is biased toward vocal/frustrated users, not representative of all users.

**Consequences:** Prompt quality oscillates. Users lose trust in FRED's consistency.

**Prevention:**
- NEVER auto-deploy prompt changes. Always require human review.
- Use Langfuse A/B testing: deploy new version to 20% of traffic, measure for 1 week.
- Compare feedback scores across BOTH versions before full rollout.
- Track prompt version in every feedback record so you can attribute quality changes.

**Detection:** Sudden spike in negative feedback after a prompt change. Feedback score variance increases.

### Pitfall 2: WhatsApp Webhook "Shadow Delivery" Failure

**What goes wrong:** WhatsApp Cloud API webhooks silently stop delivering messages. No error, no log, just silence. Feedback from WhatsApp channel drops to zero without anyone noticing.

**Why it happens:** Meta requires a WABA-to-App subscription that is not part of the standard setup docs. If this subscription lapses or is not configured, webhooks stop without notification. This is a documented gap in Meta's 2025 developer experience.

**Consequences:** Entire WhatsApp feedback channel goes dark. Team thinks "nobody is sending WhatsApp feedback" when actually the webhook is broken.

**Prevention:**
- After WhatsApp Business API setup, explicitly POST to `/{WABA_ID}/subscribed_apps` via Graph API Explorer.
- Implement a heartbeat: Trigger.dev scheduled task sends a test message to a monitoring number every 6 hours. If no webhook received within 10 minutes, alert via SMS.
- Keep BrowserBase scraping as a parallel fallback during the first month.

**Detection:** Zero WhatsApp feedback for 24+ hours when the group is active. Heartbeat check fails.

### Pitfall 3: Feedback Volume Creates Analysis Paralysis

**What goes wrong:** Team builds the feedback system, feedback floods in, nobody processes it. The admin dashboard shows 500 unread items. Team stops looking at it. System becomes a write-only database.

**Why it happens:** Feedback systems are easy to build for collection but hard to build for action. Without automated clustering and triage, humans cannot keep up.

**Consequences:** Users give feedback, nothing changes, they stop giving feedback. Worse than having no feedback system.

**Prevention:**
- Auto-classification is not optional -- it is the FIRST feature, not a "nice to have."
- Auto-triage to Linear for clusters above threshold (3+ similar items) so feedback reaches the issue tracker without human intervention.
- Weekly digest email to the team summarizing top feedback themes (Trigger.dev scheduled task).
- Admin dashboard shows "Action Required" items only by default, not all feedback.

**Detection:** Feedback table growing but `status` column stuck on "classified" (never reaching "triaged" or "resolved").

---

## Moderate Pitfalls

Mistakes that cause delays or technical debt.

### Pitfall 4: PostHog Survey Fatigue

**What goes wrong:** Team enables NPS survey, CSAT survey, feature satisfaction survey, and thumbs up/down all at once. Users see a survey popup every session. They start dismissing everything without reading.

**Prevention:**
- Maximum ONE survey per user per week (configure in PostHog survey settings).
- NPS: monthly, to a random 20% sample.
- Thumbs up/down: always available but passive (inline, not popup).
- CSAT: only after specific milestone events (first pitch deck review, first voice session).
- Use PostHog feature flags to control survey targeting.

### Pitfall 5: Langfuse Trace ID Not Propagated to Client

**What goes wrong:** Langfuse traces are captured server-side, but the trace ID is never sent to the client. When the user clicks thumbs down, there is no way to link the feedback to the specific AI response. The self-improvement loop is broken.

**Prevention:**
- Include `traceId` in the streaming response metadata from day one.
- The `<ThumbsFeedback />` component must receive and send `traceId` with every rating.
- Verify end-to-end: check that Langfuse shows feedback scores linked to traces in the dashboard.
- Write an integration test: submit feedback with traceId, verify Langfuse score was created.

### Pitfall 6: Classification Prompt Drift

**What goes wrong:** The AI classification prompt ("classify this feedback as bug/feature/ux_friction/...") works well initially. Over time, new feedback types emerge (e.g., "pricing complaint," "competitor comparison") that do not fit the existing categories. Classification accuracy degrades silently.

**Prevention:**
- Review classification accuracy monthly: sample 50 random items, check if AI category matches human judgment.
- Add a "other/unknown" category so mismatches are captured, not forced into wrong buckets.
- Track classification confidence scores (Vercel AI SDK does not provide these natively, but you can ask the model to self-assess confidence in the structured output).
- Evolve categories based on actual feedback distribution, not assumptions.

### Pitfall 7: Linear Issue Duplication

**What goes wrong:** Clustering algorithm creates a new cluster for "voice disconnects on Android" when a cluster for "voice disconnects on Samsung" already exists. Two Linear issues get created for the same problem.

**Prevention:**
- Before creating a new Linear issue, search existing open issues by keyword similarity.
- Use pgvector embeddings on cluster titles/descriptions for semantic dedup.
- Include a "related clusters" check in the triage pipeline.
- When in doubt, add feedback to an existing cluster rather than creating a new one.

---

## Minor Pitfalls

Mistakes that cause annoyance but are fixable.

### Pitfall 8: Feedback Timestamps in Wrong Timezone

**What goes wrong:** WhatsApp messages have timestamps in the sender's timezone. PostHog events use UTC. Supabase stores UTC. Admin dashboard shows mixed timezones. Impossible to correlate "the feedback came in at 3pm" across channels.

**Prevention:** Store ALL timestamps as UTC in Supabase. Convert to user's local timezone only in the UI layer. WhatsApp message timestamps must be normalized to UTC on ingestion.

### Pitfall 9: Bundle Size from PostHog Surveys

**What goes wrong:** PostHog surveys load additional JavaScript for rendering survey UI. On mobile, this adds noticeable weight to the initial bundle.

**Prevention:** PostHog surveys are loaded lazily by default. Verify this with `next build` bundle analysis. If surveys add >50KB, consider using the API-only approach (custom survey UI) instead of PostHog's prebuilt widget.

### Pitfall 10: Close-the-Loop Email Goes to Spam

**What goes wrong:** Automated "We fixed your issue" emails are flagged as spam because they come from a new sending pattern (automated, transactional-but-not-really).

**Prevention:** Use the existing Resend domain (already warmed for transactional email). Keep emails short and personal-sounding. Include the user's original feedback quote so it feels like a reply, not marketing.

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|---|---|---|
| In-app feedback widgets | Survey fatigue (#4) | One survey per week max, passive thumbs always available |
| Langfuse integration | Trace ID not propagated (#5) | Include traceId in response metadata from day one |
| AI classification | Prompt drift (#6) | Monthly accuracy review, "unknown" category |
| Linear auto-triage | Issue duplication (#7) | Keyword + embedding similarity check before creation |
| WhatsApp Cloud API | Shadow delivery (#2) | Heartbeat monitoring + BrowserBase fallback |
| Prompt A/B testing | Regression (#1) | Human review required, 20% traffic split, 1-week minimum test |
| Admin dashboard | Analysis paralysis (#3) | Auto-triage, "action required" default filter |
