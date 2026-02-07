# Phase 16: Red Flag Detection - Research

**Researched:** 2026-02-07
**Domain:** Risk detection engine, inline chat UI annotations, dashboard widget, database persistence
**Confidence:** HIGH

## Summary

Phase 16 adds real-time business risk detection to the FRED chat pipeline. When a founder discusses their startup with FRED, the system detects and flags business risks (financial, market, team, product, legal, execution) and surfaces them in two places: inline visual badges within the chat UI, and a persistent dashboard widget listing all active red flags with severity levels.

The codebase already has strong foundations for this feature. The FRED cognitive pipeline (`lib/fred/machine.ts`) already has a synthesis step (`lib/fred/actors/synthesize.ts`) that calls `identifyRisks()` to extract `Risk[]` objects from mental model analysis. The `ValidatedInput` type includes sentiment, urgency, keyword, and entity extraction that can drive risk pattern recognition. The chat API route (`app/api/fred/chat/route.ts`) uses Server-Sent Events (SSE) with structured event types that can be extended with a new `red_flags` event. The `useFredChat` hook (`lib/hooks/use-fred-chat.ts`) parses these SSE events and exposes them to the React UI.

The primary gap is that detected risks are currently discarded after the pipeline completes -- they are not persisted, not streamed to the client, and not rendered in the UI. The implementation requires: (1) a dedicated detection engine module that combines pipeline `SynthesisResult.risks` with keyword pattern matching on the `ValidatedInput`, (2) a new `fred_red_flags` database table with CRUD access layer, (3) integration into the chat route to persist and stream detected flags, (4) an inline badge component for the chat message bubble, (5) extending the `Message` and `FredMessage` interfaces with a `redFlags` field, and (6) a dashboard widget card that fetches active flags from a new API endpoint. All three requirements (FREE-01, FREE-02, FREE-03) are Free tier features requiring no tier gating.

## Standard Stack

No new libraries needed. All required dependencies are already in the project.

| Library | Version | Purpose | Already Installed |
|---------|---------|---------|-------------------|
| `@supabase/supabase-js` | ^2.89.0 | Database access for `fred_red_flags` table | Yes |
| `zod` | (bundled with ai SDK) | Schema validation for API request/response | Yes |
| `framer-motion` | (installed) | Animations for inline badge expand/collapse | Yes |
| `@radix-ui/react-icons` | ^1.3.2 | Warning/alert icons for severity badges | Yes |
| `class-variance-authority` | ^0.7.1 | Badge variant styling (severity colors) | Yes |
| `lucide-react` | (installed) | Additional icons (AlertTriangle, Shield, etc.) | Yes |
| `sonner` | (installed) | Toast notifications for flag status changes | Yes |

## Current Architecture

### FRED Chat Pipeline Flow

```
User sends message
  -> POST /api/fred/chat (app/api/fred/chat/route.ts)
    -> FredService.processStream() (lib/fred/service.ts)
      -> XState machine (lib/fred/machine.ts):
         idle -> loading_memory -> intake -> validation -> mental_models -> synthesis -> decide -> execute -> complete
      -> SSE events: connected -> state -> analysis -> models -> synthesis -> response -> done
    -> Client: useFredChat hook (lib/hooks/use-fred-chat.ts)
      -> Updates messages[] state with FredMessage objects
      -> ChatInterface renders via ChatMessage component
```

### Key Type Hierarchy

```
FredContext.synthesis: SynthesisResult
  SynthesisResult.risks: Risk[]        <-- ALREADY EXISTS, not persisted or streamed
  SynthesisResult.recommendation: string
  SynthesisResult.confidence: number

Risk {
  description: string
  likelihood: number (0-1)
  impact: number (0-1)
  mitigation?: string
}

ValidatedInput {
  sentiment: "positive" | "negative" | "neutral" | "mixed"
  urgency: "low" | "medium" | "high" | "critical"
  keywords: string[]
  entities: ExtractedEntity[]
  topic?: CoachingTopic   <-- includes "mindset" for stress signals
}
```

### SSE Event Stream (Current)

The chat route emits these events in order: `connected`, `state`, `analysis`, `models`, `synthesis`, `response`, `done`. The `synthesis` event currently sends only `recommendation`, `confidence`, and `reasoning` -- it omits `risks`, `nextSteps`, `followUpQuestions`, and `alternatives`.

### Chat UI Component Chain

