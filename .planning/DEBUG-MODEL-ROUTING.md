# DEBUG: Model Routing & Selection Analysis

**Investigator:** model-routing-checker
**Date:** 2026-02-16
**Task:** Check tier-routing and model selection for hidden slow models

---

## Summary

**No "o1" or slow reasoning model is used in the chat pipeline.** The tier routing is correctly configured to use fast models (GPT-4o-mini for free, GPT-4o for pro/studio). However, there are several findings about dead code, retry overhead, and inconsistent model selection patterns.

---

## 1. Tier Routing (`lib/ai/tier-routing.ts`)

The tier-to-model mapping is clean and correct:

| Tier | Chat Provider | Resolved Model |
|------|--------------|----------------|
| Free | `fast` | GPT-4o-mini |
| Pro | `primary` | GPT-4o |
| Studio | `primary` | GPT-4o |

**FINDING: Tier routing result is DEAD CODE.** In `app/api/fred/chat/route.ts:256`:
```ts
const _modelProviderKey = getModelForTier(tierName, "chat");
```
The underscore prefix means this value is never passed to the FRED service or actors. The tier routing is computed but **discarded**. All actors default to `"primary"` (GPT-4o) regardless of user tier.

**Impact:** Free-tier users get GPT-4o instead of GPT-4o-mini (costs more, but is NOT slower -- so this is not the perf issue, just a cost issue).

---

## 2. Models Used in the Chat Pipeline

### `lib/ai/fred-client.ts` - `generate()` function (used by decide actor)
- Defaults to `getModel("primary")` = GPT-4o
- Called in `lib/fred/actors/decide.ts:289` for LLM response generation
- **No model override is ever passed** -- always uses `"primary"` (GPT-4o)
- Response cap: `maxOutputTokens: 1024`

### `lib/ai/providers.ts` - Model registry
| Key | Model | Speed |
|-----|-------|-------|
| primary | gpt-4o | Fast (~2-4s) |
| fallback1 | claude-sonnet-4-5-20250929 | Fast (~3-5s) |
| fallback2 | gemini-2.0-flash | Fast (~1-2s) |
| fast | gpt-4o-mini | Very fast (~1s) |
| reasoning | o1 | **SLOW (~30-120s)** |

### `lib/ai/client.ts` - Legacy `generateChatResponse()` (old direct OpenAI SDK)
- Uses `gpt-4o` hardcoded (line 58)
- **Still used by:**
  - `app/api/documents/route.ts:175` -- document generation
  - `lib/ai/insight-extractor.ts:79` -- insight extraction
- **NOT used by any FRED chat actor** -- confirmed by grep

### Other hardcoded models in FRED subsystems (NOT in chat pipeline):
- `lib/fred/scoring/engine.ts` -- uses OpenAI SDK directly with `DEFAULT_SCORING_CONFIG.aiModel = "gpt-4o"` (but this is the 7-factor scoring engine, not used in real-time chat)
- `lib/fred/pitch/slide-classifier.ts` -- `openai('gpt-4o')` (pitch deck analysis, not chat)
- `lib/fred/pitch/analyzers/index.ts` -- `openai('gpt-4o')` (pitch deck analysis, not chat)
- `lib/fred/irs/engine.ts` -- `openai('gpt-4o')` (IRS scoring, not chat)
- `lib/fred/strategy/generator.ts` -- `openai('gpt-4o')` and `openai('gpt-4o-mini')` (strategy docs, not chat)

---

## 3. "o1" / Reasoning Model Usage

**The `o1` model is registered but NEVER called in the chat pipeline.**

- Defined in `lib/ai/providers.ts:97-100` as `getReasoningModel()`
- Referenced in `lib/ai/context-manager.ts:45` for context window limits
- Listed in `lib/ai/providers.ts:224-226` metadata
- **No actor, no route, and no service imports or calls `getReasoningModel()` or `getModel("reasoning")`**

