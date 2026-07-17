# Sahara / FRED — Auto Research Workflow

How we test and refine **FRED** (the Sahara mentor chatbot) using an autonomous
optimization loop ("Auto Research"). Linear: **AI-3491** eval-suite scaffold and
**AI-3521** refinement loop.

## What "Auto Research" is

FRED routes every conversation through a **coaching overlay** — a category-specific
prompt fragment layered on top of FRED's core identity. The overlays live in
[`lib/ai/prompts.ts`](../lib/ai/prompts.ts) as `COACHING_PROMPTS`:

| Category | Framework it activates |
|---|---|
| `fundraising` | Investor Lens (verdict-first, capital-is-a-tool) |
| `pitchReview` | Deck Review Protocol + Reality Lens |
| `strategy` | 9-Step Startup Process (decision sequencing) |
| `positioning` | Positioning Readiness Framework (grade + gaps) |
| `mindset` | Founder wellbeing (normalize, controllables, no therapy) |

Auto Research applies Karpathy's autoresearch methodology to these overlays: define
**binary evals**, run the overlay against a battery of representative founder
questions, score with a judge model, **mutate** the overlay to fix failures, keep
the winner, repeat. Over an overnight run this hill-climbs each overlay toward
higher mentor-quality pass rates without changing FRED's core identity or voice.

## The pieces

| Path | Role |
|---|---|
| `scripts/autoresearch-eval.py` | The loop: baseline → mutate → re-eval → keep best. |
| `scripts/fred-autoresearch/scenarios.json` | **Dataset** — founder test cases + binary eval criteria, by category. Single source of truth for both the harness and CI. |
| `lib/ai/__tests__/autoresearch-scenarios.test.ts` | CI gate — dataset integrity + every overlay stays extractable and aligned. Runs free (no API key). |
| `lib/ai/prompts.ts` (`COACHING_PROMPTS`) | The overlays being optimized. |
| `.planning/autoresearch/<run-id>/` | Per-run artifacts: `baseline/`, `iterations/NNN/`, `best/overlay.txt`, `summary.json`, `research-log.md`. |
| `.planning/OPERATING-BIBLE.md` | Source of truth the eval criteria are derived from. |

## The dataset

`scripts/fred-autoresearch/scenarios.json` holds **120 founder scenarios** (24 per
category) plus the binary `eval_criteria` for each category. This is a runnable
seed harness derived from the Operating Bible and meeting context. It is **not**
final Fred calibration yet: `source_status.fred_validated_samples_received` stays
`false` until Fred provides validated sample Q&A pairs. Grow it freely — add
scenarios under the right category, keep `id`s unique. The CI test enforces the
100-200 scenario target and the Fred-validation blocker so the library can't
silently shrink or be misreported as final.

```jsonc
{
  "linear_issues": ["AI-3491", "AI-3521"],
  "scenario_target": { "min": 100, "max": 200 },
  "source_status": {
    "seed_dataset": true,
    "fred_validated_samples_received": false,
    "fred_validated_sample_count": 0,
    "blocker": "Fred-provided validated sample Q&A pairs are still required..."
  },
  "categories": {
    "fundraising": {
      "overlay_key": "fundraising",                 // must exist in COACHING_PROMPTS
      "eval_criteria": [ { "id": "f1", "check": "...", "weight": 1 }, ... ],
      "scenarios":     [ { "id": "fr-01", "prompt": "...", "tags": [...] }, ... ]
    }
  }
}
```

## Running it

```bash
# Free + offline — validate the dataset and that every overlay is extractable.
# This is what CI mirrors; run it before any overnight loop.
python3 scripts/autoresearch-eval.py --dry-run
python3 scripts/autoresearch-eval.py --list-categories
python3 scripts/autoresearch-eval.py --manifest

# One category (needs OPENAI_API_KEY). Default 5 prompts/iteration, 3 iterations.
python3 scripts/autoresearch-eval.py --category fundraising

# Deeper run — more prompts per eval, more iterations.
python3 scripts/autoresearch-eval.py --category mindset --limit 12 --max-iterations 5

# Overnight — every category, 8 prompts each.
python3 scripts/autoresearch-eval.py --all --limit 8
```

`--limit 0` uses every scenario in a category. Models are overridable via
`AUTORESEARCH_FRED_MODEL` / `AUTORESEARCH_JUDGE_MODEL` env vars (defaults:
`gpt-4o` for FRED, `gpt-4o-mini` for the judge). With no `--category`/`--all`,
the harness defaults to `--dry-run` so it never burns API credits by accident.
`--manifest` prints machine-readable evidence for Linear/PR comments, including
scenario counts and whether Fred-validated samples have been received.

## Reading the output

Each run writes to `.planning/autoresearch/autoresearch-YYYYMMDD-<category>/`:

- `baseline/eval.json` — starting pass rate + every graded response.
- `iterations/NNN/` — each mutation: `mutation.md`, `eval.json`, `score.json`.
- `best/overlay.txt` — the winning overlay text.
- `summary.json` — baseline vs best, improvement, whether it changed.
- `research-log.md` — combined table across all categories in the run.

A winning overlay is a **proposal**, not an auto-merge. Review `best/overlay.txt`,
sanity-check it against the Operating Bible, then hand-edit `COACHING_PROMPTS` in
`lib/ai/prompts.ts` if you adopt it. The CI test will confirm the dataset still
aligns with the updated overlay.

## CI gate

`lib/ai/__tests__/autoresearch-scenarios.test.ts` runs on every `npm run test`
and asserts, with no API key required:

- every dataset category maps to a real `COACHING_PROMPTS` overlay;
- the exact regex the Python harness uses can extract each overlay (so a prompts.ts
  refactor can't silently break the loop);
- scenario/criterion ids are unique, prompts are non-empty, counts meet the 100-200
  target, and Fred-validation status remains explicit.

This is the cheap, always-on half of "test and refine": the dataset and the
overlays it targets can never drift out of sync unnoticed. The expensive half (the
LLM loop) runs out of band when an API key is available.

## Refinement loop (how a human drives it)

1. Add/curate scenarios in `scenarios.json` for the category you want to harden
   (e.g. real questions Fred wants FRED to handle better).
2. `python3 scripts/autoresearch-eval.py --dry-run` — confirm the dataset is valid.
3. `python3 scripts/autoresearch-eval.py --category <cat> --limit <n>` — run the loop.
4. Read `summary.json` / `best/overlay.txt`. If it improved and reads well, paste the
   winning overlay into `COACHING_PROMPTS`.
5. `npm run test` — the CI gate confirms alignment. Commit.
