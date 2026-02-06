/**
 * Robust JSON extraction from AI responses.
 *
 * Handles common AI response formats:
 * - Clean JSON
 * - JSON wrapped in ```json ... ``` fences
 * - JSON wrapped in ``` ... ``` fences
 * - JSON with leading/trailing text outside the object
 */
export function extractJSON<T = unknown>(raw: string): T {
  // 1. Try direct parse first (fastest path)
  const trimmed = raw.trim();
  try {
    return JSON.parse(trimmed) as T;
  } catch {
    // continue to cleanup strategies
  }

  // 2. Strip markdown code fences
  let cleaned = trimmed
    .replace(/^```(?:json)?\s*\n?/m, "")
    .replace(/\n?```\s*$/m, "")
    .trim();

  try {
    return JSON.parse(cleaned) as T;
  } catch {
    // continue
  }

  // 3. Find the first { or [ and last matching } or ]
  const firstBrace = cleaned.indexOf("{");
  const firstBracket = cleaned.indexOf("[");

  let start: number;
  let endChar: string;

  if (firstBrace === -1 && firstBracket === -1) {
    throw new Error("No JSON object or array found in AI response");
  } else if (firstBrace === -1) {
    start = firstBracket;
    endChar = "]";
  } else if (firstBracket === -1) {
    start = firstBrace;
    endChar = "}";
  } else {
    start = Math.min(firstBrace, firstBracket);
    endChar = start === firstBrace ? "}" : "]";
  }

  const end = cleaned.lastIndexOf(endChar);
  if (end <= start) {
    throw new Error("Malformed JSON structure in AI response");
  }

  cleaned = cleaned.slice(start, end + 1);

  return JSON.parse(cleaned) as T;
}
