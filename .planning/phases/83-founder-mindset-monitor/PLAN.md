---
phase: 83-founder-mindset-monitor
plan: 01
type: execute
wave: 3
depends_on: [79]
files_modified:
  - lib/sentiment/stress-detector.ts
  - lib/sentiment/intervention-engine.ts
  - lib/db/sentiment-log.ts
  - app/api/fred/chat/route.ts
  - lib/ai/prompts.ts
  - supabase/migrations/20260308_sentiment_signals.sql
autonomous: true

must_haves:
  truths:
    - "FRED extracts sentiment signals from every chat message without explicit user action"
    - "When stress patterns are detected over last 5 messages, FRED proactively intervenes"
    - "Stress signals are logged and queryable for admin dashboard analysis"
    - "High stress triggers a wellbeing check-in suggestion"
    - "Sentiment detection does not block or slow the user-facing chat response"
  artifacts:
    - path: "lib/sentiment/stress-detector.ts"
      provides: "Rolling window stress pattern detection"
      exports: ["detectStressPattern", "StressLevel", "StressSignal"]
    - path: "lib/sentiment/intervention-engine.ts"
      provides: "Generates FRED proactive intervention prompts"
      exports: ["generateIntervention", "shouldIntervene"]
    - path: "lib/db/sentiment-log.ts"
      provides: "Persistence for sentiment signals"
      exports: ["logSentimentSignal", "getRecentSentimentSignals"]
    - path: "supabase/migrations/20260308_sentiment_signals.sql"
      provides: "sentiment_signals table"
      contains: "CREATE TABLE"
  key_links:
    - from: "app/api/fred/chat/route.ts"
      to: "lib/sentiment/stress-detector.ts"
      via: "fire-and-forget sentiment check after response"
      pattern: "detectStressPattern"
    - from: "lib/sentiment/stress-detector.ts"
      to: "lib/sentiment/intervention-engine.ts"
      via: "high stress triggers intervention prompt injection"
      pattern: "shouldIntervene.*generateIntervention"
    - from: "lib/sentiment/intervention-engine.ts"
      to: "lib/ai/prompts.ts"
      via: "intervention block injected into FRED system prompt"
      pattern: "buildInterventionBlock"
---

<objective>
Build a real-time sentiment monitoring system that detects founder stress and frustration from conversation patterns (not just explicit check-ins) and triggers proactive FRED interventions. This runs as a background pipeline in the chat flow -- never blocking the response.

Purpose: Founders in distress get proactive support before burnout. FRED detects patterns like increasing frustration, repeated negative language, or escalating stress across messages and intervenes with empathy.
Output: Stress detector, intervention engine, sentiment logging, chat pipeline integration
</objective>

<execution_context>
@~/.claude/get-shit-done/workflows/execute-plan.md
@~/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/milestones/v8.0-go-live/ROADMAP.md
@.planning/STATE.md

# Existing sentiment extraction (Phase 73) -- build on top of this
@lib/feedback/sentiment.ts
@lib/feedback/sentiment-aggregator.ts

# Chat pipeline -- will be modified to integrate stress detection
@app/api/fred/chat/route.ts

# Wellbeing page -- link target for check-in suggestions
@app/dashboard/wellbeing/page.tsx

# Prompt building utilities
@lib/ai/prompts.ts
</context>

<tasks>

<task type="auto">
  <name>Task 1: Stress Detection + Intervention Engine + DB Schema</name>
  <files>
    lib/sentiment/stress-detector.ts
    lib/sentiment/intervention-engine.ts
    lib/db/sentiment-log.ts
    supabase/migrations/20260308_sentiment_signals.sql
  </files>
  <action>
