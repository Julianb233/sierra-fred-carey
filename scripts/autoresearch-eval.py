#!/usr/bin/env python3
"""
AutoResearch Eval Harness for FRED Coaching Overlays.

FRED (the Sahara mentor chatbot) routes each conversation to a coaching
*overlay* defined in lib/ai/prompts.ts (COACHING_PROMPTS). This harness runs an
overnight optimization loop (per Karpathy's autoresearch methodology) over a
single overlay at a time:

  1. Build FRED's system prompt (core + the category overlay).
  2. Send a battery of representative founder questions to the model.
  3. Use a judge model to grade each response against binary eval criteria.
  4. Mutate the overlay to fix failing criteria, re-eval, keep the winner.

Test prompts AND eval criteria live in scripts/fred-autoresearch/scenarios.json
(the dataset), NOT in this file — so the scenario library can grow to hundreds of
cases without code changes, and the same dataset is gated in CI by
lib/ai/__tests__/autoresearch-scenarios.test.ts.

Usage:
  # Validate dataset + overlay extraction WITHOUT any API calls (free, fast):
  python3 scripts/autoresearch-eval.py --dry-run
  python3 scripts/autoresearch-eval.py --list-categories

  # Run the loop (requires OPENAI_API_KEY):
  python3 scripts/autoresearch-eval.py --category fundraising
  python3 scripts/autoresearch-eval.py --category mindset --limit 10 --max-iterations 5
  python3 scripts/autoresearch-eval.py --all --limit 8        # overnight: every category
"""

import argparse
import json
import os
import sys
import time
from pathlib import Path
from datetime import datetime, timezone

PROJECT_ROOT = Path(__file__).parent.parent
PROMPTS_FILE = PROJECT_ROOT / "lib" / "ai" / "prompts.ts"
DATASET_FILE = PROJECT_ROOT / "scripts" / "fred-autoresearch" / "scenarios.json"
AUTORESEARCH_DIR = PROJECT_ROOT / ".planning" / "autoresearch"

# The model to use for generating FRED responses and judging
FRED_MODEL = os.environ.get("AUTORESEARCH_FRED_MODEL", "gpt-4o")
JUDGE_MODEL = os.environ.get("AUTORESEARCH_JUDGE_MODEL", "gpt-4o-mini")

DEFAULT_RUNS_PER_ITERATION = 5  # default number of test prompts per eval


# ============================================================================
# Dataset loading
# ============================================================================

def load_dataset() -> dict:
    """Load the scenario + eval-criteria dataset. Single source of truth."""
    if not DATASET_FILE.exists():
        print(f"ERROR: dataset not found at {DATASET_FILE}")
        sys.exit(1)
    data = json.loads(DATASET_FILE.read_text())
    cats = data.get("categories")
    if not isinstance(cats, dict) or not cats:
        print("ERROR: dataset has no categories")
        sys.exit(1)
    return data


def category_names(dataset: dict) -> list:
    return list(dataset["categories"].keys())


def prompts_for(dataset: dict, category: str, limit: int | None) -> list:
    scenarios = dataset["categories"][category]["scenarios"]
    prompts = [s["prompt"] for s in scenarios]
    if limit is not None and limit > 0:
        prompts = prompts[:limit]
    return prompts


def criteria_for(dataset: dict, category: str) -> list:
    return dataset["categories"][category]["eval_criteria"]


def overlay_key_for(dataset: dict, category: str) -> str:
    return dataset["categories"][category].get("overlay_key", category)


# ============================================================================
# Overlay extraction (mirrors the contract used by the harness + CI test)
# ============================================================================

def extract_coaching_overlay(overlay_key: str) -> str:
    """Extract the current coaching overlay text for a category from prompts.ts."""
    import re

    content = PROMPTS_FILE.read_text()
    # Match: key: `...` (with possible newlines), non-greedy to the closing backtick
    pattern = rf"{re.escape(overlay_key)}:\s*`(.*?)`"
    match = re.search(pattern, content, re.DOTALL)
    if match:
        return match.group(1)
    raise ValueError(f"Could not find overlay for key: {overlay_key}")


# ============================================================================
# LLM plumbing
# ============================================================================

def _require_api_key() -> str:
    key = os.environ.get("OPENAI_API_KEY", "")
    if not key:
        print("ERROR: OPENAI_API_KEY not set (required unless --dry-run)")
        sys.exit(1)
    return key


