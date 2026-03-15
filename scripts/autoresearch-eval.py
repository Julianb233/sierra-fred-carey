#!/usr/bin/env python3
"""
AutoResearch Eval Harness for FRED Coaching Overlays.

For each category, this script:
1. Builds the system prompt (core + overlay)
2. Sends representative founder questions to Claude
3. Uses a judge model to evaluate responses against binary evals
4. Scores and records results

Usage:
  python3 scripts/autoresearch-eval.py --category fundraising --mode baseline
  python3 scripts/autoresearch-eval.py --category fundraising --mode iterate --iteration 1
"""

import argparse
import json
import os
import sys
import time
from pathlib import Path
from datetime import datetime, timezone

OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY", "")
if not OPENAI_API_KEY:
    print("ERROR: OPENAI_API_KEY not set")
    sys.exit(1)

PROJECT_ROOT = Path(__file__).parent.parent
PROMPTS_FILE = PROJECT_ROOT / "lib" / "ai" / "prompts.ts"
AUTORESEARCH_DIR = PROJECT_ROOT / ".planning" / "autoresearch"

# The model to use for generating FRED responses and judging
FRED_MODEL = "gpt-4o"
JUDGE_MODEL = "gpt-4o-mini"

RUNS_PER_ITERATION = 5  # number of test prompts per eval

# ============================================================================
# Test prompts per category — representative founder questions
# ============================================================================

TEST_PROMPTS = {
    "fundraising": [
        "I'm building an AI-powered HR tool. We have 3 paying customers doing about $5k MRR. I think we should raise a seed round. What do you think?",
        "We're pre-revenue but we have a working prototype. My advisor says I should start talking to VCs. How do I prepare?",
        "I just got rejected by 15 investors. They all said 'too early.' What am I doing wrong?",
        "We have $200k ARR and strong retention. Is it time to raise a Series A?",
        "I'm thinking about raising $2M on a SAFE note. Is that the right structure for where I am?",
    ],
    "pitchReview": [
        "I just uploaded my pitch deck. Can you review it and tell me what's strong and what needs work?",
        "Investors keep saying my narrative is weak but my product is strong. How do I fix the deck?",
        "I need to present to a VC partner meeting next week. What should my deck cover?",
        "My deck is 25 slides. Investors say it's too long. What should I cut?",
        "I've been told my TAM slide isn't credible. How should I approach market sizing?",
    ],
    "strategy": [
        "I have a great app idea for fitness tracking. I want to build the full platform with social features, coaching, and marketplace. Where do I start?",
        "We've been building for 8 months but have no users yet. Should we keep building or try to launch what we have?",
        "I want to expand into a new market segment. We're doing OK in our current niche but growth has slowed.",
        "My co-founder wants to pivot to B2B but I think we should stay B2C. How do we decide?",
        "I'm not sure if my problem is real or if I'm just building something I personally want. How do I validate?",
    ],
    "positioning": [
        "We're building a project management tool. Our differentiator is that it's AI-powered. How should we position?",
        "Everyone says they don't understand what we do. Our product does a lot of things. How do I simplify the message?",
        "We keep losing deals to Notion and Monday.com. How do we differentiate?",
        "My target market is 'everyone who uses email.' I know that's broad — how do I narrow it?",
        "I've been described as 'Slack meets Asana meets ChatGPT.' Is that good positioning?",
    ],
    "mindset": [
        "I've been working on this for 2 years and I'm exhausted. My wife is frustrated, my savings are gone. I don't know if I can keep going.",
        "Every time I talk to another founder they seem so much further ahead. I feel like I'm failing.",
        "I keep second-guessing every decision. I'm paralyzed and nothing is moving forward.",
        "I just lost my biggest customer and my team is demoralized. How do I keep going?",
        "I feel like an imposter. I landed a meeting with a big investor but I don't feel ready.",
    ],
}

# ============================================================================
# Binary eval criteria per category — derived from OPERATING-BIBLE.md
# ============================================================================

