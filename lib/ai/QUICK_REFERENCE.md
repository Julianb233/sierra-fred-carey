# Unified Intelligence Architecture - Quick Reference

## Installation

```bash
# Run migration
npm run db:migrate

# Import in your code
import {
  generateTrackedResponse,
  extractAndSaveInsights,
  getAIConfig,
  updateAIConfig,
  createExperiment,
} from "@/lib/ai";
```

## Basic Usage

### Simple AI Call (Untracked)

```typescript
import { generateChatResponse } from "@/lib/ai";

const response = await generateChatResponse(
  [{ role: "user", content: "Your question here" }],
  "System prompt here"
);
```

### Tracked AI Call (Recommended)

```typescript
import { generateTrackedResponse } from "@/lib/ai";

const result = await generateTrackedResponse(
  [{ role: "user", content: userInput }],
  undefined, // System prompt loaded from DB
  {
    userId: user.id,
    analyzer: "reality_lens", // Must match ai_config.analyzer
    sourceId: checkin.id,
    inputData: { /* any context */ },
  }
);

console.log(result.content);   // AI response
console.log(result.requestId); // For debugging
console.log(result.latencyMs); // Performance tracking
console.log(result.variant);   // A/B test variant (if any)
```

### With Insight Extraction

```typescript
import { generateTrackedResponse, extractAndSaveInsights } from "@/lib/ai";

// 1. Generate response
const result = await generateTrackedResponse(messages, undefined, {
  userId: user.id,
  analyzer: "reality_lens",
  sourceId: checkin.id,
});

// 2. Extract insights
const insights = await extractAndSaveInsights(
  user.id,
  "checkin",
  checkin.id,
  result.content,
  "Reality Lens analysis"
);

console.log(`Found ${insights.length} insights`);
```

## Configuration Management

### Get Config

```typescript
import { getAIConfig } from "@/lib/ai";

const config = await getAIConfig("reality_lens");
console.log(config.model);       // "gpt-4-turbo-preview"
console.log(config.temperature); // 0.7
console.log(config.maxTokens);   // 1000
```

### Update Config

```typescript
import { updateAIConfig } from "@/lib/ai";

await updateAIConfig("reality_lens", {
  model: "gpt-3.5-turbo",  // Switch to cheaper model
  temperature: 0.5,         // More focused
  maxTokens: 1500,          // Longer responses
});
```

### Batch Get Configs

```typescript
import { getMultipleConfigs } from "@/lib/ai";

const configs = await getMultipleConfigs([
  "reality_lens",
  "investor_score",
  "pitch_deck",
]);
```

## A/B Testing

### Create Experiment

```typescript
import { createExperiment } from "@/lib/ai";

await createExperiment(
  "reality_lens_v2",           // Unique name
  "Testing new empathetic prompt", // Description
  [
    {
      variantName: "control",
      trafficPercentage: 50,
      // Uses default config/prompt
    },
    {
      variantName: "empathetic",
      trafficPercentage: 50,
      promptId: "prompt-uuid",  // Optional: different prompt
      configOverrides: {         // Optional: override config
        temperature: 0.8,
      },
    },
  ],
  userId // Creator
);
```

### Get Variant for User

```typescript
import { getVariantAssignment } from "@/lib/ai";

const variant = await getVariantAssignment(userId, "reality_lens_v2");
if (variant) {
  console.log(`User in variant: ${variant.variantName}`);
}
```

### Check Experiment Stats

```typescript
import { getVariantStats } from "@/lib/ai";

const stats = await getVariantStats("reality_lens_v2");
stats.forEach(s => {
  console.log(`${s.variantName}: ${s.totalRequests} requests, ${s.avgLatency}ms avg`);
});
```

### End Experiment

```typescript
import { endExperiment } from "@/lib/ai";

await endExperiment("reality_lens_v2");
```

## Insight Management

### Get User Insights