The tier routing comment at `lib/ai/tier-routing.ts:45-46` says:
> "When a reasoning model becomes cost-effective, Studio can be upgraded to 'reasoning' (o1)."

This is aspirational only -- not active.

---

## 4. Retry Logic (`lib/ai/retry.ts`)

Retry config with exponential backoff:

| Preset | Max Retries | Base Delay | Max Delay | Worst Case Total |
|--------|-------------|------------|-----------|------------------|
| quick | 2 | 500ms | 2000ms | ~3s |
| standard | 3 | 1000ms | 10000ms | ~15s |
| aggressive | 5 | 500ms | 30000ms | ~60s |
| patient | 3 | 5000ms | 60000ms | ~75s |

**FINDING:** The `standard` preset is the default. If the primary provider fails, retries add up to ~15s of wait time before attempting fallback. However, retries only happen on transient failures -- not on slow responses.

**Impact on latency:** Minimal in the happy path. If OpenAI is unreachable (500/502/503 errors), the retry loop adds 1s + 2s + 4s = 7s before capped at 10s. Then fallback begins.

---

## 5. Circuit Breaker (`lib/ai/circuit-breaker.ts`)

- Threshold: 5 failures in 60s window to open circuit
- Reset timeout: 30s before half-open test
- Half-open test: 3 consecutive successes to close

**Impact on latency:** Near zero in normal operation. The circuit breaker is a passthrough wrapper when healthy. Only adds latency if a provider is failing (and even then, it blocks fast by throwing `CircuitOpenError` rather than waiting).

---

## 6. Fallback Chain (`lib/ai/fallback-chain.ts`)

Provider order: `openai -> anthropic -> google`

**FINDING:** The fallback chain wraps both retry AND circuit breaker. In a failure scenario:
1. OpenAI attempt + 3 retries with backoff (~15s worst case)
2. Anthropic attempt + 3 retries with backoff (~15s worst case)
3. Google attempt + 3 retries with backoff (~15s worst case)

**Maximum theoretical latency for a complete provider failure cascade: ~45 seconds of retry delays alone.**

However, this only happens when ALL providers fail. The `skipOpenCircuits` flag (default: true) means if a provider's circuit is already open, it's skipped instantly.

**BUT:** The `executeWithFallback` is NOT used in the main chat pipeline. The chat pipeline goes through `generate()` in `fred-client.ts`, which calls `getModel("primary")` directly without fallback wrapping. Only `generateStructuredReliable` uses the full fallback chain (used by investor matching, not chat).

---

## 7. Key Finding: The `generate()` Function Has Its Own Retry

`lib/ai/fred-client.ts:446-477` defines a local `withRetry` that:
- Max 3 retries
- Starts at 1000ms delay
- 2x backoff multiplier
- **This is IN ADDITION to any retry in the fallback chain** (though as noted, the chat pipeline doesn't use the fallback chain)

If the primary model call fails, the chat pipeline retries 3 times with 1s -> 2s -> 4s delays = **7 seconds of retry delay** before giving up.

---

## 8. Conclusion: Model Routing Is NOT the 5-Minute Bottleneck

The model routing is working correctly:
- All chat actors use GPT-4o (fast, ~2-4s per call)
- No "o1" or slow reasoning model is in the path
- Retry/circuit-breaker/fallback add minimal latency in the happy path

**The ~5 minute latency must be coming from either:**
1. The pre-machine DB waterfall (Task #1 investigation)
2. The serial actor pipeline calling LLM + DB multiple times sequentially (Task #2 investigation)
3. The scoring engine being called inline (it uses direct OpenAI SDK, not the shared client)

**Minor issues found:**
- `_modelProviderKey` is dead code -- tier routing is computed but never used
- Free-tier users are getting GPT-4o instead of GPT-4o-mini (cost waste, not perf issue)
- Several subsystems use direct `new OpenAI()` or raw `openai()` SDK calls bypassing the centralized provider system