1. Create migration `supabase/migrations/20260308_sentiment_signals.sql`:
   ```sql
   CREATE TABLE IF NOT EXISTS sentiment_signals (
     id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
     user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
     message_id text,
     label text NOT NULL CHECK (label IN ('positive','neutral','negative','frustrated')),
     confidence real NOT NULL DEFAULT 0,
     stress_level real NOT NULL DEFAULT 0,
     topics text[],
     intervention_triggered boolean DEFAULT false,
     created_at timestamptz DEFAULT now()
   );
   CREATE INDEX IF NOT EXISTS idx_sentiment_signals_user_time ON sentiment_signals(user_id, created_at DESC);
   ALTER TABLE sentiment_signals ENABLE ROW LEVEL SECURITY;
   CREATE POLICY "Users read own signals" ON sentiment_signals FOR SELECT USING (auth.uid() = user_id);
   CREATE POLICY "Service inserts signals" ON sentiment_signals FOR INSERT WITH CHECK (true);
   ```

2. Create `lib/db/sentiment-log.ts`:
   - Export `logSentimentSignal(signal: SentimentSignal): Promise<void>` -- fire-and-forget insert into sentiment_signals
   - Export `getRecentSentimentSignals(userId: string, count?: number): Promise<SentimentSignal[]>` -- returns last N signals (default 5) ordered by created_at DESC
   - Use `createServiceClient()` for DB access (service role bypasses RLS for inserts)

3. Create `lib/sentiment/stress-detector.ts`:
   - Import `SentimentResult` from `@/lib/feedback/sentiment` (reuse the existing per-message sentiment extractor)
   - Export type `StressLevel = 'low' | 'moderate' | 'high' | 'critical'`
   - Export type `StressSignal = { level: StressLevel, score: number, trend: 'improving' | 'stable' | 'worsening', dominantEmotion: string, topics: string[] }`
   - Export `detectStressPattern(userId: string, currentSentiment: SentimentResult): Promise<StressSignal>`:
     - Fetch last 5 sentiment signals from DB via `getRecentSentimentSignals(userId, 5)`
     - Compute rolling stress score:
       - Each 'frustrated' = 1.0, 'negative' = 0.6, 'neutral' = 0.1, 'positive' = -0.2
       - Average over window, weight recent messages higher (exponential decay: most recent = 1.0, oldest = 0.5)
     - Map score to level: < 0.2 = 'low', < 0.5 = 'moderate', < 0.7 = 'high', >= 0.7 = 'critical'
     - Determine trend by comparing current window avg to previous 5 (if available)
     - Extract dominant topics from recent messages (simple keyword extraction, not LLM)
   - Export `shouldIntervene(signal: StressSignal): boolean`:
     - Returns true if level is 'high' or 'critical' AND trend is 'worsening' or 'stable'
     - Also true if level is 'critical' regardless of trend
     - Returns false if the user received an intervention in the last 3 messages (check via DB)

4. Create `lib/sentiment/intervention-engine.ts`:
   - Export `generateIntervention(signal: StressSignal, founderName: string): string`:
     - Returns a contextual prompt injection block for FRED's system prompt
     - Templates by stress level:
       - HIGH: "The founder seems stressed about {topics}. Acknowledge their frustration before giving advice. Say something like: 'I can tell {topic} is weighing on you. Let's step back and look at this differently.'"
       - CRITICAL: "The founder shows signs of burnout or severe frustration. Prioritize their wellbeing. Suggest: 'Before we continue, I think it's worth taking a breath. Would you like to do a quick wellbeing check-in? [link to /dashboard/wellbeing]'. Lead with empathy, not solutions."
     - Always include: "Do NOT say 'I detected your stress level' or mention the monitoring system. Be natural."
   - Export `buildInterventionBlock(intervention: string): string`:
     - Wraps the intervention text in a system prompt block format matching existing `lib/ai/prompts.ts` patterns
     - Format: `\n\n[FOUNDER WELLBEING CONTEXT]\n${intervention}\n[/FOUNDER WELLBEING CONTEXT]`
  </action>
  <verify>
    - `npx tsc --noEmit` passes
    - Unit test: create `lib/sentiment/__tests__/stress-detector.test.ts` testing `detectStressPattern` with mock signals and `shouldIntervene` edge cases
    - `npm run test -- --run lib/sentiment/__tests__/stress-detector.test.ts` passes
  </verify>
  <done>
    - Stress detection computes rolling window score from recent sentiment signals
    - shouldIntervene correctly gates interventions (no spam, minimum interval)
    - Intervention engine produces natural, empathetic FRED prompt injections
    - Sentiment signals persist to DB with proper RLS
  </done>