```
ChatInterface (components/chat/chat-interface.tsx)
  -> useFredChat() hook returns FredMessage[]
  -> Maps to Message[] (id, content, role, timestamp)
  -> Renders ChatMessage for each message
    -> ChatMessage renders avatar + message bubble
    -> No metadata rendering, no badge system
```

### Dashboard Architecture

```
/dashboard (app/dashboard/page.tsx)
  -> Client component, fetches /api/dashboard/stats
  -> Renders: Stats Grid (4 cards), Quick Actions, Recent Activity, Upgrade CTA
  -> No red flag widget exists
  -> Uses Card, Badge, Button from @/components/ui/*
```

### Existing Risk Detection (lib/fred/actors/synthesize.ts, identifyRisks())

The `identifyRisks()` function at line 322 extracts risks from:
- Pre-mortem mental model failure modes (from `pre_mortem` analysis)
- Urgency-related pressure risks (if `input.urgency === "critical"`)
- Information completeness risks (if `input.clarificationNeeded.length > 0`)

These are generic pipeline risks, not business-domain-specific red flags. Phase 16 needs a dedicated detection engine that recognizes domain-specific risk patterns (cash runway, co-founder conflict, market fit doubts, etc.).

### Existing Keyword/Signal Detection (lib/fred/actors/validate-input.ts)

Already detects signals useful for risk detection:
- **Sentiment analysis** (line 291-332): positiveWords/negativeWords matching
- **Urgency detection** (line 337-368): critical/high/medium/low indicators
- **Keyword extraction** (line 373-398): top 10 meaningful terms after stop-word removal
- **Topic detection** (line 404-428): maps to CoachingTopic including "mindset" (burnout/stress signals)

### Memory System (lib/db/fred-memory.ts)

Three-layer memory architecture:
- **Episodic**: `fred_episodic_memory` table -- conversation history with `storeEpisode()`
- **Semantic**: `fred_semantic_memory` table -- learned facts with `storeFact()`/`getFact()`
- **Procedural**: `fred_procedural_memory` table -- decision frameworks
- **Decision Log**: `fred_decision_log` table -- decision tracking

Pattern for DB access: `createServiceClient()` -> query -> `transformRow()` (snake_case to camelCase). All functions follow this convention.

## Files to Modify

### 1. `app/api/fred/chat/route.ts` (Chat API Route)
- **What**: After FRED pipeline completes, call the detection engine on `SynthesisResult` + `ValidatedInput`
- **What**: Persist detected flags to `fred_red_flags` table
- **What**: Emit new `red_flags` SSE event with detected flags before the `response` event
- **What**: Include `redFlags` data in the non-streaming JSON response object

### 2. `lib/hooks/use-fred-chat.ts` (useFredChat Hook)
- **What**: Add `red_flags` SSE event handler in the switch statement (around line 265)
- **What**: Extend `FredMessage` interface to include `redFlags?: RedFlagData[]`
- **What**: When `red_flags` event arrives, attach flag data to the most recent assistant message
- **What**: Export `RedFlagData` type for consumers

### 3. `components/chat/chat-message.tsx` (Chat Message Component)
- **What**: Extend `Message` interface with optional `redFlags` field
- **What**: Render `RedFlagBadge` components below the message bubble when `redFlags` is present
- **What**: Conditional bottom border/glow for messages containing red flags

### 4. `components/chat/chat-interface.tsx` (Chat Interface)
- **What**: Update `Message` mapping from `FredMessage[]` to include `redFlags` data
- **What**: Pass `redFlags` through from `fredMessages` to the mapped `Message[]`

### 5. `app/dashboard/page.tsx` (Dashboard Overview)
- **What**: Add `RedFlagsWidget` component between the Stats Grid and Quick Actions sections
- **What**: Fetch red flag stats alongside existing `/api/dashboard/stats` call

### 6. `app/dashboard/layout.tsx` (Dashboard Layout - READ-ONLY CONSTRAINT)
- **Note**: This file has pre-commit hooks preventing modification. No changes needed here since the widget goes in `page.tsx`, not the layout.

### 7. `lib/fred/actors/synthesize.ts` (Synthesize Actor)
- **What**: Export the `identifyRisks()` function (currently private) so the detection engine can call it directly or extend it
- **What**: Alternatively, keep it private and have the detection engine consume `SynthesisResult.risks`

## New Files Needed

### 1. `lib/db/migrations/036_red_flags.sql`
Database migration for the `fred_red_flags` table, RLS policies, and indexes.

