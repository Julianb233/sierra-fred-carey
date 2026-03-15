# AutoResearch Log — FRED Coaching Overlays (Per-Category)

Run date: 2026-03-15
Linear: PERS-271
Categories: fundraising, pitchReview, strategy, positioning, mindset

## Summary

| Category | Baseline | Improved | Delta | Changed |
|----------|----------|----------|-------|---------|
| fundraising | 94.3% (33/35) | 100% (35/35) | +5.7% | Yes |
| pitchReview | 70% (21/30) | 100% (30/30) | +30% | Yes |
| strategy | 60% (21/35) | 94% (33/35) | +34% | Yes |
| positioning | 73% (22/30) | 97% (29/30) | +24% | Yes |
| mindset | 88.6% (31/35) | 100% (35/35) | +11.4% | Yes |

All 5 categories improved. Winning overlays applied to `lib/ai/prompts.ts`.

---

## ✅ fundraising (94.3% → 100%)

**Root cause:** Tactical fundraising bullets with no upstream-truth gate violated Decision Sequencing Rule.

**Key fixes:**
1. Added explicit GATE requiring upstream truth verification before fundraising analysis
2. Made "Challenge first" the leading bullet — default to revenue-first thinking
3. Replaced "translate vague feedback" with "diagnose the real gap"
4. Gated raise mechanics behind upstream-truth check
5. Added "Never flatter traction that hasn't been pressure-tested"

---

## ✅ pitchReview (70% → 100%)

**Root causes:** Conciseness collapse from numbered checklist, Reality Lens as afterthought, no single-topic flexibility.

**Key fixes:**
1. MENU framing: "a MENU you offer, not a checklist you dump"
2. Reality Lens moved to structural position BEFORE the protocol list
3. Single-topic flexibility added
4. Anti-compliment rule: "Do not compliment the deck before diagnosing it"
5. Evidence rule: "Do not help polish a story built on assumptions"

---

## ✅ strategy (60% → 94%)

**Root causes:** Vague bullet list encouraged menu-style responses (0/5 on specific next step), no flattery prohibition (0/5), no reframing instruction (1/5).

**Key fixes:**
1. Restructured into 4-step diagnostic sequence (Diagnose → Gate → Reframe → Prescribe)
2. Explicit step-naming: "You're at Step N: [name]"
3. Reframing mandate: "the ONE decision that actually matters right now"
4. Single-action prescription: "Not a menu. Not options. One thing."
5. No-flattery rule: "Never open with praise... Open with diagnosis."

---

## ✅ positioning (73% → 97%)

**Root causes:** No pushback on buzzwords (1/5), no flattery counter-pressure (1/5), passive no-rewrite rule failed (3/5).

**Key fixes:**
1. Added "Challenge Triggers" with 4 explicit vague-positioning patterns
2. Tone rules: "No flattery. No 'great question.' Diagnose, don't validate."
3. Strengthened no-rewrite rule to forbid taglines, comparison phrases, messaging copy
4. Added "including doing nothing" to differentiation dimension

---

## ✅ mindset (88.6% → 100%)

**Root causes:** Vague risk signal triggers, abstract controllables instruction, missing normalization categories.

**Key fixes:**
1. Expanded normalization to include decision paralysis, comparison spirals, relationship/family strain
2. Concrete controllables: "What's the ONE decision you can make today?"
3. Added comparison-specific redirect bullet
4. Enumerated explicit distress and professional support triggers

---

## Methodology

- Eval criteria from `.planning/OPERATING-BIBLE.md` per SAHARA-FRED-AUTORESEARCH-WORKFLOW.md §4b
- 5 representative founder prompts per category
- 6-7 binary eval criteria per category (33 total checks)
- Only coaching overlays mutated; core prompt untouched
- All iteration logs in `.planning/autoresearch/autoresearch-20260315-{category}/`
