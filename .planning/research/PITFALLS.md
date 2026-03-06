# Pitfalls Research -- v7.0 UX Feedback Loop

**Domain:** Closed-loop user feedback systems for AI coaching SaaS (Sahara / FRED)
**Researched:** 2026-03-04
**Overall confidence:** MEDIUM-HIGH (domain well-understood, Sahara-specific risks extrapolated from codebase analysis)

---

## Critical Pitfalls

Mistakes that cause rewrites, user churn, or FRED voice corruption.

---

### C1: FRED Voice Drift from Prompt Self-Improvement

**What goes wrong:** Automated prompt tuning based on feedback gradually erodes FRED's canonical voice. Fred Cary's speech patterns, philosophy ("We trade in truth, not comfort"), and mentoring cadence get averaged out toward a generic helpful-AI tone. Research shows prompt drift is "not always obvious until complaints pile up" -- by the time someone notices FRED sounds wrong, hundreds of sessions have already delivered off-brand responses.

**Why it happens:** Feedback-driven optimization maximizes user satisfaction scores, which naturally favors agreeable, verbose, hedging language. FRED's core value is blunt truth-telling, which sometimes produces low satisfaction scores by design. An optimizer will sand down the edges that make FRED valuable.

**Consequences:**
- Fred Cary himself notices ("Fred isn't working" -- this already happened, per the WhatsApp PRD)
- Founders get generic advice indistinguishable from ChatGPT
- Loss of the canonical 9-document personality framework that defines FRED
- Irreversible if changes compound over multiple optimization cycles

**Warning signs:**
- FRED responses getting longer on average (verbosity creep)
- Increase in hedging phrases ("It depends", "You might want to consider")
- Decrease in reframing behavior (the prime directive: "Reframe Before You Prescribe")
- Fred Cary or power users saying FRED "feels different"

**Prevention:**
1. **Immutable core prompt.** The `FRED_CAREY_SYSTEM_PROMPT` in `lib/ai/prompts.ts` and the 9 canonical documents must NEVER be modified by automated systems. Period. Treat them as read-only constants.
2. **Layered prompt architecture.** Only tune a "supplemental guidance" layer that sits BELOW the core prompt. If supplemental guidance contradicts the core, the core wins.
3. **Voice regression test suite.** Before any prompt change ships, run 20+ canonical test scenarios through the new prompt and validate:
   - Uses Fred's signature phrases (check `FRED_COMMUNICATION_STYLE`)
   - Challenges assumptions rather than agreeing
   - Keeps responses concise (not verbose)
   - Applies Reality Lens dimensions without being asked
4. **Human-in-the-loop gate.** No prompt changes go live without a human reviewing 10 sample outputs. The existing A/B test system (`lib/ai/ab-testing.ts`) supports canary rollouts -- use it.
5. **Snapshot and rollback.** Version every prompt change in the `ab_experiments` / `ab_variants` tables. If voice quality degrades, rollback to the last known-good variant within minutes.

**Detection:** Weekly automated "voice fidelity" check: run 10 standard scenarios, score outputs against the Operating Bible's communication style rules. Alert if score drops below threshold.

**Phase mapping:** Must be addressed in Phase 1 (foundation) -- before any feedback collection begins. The guardrails must exist before the optimization loop exists.

**Severity:** CRITICAL -- this is existential for Sahara's value proposition.

---

### C2: Feedback-Driven Issue Flood Without Deduplication

**What goes wrong:** The existing WhatsApp monitor (`trigger/sahara-whatsapp-monitor.ts`) already creates Linear issues from WhatsApp messages. Adding in-product feedback creates a second source of issues. Without deduplication, the same problem generates 5-50 Linear issues from different users reporting the same bug, burying real signal in noise.

**Why it happens:** The current `createLinearIssue()` function does a simple GraphQL mutation with no duplicate check. Each run processes messages independently. Adding in-product feedback means the same "voice chat cuts off on Samsung" bug could generate issues from WhatsApp monitoring, thumbs-down feedback, detailed text feedback, and Sentry error alerts -- all as separate tickets.

**Consequences:**
- Linear backlog becomes unmanageable
- Team spends more time triaging than fixing
- Critical issues get lost among duplicates
- "Issue created" notifications spam the team

**Warning signs:**
- Linear issue count growing faster than resolution rate
- Multiple issues with near-identical titles
- Team stops reading Linear notifications (alert fatigue)
- Triage meetings taking longer than 15 minutes

