# Autoresearch Log — Mindset Category
**Date:** 2026-03-15

## Baseline Evaluation

**Score: 31/35 (0.886)**

Evaluated the existing mindset overlay from `lib/ai/prompts.ts` (lines 101-115) against 5 test prompts and 7 binary criteria.

### Failures identified (4 points lost):

| Prompt | Criterion | Issue |
|--------|-----------|-------|
| P1 (exhaustion + family + savings gone) | m7 | No explicit markers for when relationship strain or financial ruin should trigger professional support referral. "Serious risk signals" too vague. |
| P2 (comparison to other founders) | m2 | "Reduce to controllables, offer practical exits" too abstract for comparison-driven self-doubt. No guidance to redirect comparison energy into concrete action. |
| P3 (decision paralysis) | m1 | Decision paralysis not listed in the normalization bullet. Only insecurity, burnout, imposter syndrome are mentioned. |
| P5 (imposter syndrome + investor meeting) | m2 | No specific actionable framing for imposter syndrome preparation. "Reduce to controllables" doesn't translate clearly to "prepare for the meeting." |

### Root causes:
1. **Incomplete normalization list** — overlay only listed 3 emotional states; real founders face at least 6 common ones.
2. **Abstract controllables instruction** — "offer practical exits" gives no model for what a practical exit looks like.
3. **Vague professional support triggers** — no examples of what constitutes "serious risk signals."

## Iteration 001 — Targeted Fixes

**Strategy:** Surgical edits to close the 4 specific gaps without bloating word count.

### Changes made:
1. Expanded normalization list: added decision paralysis, comparison spirals, relationship/family strain
2. Made controllables actionable with example: "What's the ONE decision you can make today?"
3. Added micro-victories concreteness: "name one concrete next step they can take today"
4. Added comparison-specific redirect instruction
5. Enumerated distress triggers: exhaustion, financial strain, family conflict, hopelessness
6. Enumerated professional support triggers: financial ruin, relationship breakdown, sustained hopelessness, self-harm

**Word count:** 193 words (under 200 limit)

### Result: 35/35 (1.0) — all 4 gaps closed

| Prompt | Criterion | Before | After | Fix |
|--------|-----------|--------|-------|-----|
| P1 | m7 | 0 | 1 | Explicit distress triggers list |
| P2 | m2 | 0 | 1 | Comparison redirect instruction |
| P3 | m1 | 0 | 1 | Decision paralysis in normalization list |
| P5 | m2 | 0 | 1 | Concrete micro-victories + actionable controllables |

## Conclusion

Single iteration achieved perfect score. The baseline was already strong (88.6%); the gaps were addressable through specificity rather than structural changes. Key insight: abstract instructions like "reduce to controllables" need at least one concrete example to reliably guide LLM behavior across varied emotional contexts.

**Recommendation:** Apply the winning overlay to `lib/ai/prompts.ts` line 101-115.