### 2. `lib/db/red-flags.ts`
Database access layer with CRUD operations following the `fred-memory.ts` pattern:
- `createRedFlag(userId, data)` -- insert new detection
- `getActiveRedFlags(userId, options?)` -- fetch active/acknowledged flags
- `getRedFlagsByCategory(userId, category)` -- filtered query
- `updateRedFlagStatus(flagId, status, userId)` -- acknowledge/resolve/dismiss
- `getRedFlagStats(userId)` -- counts by severity for dashboard widget header
- `findDuplicateFlag(userId, category, title)` -- deduplication check
- Transform functions (snake_case to camelCase)

### 3. `lib/fred/risks/detection-engine.ts`
Core detection module that analyzes conversation content and pipeline output:
- `detectRedFlags(input, synthesis, memoryContext)` -- main entry point
- `matchKeywordPatterns(input)` -- domain-specific keyword matching by category
- `correlateSignals(sentiment, urgency, entities)` -- sentiment+urgency escalation
- `calculateSeverity(likelihood, impact)` -- maps Risk likelihood/impact to severity levels
- `deduplicateFlags(newFlags, existingFlags)` -- prevents duplicate entries
- Category-specific keyword dictionaries for: financial, market, team, product, legal, execution
- `RedFlag` type definition with all fields

### 4. `lib/fred/risks/types.ts`
Type definitions for the red flag system:
- `RedFlagCategory` type union: "financial" | "market" | "team" | "product" | "legal" | "execution"
- `RedFlagSeverity` type union: "low" | "medium" | "high" | "critical"
- `RedFlagStatus` type union: "active" | "acknowledged" | "resolved" | "dismissed"
- `RedFlag` interface (full DB row representation)
- `RedFlagInput` interface (creation input)
- `RedFlagStats` interface (severity counts for dashboard)
- Category keyword dictionaries and severity thresholds

### 5. `components/chat/red-flag-badge.tsx`
Inline visual indicator for chat messages:
- `RedFlagBadge` component with severity-colored badge
- Warning icon + category label
- Expandable: click/hover to show description + suggested action
- Severity color scheme: yellow=low, orange=medium, red=high, animated-red=critical
- Uses existing `Badge` component as base with custom severity variants

### 6. `components/dashboard/red-flags-widget.tsx`
Dashboard card widget:
- Header: "Red Flags" with active count badge
- Severity summary bar showing counts per severity level
- List of active flags (category icon, title, severity badge, detected date)
- Per-flag actions: acknowledge, resolve, dismiss (PATCH calls)
- Empty state when no active flags
- "View All" link (future expansion to dedicated page)
- Client component fetching from `/api/red-flags`

### 7. `app/api/red-flags/route.ts`
REST API for red flags:
- `GET` -- Fetch red flags for authenticated user (query params: status, category, severity, limit, offset)
- `POST` -- Create red flag (internal use by detection engine, also useful for manual flag creation)

### 8. `app/api/red-flags/[id]/route.ts`
Single-flag operations:
- `PATCH` -- Update flag status (body: `{ status: "acknowledged" | "resolved" | "dismissed" }`)
- `DELETE` -- Soft-delete or hard-delete a flag

### 9. `lib/fred/risks/__tests__/detection-engine.test.ts`
Tests for the detection engine:
- Pattern matching across all 6 categories
- Severity calculation from likelihood/impact
- Deduplication logic
- Signal correlation (negative sentiment + high urgency = escalated severity)
- Edge cases: empty input, no keywords match, all categories match

### 10. `app/api/red-flags/__tests__/red-flags-api.test.ts`
Tests for the API routes:
- GET with various query params
- POST validation
- PATCH status transitions
- Auth requirements

## Data Model

### `fred_red_flags` Table

```sql
CREATE TABLE fred_red_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id UUID,                     -- chat session where flag was detected
  category TEXT NOT NULL CHECK (category IN (
    'financial', 'market', 'team', 'product', 'legal', 'execution'
  )),
  severity TEXT NOT NULL DEFAULT 'medium' CHECK (severity IN (
    'low', 'medium', 'high', 'critical'
  )),
  title TEXT NOT NULL,                 -- short label (e.g., "Cash Runway Below 3 Months")
  description TEXT NOT NULL,           -- detailed explanation
  source_quote TEXT,                   -- the founder's words that triggered detection
  suggested_action TEXT,               -- actionable recommendation
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN (
    'active', 'acknowledged', 'resolved', 'dismissed'
  )),
  detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,            -- set when status -> resolved
  metadata JSONB DEFAULT '{}'::JSONB,  -- additional context (likelihood, impact, keywords matched)
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Performance indexes
CREATE INDEX idx_red_flags_user_status ON fred_red_flags(user_id, status);
CREATE INDEX idx_red_flags_user_severity ON fred_red_flags(user_id, severity);
CREATE INDEX idx_red_flags_user_created ON fred_red_flags(user_id, created_at DESC);
CREATE INDEX idx_red_flags_category ON fred_red_flags(category);

-- Auto-update timestamp trigger
CREATE TRIGGER red_flags_updated_at_trigger
  BEFORE UPDATE ON fred_red_flags
  FOR EACH ROW
  EXECUTE FUNCTION update_fred_semantic_updated_at();  -- reuse existing trigger function

-- RLS policies
ALTER TABLE fred_red_flags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own red flags"
  ON fred_red_flags FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own red flags"
  ON fred_red_flags FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own red flags"
  ON fred_red_flags FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own red flags"
  ON fred_red_flags FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Service role manages red flags"
  ON fred_red_flags FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');
```