**Prevention:**
1. **Semantic deduplication before issue creation.** Before creating a Linear issue, query existing open issues and use an LLM to check if the new feedback matches an existing issue. Linear's Triage Intelligence (Business plan) can help, but do not rely on it alone.
2. **Feedback aggregation window.** Batch feedback into 4-hour windows. Within a window, group similar feedback items, then create ONE issue with a count: "Voice cutoff on Samsung (reported by 12 users)".
3. **Feedback-to-issue linking.** Store a `linear_issue_id` on each feedback record. When new feedback matches an existing issue, add a comment to that issue instead of creating a new one.
4. **Severity escalation, not duplication.** If 5 users report the same thing, escalate priority on the existing issue rather than creating 5 P3 tickets.

**Detection:** Monitor the ratio of issues created to unique root causes. If ratio exceeds 3:1, deduplication is failing.

**Phase mapping:** Phase 2 (feedback collection) must include deduplication logic. Do not ship feedback collection without it.

**Severity:** CRITICAL -- without this, the entire feedback system becomes a liability rather than an asset.

---

### C3: A/B Testing Prompt Quality Without Statistical Controls

**What goes wrong:** The existing A/B testing system (`lib/ai/ab-testing.ts`) has the infrastructure for variant assignment and basic stats (request count, latency, error rate) but lacks statistical significance testing, proper sample size calculations, and guardrails against early stopping. Teams declare a winner based on a few hundred interactions, ship it, and the "winning" prompt actually performs worse at scale.

**Why it happens:** LLM outputs are high-variance. A prompt might produce great responses for founders asking about unit economics but terrible ones for pitch deck reviews. Aggregated metrics hide these failure modes. Research from Statsig confirms: "statistical significance and practical significance are different things -- a p-value of 0.001 tells you the effect is real, but Cohen's d tells you whether it's big enough to matter."

**Consequences:**
- Ship prompts that regress quality for specific user segments
- Oscillating prompt changes (A beats B, then B beats A on different sample)
- Loss of confidence in the optimization process
- Potential FRED voice corruption (see C1)

**Warning signs:**
- Experiments concluded in under 1 week
- No sample size calculation before experiment start
- Stats only show averages, not distributions or segment breakdowns
- "We tested it and it's better" without confidence intervals

**Prevention:**
1. **Pre-registration.** Before starting any A/B test, document: hypothesis, primary metric, required sample size (power analysis), and decision criteria. Store this in the `ab_experiments` table as metadata.
2. **Minimum sample size enforcement.** The `getVariantStats()` function should refuse to declare a winner below a configurable minimum (suggest: 500 sessions per variant for chat quality, 100 for binary metrics like thumbs-up rate).
3. **Segmented analysis.** Break results by founder stage (beginner, pre-seed, seed, Series A+), topic (unit economics, pitch review, team building), and tier (Free, Pro, Studio). A prompt that wins overall but loses for your highest-value segment is not a winner.
4. **Model drift guard.** The existing `getVariantStats` joins on `ai_requests` and `ai_responses`, but does not track which underlying model version was used. If Anthropic updates claude-sonnet during your test, your results are invalid. Log the exact model ID per request.
5. **Sequential testing with alpha spending.** If you must peek at results (you will), use a sequential testing framework that adjusts for multiple looks. Otherwise, early peeking inflates false positive rates to 20-30%.

**Detection:** Post-experiment, check if the deployed prompt's metrics match the test period. If they diverge by more than 10%, the test was unreliable.

**Phase mapping:** Phase 3 (analysis/optimization). The A/B infrastructure exists but needs statistical rigor before running prompt experiments.

**Severity:** CRITICAL -- shipping bad prompts directly degrades the product.

---

## High-Priority Pitfalls

Mistakes that cause significant delays, user frustration, or technical debt.

---

### H1: Feedback Fatigue -- Wrong Timing, Wrong Frequency

**What goes wrong:** Inline feedback prompts interrupt FRED's mentoring flow. A founder is having a breakthrough conversation about their positioning strategy, and a "Rate this response" widget breaks the spell. Users either ignore all feedback requests (making data useless) or leave the platform because it feels like a survey, not a mentor.

**Why it happens:** Teams optimize for feedback volume ("we need more data") rather than feedback quality. They add feedback widgets to every message or pop up modals after every session.

**Consequences:**
- Feedback response rate drops below 5% (industry baseline for in-product feedback)
- Remaining feedback is biased toward highly negative experiences (see H2)
- User satisfaction drops due to interruptions
- FRED feels less like a mentor and more like a customer service bot

**Warning signs:**
- Feedback response rate declining week-over-week
- Users dismissing feedback prompts within <1 second (rage-clicking away)
- Support tickets about "too many popups"
- Session length decreasing after feedback widgets launch