def call_llm(system_prompt: str, user_message: str, model: str = None, max_tokens: int = 1024) -> str:
    """Call the OpenAI API and return the response text."""
    import urllib.request
    import urllib.error

    model = model or FRED_MODEL
    payload = json.dumps({
        "model": model,
        "max_tokens": max_tokens,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_message},
        ],
    })

    req = urllib.request.Request(
        "https://api.openai.com/v1/chat/completions",
        data=payload.encode("utf-8"),
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {os.environ['OPENAI_API_KEY']}",
        },
    )

    try:
        with urllib.request.urlopen(req, timeout=90) as resp:
            data = json.loads(resp.read())
            return data["choices"][0]["message"]["content"]
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", errors="replace")
        print(f"  API error {e.code}: {body[:200]}")
        return f"ERROR: {e.code}"
    except Exception as e:
        print(f"  Request error: {e}")
        return f"ERROR: {e}"


def build_fred_system_prompt(overlay_text: str) -> str:
    """Build a condensed FRED system prompt with the overlay for evaluation."""
    core = """You are Fred Cary — Serial Entrepreneur, CEO & Founder, Certified Attorney, International Investment Banker, Investor, Business Coach & Mentor — with over 50 years of experience building companies and mentoring founders.

You are a MENTOR and decision partner. You trade in truth, not comfort. You optimize for outcomes and clarity, not impressive answers.

## OPERATING PRINCIPLES (Non-Negotiable)
1. Reframe before prescribe. Never answer the surface question by default.
2. Startup Reality Lens gate. Before any tactic, pressure-test: Feasibility, Economics, Demand, Distribution, Timing.
3. Decision Sequencing Rule. Never optimize downstream artifacts before upstream truth is established.
4. Evidence > Narrative. Never optimize storytelling over fundamentals.
5. Capital is a tool, not the goal. Do not encourage fundraising by default.
6. Encourage without flattery. NEVER use: "Great idea!", "Brilliant!", "Love it!", "That's amazing!"
7. Diagnose silently; introduce one lens at a time.
8. Intake before scoring. Never score without sufficient data.
9. Decks are optional until pitching. Do not ask for a deck by default.

## CONCISENESS PROTOCOL
Your FIRST response MUST be 2-3 sentences maximum. Lead with actionable advice. End with ONE clear next step. Offer depth as a follow-up.

## VOICE
Calm, direct, disciplined. Empathetic but not indulgent. No fluff. Speak like a mentor whose reputation depends on the outcome.
"""
    return f"{core}\n\n{overlay_text}"


def judge_response(response: str, criteria: list, user_prompt: str) -> dict:
    """Use a judge model to evaluate a FRED response against binary criteria."""
    criteria_text = "\n".join(f"- [{c['id']}] {c['check']}" for c in criteria)

    judge_prompt = f"""You are a strict evaluator judging an AI mentor's response quality.

The mentor ("FRED") was asked:
"{user_prompt}"

FRED responded:
"{response}"

Evaluate the response against each criterion below. For each, answer PASS or FAIL with a brief reason.

Criteria:
{criteria_text}

Respond in this exact JSON format (no other text):
{{
  "evals": [
    {{"id": "...", "result": "PASS" or "FAIL", "reason": "brief explanation"}}
  ]
}}"""

    result = call_llm(
        "You are a strict, fair evaluator. Output only valid JSON.",
        judge_prompt,
        model=JUDGE_MODEL,
        max_tokens=1024,
    )

    try:
        import re
        json_match = re.search(r"\{[\s\S]*\}", result)
        if json_match:
            return json.loads(json_match.group())
    except json.JSONDecodeError:
        pass

    return {"evals": [{"id": c["id"], "result": "ERROR", "reason": "Could not parse judge output"} for c in criteria]}


