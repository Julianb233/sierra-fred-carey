/** Runtime sanity check for parseReportPayload — covers the fence-edge cases. */
import { parseReportPayload } from "@/lib/report/prompt";

const valid = {
  score: 65,
  verdictHeadline: "Promising idea, missing upstream truth.",
  verdictSubline: "5 validated.",
  executiveSummary: "You named the problem...",
  steps: Array.from({ length: 9 }, (_, i) => ({
    stepNumber: i + 1,
    step: "problem",
    name: `Step ${i + 1}`,
    status: "validated",
    answerSummary: "a",
    verdict: "v",
  })),
  recommendedTier: "validate",
};
const json = JSON.stringify(valid);

const cases: Array<[string, string, boolean]> = [
  ["complete fence", "```json\n" + json + "\n```", true],
  ["no language tag", "```\n" + json + "\n```", true],
  ["prose around fence", "Here:\n```json\n" + json + "\n```\nthx", true],
  ["missing closing fence", "```json\n" + json + "\n", true],
  ["malformed closing", "```json\n" + json + "\n``", true],
  ["raw json no fence", json, true],
  ["json embedded in prose", "Sure — " + json + " hope it helps", true],
  ["pure prose", "no json at all here", false],
];

let pass = 0, fail = 0;
for (const [name, input, shouldParse] of cases) {
  try {
    const r = parseReportPayload(input);
    if (shouldParse && r.score === 65) { console.log(`✓ ${name}`); pass++; }
    else { console.log(`✗ ${name} — parsed but unexpected:`, r); fail++; }
  } catch (err) {
    if (!shouldParse) { console.log(`✓ ${name} (correctly threw)`); pass++; }
    else { console.log(`✗ ${name} — threw:`, (err as Error).message); fail++; }
  }
}
console.log(`\nresult: ${pass} pass, ${fail} fail`);
process.exit(fail === 0 ? 0 : 1);