EVAL_CRITERIA = {
    "fundraising": [
        {"id": "f1", "check": "Gives a verdict (Yes / No / Not yet) or equivalent clear assessment before giving fixes", "weight": 1},
        {"id": "f2", "check": "Does NOT encourage fundraising by default — challenges whether raising is the right move", "weight": 1},
        {"id": "f3", "check": "Does NOT ask for a pitch deck by default", "weight": 1},
        {"id": "f4", "check": "Prescribes smallest proofs or concrete next steps to strengthen position", "weight": 1},
        {"id": "f5", "check": "Initial response is concise (2-3 sentences before offering depth)", "weight": 1},
        {"id": "f6", "check": "Follows decision sequencing — does not skip to fundraising tactics before upstream truth (demand, economics) is established", "weight": 1},
        {"id": "f7", "check": "No generic flattery or 'great idea' language", "weight": 1},
    ],
    "pitchReview": [
        {"id": "p1", "check": "References or applies the Deck Review Protocol structure (scorecard, fixes, objections)", "weight": 1},
        {"id": "p2", "check": "Applies or references Reality Lens dimensions (Feasibility, Economics, Demand, Distribution, Timing)", "weight": 1},
        {"id": "p3", "check": "Specific about what's strong AND what's weak — no softball feedback", "weight": 1},
        {"id": "p4", "check": "Evidence over narrative — does not optimize storytelling over fundamentals", "weight": 1},
        {"id": "p5", "check": "Initial response is concise (2-3 sentences before offering depth)", "weight": 1},
        {"id": "p6", "check": "No generic flattery or 'great idea' language", "weight": 1},
    ],
    "strategy": [
        {"id": "s1", "check": "Identifies which step in the startup process the founder is actually on (not where they think they are)", "weight": 1},
        {"id": "s2", "check": "Does NOT let the founder skip ahead — validates current step first or redirects", "weight": 1},
        {"id": "s3", "check": "Enforces decision sequencing — upstream truth before downstream optimization", "weight": 1},
        {"id": "s4", "check": "Provides a clear, specific next step (not a vague menu of options)", "weight": 1},
        {"id": "s5", "check": "Initial response is concise (2-3 sentences before offering depth)", "weight": 1},
        {"id": "s6", "check": "Reframes the founder's question to the highest-leverage decision", "weight": 1},
        {"id": "s7", "check": "No generic flattery or 'great idea' language", "weight": 1},
    ],
    "positioning": [
        {"id": "po1", "check": "Applies Positioning Readiness dimensions (Clarity, Differentiation, Market Understanding, Narrative Strength)", "weight": 1},
        {"id": "po2", "check": "Outputs or references a grade (A-F), gaps, and/or Next Actions", "weight": 1},
        {"id": "po3", "check": "Does NOT jump into messaging rewrites unless explicitly requested", "weight": 1},
        {"id": "po4", "check": "Challenges vague positioning ('everyone', 'AI-powered') with specificity demands", "weight": 1},
        {"id": "po5", "check": "Initial response is concise (2-3 sentences before offering depth)", "weight": 1},
        {"id": "po6", "check": "No generic flattery or 'great idea' language", "weight": 1},
    ],
    "mindset": [
        {"id": "m1", "check": "Normalizes the emotional load — frames struggles as common among founders, not weakness", "weight": 1},
        {"id": "m2", "check": "Reduces to controllables — offers practical next steps, not just encouragement", "weight": 1},
        {"id": "m3", "check": "Encourages without flattery — tough love with genuine care", "weight": 1},
        {"id": "m4", "check": "Does NOT give therapeutic or medical advice (is a mentor, not a therapist)", "weight": 1},
        {"id": "m5", "check": "Addresses wellbeing BEFORE business advice when distress signals are present", "weight": 1},
        {"id": "m6", "check": "Initial response is concise and warm (2-3 sentences, not a lecture)", "weight": 1},
        {"id": "m7", "check": "If serious risk signals present, encourages professional support", "weight": 1},
    ],
}


def call_llm(system_prompt: str, user_message: str, model: str = FRED_MODEL, max_tokens: int = 1024) -> str:
    """Call the OpenAI API and return the response text."""
    import urllib.request
    import urllib.error

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
            "Authorization": f"Bearer {OPENAI_API_KEY}",
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


def extract_coaching_overlay(category: str) -> str:
    """Extract the current coaching overlay text for a category from prompts.ts."""
    content = PROMPTS_FILE.read_text()

    # Find the category's overlay text between backticks
    import re
    # Match: category: `...` (with possible newlines)
    pattern = rf'{category}:\s*`(.*?)`'
    match = re.search(pattern, content, re.DOTALL)
    if match:
        return match.group(1)
    raise ValueError(f"Could not find overlay for category: {category}")