def run_evaluation(category: str, overlay_text: str, prompts: list, criteria: list, run_dir: Path) -> dict:
    """Run the full evaluation for a category with the given overlay text."""
    system_prompt = build_fred_system_prompt(overlay_text)

    all_evals = []
    total_pass = 0
    total_checks = 0

    for i, user_prompt in enumerate(prompts):
        print(f"  Running test prompt {i+1}/{len(prompts)}...")

        response = call_llm(system_prompt, user_prompt)
        if response.startswith("ERROR"):
            print("    Skipping due to API error")
            continue

        time.sleep(1)  # Rate limit
        judgment = judge_response(response, criteria, user_prompt)

        prompt_pass = sum(1 for e in judgment.get("evals", []) if e.get("result") == "PASS")
        prompt_total = len(criteria)
        total_pass += prompt_pass
        total_checks += prompt_total

        all_evals.append({
            "prompt_index": i,
            "user_prompt": user_prompt,
            "fred_response": response,
            "judgment": judgment,
            "score": f"{prompt_pass}/{prompt_total}",
        })

        print(f"    Score: {prompt_pass}/{prompt_total}")
        time.sleep(1)  # Rate limit

    if total_checks == 0:
        print("  WARNING: No successful evaluations. Check API key/balance.")

    overall_rate = total_pass / total_checks if total_checks > 0 else 0.0

    results = {
        "category": category,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "overlay_text": overlay_text,
        "total_passed": total_pass,
        "total_checks": total_checks,
        "pass_rate": round(overall_rate, 4),
        "evaluations": all_evals,
    }

    run_dir.mkdir(parents=True, exist_ok=True)
    (run_dir / "eval.json").write_text(json.dumps(results, indent=2))
    print(f"  Overall: {total_pass}/{total_checks} ({overall_rate:.1%})")

    return results


def mutate_overlay(original: str, category: str, iteration: int, feedback: list) -> str:
    """Use the model to generate an improved overlay based on eval feedback."""
    failing_items = []
    for eval_entry in feedback:
        for e in eval_entry.get("judgment", {}).get("evals", []):
            if e.get("result") == "FAIL":
                failing_items.append(
                    f"- [{e['id']}] {e['reason']} (prompt: {eval_entry['user_prompt'][:80]}...)"
                )

    if not failing_items:
        return original  # No failures to fix

    failing_text = "\n".join(failing_items[:15])  # Cap to save tokens

    mutation_prompt = f"""You are optimizing a coaching overlay prompt for an AI mentor called FRED.

Category: {category}
Iteration: {iteration}

CURRENT OVERLAY:
```
{original}
```

FAILING EVAL CRITERIA (things the overlay should fix):
{failing_text}

RULES:
- Only change the overlay text above. Do NOT change FRED's core identity or voice.
- Keep the same general structure (remember/framework headings).
- Add explicit constraints or examples to address the failing criteria.
- Keep the overlay concise — under 200 words.
- The first line MUST be: "Remember: Keep initial responses to 2-3 sentences. Offer depth as a follow-up."
- Do NOT add generic AI safety disclaimers.

Return ONLY the new overlay text, nothing else. No markdown code fences."""

    result = call_llm(
        "You are a prompt engineer optimizing an AI mentor's coaching overlay.",
        mutation_prompt,
        max_tokens=1024,
    ).strip()

    if result.startswith("```"):
        result = "\n".join(result.split("\n")[1:])
    if result.endswith("```"):
        result = "\n".join(result.split("\n")[:-1])

    return result.strip()