</task>

<task type="auto">
  <name>Task 2: Integrate Stress Detection into Chat Pipeline</name>
  <files>
    app/api/fred/chat/route.ts
    lib/ai/prompts.ts
  </files>
  <action>
1. Modify `app/api/fred/chat/route.ts` to integrate stress monitoring:
   - Import `detectStressPattern`, `shouldIntervene` from `@/lib/sentiment/stress-detector`
   - Import `generateIntervention`, `buildInterventionBlock` from `@/lib/sentiment/intervention-engine`
   - Import `logSentimentSignal` from `@/lib/db/sentiment-log`

   - AFTER the existing `extractSentiment()` call (which already runs as fire-and-forget), add stress detection:
     ```
     // Fire-and-forget: log sentiment + check stress pattern
     const sentimentResult = await extractSentiment(...)  // already exists
     void logSentimentSignal({ userId, label: sentimentResult.label, confidence: sentimentResult.confidence, ... })
     const stressSignal = await detectStressPattern(userId, sentimentResult)
     ```

   - BEFORE building the system prompt (before the LLM call), check if intervention is needed:
     ```
     let interventionBlock = ''
     if (shouldIntervene(stressSignal)) {
       const intervention = generateIntervention(stressSignal, founderName)
       interventionBlock = buildInterventionBlock(intervention)
       // Log that intervention was triggered
       void logSentimentSignal({ ...signal, intervention_triggered: true })
     }
     ```

   - Append `interventionBlock` to the system prompt. Find where the system prompt is assembled (likely near `buildStepGuidanceBlock` or similar calls) and add the intervention block alongside other prompt blocks.

   - IMPORTANT: The stress detection MUST NOT block the response. Use the following pattern:
     - The `detectStressPattern` call happens BEFORE the LLM call (to potentially inject intervention)
     - But keep it fast: the DB query for 5 recent signals is lightweight
     - The `logSentimentSignal` call is fire-and-forget (void, no await blocking response)

2. Add to `lib/ai/prompts.ts`:
   - Export `buildWellbeingInterventionBlock(interventionText: string): string` that formats the block consistently with other prompt blocks in this file
   - Follow the same pattern as `buildStepGuidanceBlock`, `buildFrameworkInjectionBlock`, etc.
  </action>
  <verify>
    - `npx tsc --noEmit` passes
    - `npm run test` passes (no regressions in existing tests)
    - Manual: send 5+ frustrated messages to FRED chat and verify FRED acknowledges the stress
    - Manual: verify normal conversations do NOT trigger intervention
  </verify>
  <done>
    - Every chat message has its sentiment logged to sentiment_signals table
    - When 5+ messages show worsening stress, FRED proactively intervenes
    - Intervention feels natural (FRED doesn't say "I detected stress")
    - No latency impact on normal chat responses
    - Wellbeing check-in is suggested for critical stress levels
  </done>
</task>

</tasks>

<verification>
1. `npx tsc --noEmit` -- no type errors
2. `npm run test` -- all existing tests still pass
3. `npm run test -- --run lib/sentiment/__tests__/stress-detector.test.ts` -- stress detection tests pass
4. Manual: send multiple frustrated messages -> verify FRED intervention
5. Manual: send normal messages -> verify NO intervention
6. DB: verify sentiment_signals table has entries after chat
</verification>

<success_criteria>
- Sentiment extracted from every chat message (fire-and-forget, no latency impact)
- Rolling 5-message window detects stress patterns
- FRED intervenes naturally when stress is high/critical
- Intervention has a cooldown (no spam every message)
- Signals are logged and queryable for admin analysis
- Wellbeing check-in suggested at critical level
</success_criteria>

<output>
After completion, create `.planning/phases/83-founder-mindset-monitor/83-01-SUMMARY.md`
</output>
