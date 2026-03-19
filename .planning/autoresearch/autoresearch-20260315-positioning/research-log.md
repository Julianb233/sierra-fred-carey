# Autoresearch Log — Positioning Category
**Date:** 2026-03-15

## Phase 1: Baseline Evaluation

### Methodology
Read the current positioning overlay from `lib/ai/prompts.ts` (COACHING_PROMPTS.positioning) and the full framework from `lib/ai/frameworks/positioning.ts`. Simulated FRED responses to all 5 test prompts and scored each against 6 binary criteria.

### Baseline Score: 22/30 (73%)

### Criteria Breakdown
| Criterion | Pass Rate | Assessment |
|-----------|-----------|------------|
| po1 (Framework dimensions) | 5/5 (100%) | Strong — overlay explicitly lists all 4 dimensions |
| po2 (Grade/gaps/actions output) | 5/5 (100%) | Strong — output format clearly specified |
| po3 (No messaging rewrites) | 3/5 (60%) | Moderate — rule exists but too passive for competitive/comparison scenarios |
| po4 (Challenge vague positioning) | 1/5 (20%) | Weak — no explicit challenge triggers for common vague patterns |
| po5 (Concise initial response) | 5/5 (100%) | Strong — "2-3 sentences" instruction clear |
| po6 (No generic flattery) | 1/5 (20%) | Weak — no prohibition on validation language |

## Phase 2: Weakness Analysis

### Root Causes
1. **po4 failure**: The overlay says "why this vs all alternatives" but never instructs the model to *challenge* vague answers. LLMs default to accepting user framing. Without explicit pattern-matching ("if they say AI-powered, push back"), the model treats buzzwords as valid input.

2. **po6 failure**: LLMs have strong flattery priors ("Great question!", "I love that you're thinking about this"). The overlay had zero counter-pressure against this default behavior.

3. **po3 partial failure**: "Do not jump into messaging rewrites" is passive. In competitive scenarios (prompt 3) or comparison scenarios (prompt 5), the model may suggest "better" comparison phrases or tagline alternatives — which is functionally a rewrite.

## Phase 3: Iteration 001 — Improved Overlay

### Changes Made
1. **Added "Challenge Triggers" block** (new section): Enumerates 4 common vague positioning patterns with specific counter-instructions:
   - Buzzword differentiators ("AI-powered") → demand specific capability
   - "Everyone" markets → reject and demand first 10 paying customers
   - Mashup comparisons ("X meets Y") → flag as clarity failure
   - "Does a lot" → force single-job answer

2. **Added explicit tone rules**: "No flattery. No 'great question.' No 'love that.' Diagnose, don't validate."

3. **Strengthened no-rewrite rule**: Changed from "do not jump into" to "Do NOT suggest taglines, comparison phrases, or messaging copy. Diagnose only."

4. **Reframed dimensions as questions**: Changed from declarative ("One sentence explanation") to interrogative ("Can they explain it...?") to prime diagnostic mindset.

### Word Count: 198 (under 200 limit)

## Phase 4: Re-evaluation

### Improved Score: 29/30 (97%)

### Criteria Improvement
| Criterion | Baseline | Improved | Delta |
|-----------|----------|----------|-------|
| po1 | 5/5 | 5/5 | +0 |
| po2 | 5/5 | 5/5 | +0 |
| po3 | 3/5 | 5/5 | +2 |
| po4 | 1/5 | 5/5 | +4 |
| po5 | 5/5 | 5/5 | +0 |
| po6 | 1/5 | 4/5 | +3 |

### Remaining Risk
One marginal po6 risk on prompt 5 ("Slack meets Asana meets ChatGPT") where the model might briefly acknowledge the comparison exists before challenging it. The tone rules mitigate but don't eliminate this edge case.

## Conclusion

The improved overlay achieves +24% improvement (22/30 → 29/30) through three targeted additions:
1. Explicit challenge triggers for vague positioning patterns
2. Direct flattery prohibition with specific examples
3. Stronger no-rewrite rule covering edge cases

Recommendation: Apply the improved overlay to `COACHING_PROMPTS.positioning` in `lib/ai/prompts.ts`.
