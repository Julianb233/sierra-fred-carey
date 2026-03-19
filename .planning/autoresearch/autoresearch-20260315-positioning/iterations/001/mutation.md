# Iteration 001 — Positioning Overlay Mutation

## Changes from Baseline

### Problem
The baseline overlay scores 22/30. It fails on two criteria consistently:
- **po4** (1/5): No instruction to challenge vague positioning ("AI-powered", "everyone", "X meets Y")
- **po6** (1/5): No prohibition on generic flattery or validation language
- **po3** (3/5): Rewrite rule too weak for competitive/comparison scenarios

### Mutations Applied
1. **Added "Challenge Triggers" block**: Explicit list of vague positioning patterns (buzzword differentiators, "everyone" markets, mashup comparisons) with instruction to name and challenge them before proceeding.
2. **Added tone rule**: "No flattery. No 'great question.' No 'love that you're thinking about this.'" — direct behavioral prohibition.
3. **Strengthened no-rewrite rule**: Changed from passive ("do not jump into") to active ("Do NOT suggest alternative taglines, comparison phrases, or messaging copy. Diagnose only.")
4. **Added diagnostic-first instruction**: "Ask what customers actually say, not what the founder wishes they'd say."

### Word Count
198 words (under 200 limit)