**Prevention:**
1. **Session-end only for detailed feedback.** Never interrupt a FRED conversation with a feedback request. Offer a single lightweight prompt (thumbs up/down) ONLY after the user has been idle for 30+ seconds or explicitly ends the session.
2. **Throttle per user.** Maximum one detailed feedback request per week per user. Track last feedback timestamp in user metadata.
3. **Contextual triggers only.** Ask for feedback when it is contextually relevant:
   - After a pitch deck review is delivered
   - After a goal milestone is completed
   - After an IRS score changes significantly
   - NOT after routine chat messages
4. **Passive signals first.** Before adding any explicit feedback widget, instrument passive signals: session duration, return rate, message count, whether user completed suggested action items. These are high-signal, zero-friction.
5. **Progressive disclosure.** Start with thumbs up/down (0.5 seconds of user effort). Only show "Tell us more" if they click thumbs down. Never show a textarea by default.

**Detection:** Track feedback prompt-to-response ratio. If below 10%, you are asking too often or at the wrong time.

**Phase mapping:** Phase 2 (feedback collection). UX design must be finalized before any widget code is written.

**Severity:** HIGH -- directly affects user experience and data quality.

---

### H2: Survivorship and Negativity Bias in Feedback

**What goes wrong:** Only dissatisfied users bother to give feedback. The feedback dataset over-represents problems and under-represents successes. When you optimize based on this biased data, you make FRED less direct (because blunt advice gets thumbs-down from some users) and more hand-holdy (because confused beginners are the ones who complain).

**Why it happens:** Satisfied users have no reason to stop and rate. They got value and moved on. Dissatisfied users are motivated to express frustration. This is a well-documented cognitive bias in UX research. Additionally, users who churned never give feedback at all (survivorship bias).

**Consequences:**
- Prompt optimization regresses quality for power users (who are satisfied and silent)
- FRED becomes increasingly cautious and hedging
- Product decisions driven by the vocal minority
- False signal: "users hate direct feedback" when actually 90% of users love it

**Warning signs:**
- Feedback sentiment is >70% negative
- Thumbs-down rate on FRED's challenging/reframing responses is disproportionately high
- No feedback from Pro/Studio tier users (your best customers)
- Feedback volume correlates with bug reports, not with usage

**Prevention:**
1. **Stratified sampling.** Actively solicit feedback from users who are NOT complaining. Target: proportional representation across tiers, founder stages, and usage frequency. If 60% of active users are Pro tier, 60% of feedback requests should go to Pro users.
2. **Separate bug reports from quality feedback.** A "this didn't work" (bug) is fundamentally different from "I didn't like this answer" (quality). Route them differently. Bug reports go to Linear. Quality feedback goes to the prompt optimization pipeline.
3. **Implicit positive signals.** Count as positive feedback: user follows FRED's advice (takes suggested action), user returns within 24 hours, user upgrades tier, user shares a link. These are stronger signals than an explicit thumbs-up.
4. **Weight by user value.** Feedback from a Studio-tier founder who has been on the platform for 3 months should carry more weight than feedback from a Free-tier user on their first session. Not because free users don't matter, but because experienced users have calibrated expectations.
5. **Control group.** Always maintain a set of users who receive NO feedback prompts. Compare their behavior (retention, session length, upgrade rate) to the feedback-prompted group. If the feedback-prompted group shows worse metrics, the feedback system itself is the problem.

**Detection:** Weekly bias report: compare feedback sentiment distribution to overall usage metrics (retention, session length, NPS if available). If they diverge significantly, bias is present.

**Phase mapping:** Phase 2 (feedback collection design) and Phase 3 (analysis). Bias mitigation must be designed into the collection mechanism, not bolted on after.

**Severity:** HIGH -- biased data leads to systematically wrong optimization decisions.

---

### H3: Performance Impact on the Chat Pipeline

**What goes wrong:** Adding feedback collection, sentiment analysis, and real-time analytics to the existing chat pipeline introduces latency. FRED already has documented latency issues (per FRED-CHAT-LATENCY-REPORT.md). Inline feedback widgets add DOM elements, event listeners, and API calls to every message render. Feedback submission triggers Supabase writes, and if those are synchronous, they block the next FRED response.

**Why it happens:** Feedback features are treated as "simple additions" that just add a button. But each button needs state management, optimistic UI, error handling, and a write path. When multiplied by every message in a conversation, the overhead compounds.

**Consequences:**
- Chat latency increases by 50-200ms per message (noticeable)
- Memory leaks from feedback widget event listeners in long conversations
- Supabase connection pool exhaustion if feedback writes are not batched
- Existing 335 lint errors and 12 test failures become harder to diagnose

