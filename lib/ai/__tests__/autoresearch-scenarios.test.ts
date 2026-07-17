/**
 * AutoResearch dataset integrity + overlay-alignment gate.
 *
 * The autoresearch overnight loop (scripts/autoresearch-eval.py) optimizes
 * FRED's coaching overlays against scripts/fred-autoresearch/scenarios.json.
 * That loop only runs out of band (it needs OPENAI_API_KEY). This test is the
 * CI-cheap guard that keeps the dataset and the overlays it targets in sync:
 *
 *  - every category in the dataset has a matching overlay in COACHING_PROMPTS
 *  - the regex the Python harness uses to extract each overlay actually matches
 *  - scenario ids are unique, prompts are non-empty, and counts meet a floor
 *  - eval criteria are well-formed (id + check + weight)
 *
 * Source of truth for eval criteria: .planning/OPERATING-BIBLE.md
 * Harness: scripts/autoresearch-eval.py
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import { COACHING_PROMPTS } from "../prompts";

const REPO_ROOT = join(__dirname, "..", "..", "..");
const DATASET_PATH = join(REPO_ROOT, "scripts", "fred-autoresearch", "scenarios.json");
const PROMPTS_PATH = join(REPO_ROOT, "lib", "ai", "prompts.ts");

interface EvalCriterion {
  id: string;
  check: string;
  weight: number;
}
interface Scenario {
  id: string;
  prompt: string;
  tags?: string[];
}
interface Category {
  overlay_key: string;
  eval_criteria: EvalCriterion[];
  scenarios: Scenario[];
}
interface Dataset {
  version: string;
  linear_issues: string[];
  scenario_target: {
    min: number;
    max: number;
  };
  source_status: {
    seed_dataset: boolean;
    fred_validated_samples_received: boolean;
    fred_validated_sample_count: number;
    blocker: string;
  };
  categories: Record<string, Category>;
}

const dataset: Dataset = JSON.parse(readFileSync(DATASET_PATH, "utf-8"));
const promptsSource: string = readFileSync(PROMPTS_PATH, "utf-8");
const categoryNames = Object.keys(dataset.categories);

/** Mirror of the overlay-extraction regex used by scripts/autoresearch-eval.py */
function extractOverlay(overlayKey: string): string | null {
  const escaped = overlayKey.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`${escaped}:\\s*\`([\\s\\S]*?)\``);
  const m = promptsSource.match(re);
  return m ? m[1] : null;
}

describe("autoresearch dataset — structure", () => {
  it("parses and has at least one category", () => {
    expect(categoryNames.length).toBeGreaterThan(0);
  });

  it("declares a version", () => {
    expect(typeof dataset.version).toBe("string");
    expect(dataset.version.length).toBeGreaterThan(0);
  });

  it("contains the five expected coaching categories", () => {
    for (const expected of ["fundraising", "pitchReview", "strategy", "positioning", "mindset"]) {
      expect(categoryNames).toContain(expected);
    }
  });

  it("holds at least 100 scenarios total (issue AI-3521: 100-200 test cases)", () => {
    const total = categoryNames.reduce(
      (sum, c) => sum + dataset.categories[c].scenarios.length,
      0,
    );
    expect(total).toBeGreaterThanOrEqual(dataset.scenario_target.min);
    expect(total).toBeLessThanOrEqual(dataset.scenario_target.max);
  });

  it("is traceable to the Linear eval-suite issues", () => {
    expect(dataset.linear_issues).toContain("AI-3491");
    expect(dataset.linear_issues).toContain("AI-3521");
  });

  it("records Fred validation status so seed data is not mistaken for final calibration", () => {
    expect(dataset.source_status.seed_dataset).toBe(true);
    expect(dataset.source_status.fred_validated_samples_received).toBe(false);
    expect(dataset.source_status.fred_validated_sample_count).toBe(0);
    expect(dataset.source_status.blocker).toMatch(/Fred-provided validated sample Q&A pairs/i);
  });
});

describe.each(categoryNames)("autoresearch dataset — category %s", (name) => {
  const cat = dataset.categories[name];

  it("has at least 10 scenarios", () => {
    expect(cat.scenarios.length).toBeGreaterThanOrEqual(10);
  });

  it("has unique scenario ids", () => {
    const ids = cat.scenarios.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("every scenario has a non-empty id and prompt", () => {
    for (const s of cat.scenarios) {
      expect(s.id, `scenario id in ${name}`).toBeTruthy();
      expect(typeof s.prompt).toBe("string");
      expect(s.prompt.trim().length).toBeGreaterThan(0);
    }
  });

  it("has well-formed eval criteria (id + check + numeric weight)", () => {
    expect(cat.eval_criteria.length).toBeGreaterThan(0);
    for (const c of cat.eval_criteria) {
      expect(c.id, `criterion id in ${name}`).toBeTruthy();
      expect(c.check.trim().length).toBeGreaterThan(0);
      expect(typeof c.weight).toBe("number");
    }
  });

  it("has unique eval criterion ids", () => {
    const ids = cat.eval_criteria.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("maps to an existing overlay in COACHING_PROMPTS", () => {
    const key = cat.overlay_key as keyof typeof COACHING_PROMPTS;
    expect(COACHING_PROMPTS[key], `overlay_key '${cat.overlay_key}' missing from COACHING_PROMPTS`).toBeDefined();
  });

  it("overlay is extractable by the harness regex (prompts.ts contract)", () => {
    const overlay = extractOverlay(cat.overlay_key);
    expect(overlay, `harness cannot extract overlay '${cat.overlay_key}'`).not.toBeNull();
    expect((overlay as string).trim().length).toBeGreaterThan(0);
  });

  it("extracted overlay matches the COACHING_PROMPTS value", () => {
    const key = cat.overlay_key as keyof typeof COACHING_PROMPTS;
    const extracted = extractOverlay(cat.overlay_key);
    // The harness operates on the raw template text; it should equal the runtime value.
    expect(extracted).toBe(COACHING_PROMPTS[key]);
  });
});
