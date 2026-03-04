# Domain Pitfalls -- v7.0 UX Feedback Loop

**Domain:** Closed-loop UX feedback systems for AI-powered SaaS
**Researched:** 2026-03-04

---

## Critical Pitfalls

Mistakes that cause rewrites, data corruption, or trust erosion.

### Pitfall 1: Auto-Deploying Prompt Changes Without Human Review
**What goes wrong:** Feedback-driven prompt refinement sounds great until a coordinated group of users (or a single bad actor) submits misleading feedback that poisons FRED's prompts. Alternatively, a well-intentioned prompt patch for one coaching topic regresses quality on another.
**Why it happens:** Teams get excited about "self-improving AI" and remove the human gate for speed.
**Consequences:** FRED gives bad advice to founders. Trust is destroyed. Could have legal implications if bad financial/fundraising advice results from poisoned prompts.
**Prevention:** Human-in-the-loop gate for ALL prompt modifications. Admin must review and approve before deployment. A/B test every change before promoting to 100%.
**Detection:** Monitor thumbs-down ratio by topic after any prompt change. Alert if it spikes above baseline within 48 hours.

### Pitfall 2: Collecting Feedback Without Acting On It
**What goes wrong:** Teams ship thumbs up/down buttons but never look at the data, never improve prompts, never tell users their feedback mattered. Founders realize nothing changes and stop providing feedback entirely.
**Why it happens:** Feedback collection is easy to build (Low complexity). Feedback analysis and action are hard (High complexity). Teams ship the easy part and move on.
**Consequences:** Feedback rates drop to near-zero within 4-6 weeks. Users feel ignored. The "feedback system" becomes decoration.
**Prevention:** Do not ship collection (TS-1) without a concrete plan for analysis (D-1) and action (D-2). At minimum, ship the admin dashboard (TS-2) simultaneously so someone is looking at the data. Set a weekly review cadence.
**Detection:** Track feedback submission rate over time. If it declines more than 30% month-over-month, the loop is broken.

### Pitfall 3: Feedback UI That Interrupts the Coaching Flow
**What goes wrong:** Inserting modals, popups, or mandatory rating prompts into FRED's coaching conversation breaks the intimate 1-on-1 coaching experience. Founders feel like they are rating a customer service chatbot, not working with a coach.
**Why it happens:** Teams copy feedback patterns from customer support bots (which ARE transactional) and apply them to coaching (which is relational).
**Consequences:** Founders disengage from coaching to avoid the interruptions. NPS drops. Churn increases.
**Prevention:** Feedback must be non-blocking and optional. Thumbs icons inline, never modals. Post-session micro-survey (max 1 question), never mid-conversation. No NPS inside chat.
**Detection:** Track session duration and completion rate before and after adding feedback UI. If sessions get shorter, the UI is intrusive.

---

## Moderate Pitfalls

Mistakes that cause delays or technical debt.

### Pitfall 4: Over-Indexing on Explicit Feedback, Ignoring Implicit Signals
**What goes wrong:** Building only thumbs up/down and missing the 80% of feedback that is implicit: session abandonment, repeated questions, declining engagement, voice call hangups, frustrated tone.
**Prevention:** Design the data model (TS-4) to accommodate both explicit and implicit signals from day one, even if implicit collection (D-4) comes later. Do not schema-lock yourself.

### Pitfall 5: Sentiment Analysis That Degrades Response Quality
**What goes wrong:** Piggybacking sentiment detection on FRED's LLM response generation adds cognitive load to the prompt, potentially degrading response quality or increasing latency.
**Prevention:** Benchmark FRED's response quality (existing A/B test metrics) before and after adding sentiment extraction. If quality drops, move sentiment to a lightweight async post-processing step instead.

### Pitfall 6: Building Too Much Admin UI Too Early
**What goes wrong:** Spending 3 weeks building a beautiful feedback analytics dashboard before having enough data to display. The dashboard launches with mostly-empty charts and feels premature.
**Prevention:** Ship a minimal admin view (table of recent feedback, basic filters) in Phase 1. Add charts, trends, and pattern detection only after 2-4 weeks of data accumulation.

### Pitfall 7: Feedback-to-Linear Pipeline Creates Noise
**What goes wrong:** The existing WhatsApp monitor already creates Linear issues. Adding in-app feedback as another source could flood Linear with low-quality issues (every thumbs-down becomes a ticket).
**Prevention:** Aggregate before creating tickets. Only pattern-detected themes (D-1) should create Linear issues, not individual thumbs-down signals. Set frequency thresholds: create a ticket only when 5+ users report the same category of issue.

---

## Minor Pitfalls

Mistakes that cause annoyance but are fixable.

### Pitfall 8: Feedback Categories That Are Too Generic
**What goes wrong:** Offering thumbs-down categories like "Bad" and "Not helpful" yields no actionable information. Everything is equally unhelpful.
**Prevention:** Use FRED-specific categories: "Wrong for my stage," "Too vague," "Incorrect information," "Too long," "Wrong tone," "Missing context I already provided." These map to specific prompt improvements.

### Pitfall 9: Not Tracking Which Prompt Version Produced Which Response
**What goes wrong:** You know a response got thumbs-down, but you cannot trace it back to the prompt version, model, or A/B variant. Analysis is impossible.
**Prevention:** The existing `ai_requests` table already links to `variant_id`. Ensure EVERY feedback signal links to the `ai_request` that produced the response, which links to the variant and prompt version.

### Pitfall 10: Channel-Specific Feedback Bias
**What goes wrong:** Chat users provide 10x more explicit feedback than SMS or voice users (because the UI is right there). You optimize FRED for chat but degrade quality for other channels.
**Prevention:** Weight feedback by channel to account for volume differences. Track quality metrics per channel independently.

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| Data model design | Schema too rigid for future signal types | Use JSONB metadata column for extensibility |
| Thumbs UI implementation | Interrupts chat flow | Inline-only, never modal, optional expansion |
| Admin dashboard | Over-built before data exists | Ship minimal table view first |
| Sentiment tracking | Degrades FRED response quality | Benchmark before/after, async fallback |
| AI categorization | Creates Linear noise | Aggregate by theme, frequency thresholds |
| RLHF-lite | Auto-deployment without review | Human gate mandatory, A/B test all changes |
| Close-the-loop | Notifications feel spammy | Batch weekly, only notify for meaningful improvements |
| Multi-channel | Chat feedback dominates | Per-channel quality tracking, weighted analysis |

---

## Sources

- [Microsoft: Beyond Thumbs Up and Down](https://medium.com/data-science-at-microsoft/beyond-thumbs-up-and-thumbs-down-a-human-centered-approach-to-evaluation-design-for-llm-products-d2df5c821da5) -- feedback granularity pitfalls
- [Product School: Customer Feedback Loops](https://productschool.com/blog/user-experience/customer-feedback-loop) -- close-the-loop failure patterns
- [Getthematic: Customer Feedback Loop Guide](https://getthematic.com/insights/customer-feedback-loop-guide) -- common feedback system mistakes
- Sahara codebase analysis: existing WhatsApp monitor, A/B testing, conversation context patterns