**Warning signs:**
- Time-to-first-token increases after feedback feature ships
- Lighthouse performance score drops
- `use-fred-chat.ts` hook re-renders increase
- Supabase connection count spikes during peak usage

**Prevention:**
1. **Fire-and-forget for feedback writes.** Feedback submission must be asynchronous and non-blocking. Use `navigator.sendBeacon()` for browser-side or a dedicated queue. Never `await` a feedback write in the chat response path.
2. **Lazy load feedback widgets.** Do not import feedback components in the initial chat bundle. Use `React.lazy()` or dynamic import. The thumbs-up/down icons are tiny, but the submission logic, animation, and state management are not.
3. **Batch feedback writes.** Buffer feedback events client-side (max 10 or every 30 seconds) and write to Supabase in a single batch. This reduces connection overhead from N writes to 1.
4. **Separate feedback table from chat tables.** Do not add columns to existing `chat_messages` or `ai_requests` tables. Create a dedicated `feedback_events` table with its own indexes. This prevents feedback queries from slowing down chat queries.
5. **Performance budget.** Set a hard limit: feedback features must add less than 50ms to p95 chat latency and less than 20KB to the chat bundle. Measure before and after with Lighthouse CI.
6. **Build compatibility.** The project uses `next build --webpack` (Turbopack fails). Verify that any new feedback dependencies are webpack-compatible. Test the build after adding packages.

**Detection:** Add a latency comparison metric to the existing health monitor (`lib/ai/health-monitor.ts`): track p50/p95/p99 chat latency before and after feedback feature deployment.

**Phase mapping:** Phase 2 (implementation). Performance testing must happen before, during, and after feedback feature rollout.

**Severity:** HIGH -- FRED latency is already a known pain point. Making it worse is unacceptable.

---

### H4: WhatsApp API Compliance and Rate Limit Violations

**What goes wrong:** The existing WhatsApp monitor uses BrowserBase (browser automation) to scrape messages from WhatsApp Web. This is a Terms of Service violation for WhatsApp. If Meta detects it, the phone number gets banned. Additionally, if you expand to sending feedback-resolution notifications via WhatsApp, you must use the official Business API with pre-approved message templates, and you face per-portfolio rate limits.

**Why it happens:** The current implementation (`trigger/sahara-whatsapp-monitor.ts`) was built as a pragmatic shortcut -- scraping a group chat rather than integrating the official API. This works until it does not. Scaling to user-facing feedback notifications requires the official API path.

**Consequences:**
- Phone number banned by Meta (permanent, no appeal for scraping violations)
- Loss of the "Sahara Founders" WhatsApp group communication channel
- Messages not delivered due to rate limiting (250 conversations/24h for new numbers, scaling to 100K after verification in Q2 2026)
- Business portfolio pacing: Meta now batches large campaigns and can pause delivery based on feedback signals

**Warning signs:**
- WhatsApp Web session disconnects more frequently
- QR code re-authentication required (sign Meta is suspicious)
- Messages marked as "pending" or not delivered
- BrowserBase session creation failures increasing

**Prevention:**
1. **Migrate to official WhatsApp Business API.** Use a BSP (Business Solution Provider) like Twilio, MessageBird, or 360dialog. The official API provides webhooks for incoming messages, eliminating the need for browser scraping.
2. **Pre-approve message templates.** All outbound messages (feedback resolution notifications) must use Meta-approved templates. Template approval takes 24-48 hours. Plan ahead.
3. **Respect rate limits.** New numbers start at 250 conversations/24h. As of Q2 2026, verified businesses jump directly to 100K/day. Budget accordingly for the demo to 250 founders.
4. **Quality rating monitoring.** Meta assigns quality ratings (Green/Yellow/Red) based on user feedback on your messages. If users block or report your messages, your quality drops and limits decrease. Never send unsolicited notifications.
5. **24-hour messaging window.** You can only send free-form messages within 24 hours of a user's last message. After that, you must use approved templates and pay per conversation.

**Detection:** Track WhatsApp API response codes. Error 131056 (rate limit) and 131049 (message failed) indicate compliance issues.

**Phase mapping:** Phase 1 (infrastructure). Migrate off BrowserBase scraping before building any feedback notification system on top of it.

**Severity:** HIGH -- current approach is a ticking time bomb.

---

### H5: Admin Dashboard Becomes a Data Graveyard

**What goes wrong:** The feedback admin dashboard is built, populated with charts and tables, and then nobody looks at it. Feedback accumulates without being acted on. Users who gave feedback see no changes. The team builds a "feedback insights" page that shows beautiful sentiment trends that drive zero decisions.

**Why it happens:** Dashboards are built for "viewing data" rather than "making decisions." Without clear ownership, regular review cadence, and workflow integration, dashboards become read-only museums of historical data.