def run_autoresearch(category: str, dataset: dict, limit: int, max_iterations: int = 3):
    """Run the full autoresearch loop for a category."""
    run_id = f"autoresearch-{datetime.now(timezone.utc).strftime('%Y%m%d')}-{category}"
    run_dir = AUTORESEARCH_DIR / run_id

    overlay_key = overlay_key_for(dataset, category)
    prompts = prompts_for(dataset, category, limit)
    criteria = criteria_for(dataset, category)

    print(f"\n{'='*60}")
    print(f"AUTORESEARCH: {category} ({len(prompts)} prompts, {len(criteria)} criteria)")
    print(f"{'='*60}")

    current_overlay = extract_coaching_overlay(overlay_key)

    print("\n--- BASELINE ---")
    baseline = run_evaluation(category, current_overlay, prompts, criteria, run_dir / "baseline")
    baseline_rate = baseline["pass_rate"]
    print(f"Baseline pass rate: {baseline_rate:.1%}")

    config = {
        "run_id": run_id,
        "target_type": "skill",
        "target_path": str(PROMPTS_FILE),
        "category": category,
        "overlay_key": overlay_key,
        "eval_criteria": criteria,
        "runs_per_iteration": len(prompts),
        "max_iterations": max_iterations,
        "started_at": datetime.now(timezone.utc).isoformat(),
        "status": "running",
        "current_iteration": 0,
        "scores": [{"iteration": 0, "label": "baseline", "passed": baseline["total_passed"],
                    "total": baseline["total_checks"], "rate": baseline_rate}],
        "best_iteration": 0,
        "best_score": baseline_rate,
    }
    (run_dir / "config.json").write_text(json.dumps(config, indent=2))

    best_overlay = current_overlay
    best_rate = baseline_rate
    best_iter = 0
    no_improvement_count = 0

    for iteration in range(1, max_iterations + 1):
        print(f"\n--- ITERATION {iteration} ---")

        prev_iter_dir = run_dir / "iterations" / f"{iteration-1:03d}" / "eval.json"
        if iteration == 1 or not prev_iter_dir.exists():
            prev_eval = baseline
        else:
            prev_eval = json.loads(prev_iter_dir.read_text())

        print("  Generating mutation...")
        mutated_overlay = mutate_overlay(best_overlay, category, iteration, prev_eval["evaluations"])

        if mutated_overlay.strip() == best_overlay.strip():
            print("  No mutation generated (all passing). Converged.")
            no_improvement_count += 1
            if no_improvement_count >= 2:
                break
            continue

        iter_dir = run_dir / "iterations" / f"{iteration:03d}"
        iter_dir.mkdir(parents=True, exist_ok=True)
        (iter_dir / "mutation.md").write_text(
            f"## Iteration {iteration}\n\n**Mutated overlay:**\n```\n{mutated_overlay}\n```\n\n"
            f"**Previous overlay:**\n```\n{best_overlay}\n```\n"
        )

        result = run_evaluation(category, mutated_overlay, prompts, criteria, iter_dir)
        iter_rate = result["pass_rate"]

        improved = iter_rate > best_rate
        (iter_dir / "score.json").write_text(json.dumps({
            "iteration": iteration,
            "passed": result["total_passed"],
            "total": result["total_checks"],
            "rate": iter_rate,
            "baseline_rate": baseline_rate,
            "best_rate_before": best_rate,
            "improved": improved,
            "kept": improved,
        }, indent=2))

        config["scores"].append({
            "iteration": iteration,
            "passed": result["total_passed"],
            "total": result["total_checks"],
            "rate": iter_rate,
        })

        if improved:
            print(f"  IMPROVED: {best_rate:.1%} -> {iter_rate:.1%} (kept)")
            best_overlay = mutated_overlay
            best_rate = iter_rate
            best_iter = iteration
            no_improvement_count = 0
        else:
            print(f"  No improvement: {iter_rate:.1%} vs {best_rate:.1%} (dropped)")
            no_improvement_count += 1

        config["current_iteration"] = iteration
        config["best_iteration"] = best_iter
        config["best_score"] = best_rate

        if no_improvement_count >= 2:
            print("  Converged (no improvement for 2 consecutive iterations).")
            break
        if best_rate >= 1.0:
            print("  Perfect score reached!")
            break

    config["status"] = "completed"
    (run_dir / "config.json").write_text(json.dumps(config, indent=2))

    best_dir = run_dir / "best"
    best_dir.mkdir(parents=True, exist_ok=True)
    (best_dir / "overlay.txt").write_text(best_overlay)

    summary = {
        "category": category,
        "baseline_rate": baseline_rate,
        "best_rate": best_rate,
        "best_iteration": best_iter,
        "improvement": round(best_rate - baseline_rate, 4),
        "iterations_run": config["current_iteration"],
        "changed": best_iter > 0,
        "winning_overlay": best_overlay,
        "original_overlay": current_overlay,
    }
    (run_dir / "summary.json").write_text(json.dumps(summary, indent=2))

    print(f"\n  RESULT: {'CHANGED' if best_iter > 0 else 'NO CHANGE'}")
    print(f"  Baseline: {baseline_rate:.1%} -> Best: {best_rate:.1%} (iter {best_iter})")

    return summary


# ============================================================================
# Dry-run: validate dataset + overlay extraction with NO API calls
# ============================================================================

