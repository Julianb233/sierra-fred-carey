# Funnel → Full Platform Data Migration

> **Linear:** AI-2276
> **Owner:** Alessandro De La Torre
> **Last updated:** 2026-03-11

## Overview

The funnel version (u.joinsahara.com) collects user data in browser localStorage and periodically syncs it to the main platform via `/api/funnel/sync`. When a funnel user signs up for the full Sahara platform, their data must be migrated to the full schema without loss.

## Architecture

```
┌──────────────────────┐     POST /api/funnel/sync     ┌──────────────────────┐
│   Funnel (Vite SPA)  │ ─────────────────────────────→│   Sahara Platform    │
│                      │                                │                      │
│  localStorage:       │                                │  Supabase:           │
│  - chat messages     │                                │  - funnel_sessions   │
│  - journey progress  │                                │  (staging table)     │
│  - session ID        │                                │                      │
└──────────────────────┘                                └──────────┬───────────┘
                                                                   │
                                                        On user signup:
                                                        migrate_funnel_session()
                                                                   │
                                                                   ▼
                                                        ┌──────────────────────┐
                                                        │  Full Platform       │
                                                        │  - profiles          │
                                                        │  - chat_messages     │
                                                        │  - milestones        │
                                                        │  - journey_events    │
                                                        └──────────────────────┘
```

## Funnel Data Model

| Storage Key | Type | Fields |
|---|---|---|
| `sahara-funnel-chat` | `ChatMessage[]` | `id`, `role` (user/assistant), `content`, `timestamp` |
| `sahara-funnel-journey` | `Record<string, boolean>` | Keys: `"{stageId}-{milestoneIndex}"`, values: completion status |
| `sahara-funnel-session` | `string` | UUID session identifier (sessionStorage) |

### Sync Payload (POST /api/funnel/sync)

```typescript
{
  sessionId: string           // UUID identifying the anonymous session
  chatMessages: ChatMessage[] // Full chat history
  journeyProgress: Record<string, boolean>  // Stage-milestone completion map
  funnelVersion: '1.0'       // Schema version for forward compatibility
  exportedAt: string          // ISO 8601 timestamp
}
```

### Journey Stage IDs → Milestone Indexes

| Stage ID | Stage Name | Milestones (0-3) |
|---|---|---|
| `idea` | Idea | Define problem, Identify customer, Validate demand, Business brief |
| `build` | Build | Build MVP, 10 customers, Key metrics, Pitch deck draft |
| `launch` | Launch | Launch publicly, 10%+ MoM growth, $1K MRR / 100 users, GTM strategy |
| `scale` | Scale | Hire team, $10K+ MRR, Investor readiness, Investor pipeline |
| `fund` | Fund | Finalize pitch deck, Due diligence prep, Secure term sheet, Close round |

## Full Platform Target Tables

### 1. `funnel_sessions` (NEW staging table)

Stores raw funnel sync data before user signs up. Acts as the migration source.

| Column | Type | Maps From |
|---|---|---|
| `id` | UUID PK | auto-generated |
| `session_id` | VARCHAR(255) UNIQUE | `payload.sessionId` |
| `chat_messages` | JSONB | `payload.chatMessages` |
| `journey_progress` | JSONB | `payload.journeyProgress` |
| `funnel_version` | VARCHAR(10) | `payload.funnelVersion` |
| `migrated_to_user_id` | UUID NULL | Set when user signs up |
| `migrated_at` | TIMESTAMPTZ NULL | Set when migration completes |
| `last_synced_at` | TIMESTAMPTZ | `payload.exportedAt` |
| `created_at` | TIMESTAMPTZ | auto |
| `updated_at` | TIMESTAMPTZ | auto |

### 2. `chat_messages` (existing)

| Platform Column | Funnel Source | Transform |
|---|---|---|
| `user_id` | `payload.sessionId` → authenticated `user.id` | Replaced on migration |
| `session_id` | `payload.sessionId` | Preserved for traceability |
| `role` | `message.role` | Direct map (`'user'` / `'assistant'`) |
| `content` | `message.content` | Direct copy |
| `created_at` | `message.timestamp` | Parse ISO string → TIMESTAMP |

### 3. `milestones` (existing)

| Platform Column | Funnel Source | Transform |
|---|---|---|
| `user_id` | authenticated `user.id` | Set on migration |
| `title` | stage milestone title | Lookup from constants |
| `description` | stage milestone description | Lookup from constants |
| `category` | stage ID | Map: idea→product, build→product, launch→growth, scale→growth, fund→fundraising |
| `status` | `journeyProgress[key]` | `true` → `'completed'`, `false`/missing → `'pending'` |
| `completed_at` | migration timestamp | Set if completed |
| `metadata` | — | `{ source: 'funnel', funnel_version: '1.0' }` |

### 4. `journey_events` (existing)

One event per completed milestone at migration time:

| Platform Column | Funnel Source | Transform |
|---|---|---|
| `user_id` | authenticated `user.id` | Set on migration |
| `event_type` | — | `'milestone_achieved'` |
| `event_data` | stage + milestone info | `{ source: 'funnel_migration', stage, milestone }` |

## Data Transformations

### Journey Progress Key Parsing

```
"idea-0" → stage: "idea", milestoneIndex: 0 → "Define the problem you solve"
"build-2" → stage: "build", milestoneIndex: 2 → "Establish key metrics & KPIs"
```

### Stage → Category Mapping

| Funnel Stage | Platform Category |
|---|---|
| `idea` | `product` |
| `build` | `product` |
| `launch` | `growth` |
| `scale` | `growth` |
| `fund` | `fundraising` |

### Chat Message Timestamp

Funnel stores timestamps as `Date` objects serialized to JSON (ISO strings). The migration must parse these back to PostgreSQL `TIMESTAMP` values.

## Migration Process

### Phase 1: Sync (automatic, ongoing)
1. Funnel app POSTs to `/api/funnel/sync` every 30s and on page unload
2. Platform upserts data into `funnel_sessions` table (keyed by `session_id`)

### Phase 2: Migrate (triggered on signup)
1. User completes signup on full platform (gets `auth.users.id`)
2. Platform calls `migrate_funnel_session(sessionId, userId)`
3. Migration function:
   a. Reads `funnel_sessions` row by `session_id`
   b. Inserts chat messages into `chat_messages` with new `user_id`
   c. Creates `milestones` records from journey progress
   d. Logs `journey_events` for completed milestones
   e. Marks `funnel_sessions.migrated_to_user_id` and `migrated_at`

### Phase 3: Verify
1. Compare counts: funnel chat messages = platform chat messages for user
2. Compare journey progress: all completed milestones exist in platform
3. Verify no duplicate migrations (idempotency via `migrated_to_user_id` check)

## Idempotency & Safety

- Migration checks `migrated_to_user_id IS NULL` before proceeding
- Re-running migration for same session is a no-op (returns existing user)
- Chat messages are checked for duplicates by `session_id` + `content` + `created_at`
- All operations wrapped in a transaction-like sequence with rollback on failure

## Error Handling

| Scenario | Handling |
|---|---|
| Session not found | Return error, user starts fresh |
| Partial migration failure | Log error, mark session as failed, allow retry |
| Duplicate migration attempt | Return success with existing user ID |
| Invalid chat message data | Skip message, log warning, continue |
| Invalid journey key format | Skip key, log warning, continue |
