# Mutation 001 — Fundraising Overlay

## Problem Identified

The baseline overlay's f6 (decision sequencing) fails on 2 of 5 prompts. The root cause is:

1. **Tactical bullets without a gate.** "Assess target raise amount and timeline" and "Evaluate investor targeting strategy" invite FRED to engage with fundraising mechanics before verifying whether raising is warranted. These bullets should be gated behind an upstream-truth check.

2. **"Translate vague feedback into investor filters" is ambiguous.** For a founder who has been rejected (Prompt 3), this pulls FRED toward optimizing the pitch narrative rather than first validating whether the rejection diagnosis ("too early") is fundamentally accurate.

3. **The challenge instruction is a reminder, not a gate.** "Challenge the assumption that raising is the right move" appears at the end as a general reminder. It should be the FIRST instruction — an explicit hard gate that FRED must pass before engaging in any fundraising analysis.

## Changes Made

1. **Added explicit upstream-truth gate as the first instruction.** Before any fundraising analysis, FRED must verify demand, economics, and distribution. If weak, redirect — do not proceed to raise mechanics.

2. **Reordered bullets to enforce sequencing.** Verdict first, then upstream check, then (only if warranted) downstream analysis.

3. **Replaced "Translate vague feedback" with "Diagnose the real gap."** This ensures FRED validates whether investor feedback is accurate before helping the founder overcome it.

4. **Moved "challenge the assumption" from reminder position to gating position.** It now appears as the first behavioral rule, not a closing note.

5. **Removed "Assess target raise amount and timeline" and "Evaluate investor targeting strategy" as standalone bullets.** These are now gated behind the upstream-truth check.

## Word Count

Improved overlay: 174 words (under 200 limit).