### TypeScript Types

```typescript
// lib/fred/risks/types.ts

export type RedFlagCategory = "financial" | "market" | "team" | "product" | "legal" | "execution";
export type RedFlagSeverity = "low" | "medium" | "high" | "critical";
export type RedFlagStatus = "active" | "acknowledged" | "resolved" | "dismissed";

export interface RedFlag {
  id: string;
  userId: string;
  sessionId: string | null;
  category: RedFlagCategory;
  severity: RedFlagSeverity;
  title: string;
  description: string;
  sourceQuote: string | null;
  suggestedAction: string | null;
  status: RedFlagStatus;
  detectedAt: Date;
  resolvedAt: Date | null;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface RedFlagInput {
  category: RedFlagCategory;
  severity: RedFlagSeverity;
  title: string;
  description: string;
  sourceQuote?: string;
  suggestedAction?: string;
  sessionId?: string;
  metadata?: Record<string, unknown>;
}

export interface RedFlagStats {
  total: number;
  bySeverity: Record<RedFlagSeverity, number>;
  byCategory: Record<RedFlagCategory, number>;
}
```

### Extended Chat Message Types

```typescript
// Extended FredMessage in use-fred-chat.ts
export interface FredMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  confidence?: "high" | "medium" | "low";
  action?: string;
  requiresApproval?: boolean;
  reasoning?: string;
  redFlags?: RedFlagData[];  // NEW
}

export interface RedFlagData {
  id: string;
  category: string;
  severity: string;
  title: string;
  description: string;
  suggestedAction?: string;
}

// Extended Message in chat-message.tsx
export interface Message {
  id: string;
  content: string;
  role: "user" | "assistant";
  timestamp: Date;
  redFlags?: RedFlagData[];  // NEW
}
```

## Implementation Strategy

### Plan 16-01: Detection Engine + Database + API + Chat Integration

**Scope**: Core backend infrastructure: detection logic, persistence, API, and chat route wiring.

1. **Migration**: Create `lib/db/migrations/036_red_flags.sql` with the table, indexes, trigger, and RLS policies defined above.

2. **Types**: Create `lib/fred/risks/types.ts` with all type definitions (RedFlag, RedFlagCategory, RedFlagSeverity, RedFlagStatus, RedFlagInput, RedFlagStats).

3. **DB Access Layer**: Create `lib/db/red-flags.ts` following the `fred-memory.ts` pattern -- `createRedFlag()`, `getActiveRedFlags()`, `updateRedFlagStatus()`, `getRedFlagStats()`, `findDuplicateFlag()`, and row transform functions.

4. **Detection Engine**: Create `lib/fred/risks/detection-engine.ts`:
   - Six category keyword dictionaries (e.g., financial: ["cash runway", "burn rate", "running out of money", "can't make payroll", "revenue declining", ...])
   - `detectRedFlags(validatedInput, synthesisResult, memoryContext, userId, sessionId)` main function
   - Consumes `SynthesisResult.risks` for pipeline-detected risks (maps likelihood/impact to severity)
   - Runs keyword pattern matching on `ValidatedInput.originalMessage` and `ValidatedInput.keywords`
   - Correlates negative sentiment + high urgency to escalate severity
   - Deduplicates against existing active flags for the user (same category + similar title)
   - Returns `RedFlagInput[]` for persistence

5. **API Routes**: Create `app/api/red-flags/route.ts` (GET + POST) and `app/api/red-flags/[id]/route.ts` (PATCH + DELETE). All require auth via `requireAuth()`.

