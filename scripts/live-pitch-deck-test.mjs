// Live verification of pitch-deck pipeline against the real prod code paths.
// Loads investor-deck.pdf, parses it, runs the full review engine end-to-end.
// Run with: NODE_OPTIONS="--experimental-vm-modules" npx tsx scripts/live-pitch-deck-test.mjs

import { readFile } from "node:fs/promises";

const startedAt = Date.now();

// Use path-aliased imports so tsx can resolve via tsconfig paths
const { parsePDF } = await import("@/lib/parsers/pdf-parser");
const { reviewPitchDeck } = await import("@/lib/fred/pitch/review-engine");

const pdfPath = "public/assets/tory/investor-deck.pdf";
console.log(`[live-test] Reading ${pdfPath}`);
const buf = await readFile(pdfPath);
console.log(`[live-test] PDF bytes: ${buf.length}`);

const parsed = await parsePDF(buf);
console.log(`[live-test] parsed pages: ${parsed.totalPages}`);
console.log(`[live-test] sample slide texts:`);
for (const s of parsed.slides.slice(0, 3)) {
  console.log(`   p${s.pageNumber} (${s.text.length} chars): ${s.text.slice(0, 80).replace(/\s+/g, " ")}...`);
}

console.log(`\n[live-test] Calling reviewPitchDeck (full LLM pipeline) ...`);
const review = await reviewPitchDeck({
  pages: parsed.slides.map((s) => ({ pageNumber: s.pageNumber, content: s.text, text: s.text })),
  documentId: "live-test-doc",
});

const elapsed = ((Date.now() - startedAt) / 1000).toFixed(1);
console.log(`\n=== REVIEW RESULT (took ${elapsed}s) ===`);
console.log(`overallScore:   ${review.overallScore}`);
console.log(`structureScore: ${review.structureScore}`);
console.log(`contentScore:   ${review.contentScore}`);
console.log(`slidesAnalyzed: ${review.slides.length}`);
console.log(`missingSections: ${JSON.stringify(review.missingSections)}`);
console.log(`strengths (${review.strengths.length}):`);
for (const s of review.strengths.slice(0, 5)) console.log(`  - ${s}`);
console.log(`improvements (${review.improvements.length}):`);
for (const i of review.improvements.slice(0, 5)) console.log(`  - ${i}`);

console.log(`\n=== PER-SLIDE BREAKDOWN ===`);
for (const slide of review.slides) {
  console.log(`  [p${slide.pageNumber}] ${slide.type} (conf ${slide.typeConfidence?.toFixed(2)}) — score ${slide.score}/100`);
  if (slide.suggestions?.length) {
    console.log(`     top suggestion: ${slide.suggestions[0].slice(0, 90)}`);
  }
}