```typescript
import { getUserInsights } from "@/lib/ai";

// All insights
const insights = await getUserInsights(userId);

// Filter by type
const warnings = await getUserInsights(userId, {
  insightType: "warning",
  minImportance: 7,
  limit: 10,
});

// Filter by source
const checkinInsights = await getUserInsights(userId, {
  sourceType: "checkin",
  sourceId: checkinId,
});
```

### Dismiss Insight

```typescript
import { dismissInsight } from "@/lib/ai";

await dismissInsight(userId, insightId);
```

## Prompt Management

### Create Prompt

```sql
INSERT INTO ai_prompts (name, version, content, is_active)
VALUES (
  'reality_lens_system',
  1,
  'You are an expert startup advisor...',
  true
);
```

### Get Active Prompt

```typescript
import { getActivePrompt } from "@/lib/ai";

const prompt = await getActivePrompt("reality_lens_system");
if (prompt) {
  console.log(`Using prompt v${prompt.version}`);
}
```

## Analyzers

Default analyzers seeded in database:
- `reality_lens` - Reality Lens analysis
- `investor_score` - Investor Score calculation
- `pitch_deck` - Pitch deck analysis

## Insight Types

- `breakthrough` - Significant realization or validation
- `warning` - Potential risk or concern
- `opportunity` - Actionable opportunity
- `pattern` - Recurring theme
- `recommendation` - Specific action item

## Performance

- Config cached for 5 minutes
- Prompt cached for 5 minutes
- A/B assignment is O(1) hash-based
- All queries indexed

## Monitoring Queries

```sql
-- Requests per analyzer (last 7 days)
SELECT analyzer, COUNT(*)
FROM ai_requests
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY analyzer;

-- Average latency per analyzer
SELECT req.analyzer, AVG(resp.latency_ms) as avg_latency
FROM ai_requests req
JOIN ai_responses resp ON resp.request_id = req.id
WHERE req.created_at > NOW() - INTERVAL '7 days'
GROUP BY req.analyzer;

-- Error rate
SELECT req.analyzer,
  COUNT(*) FILTER (WHERE resp.error IS NOT NULL) * 100.0 / COUNT(*) as error_rate
FROM ai_requests req
JOIN ai_responses resp ON resp.request_id = req.id
GROUP BY req.analyzer;

-- Most common insights
SELECT insight_type, COUNT(*)
FROM ai_insights
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY insight_type
ORDER BY COUNT(*) DESC;
```

## Migration Pattern

### Before
```typescript
const response = await generateChatResponse(
  [{ role: "user", content: input }],
  HARDCODED_PROMPT
);
const analysis = JSON.parse(response);
await saveToDatabase(analysis);
```

### After
```typescript
const result = await generateTrackedResponse(
  [{ role: "user", content: input }],
  undefined, // Prompt from DB
  {
    userId: user.id,
    analyzer: "reality_lens",
    sourceId: source.id,
  }
);
const analysis = JSON.parse(result.content);

// Auto-extract insights
await extractAndSaveInsights(
  user.id,
  "checkin",
  source.id,
  result.content
);
```

## Error Handling

All functions throw on error - wrap in try/catch:

```typescript
try {
  const result = await generateTrackedResponse(...);
} catch (error) {
  console.error("AI request failed:", error);
  // Fallback or error handling
}
```

## TypeScript Types

```typescript
import type {
  ChatMessage,
  AIConfig,
  AIPrompt,
  ABVariant,
  ExtractedInsight,
} from "@/lib/ai";
```

## Environment Variables

Required for AI providers:
- `OPENAI_API_KEY` (primary)
- `ANTHROPIC_API_KEY` (fallback)
- `GOOGLE_API_KEY` (fallback)

## Cache Management

```typescript
import { clearConfigCache } from "@/lib/ai";

// Clear cache after updating configs
clearConfigCache();
```

## Full Documentation

See `/lib/ai/README.md` for comprehensive documentation.