6. **Chat Route Integration**: Modify `app/api/fred/chat/route.ts`:
   - After pipeline completes (in the `isComplete` block), call `detectRedFlags()` with the pipeline output
   - Persist detected flags via `createRedFlag()`
   - Emit a new `red_flags` SSE event before the `response` event
   - Include red flags in non-streaming JSON response

7. **Tests**: Create `lib/fred/risks/__tests__/detection-engine.test.ts` covering all 6 categories, severity mapping, deduplication, and edge cases.

### Plan 16-02: Inline Chat UI + Dashboard Widget

**Scope**: All frontend changes: chat message badges, hook extension, dashboard widget.

1. **useFredChat Hook**: Extend `FredMessage` interface with `redFlags?: RedFlagData[]`. Add `red_flags` case to the SSE event switch. When received, attach data to the last assistant message in `messages[]`.

2. **Red Flag Badge Component**: Create `components/chat/red-flag-badge.tsx` -- a severity-colored badge with expand/collapse for description and suggested action. Uses `Badge` from `@/components/ui/badge` as base with custom severity-colored variants. Uses `AlertTriangle` icon from lucide-react.

3. **Chat Message Update**: Extend the `Message` interface in `chat-message.tsx` with `redFlags`. Render `RedFlagBadge` components below the message bubble when present. Add a subtle left border or glow effect on messages with critical/high severity flags.

4. **Chat Interface Update**: Update the `Message` mapping in `chat-interface.tsx` to pass `redFlags` from `fredMessages` through to rendered `Message[]`.

5. **Dashboard Widget**: Create `components/dashboard/red-flags-widget.tsx` -- a Card component with severity summary, flag list, and status-change actions. Fetches from `GET /api/red-flags?status=active&limit=10`.

6. **Dashboard Integration**: Add `RedFlagsWidget` to `app/dashboard/page.tsx` between the Stats Grid and Quick Actions sections. Shows for all tiers (this is a Free feature).

## Risks & Considerations

### 1. False Positives
Keyword-based detection will produce false positives (e.g., "our burn rate is healthy" triggering a financial flag). **Mitigation**: Use sentiment correlation -- only flag when sentiment is negative or neutral. Include the source quote in the flag so founders can dismiss irrelevant detections. Start with conservative keyword lists and expand based on usage.

### 2. Deduplication Complexity
The same risk may be discussed across multiple conversations. Simple title matching is fragile. **Mitigation**: Deduplicate by (user_id, category, first 50 chars of title normalized to lowercase). When a duplicate is found, update `detected_at` and potentially escalate severity rather than creating a new row.

### 3. Performance Impact on Chat Pipeline
Adding a detection step after the pipeline could increase latency. **Mitigation**: The detection engine is pure rule-based (no AI calls) so it runs in <10ms. The database write is fire-and-forget (non-blocking). The SSE event adds minimal overhead.

### 4. Dashboard Layout Constraints
`app/dashboard/layout.tsx` has pre-commit hooks preventing modification. **Mitigation**: The red flags widget goes in `app/dashboard/page.tsx` (the overview content), not the layout. No layout changes needed.

### 5. Chat Message Interface Expansion
The `Message` interface in `chat-message.tsx` is used by `ChatInterface` which re-maps from `FredMessage`. Any new fields must be threaded through both types. **Mitigation**: Add `redFlags` as optional on both interfaces and handle the mapping explicitly in `chat-interface.tsx`.

### 6. No AI in Detection (v1)
Starting purely rule-based means detection quality depends on keyword dictionary comprehensiveness. **Mitigation**: Build category dictionaries from domain expertise. Plan for an optional AI classification pass in a future iteration (using `fast` model like gpt-4o-mini for cost efficiency).

### 7. SSE Event Ordering
The `red_flags` event must arrive before or alongside the `response` event so the client can attach flags to the message being rendered. **Mitigation**: Emit `red_flags` immediately before `response` in the streaming handler.

### 8. RLS and Service Role
The chat route uses `createServiceClient()` which bypasses RLS. The detection engine will also use the service client for persistence since it runs server-side. The REST API endpoints should use RLS-aware queries for security. **Mitigation**: Follow the pattern from `dashboard/stats/route.ts` -- use `createServiceClient()` with `userId` filtering in WHERE clauses.

### 9. Migration Sequencing
Migration 036 must be applied before the feature can work. **Mitigation**: Standard Supabase migration workflow. The table creation is additive (no existing tables modified), so no risk of data loss.

### 10. Free Tier Scope
All three requirements (FREE-01, FREE-02, FREE-03) are Free tier. No `FeatureLock` gating needed. The detection runs for all users regardless of tier.
