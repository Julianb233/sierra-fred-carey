# Unified Intelligence Architecture

A production-ready AI library with database-driven configuration, A/B testing, request/response logging, and automatic insight extraction.

## Features

### 1. **Database-Driven Configuration**
Configure AI behavior per analyzer without code changes:
- Model selection (GPT-4, Claude, Gemini)
- Temperature and max tokens
- Analyzer-specific weights and thresholds
- Custom settings per feature

### 2. **Prompt Versioning**
Manage prompts in the database:
- Version control for prompts
- Easy rollback to previous versions
- A/B test different prompt variations

### 3. **A/B Testing**
Run experiments on prompts and configurations:
- Deterministic user assignment (same user → same variant)
- Traffic percentage control
- Per-variant config overrides
- Automatic stats tracking

### 4. **Request/Response Logging**
Full observability of AI interactions:
- Every request and response logged
- Latency tracking
- Error tracking
- Token usage (when available)

### 5. **Insight Extraction**
Automatically extract learnings from AI responses:
- Breakthrough moments
- Warnings and risks
- Opportunities
- Patterns
- Recommendations

## Usage

### Basic Usage (Untracked)

```typescript
import { generateChatResponse } from "@/lib/ai";

const response = await generateChatResponse(
  [{ role: "user", content: "Analyze this startup idea..." }],
  "You are a startup advisor..."
);
```

### Advanced Usage (Tracked with Config)

```typescript
import { generateTrackedResponse } from "@/lib/ai";

const result = await generateTrackedResponse(
  [{ role: "user", content: "Analyze this startup idea..." }],
  undefined, // System prompt loaded from database
  {
    userId: user.id,
    analyzer: "reality_lens", // Loads config from ai_config table
    sourceId: checkin.id,
    inputData: { checkinText: checkin.content },
  }
);

console.log(result.content); // AI response
console.log(result.requestId); // For logging/debugging
console.log(result.variant); // A/B test variant (if applicable)
console.log(result.latencyMs); // Response time
```

### With Insight Extraction

```typescript
import { generateTrackedResponse, extractAndSaveInsights } from "@/lib/ai";

// Generate AI response
const result = await generateTrackedResponse(
  [{ role: "user", content: userInput }],
  undefined,
  {
    userId: user.id,
    analyzer: "reality_lens",
    sourceId: checkin.id,
  }
);

// Extract and save insights
const insights = await extractAndSaveInsights(
  user.id,
  "checkin",
  checkin.id,
  result.content,
  "Reality Lens analysis"
);

console.log(`Extracted ${insights.length} insights`);
```

### Configuration Management

```typescript
import { getAIConfig, updateAIConfig } from "@/lib/ai";

// Get current config
const config = await getAIConfig("reality_lens");

// Update config
await updateAIConfig("reality_lens", {
  temperature: 0.5, // More focused
  maxTokens: 2000, // Longer responses
});
```

### A/B Testing

```typescript
import { createExperiment, getVariantStats } from "@/lib/ai";

// Create experiment
await createExperiment(
  "reality_lens_prompt_v2",
  "Testing more empathetic prompt",
  [
    {
      variantName: "control",
      trafficPercentage: 50,
    },
    {
      variantName: "empathetic",
      promptId: newPromptId,
      trafficPercentage: 50,
    },
  ],
  userId
);

// Check stats
const stats = await getVariantStats("reality_lens_prompt_v2");
console.log(stats);
// [
//   { variantName: "control", totalRequests: 1234, avgLatency: 850, errorRate: 0.01 },
//   { variantName: "empathetic", totalRequests: 1189, avgLatency: 920, errorRate: 0.02 }
// ]
```

### Get User Insights

```typescript
import { getUserInsights, dismissInsight } from "@/lib/ai";

// Get all insights for user
const insights = await getUserInsights(userId);

// Get high-importance warnings
const warnings = await getUserInsights(userId, {
  insightType: "warning",
  minImportance: 7,
  limit: 10,
});

// Dismiss an insight
await dismissInsight(userId, insightId);
```

## Database Schema

### Tables

- **`ai_config`** - Configuration per analyzer (model, temperature, etc.)
- **`ai_prompts`** - Versioned prompt management
- **`ab_experiments`** - A/B test experiments
- **`ab_variants`** - Variants within experiments
- **`ai_requests`** - All AI requests logged
- **`ai_responses`** - All AI responses logged
- **`ai_insights`** - Extracted insights for founders

### Seeded Analyzers

Default configs are created for:
- `reality_lens`
- `investor_score`
- `pitch_deck`

## Architecture Decisions

### Why Database-Driven Config?
- Change AI behavior without deployments
- A/B test configurations easily
- Track what config was used for each request
- Rollback bad changes quickly

### Why Deterministic A/B Assignment?
- Consistent experience per user
- No need to store assignment state
- Works across sessions
- Simple hash-based assignment

### Why Insight Extraction?
- Help founders learn from AI feedback
- Surface patterns across sessions
- Build a knowledge base over time
- Enable "what did I learn?" features

### Why Logging Everything?
- Debug AI issues
- Track costs per analyzer
- Monitor latency trends
- Analyze which prompts perform best

## Migration

Run the migration:

```bash
npm run db:migrate
```

This creates all tables and seeds default configs.

## Examples

See the `/examples` directory for:
- Reality Lens integration
- Investor Score integration
- Pitch Deck analysis
- Custom analyzer creation

## Performance

- **Config caching**: 5-minute TTL (configurable)
- **Prompt caching**: 5-minute TTL (configurable)
- **Indexed queries**: All common queries have indexes
- **RLS enabled**: Row-level security on all tables

## Future Enhancements

- [ ] Token usage tracking from API responses
- [ ] Cost tracking per analyzer
- [ ] Prompt performance metrics
- [ ] Automatic experiment winner detection
- [ ] Multi-modal support (images, audio)
- [ ] Streaming support with tracking
- [ ] Batch request optimization
- [ ] Custom model fine-tuning integration