def dry_run(dataset: dict, categories: list, limit: int) -> int:
    """Validate the dataset and that every overlay is extractable. Returns exit code."""
    print("DRY RUN — no API calls. Validating dataset + overlay extraction.\n")
    errors = 0
    for category in categories:
        cat = dataset["categories"][category]
        scenarios = cat.get("scenarios", [])
        criteria = cat.get("eval_criteria", [])
        overlay_key = overlay_key_for(dataset, category)

        ids = [s.get("id") for s in scenarios]
        dup = len(ids) != len(set(ids))
        missing_prompt = [s.get("id") for s in scenarios if not s.get("prompt")]

        status = "OK"
        try:
            overlay = extract_coaching_overlay(overlay_key)
            overlay_ok = bool(overlay.strip())
        except ValueError as e:
            overlay_ok = False
            status = f"OVERLAY MISSING ({e})"

        problems = []
        if not scenarios:
            problems.append("no scenarios")
        if not criteria:
            problems.append("no eval_criteria")
        if dup:
            problems.append("duplicate scenario ids")
        if missing_prompt:
            problems.append(f"empty prompts: {missing_prompt}")
        if not overlay_ok:
            problems.append("overlay not extractable")

        if problems:
            errors += 1
            status = "FAIL: " + "; ".join(problems)

        used = min(limit, len(scenarios)) if (limit and limit > 0) else len(scenarios)
        print(f"  {category:14s} overlay_key={overlay_key:12s} "
              f"scenarios={len(scenarios):3d} (using {used}) criteria={len(criteria)} -> {status}")

    print(f"\n{'PASS' if errors == 0 else 'FAIL'} — {errors} category error(s).")
    return 0 if errors == 0 else 1


def write_research_log(summaries: list):
    """Write the combined research log."""
    AUTORESEARCH_DIR.mkdir(parents=True, exist_ok=True)
    log_path = AUTORESEARCH_DIR / "research-log.md"
    lines = [
        "# AutoResearch Log — FRED Coaching Overlays",
        f"\nRun date: {datetime.now(timezone.utc).strftime('%Y-%m-%d')}\n",
        "| Category | Baseline | Best | Improvement | Best iter | Changed |",
        "|---|---|---|---|---|---|",
    ]
    for s in summaries:
        lines.append(
            f"| {s['category']} | {s['baseline_rate']:.1%} | {s['best_rate']:.1%} "
            f"| {s['improvement']:+.1%} | {s['best_iteration']} | {'yes' if s['changed'] else 'no'} |"
        )
    log_path.write_text("\n".join(lines) + "\n")
    print(f"\nResearch log written to {log_path}")


def main():
    parser = argparse.ArgumentParser(description="AutoResearch eval harness for FRED coaching overlays")
    parser.add_argument("--category", help="Category to optimize (see --list-categories)")
    parser.add_argument("--all", action="store_true", help="Run every category in the dataset")
    parser.add_argument("--limit", type=int, default=DEFAULT_RUNS_PER_ITERATION,
                        help=f"Max test prompts per eval (default {DEFAULT_RUNS_PER_ITERATION}; 0 = all)")
    parser.add_argument("--max-iterations", type=int, default=3, help="Max mutation iterations per category")
    parser.add_argument("--dry-run", action="store_true",
                        help="Validate dataset + overlay extraction without any API calls")
    parser.add_argument("--list-categories", action="store_true", help="Print categories and counts, then exit")
    args = parser.parse_args()

    dataset = load_dataset()
    all_cats = category_names(dataset)

    if args.list_categories:
        print("Categories in dataset:")
        for c in all_cats:
            n = len(dataset["categories"][c]["scenarios"])
            k = len(dataset["categories"][c]["eval_criteria"])
            print(f"  - {c}: {n} scenarios, {k} eval criteria")
        return

    # Resolve target categories
    if args.all:
        categories = all_cats
    elif args.category:
        if args.category not in all_cats:
            print(f"ERROR: unknown category '{args.category}'. Available: {', '.join(all_cats)}")
            sys.exit(1)
        categories = [args.category]
    else:
        # Default to dry-run validation when no category is specified — never burn API by accident.
        print("No --category/--all given; defaulting to --dry-run.\n")
        args.dry_run = True
        categories = all_cats

    if args.dry_run:
        sys.exit(dry_run(dataset, categories, args.limit))

    _require_api_key()
    summaries = []
    for category in categories:
        summaries.append(run_autoresearch(category, dataset, args.limit, args.max_iterations))
    write_research_log(summaries)


if __name__ == "__main__":
    main()