**Consequences:**
- Feedback system exists but produces no product improvements
- Users stop giving feedback because nothing changes
- Engineering effort wasted on dashboard that nobody uses
- False sense of "we're listening to users" without actually acting

**Warning signs:**
- Dashboard page views declining after initial launch excitement
- No Linear issues created from dashboard insights in 30+ days
- "Action items" column in dashboard always empty
- Team meetings never reference dashboard data

**Prevention:**
1. **Workflow, not dashboard.** Instead of a "view feedback" page, build a "triage feedback" workflow. Each feedback item has a status: New > Reviewed > Actioned > Resolved > Communicated. If items stay in "New" for more than 7 days, alert the product owner.
2. **Weekly digest email.** Send a weekly summary to the product team (already have Resend integration) with: top 5 feedback themes, sentiment trend, unresolved items count, items resolved this week. Force awareness without requiring a dashboard visit.
3. **Link to roadmap.** Every feedback theme should link to a Linear issue or roadmap item. If a theme has no linked issue, it is flagged for triage. This closes the gap between "data collected" and "data acted on."
4. **Kill metrics that don't drive action.** Do not show vanity metrics (total feedback count, average sentiment score). Show actionable metrics: "Top 3 unresolved complaints this week," "Features most requested by Pro/Studio users," "Feedback items that match open bugs."
5. **Assign ownership.** One person (not "the team") owns reviewing feedback weekly. If that person is on vacation, it auto-delegates. Use a rotation if needed.

**Detection:** Track the ratio of feedback items that result in a code change, prompt update, or documented decision within 14 days. If below 20%, the system is not producing value.

**Phase mapping:** Phase 4 (admin/close-the-loop). Design for action, not for display.

**Severity:** HIGH -- a feedback system that collects but never acts is worse than no feedback system (it wastes user goodwill).

---

## Medium-Priority Pitfalls

Mistakes that cause delays or technical debt but are recoverable.

---

### M1: Sentiment Analysis Overconfidence on Short Text

**What goes wrong:** A thumbs-down on a FRED response is unambiguous. But a text comment like "interesting" or "ok" is ambiguous. Running LLM-based sentiment analysis on 1-5 word feedback produces high-confidence scores on ambiguous input. The system reports "72% negative sentiment" when the reality is "72% of feedback was too short to classify meaningfully."

**Why it happens:** Modern transformers achieve 94%+ accuracy on sentiment benchmarks, but those benchmarks use full sentences and reviews. Short, contextless feedback in a coaching product (where "tough love" is a feature) does not map to standard sentiment categories.

