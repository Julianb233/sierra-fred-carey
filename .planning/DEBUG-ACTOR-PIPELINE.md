# FRED XState Actor Pipeline Audit

**Date:** 2026-02-16
**Auditor:** actor-pipeline-auditor
**Objective:** Identify serial LLM calls and bottlenecks in the FRED state machine pipeline

---

## Executive Summary

The XState machine runs 6 actors SEQUENTIALLY: `load-memory -> validate-input -> mental-models -> synthesize -> decide -> execute`. The pipeline contains **up to 3 LLM calls** for a decision_request, and **1 LLM call** for simpler intents. The "12 serial LLM calls" hypothesis is **FALSE** -- mental-models does NOT make LLM calls. However, significant issues remain:

1. **The synthesize actor conditionally makes 1 LLM call** (AI-powered 7-factor scoring via the scoring engine) using the OLD OpenAI client directly (not Vercel AI SDK)
2. **The decide actor makes 1 LLM call** to generate the response using `generate()` from the new fred-client (Vercel AI SDK)
3. **The scoring engine uses `gpt-4o`** via direct OpenAI SDK -- this is a separate call from the decide LLM call
4. **No actors use o1** -- the `reasoning` provider key exists in providers.ts but is never referenced by any actor
5. **The entire pipeline is strictly sequential** -- several actors could run in parallel

**Estimated worst-case LLM time: ~5-12s for 2 LLM calls (scoring + response generation). The remaining ~4-5 minutes of delay is NOT in the actor pipeline -- look upstream.**

---

## Actor-by-Actor Analysis

### 1. load-memory.ts (loading_memory state)

| Property | Value |
|---|---|
| **LLM Calls** | 0 |
| **AI Model** | None |
| **What it does** | 3x parallel DB queries (episodes, facts, decisions) via `Promise.all` |
| **Prompt size** | N/A |
| **Client used** | N/A (pure DB) |
| **Can skip for simple msgs?** | Yes -- already skips for free tier (retentionDays=0) |
| **Can parallelize?** | Could run in parallel with validate-input (memory is only used downstream) |
| **Estimated time** | 50-500ms (DB queries) |

**Notes:** Well-implemented with `Promise.all` for internal parallelism. The tier-based gating is good -- free users skip entirely. However, the machine ALWAYS waits for this to complete before starting intake, even though validate-input doesn't strictly need memory data.

---

### 2. validate-input.ts (intake state)

| Property | Value |
|---|---|
| **LLM Calls** | 0 |
| **AI Model** | None |
| **What it does** | Rule-based intent detection, entity extraction, sentiment analysis, keyword extraction, burnout detection, step-relevance detection, drift detection, downstream request detection, positioning/investor signal detection |
| **Prompt size** | N/A |
| **Client used** | N/A (pure regex/rules) |
| **Can skip for simple msgs?** | No -- always needed for routing |
| **Can parallelize?** | Depends on memory for clarification logic, but most work is independent |
| **Estimated time** | <5ms (synchronous regex) |

**Notes:** Despite being marked `async`, this actor makes ZERO LLM calls. All detection is regex/keyword-based. `detectIntent()` and `extractEntities()` are marked async but return synchronously. This is extremely fast and not a bottleneck. The comment "will be enhanced with AI later" (line 157) confirms the original plan was to add AI later but it hasn't happened.

---

### 3. mental-models.ts (mental_models state)

| Property | Value |
|---|---|
| **LLM Calls** | **0** |
| **AI Model** | None |
| **What it does** | Selects up to 4 relevant mental models, runs them via `Promise.all`, each model is a pure heuristic function |
| **Prompt size** | N/A |
| **Client used** | N/A (pure heuristics) |
| **Can skip for simple msgs?** | Yes -- for greetings, feedback, information intents, models add little value |
| **Can parallelize?** | Internal models already run in parallel. Could run concurrently with synthesize if we restructured |
| **Estimated time** | <5ms (synchronous heuristics despite async signatures) |

**KEY FINDING:** The "12 serial LLM calls" hypothesis is **completely false**. There are 12 mental model implementations defined (`first_principles`, `second_order_effects`, `opportunity_cost`, `pre_mortem`, `inversion`, `five_whys`, `jobs_to_be_done`, `time_horizon`, `swot`, `regret_minimization`, `contrarian`, `probabilistic`), but:

- At most 4 are selected per request (line 83: `models.slice(0, 4)`)
- They already run in parallel via `Promise.all` (line 29-33)
- **None of them make LLM calls** -- every implementation is a pure heuristic function returning canned insights based on keyword matching
- All 12 async functions resolve near-instantly

This actor is NOT a performance bottleneck.

---

### 4. synthesize.ts (synthesis state)

| Property | Value |
|---|---|
| **LLM Calls** | **0 or 1** (conditional) |
| **AI Model** | `gpt-4o` via direct OpenAI SDK (in scoring engine) |
| **What it does** | Collects model insights, calculates 7-factor scores, generates recommendation, alternatives, risks, reasoning |
| **Prompt size** | ~800-1200 tokens (scoring prompt with decision context) |
| **Client used** | **OLD direct OpenAI SDK** (`new OpenAI()` in `scoring/engine.ts:116`) -- NOT the Vercel AI SDK |
| **Can skip for simple msgs?** | Yes -- AI scoring only triggers for `decision_request` intent when OPENAI_API_KEY exists (line 115) |
| **Can parallelize?** | The AI scoring call could be parallelized with the heuristic scoring path |
| **Estimated time** | <5ms (heuristic) or 2-5s (AI scoring via OpenAI) |

**AI Call Path:** `synthesizeActor()` -> `calculateFactorScores()` -> `getAIFactorScores()` -> `scoreDecision()` -> `getAIScoringFactors()` -> `openai.chat.completions.create()` with model `gpt-4o`, temp 0.3, JSON response_format.

**Issue:** The scoring engine at `lib/fred/scoring/engine.ts` creates a **new OpenAI client on every call** (line 116: `const openai = new OpenAI({...})`). This is wasteful -- should be a singleton.

---

### 5. decide.ts (decide state)

| Property | Value |
|---|---|
| **LLM Calls** | **0 or 1** (conditional) |
| **AI Model** | `gpt-4o` via Vercel AI SDK `generate()` (primary provider in fred-client.ts) |
| **What it does** | Determines action type, generates LLM response with full FRED personality, adds drift redirects, step questions, Next 3 Actions |
| **Prompt size** | **~3000-5000+ tokens** (full system prompt with FRED personality, coaching overlays, founder context) |
| **Client used** | **NEW Vercel AI SDK** via `generate()` from `lib/ai/fred-client.ts` |
| **Can skip for simple msgs?** | Partially -- `clarify` and `defer` actions skip LLM (line 310-322). But ALL other substantive responses go through LLM. |
| **Can parallelize?** | No -- depends on synthesis output |
| **Estimated time** | <5ms (clarify/defer template) or 3-8s (LLM generation with large system prompt) |

**KEY FINDING:** The `generate()` call in `buildResponseContent()` (line 326) uses the `primary` model which resolves to `gpt-4o`. Options: `temperature: 0.7, maxOutputTokens: 1024`. The system prompt is MASSIVE -- it includes FRED's full identity, bio, philosophy, communication style, coaching prompts, and founder context. This is the heaviest LLM call in the pipeline.

**IMPORTANT: decide.ts does NOT use o1.** The `reasoning` provider key exists in `providers.ts` (line 97-100, maps to `openai("o1")`) but is never referenced by any actor. The o1 model is registered but unused.

---

### 6. execute.ts (execute state)

| Property | Value |
|---|---|
| **LLM Calls** | 0 |
| **AI Model** | None |
| **What it does** | Logs decision to memory (DB writes), builds response object, fires-and-forgets conversation state updates, IRS scoring triggers, verdict extraction |
| **Prompt size** | N/A |
| **Client used** | N/A (pure DB operations) |
| **Can skip for simple msgs?** | Memory logging could be skipped for greetings |
| **Can parallelize?** | Most operations already fire-and-forget |
| **Estimated time** | 50-500ms (DB writes, some fire-and-forget) |

**Notes:** `updateConversationState` runs as fire-and-forget (line 43-44). IRS scoring is also fire-and-forget (line 385-386). However, `logDecisionToMemory` is AWAITED (line 29) -- this is 2 sequential DB writes that block the response.

---

## LLM Call Summary

### Worst Case (decision_request intent):