def build_fred_system_prompt(overlay_text: str) -> str:
    """Build a simplified FRED system prompt with the overlay for evaluation."""
    # Use a condensed version of the core prompt + overlay for eval purposes
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
    criteria_text = "\n".join(
        f"- [{c['id']}] {c['check']}" for c in criteria
    )

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
        # Try to extract JSON from response
        import re
        json_match = re.search(r'\{[\s\S]*\}', result)
        if json_match:
            return json.loads(json_match.group())
    except json.JSONDecodeError:
        pass

    # Fallback: parse manually
    return {"evals": [{"id": c["id"], "result": "ERROR", "reason": "Could not parse judge output"} for c in criteria]}


def run_evaluation(category: str, overlay_text: str, run_dir: Path) -> dict:
    """Run the full evaluation for a category with the given overlay text."""
    system_prompt = build_fred_system_prompt(overlay_text)
    criteria = EVAL_CRITERIA[category]
    prompts = TEST_PROMPTS[category]

    all_evals = []
    total_pass = 0
    total_checks = 0

    for i, user_prompt in enumerate(prompts):
        print(f"  Running test prompt {i+1}/{len(prompts)}...")

        # Get FRED response
        response = call_llm(system_prompt, user_prompt)
        if response.startswith("ERROR"):
            print(f"    Skipping due to API error")
            continue

        # Judge the response
        time.sleep(1)  # Rate limit
        judgment = judge_response(response, criteria, user_prompt)

        # Score
        prompt_pass = sum(1 for e in judgment.get("evals", []) if e.get("result") == "PASS")
        prompt_total = len(criteria)
        total_pass += prompt_pass
        total_checks += prompt_total

        eval_entry = {
            "prompt_index": i,
            "user_prompt": user_prompt,
            "fred_response": response,
            "judgment": judgment,
            "score": f"{prompt_pass}/{prompt_total}",
        }
        all_evals.append(eval_entry)

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

    # Save results
    run_dir.mkdir(parents=True, exist_ok=True)
    (run_dir / "eval.json").write_text(json.dumps(results, indent=2))
    print(f"  Overall: {total_pass}/{total_checks} ({overall_rate:.1%})")

    return results


def mutate_overlay(original: str, category: str, iteration: int, feedback: list) -> str:
    """Use Claude to generate an improved overlay based on eval feedback."""
    failing_items = []
    for eval_entry in feedback:
        for e in eval_entry.get("judgment", {}).get("evals", []):
            if e.get("result") == "FAIL":
                failing_items.append(f"- [{e['id']}] {e['reason']} (prompt: {eval_entry['user_prompt'][:80]}...)")

    if not failing_items:
        return original  # No failures to fix

    failing_text = "\n".join(failing_items[:15])  # Cap at 15 to save tokens

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
    )

    # Clean up
    result = result.strip()
    if result.startswith("```"):
        result = "\n".join(result.split("\n")[1:])
    if result.endswith("```"):
        result = "\n".join(result.split("\n")[:-1])

    return result.strip()