**Consequences:**
- Misleading sentiment dashboards
- Optimization toward false negatives (FRED's directness classified as "negative experience")
- Wasted engineering time building sentiment trends that are noise

**Prevention:**
1. **Classify confidence, not just sentiment.** For each feedback item, output both sentiment AND confidence. Discard or flag items where confidence < 0.7.
2. **Context-aware analysis.** Include the FRED message that triggered the feedback in the sentiment analysis prompt. "This was hard to hear" after a Reality Lens assessment is POSITIVE feedback (FRED did its job). Without context, it reads as negative.
3. **Three-bucket minimum.** Do not use positive/negative binary. Use: positive, negative, neutral/ambiguous, and "coaching discomfort" (a special category for when FRED's directness is working as intended but feels uncomfortable).
4. **Thumbs up/down as primary metric.** Binary signals are unambiguous. Use them as the primary metric. Use text analysis only as a supplement, never as a replacement.

**Detection:** Sample 50 feedback items monthly. Have a human classify them. Compare to automated classification. If agreement < 80%, the automated system needs calibration.

**Phase mapping:** Phase 3 (analysis). Do not over-invest in NLP for short feedback. Binary signals first.

**Severity:** MEDIUM -- leads to bad analysis but does not directly harm users.

---

### M2: Close-the-Loop Notification Spam

**What goes wrong:** Users give feedback. The team fixes things. The system sends "We fixed this!" notifications. But it sends too many, or sends them for trivial fixes, or sends them weeks later when the user has forgotten what they reported. The notification channel (email, in-app, WhatsApp) becomes noise.

**Why it happens:** "Closing the loop" is a UX best practice. Teams implement it literally: every feedback item that gets resolved triggers a notification. But users gave 3 pieces of feedback over 2 months and do not remember them individually.

**Consequences:**
- Users unsubscribe from notifications (losing a communication channel)
- "We fixed this" messages for things the user barely cared about feel spammy
- WhatsApp notification limits consumed by low-value messages
- User trust decreases if notifications feel automated/impersonal

**Prevention:**
1. **Batch resolution updates.** Send a monthly "Here's what we improved based on your feedback" email. Not per-item. Reference 3-5 improvements. Use the existing email engagement system (`lib/email/milestones/`).
2. **Threshold for notification.** Only notify for P1/P2 fixes or features the user explicitly requested. Do not notify for minor tweaks.
3. **Staleness cutoff.** If feedback is older than 30 days, do not send a resolution notification. The user has moved on.
4. **Opt-in, not opt-out.** Let users choose if they want feedback resolution updates. Default: off. Only suggest opting in after their first feedback submission.
5. **Personal touch.** If Fred Cary himself cares about a specific piece of feedback (common in the current WhatsApp flow), a personal acknowledgment is worth more than 100 automated notifications.

**Detection:** Track notification open rates. If below 15%, you are sending too many or the wrong kind.

**Phase mapping:** Phase 4 (close-the-loop). Build the notification system with throttling from day one.

**Severity:** MEDIUM -- annoying but recoverable by adjusting frequency.

---

### M3: Privacy/GDPR Concerns with Feedback Storage and AI Analysis

**What goes wrong:** Feedback text may contain personal information (founder names, company names, financial data). Storing it in plain text in Supabase and then sending it to Anthropic/OpenAI for sentiment analysis creates a GDPR data processing chain that requires explicit consent, data minimization, and documented legitimate interest assessments.

**Why it happens:** Feedback is treated as "just another database field" rather than as personal data requiring protection. The EDPB's April 2025 opinion clarified that LLMs "rarely achieve anonymization standards" -- meaning feedback text processed by AI is still personal data.

**Consequences:**
- GDPR violation risk (fines up to 4% of annual global turnover)
- Users discovering their feedback is being processed by third-party AI without consent
- Data subject access requests (DSARs) requiring you to produce all stored feedback for a user

**Prevention:**
1. **Explicit consent at collection point.** When a user first encounters a feedback widget, show a brief notice: "Your feedback helps us improve FRED. It may be analyzed by AI to identify trends. [Learn more]". Store consent timestamp.
2. **Data minimization.** Strip personally identifiable information before sending to AI analysis. Company names, revenue figures, and specific founder names in feedback text should be anonymized before batch processing.
3. **Retention policy.** Auto-delete raw feedback text after 90 days. Keep only aggregated, anonymized insights. Add a Supabase cron job for cleanup.
4. **Right to deletion.** Implement a "delete my feedback" flow in account settings. This must cascade to any derived analytics.
5. **Processing records.** Document the feedback data flow in your Records of Processing Activities (ROPA): collection point, storage location, AI processors used, retention period, legal basis.

**Detection:** Quarterly audit: is any feedback data older than retention policy? Are all AI processing chains documented?

**Phase mapping:** Phase 1 (foundation) for consent mechanism. Phase 2 (collection) for data handling. Phase 4 (admin) for deletion flow.

**Severity:** MEDIUM -- legal risk, but Sahara's current user base is small enough that exposure is limited. Must be addressed before the Gregory alliance (80K founders).

---

### M4: Analysis Paralysis -- Collecting Everything, Acting on Nothing

**What goes wrong:** The feedback system collects thumbs up/down, text comments, session recordings, NPS scores, feature requests, bug reports, and sentiment analysis. The data team has 15 dashboards and 30 metrics. Nobody knows which metric to optimize. Product decisions stall because "we need more data."

**Why it happens:** It is easier to add one more data point than to make a decision. Teams confuse data collection with insight generation. The availability of AI-powered analysis makes it trivially easy to generate reports, charts, and summaries -- none of which answer the question "what should we build next?"

**Consequences:**
- Product velocity decreases
- Feedback system costs more to maintain than the value it produces
- Team debates metrics instead of shipping features

**Prevention:**
1. **One primary metric per phase.** Phase 1: feedback submission rate. Phase 2: thumbs-up ratio. Phase 3: feedback-to-action ratio. Do not add more metrics until the current one is stable.
2. **Decision framework, not data warehouse.** For each metric, define: "If metric > X, do A. If metric < Y, do B. Otherwise, do nothing." If you cannot write this framework, you do not need the metric.
3. **Kill unused metrics.** If a metric has not influenced a decision in 30 days, remove it from the dashboard. Storage and computation are not free.
4. **Time-boxed analysis.** Feedback review takes maximum 1 hour per week. If it takes longer, you are collecting too much.

**Detection:** Count the number of product decisions explicitly attributed to feedback data in the last 30 days. If zero, the system is not producing value.

**Phase mapping:** All phases. Start lean and expand only when the current data is being used.

**Severity:** MEDIUM -- slows the team but does not harm users directly.

---

## FRED-Specific Risks

Risks unique to Sahara's architecture and FRED's persona.

---

### F1: Existing Pre-Commit Hooks Break Feedback Integration

**What goes wrong:** The project has pre-commit hooks that auto-revert changes to `dashboard/layout.tsx` and `documents/new/page.tsx`. If feedback widgets need to be added to the dashboard layout (likely) or document pages, the hooks will silently revert the changes. Engineers will commit, verify, and discover their feedback integration is missing.

**Prevention:** Use the documented workaround: create adapter routes or wrapper components. For example, instead of modifying `dashboard/layout.tsx` directly, create a `dashboard/feedback-wrapper.tsx` that imports from layout and adds feedback functionality. Or update the pre-commit hooks to allow the specific changes needed.

**Phase mapping:** Phase 2. Address before any UI integration work begins.

---

### F2: 335 Lint Errors and 12 Test Failures Create Noise

**What goes wrong:** Adding feedback features generates new lint warnings and potential test failures. With 335 existing lint errors and 12 test failures, it is impossible to distinguish new issues from pre-existing ones. A feedback-related regression hides in the noise.

**Prevention:** Before starting Phase 1, create a baseline snapshot of lint errors and test failures. Tag each existing issue as "pre-existing." Set up CI to fail on NEW errors only (delta checking). The existing Vitest configuration (`fileParallelism: false`) means tests run slowly -- add feedback tests to a separate test group if needed.

**Phase mapping:** Phase 0 (pre-work). Baseline the current state before adding anything.

---

### F3: FRED Chat Latency Compounding

**What goes wrong:** FRED already has documented latency issues (FRED-CHAT-LATENCY-REPORT.md). The chat pipeline uses a multi-model fallback chain (`lib/ai/fallback-chain.ts`), circuit breaker (`lib/ai/circuit-breaker.ts`), and tier-based routing (`lib/ai/tier-routing.ts`). Adding feedback collection, A/B variant resolution, and logging to this pipeline introduces additional async operations per message.

**Prevention:**
- A/B variant resolution is already cached for 5 minutes (`experimentsCache` in `ab-testing.ts`). Ensure feedback configuration uses similar caching.
- Use the existing `fire-and-forget` pattern (documented in project architecture) for feedback writes. The project already uses this pattern for agent dispatch.
- Never add synchronous Supabase reads to the chat hot path for feedback purposes. Pre-load feedback configuration at session start.

**Phase mapping:** Phase 2 and Phase 3. Profile the chat pipeline before and after each feedback feature addition.

---

### F4: Multi-Agent Git Conflicts

**What goes wrong:** The project has a documented history of concurrent agents writing to the same repo, causing git staging conflicts. If feedback features touch shared files (`types.ts`, `chat/route.ts`, `use-fred-chat.ts`), concurrent development will create merge conflicts.

**Prevention:** Feedback features should be self-contained in new files/directories:
- `lib/feedback/` -- all feedback logic
- `components/feedback/` -- all feedback UI
- `app/api/feedback/` -- all feedback API routes
- Minimize changes to existing shared files. Use the adapter/wrapper pattern.

**Phase mapping:** All phases. Establish the directory structure in Phase 1.

---

### F5: Feedback Loop Creates Perverse Incentives for Free Tier

**What goes wrong:** Free-tier users have limited FRED interactions (5 messages, 0 days memory per MEMORY_CONFIG). They are most likely to give negative feedback because their experience is deliberately limited. If feedback-driven optimization responds to Free-tier complaints, it creates pressure to give away more for free rather than improving the paid experience.

**Prevention:**
- Segment all feedback by tier. Weight Pro/Studio feedback 3-5x higher for prompt optimization decisions.
- Do not show feedback widgets to users who have not completed at least one full FRED conversation (5+ messages).
- Frame Free-tier limitations honestly: "Upgrade to Pro for longer conversations" rather than trying to make the limited experience feel unlimited.

**Phase mapping:** Phase 2 (collection design). Tier-aware feedback collection from day one.

---

## Prevention Checklist

Pre-flight checklist before building any feedback loop component.

| # | Check | Phase | Owner |
|---|-------|-------|-------|
| 1 | Core FRED prompt marked as immutable (read-only constant, no auto-modification) | 1 | AI Lead |
| 2 | Voice regression test suite created (20+ scenarios) | 1 | AI Lead |
| 3 | Baseline lint errors and test failures snapshot taken | 0 | Engineering |
| 4 | Feedback data model designed with GDPR consent field | 1 | Backend |
| 5 | Deduplication logic designed before feedback collection ships | 2 | Backend |
| 6 | Feedback widget performance budget set (<50ms p95, <20KB bundle) | 2 | Frontend |
| 7 | Tier-aware feedback sampling strategy documented | 2 | Product |
| 8 | A/B test pre-registration template created with sample size calculator | 3 | Data |
| 9 | WhatsApp Business API migration plan created | 1 | Infrastructure |
| 10 | Admin dashboard designed as workflow, not report | 4 | Product |
| 11 | Close-the-loop notification throttling rules defined | 4 | Product |
| 12 | Feedback data retention policy documented (90 day default) | 1 | Legal/Compliance |
| 13 | Pre-commit hook workaround documented for feedback UI files | 2 | Engineering |
| 14 | One primary metric per phase defined | All | Product |
| 15 | Fire-and-forget pattern confirmed for feedback writes | 2 | Backend |

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| FRED voice drift (C1) | HIGH | Based on direct codebase analysis of `prompts.ts` and Operating Bible, plus research on prompt drift |
| Issue deduplication (C2) | HIGH | Based on analysis of existing `sahara-whatsapp-monitor.ts` which has no dedup logic |
| A/B testing stats (C3) | HIGH | Based on analysis of existing `ab-testing.ts` code which lacks statistical significance testing |
| Feedback fatigue (H1) | MEDIUM | UX best practices well-documented; Sahara-specific timing depends on user behavior data we don't have |
| Feedback bias (H2) | MEDIUM | Well-studied phenomenon; specific impact on FRED's coaching style is extrapolated |
| Performance impact (H3) | HIGH | FRED latency issues already documented; chat pipeline analyzed in detail |
| WhatsApp compliance (H4) | HIGH | Current BrowserBase approach confirmed as ToS violation; Meta rate limit changes verified for Q2 2026 |
| Admin data graveyard (H5) | MEDIUM | Common industry pattern; specific risk for Sahara is extrapolated |
| Sentiment accuracy (M1) | MEDIUM | Research confirms short text limitations; Sahara-specific "coaching discomfort" category is novel |
| GDPR (M3) | MEDIUM | EDPB 2025 opinion verified; specific Sahara exposure depends on user geography |
| Sahara-specific risks (F1-F5) | HIGH | Based on direct codebase analysis and documented project history |

---

## Sources

**Prompt drift and regression:**
- [Statsig: Prompt Regression Testing](https://www.statsig.com/perspectives/slug-prompt-regression-testing)
- [Agenta: Prompt Drift Detection](https://agenta.ai/blog/prompt-drift)
- [Orq: Model vs Data Drift in LLMs](https://orq.ai/blog/model-vs-data-drift)

**A/B testing LLMs:**
- [Statsig: When Statistical Significance Misleads](https://www.statsig.com/perspectives/abtesting-llms-misleading)
- [Braintrust: A/B Testing LLM Prompts](https://www.braintrust.dev/articles/ab-testing-llm-prompts)
- [Latitude: A/B Testing in LLM Deployment](https://latitude-blog.ghost.io/blog/ab-testing-in-llm-deployment-ultimate-guide/)

**WhatsApp API compliance:**
- [Chatarmin: WhatsApp Messaging Limits 2026](https://chatarmin.com/en/blog/whats-app-messaging-limits)
- [Sanuker: WhatsApp 2026 Updates](https://sanuker.com/whatsapp-api-2026_updates-pacing-limits-usernames/)
- [GMCSCO: WhatsApp API Compliance 2026](https://gmcsco.com/your-simple-guide-to-whatsapp-api-compliance-2026/)

**GDPR and AI:**
- [SecurePrivacy: AI GDPR Compliance Challenges 2025](https://secureprivacy.ai/blog/ai-gdpr-compliance-challenges-2025)
- [Orrick: EDPB Opinion on AI and GDPR](https://www.orrick.com/en/Insights/2025/03/The-European-Data-Protection-Board-Shares-Opinion-on-How-to-Use-AI-in-Compliance-with-GDPR)

**Feedback UX:**
- [Qualaroo: Customer Feedback Strategies for SaaS 2026](https://qualaroo.com/blog/customer-feedback-saas/)
- [Thematic: Customer Feedback Loop Guide](https://getthematic.com/insights/customer-feedback-loop-guide)

**Linear triage:**
- [Linear: Triage Intelligence](https://linear.app/docs/triage-intelligence)
- [Linear: Product Intelligence](https://linear.app/changelog/2025-08-14-product-intelligence-technology-preview)

**Chatbot UX patterns:**
- [Groto: AI Chatbot UX 2026](https://www.letsgroto.com/blog/ux-best-practices-for-ai-chatbots)
- [AI UX Patterns](https://aiuxpatterns.com/)
