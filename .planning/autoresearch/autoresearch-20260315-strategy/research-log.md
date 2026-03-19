# Autoresearch Log — Strategy Overlay (2026-03-15)

## Objective
Evaluate and improve the FRED coaching overlay for the "strategy" category against 7 binary criteria across 5 test prompts.

## Baseline Analysis (21/35 = 60%)

### Strengths (100% pass rate)
- **s1 (step identification)**: The overlay explicitly instructs step identification. Strong.
- **s2 (no skipping)**: "Do not let them skip ahead" is clear and effective.
- **s3 (decision sequencing)**: "Upstream truth before downstream optimization" is well-phrased.
- **s5 (conciseness)**: "2-3 sentences" instruction is direct.

### Weaknesses (0-20% pass rate)
- **s4 (specific next step, 0%)**: The overlay lists 7 vague action bullets (identify challenges, determine validation, prioritize resources, define milestones). This encourages menu-style responses rather than a single concrete prescription. No instruction to prescribe ONE action.
- **s7 (no flattery, 0%)**: No prohibition on generic praise. LLMs default to "Great idea!" or "That's a smart question" openers. Without explicit prohibition, this fails every time.
- **s6 (reframing, 20%)**: Only passes when the founder is already asking the right question (prompt 5). No instruction to reframe surface-level questions to the highest-leverage underlying decision.

## Iteration 001 — Structural Rewrite

### Mutation Strategy
Restructured the overlay from a flat bullet list into a numbered diagnostic sequence (Diagnose → Gate → Reframe → Prescribe). This mirrors how an experienced mentor actually thinks:

1. **Added explicit step-naming**: "Name it explicitly: 'You're at Step N: [name].'" — forces s1 compliance
2. **Added reframing as Step 3**: "Reframe their question to the ONE decision that actually matters" — addresses s6
3. **Added single-action mandate**: "End with exactly ONE concrete next step... Not a menu. Not options. One thing." — addresses s4
4. **Added no-flattery rule**: "Never open with praise, flattery, or 'great question' language. Open with diagnosis." — addresses s7
5. **Removed vague bullets**: Eliminated "identify challenges," "prioritize resources," "define milestones" — these invited menu responses

### Result: 33/35 = 94% (+34% improvement)

All criteria now pass at >= 60%. The 2 remaining failures are both on s7 (no-flattery) in edge cases:
- Prompt 3: Founder has real traction ("doing OK in our niche") — model may acknowledge this as implicit praise
- Prompt 5: Founder shows self-awareness — model may affirm the humility as a form of flattery

These are inherent LLM tendencies that would require increasingly aggressive language to suppress, risking making Fred feel hostile rather than direct. The 94% rate is a good tradeoff.

## Key Insight
The original overlay told the model WHAT to do (identify step, gate, sequence) but not HOW to structure the response. The improved version prescribes a response pattern (diagnose → gate → reframe → prescribe one action) which constrains the output format and eliminates the vague-menu failure mode. Structural instructions > behavioral instructions for LLM prompt overlays.

## Files Produced
- `config.json` — test configuration
- `baseline/eval.json` — baseline scores (21/35)
- `iterations/001/mutation.md` — mutation rationale
- `iterations/001/eval.json` — iteration scores (33/35)
- `best/overlay.txt` — winning overlay text
- `summary.json` — summary metrics
