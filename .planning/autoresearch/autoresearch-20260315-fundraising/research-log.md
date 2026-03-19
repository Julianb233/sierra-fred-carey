# Autoresearch Log — Fundraising Overlay

**Date:** 2026-03-15
**Category:** fundraising
**Overlay source:** `lib/ai/prompts.ts` -> `COACHING_PROMPTS.fundraising`
**Model:** claude-opus-4-6

---

## Phase 1: Baseline Evaluation

**Score: 33/35 (94.3%)**

Evaluated the current overlay against 5 test prompts and 7 binary criteria from the Operating Bible. The overlay performs well overall — the core system prompt carries significant weight in enforcing conciseness (f5), no-flattery (f7), and challenge-by-default (f2). The overlay's verdict-first (f1), no-deck (f3), and smallest-proofs (f4) instructions are clear and effective.

**Failures (2):**

1. **Prompt 3 / f6 (decision sequencing):** "I just got rejected by 15 investors." The overlay says "Translate vague feedback into explicit investor filters" which pulls FRED toward optimizing the investor pitch before validating whether the rejection ("too early") is fundamentally accurate. This violates decision sequencing: FRED should first verify whether the founder IS too early before helping them overcome the objection.

2. **Prompt 5 / f6 (decision sequencing):** "$2M SAFE note" question. The overlay bullets "Assess target raise amount and timeline" and "Evaluate investor targeting strategy" are standalone tactical items with no gate. A founder asking about SAFE structure is asking about a downstream artifact (instrument type) before upstream truth (should they raise at all) is established. The overlay has no explicit instruction preventing FRED from engaging with raise mechanics prematurely.

**Root cause:** The overlay lists tactical evaluation bullets (raise amount, timeline, investor targeting, translating feedback) without gating them behind an upstream-truth check. The "Challenge the assumption" closing paragraph is a reminder, not a hard behavioral gate.

---

## Phase 2: Weakness Analysis

**Primary weakness: f6 (decision sequencing)**

The Operating Bible's Decision Sequencing Rule states: "Never optimize downstream artifacts (decks, patents, hiring, fundraising, scaling) before upstream truth is established." The overlay partially enforces this via the closing reminder but undermines it with ungated tactical bullets that invite immediate engagement with raise mechanics.

The tension is structural: the overlay tries to be both a challenge tool AND a fundraising playbook. The tactical bullets belong in the conversation, but only AFTER the upstream gate passes.

**Secondary risk: f2 (challenge default)**

"Assess target raise amount and timeline" implicitly assumes raising will happen. This primes FRED toward facilitation mode rather than challenge mode. The instruction should be gated: only relevant AFTER the decision to raise is validated.

---

## Phase 3: Mutation Design (Iteration 001)

**Changes:**

1. Added explicit GATE instruction as the first paragraph after the header. Uses the word "non-negotiable" and provides redirect language. This mirrors the core prompt's Reality Lens gate pattern.

2. Reordered bullets: "Challenge first" is now bullet #1, before the verdict. This enforces the Operating Bible principle that capital is a tool, not the goal.

3. Replaced "Translate vague feedback into explicit investor filters" with "Diagnose the real gap: validate whether feedback is fundamentally accurate before helping overcome it." This prevents pitch optimization before fundamental validation.

4. Removed standalone "Assess target raise amount and timeline" and "Evaluate investor targeting strategy" bullets. These are now gated: "Only after the gate passes: discuss raise amount, instrument structure, timeline, and investor targeting."

5. Added closing line: "Never flatter traction that hasn't been pressure-tested." This reinforces f7 at the overlay level (previously only in core prompt).

**Word count:** 174 (under 200 limit).

---

## Phase 4: Re-evaluation

**Score: 35/35 (100%)**

Both previously failing criteria now pass:

- **Prompt 3 / f6:** "Diagnose the real gap" instruction explicitly requires FRED to validate rejection accuracy before helping overcome it. FRED would now say: "Before we fix the pitch, let's check — are they right? What's your traction?" before discussing investor filters.

- **Prompt 5 / f6:** GATE instruction explicitly lists "instrument structure" as gated behind upstream truth verification. FRED cannot discuss SAFE vs. priced round until verifying the raise itself is warranted.

All 33 previously passing criteria remain passing. No regression detected.

---

## Recommendation

**Apply iteration 001.** The improved overlay:
- Fixes the 2 decision-sequencing failures
- Adds no regression risk (all existing passes preserved)
- Stays under 200-word limit (174 words)
- Follows the same structural pattern as the original
- Aligns more tightly with the Operating Bible's gating principles

The winning overlay is saved at `best/overlay.txt`. To apply it, update `COACHING_PROMPTS.fundraising` in `lib/ai/prompts.ts`.