| # | Actor | Model | Client | Estimated Time |
|---|---|---|---|---|
| 1 | synthesize (scoring engine) | gpt-4o | OLD direct OpenAI SDK | 2-5s |
| 2 | decide (response generation) | gpt-4o | NEW Vercel AI SDK | 3-8s |
| **Total** | | | | **5-13s** |

### Best Case (greeting/feedback intent):

| # | Actor | Model | Client | Estimated Time |
|---|---|---|---|---|
| - | No LLM calls | - | - | 0s |
| **Total** | | | | **<1s** (DB only) |

### Typical Case (question intent):

| # | Actor | Model | Client | Estimated Time |
|---|---|---|---|---|
| 1 | decide (response generation) | gpt-4o | NEW Vercel AI SDK | 3-8s |
| **Total** | | | | **3-8s** |

---

## Critical Findings

### 1. NO ACTOR USES o1 (CONFIRMED)
The `reasoning` provider key maps to `openai("o1")` in `providers.ts:99` but no actor ever calls `getModel("reasoning")`. The o1 model is registered but **completely unused**. This is NOT causing the 5-minute delay.

### 2. Mental Models Does NOT Make 12 Serial LLM Calls (CONFIRMED)
All 12 mental model implementations are pure heuristic functions. At most 4 are selected, and they run in parallel via `Promise.all`. Total time: <5ms.

### 3. Two Different AI Clients (TECHNICAL DEBT)
- **Scoring engine** (`lib/fred/scoring/engine.ts`): Uses OLD direct `OpenAI` SDK with `new OpenAI()` created per-call
- **Decide actor** (`lib/fred/actors/decide.ts`): Uses NEW Vercel AI SDK via `generate()` from `lib/ai/fred-client.ts`
- **Old client.ts** (`lib/ai/client.ts`): A third legacy client with `generateChatResponse()` -- does NOT appear to be used by any actor in the pipeline

### 4. The Pipeline Is Strictly Sequential (But Most Actors Are Fast)
```
load-memory (50-500ms DB)
  -> validate-input (<5ms regex)
    -> [validation guard] (<1ms)
      -> mental-models (<5ms heuristics)
        -> synthesize (<5ms heuristic OR 2-5s AI scoring)
          -> decide (template OR 3-8s LLM)
            -> execute (50-500ms DB)
```

**Total non-LLM overhead: ~100-1000ms**
**Total LLM time: 0-13s depending on intent**

### 5. The 5-Minute Delay Is NOT In This Pipeline
Even in the absolute worst case, the actor pipeline takes ~15s. The 5-minute delay must be upstream (pre-machine DB waterfall, route handler, or client-side issues).

---

## Parallelization Opportunities

### Safe to Parallelize Now:
1. **load-memory + validate-input**: Memory is only consumed downstream by synthesize/decide. Validate-input uses memory only for clarification logic (non-critical). These could run concurrently.

### Would Require Restructuring:
2. **mental-models + synthesize heuristic path**: If synthesize's heuristic scoring doesn't depend on mental model results, these could overlap. However, synthesize DOES use mental model insights.

### Not Worth Parallelizing:
3. Mental models are already internally parallel and take <5ms.
4. Execute is already mostly fire-and-forget.

---

## Optimization Recommendations

### Quick Wins:
1. **Skip mental-models for non-decision intents**: Greetings, feedback, and simple questions gain nothing from mental models.
2. **Make scoring engine use singleton OpenAI client**: `scoring/engine.ts` creates `new OpenAI()` on every call.
3. **Make `logDecisionToMemory` fire-and-forget**: Currently awaited in execute.ts -- not needed for response.
4. **Use `fast` model (gpt-4o-mini) for scoring**: The scoring call uses gpt-4o but structured JSON output works fine with smaller models.

### Medium Effort:
5. **Parallelize load-memory and validate-input**: Run them concurrently, pass memory context downstream.
6. **Add early-exit for greetings**: Skip mental_models, synthesis, and scoring entirely. Go straight from validation to decide with a template response.
7. **Consolidate to single AI client**: Migrate scoring engine from direct OpenAI SDK to Vercel AI SDK `generateStructured()`.

### Larger Effort:
8. **Implement response streaming**: The decide actor could stream the LLM response instead of waiting for full completion.
9. **Cache scoring results**: Similar decisions could reuse cached factor scores.