def run_autoresearch(category: str, max_iterations: int = 3):
    """Run the full autoresearch loop for a category."""
    run_id = f"autoresearch-20260315-{category}"
    run_dir = AUTORESEARCH_DIR / run_id

    print(f"\n{'='*60}")
    print(f"AUTORESEARCH: {category}")
    print(f"{'='*60}")

    # Get current overlay
    current_overlay = extract_coaching_overlay(category)

    # ---- BASELINE ----
    print(f"\n--- BASELINE ---")
    baseline = run_evaluation(category, current_overlay, run_dir / "baseline")
    baseline_rate = baseline["pass_rate"]
    print(f"Baseline pass rate: {baseline_rate:.1%}")

    # Save config
    config = {
        "run_id": run_id,
        "target_type": "skill",
        "target_path": str(PROMPTS_FILE),
        "category": category,
        "eval_criteria": EVAL_CRITERIA[category],
        "runs_per_iteration": RUNS_PER_ITERATION,
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

    # ---- ITERATIONS ----
    best_overlay = current_overlay
    best_rate = baseline_rate
    best_iter = 0
    no_improvement_count = 0

    for iteration in range(1, max_iterations + 1):
        print(f"\n--- ITERATION {iteration} ---")

        # Get feedback from previous eval
        prev_iter_dir = run_dir / "iterations" / f"{iteration-1:03d}" / "eval.json"
        if iteration == 1 or not prev_iter_dir.exists():
            prev_eval = baseline
        else:
            prev_eval = json.loads(prev_iter_dir.read_text())

        # Mutate
        print("  Generating mutation...")
        mutated_overlay = mutate_overlay(best_overlay, category, iteration, prev_eval["evaluations"])

        if mutated_overlay.strip() == best_overlay.strip():
            print("  No mutation generated (all passing). Converged.")
            no_improvement_count += 1
            if no_improvement_count >= 2:
                break
            continue

        # Save mutation
        iter_dir = run_dir / "iterations" / f"{iteration:03d}"
        iter_dir.mkdir(parents=True, exist_ok=True)
        (iter_dir / "mutation.md").write_text(f"## Iteration {iteration}\n\n**Mutated overlay:**\n```\n{mutated_overlay}\n```\n\n**Previous overlay:**\n```\n{best_overlay}\n```\n")

        # Evaluate
        result = run_evaluation(category, mutated_overlay, iter_dir)
        iter_rate = result["pass_rate"]

        # Keep or drop
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
            print(f"  IMPROVED: {best_rate:.1%} → {iter_rate:.1%} ✓")
            best_overlay = mutated_overlay
            best_rate = iter_rate
            best_iter = iteration
            no_improvement_count = 0
        else:
            print(f"  No improvement: {iter_rate:.1%} vs {best_rate:.1%} ✗")
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

    # ---- FINALIZE ----
    config["status"] = "completed"
    (run_dir / "config.json").write_text(json.dumps(config, indent=2))

    # Save best
    best_dir = run_dir / "best"
    best_dir.mkdir(parents=True, exist_ok=True)
    (best_dir / "overlay.txt").write_text(best_overlay)

    # Summary
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
    print(f"  Baseline: {baseline_rate:.1%} → Best: {best_rate:.1%} (iter {best_iter})")

    return summary


def write_research_log(summaries: list):
    """Write the combined research log."""
    log_path = AUTORESEARCH_DIR / "research-log.md"
    lines = [
        "# AutoResearch Log — FRED Coaching Overlays",
        f"\nRun date: {datetime.now(timezone.utc).strftime('%Y-%m-%d')}",
        f"Categories: {', '.join(s['category'] for s in summaries)}",
        "",
    ]

    for s in summaries:
        emoji = "✅" if s["changed"] else "➖"
        lines.append(f"## {emoji} {s['category']}")
        lines.append(f"- Baseline: {s['baseline_rate']:.1%}")
        lines.append(f"- Best: {s['best_rate']:.1%} (iteration {s['best_iteration']})")
        lines.append(f"- Improvement: {'+' if s['improvement'] > 0 else ''}{s['improvement']:.1%}")
        lines.append(f"- Iterations run: {s['iterations_run']}")
        lines.append(f"- Changed: {'Yes' if s['changed'] else 'No'}")
        lines.append("")

    log_path.write_text("\n".join(lines))
    print(f"\nResearch log written to {log_path}")


def main():
    parser = argparse.ArgumentParser(description="AutoResearch eval for FRED coaching overlays")
    parser.add_argument("--category", choices=list(EVAL_CRITERIA.keys()) + ["all"], default="all")
    parser.add_argument("--max-iterations", type=int, default=3)
    args = parser.parse_args()

    categories = list(EVAL_CRITERIA.keys()) if args.category == "all" else [args.category]
    summaries = []

    for cat in categories:
        summary = run_autoresearch(cat, args.max_iterations)
        summaries.append(summary)

    write_research_log(summaries)

    # Print final summary
    print(f"\n{'='*60}")
    print("AUTORESEARCH COMPLETE")
    print(f"{'='*60}")
    for s in summaries:
        status = "IMPROVED" if s["changed"] else "NO CHANGE"
        print(f"  {s['category']:15s}: {s['baseline_rate']:.1%} → {s['best_rate']:.1%} [{status}]")


if __name__ == "__main__":
    main()
