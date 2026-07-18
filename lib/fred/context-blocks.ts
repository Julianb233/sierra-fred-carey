import { estimateTokens } from "@/lib/ai/context-manager";

export interface FredContextBlock {
  name: string;
  value: string;
  priority: number;
}

/**
 * Join Fred prompt context blocks, dropping the lowest-priority blocks only
 * when the assembled prompt exceeds the model context budget.
 */
export function compactFredContextBlocks(
  blocks: FredContextBlock[],
  maxTokens = 100_000
): { context: string; originalTokens: number; compactedTokens: number; droppedBlocks: string[] } {
  const activeBlocks = blocks.filter((block) => block.value.trim().length > 0);
  const originalContext = activeBlocks.map((block) => block.value).join("\n\n");
  const originalTokens = estimateTokens(originalContext);

  if (originalTokens <= maxTokens) {
    return {
      context: originalContext,
      originalTokens,
      compactedTokens: originalTokens,
      droppedBlocks: [],
    };
  }

  const kept = [...activeBlocks];
  const droppedBlocks: string[] = [];

  while (kept.length > 1) {
    const candidate = kept.map((block) => block.value).join("\n\n");
    if (estimateTokens(candidate) <= maxTokens) break;

    let dropIndex = 0;
    for (let i = 1; i < kept.length; i += 1) {
      if (kept[i].priority < kept[dropIndex].priority) {
        dropIndex = i;
      }
    }

    const [dropped] = kept.splice(dropIndex, 1);
    droppedBlocks.push(dropped.name);
  }

  let context = kept.map((block) => block.value).join("\n\n");

  if (estimateTokens(context) > maxTokens) {
    const maxChars = maxTokens * 4;
    context = context.substring(0, maxChars);
  }

  return {
    context,
    originalTokens,
    compactedTokens: estimateTokens(context),
    droppedBlocks,
  };
}
