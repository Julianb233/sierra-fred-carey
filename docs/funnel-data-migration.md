# Funnel → Platform Data Migration

**Linear:** AI-1903
**Owner:** Alessandro De La Torre
**Date:** 2026-03-09

## Overview

The Sahara funnel (`u.joinsahara.com`) is a lightweight Vite + React app that lets visitors chat with Fred and track their founder journey — without creating an account. When a visitor signs up for the full Sahara platform (`joinsahara.com`), all their funnel data must migrate seamlessly.

## Architecture

```
┌─────────────────────────┐     ┌──────────────────────────┐
│   Funnel (Vite/React)   │     │  Platform (Next.js)      │
│   u.joinsahara.com      │     │  joinsahara.com          │
│                         │     │                          │
│ localStorage:           │     │ Supabase tables:         │
│ ├─ sahara-funnel-chat   │────▶│ ├─ funnel_leads (staging) │
│ ├─ sahara-funnel-journey│     │ ├─ fred_episodic_memory   │
│ sessionStorage:         │     │ ├─ founder_goals          │
│ └─ sahara-funnel-session│     │ ├─ journey_events         │
│                         │     │ └─ profiles               │
└─────────────────────────┘     └──────────────────────────┘
```

## Migration Flow

### Step 1: Periodic Sync (Anonymous)

The funnel periodically POSTs its localStorage data to `POST /api/funnel/sync`:

```json
{
  "sessionId": "uuid-from-session-storage",
  "chatMessages": [
    { "id": "msg-1", "role": "user", "content": "...", "timestamp": "..." },
    { "id": "msg-2", "role": "assistant", "content": "...", "timestamp": "..." }
  ],
  "journeyProgress": {
    "idea-0": true,
    "idea-1": true,
    "build-0": false
  },
  "funnelVersion": "1.0"
}
```

This upserts a row in `funnel_leads` (staging table). No auth required.

### Step 2: Link on Sign-up

When the visitor creates an account, the sign-up flow passes the `sessionId` to `POST /api/funnel/migrate`. This links `funnel_leads.user_id` to the new auth user.

### Step 3: Migrate to Platform Tables

`migrateFunnelData(userId)` processes all un-migrated leads:

| Source | Target | Transform |
|--------|--------|-----------|
| `chatMessages[]` | `fred_episodic_memory` | Each message → episodic row with `channel='funnel'`, `event_type='conversation'` |
| `journeyProgress` (completed) | `founder_goals` | Milestone → goal row with correct `stage`, `category`, `completed=true` |
| `journeyProgress` (completed) | `journey_events` | Milestone → `milestone_achieved` event |
| `sessionId` | `profiles.enrichment_data` | Stored as `funnel_sessions[]` for audit trail |

### Step 4: Mark Migrated

After successful migration, `funnel_leads.migrated = true` prevents re-processing.

## Data Mapping Detail

### Chat Messages → `fred_episodic_memory`

| Funnel Field | Platform Column | Notes |
|-------------|----------------|-------|
| `id` | `content.originalId` | Preserved for deduplication |
| `role` | `content.role` | `'user'` or `'assistant'` |
| `content` | `content.content` | Raw text |
| `timestamp` | `created_at` | Original funnel timestamp |
| — | `event_type` | Always `'conversation'` |
| — | `channel` | Always `'funnel'` |
| — | `importance_score` | `0.6` for user, `0.4` for assistant |
| — | `metadata.migratedFrom` | `'funnel'` |
| — | `content.source` | `'funnel'` |

### Journey Progress → `founder_goals`

| Funnel Key | Platform Columns | Notes |
|-----------|-----------------|-------|
| `idea-0` → `idea-3` | `stage='idea'`, `category='validation'` | 4 milestones |
| `build-0` → `build-3` | `stage='build'`, `category='product'` | 4 milestones |
| `launch-0` → `launch-3` | `stage='launch'`, `category='growth'` | 4 milestones |
| `scale-0` → `scale-3` | `stage='scale'`, `category='strategy'` | 4 milestones |
| `fund-0` → `fund-3` | `stage='fund'`, `category='fundraising'` | 4 milestones |

Stage → Category mapping:
- `idea` → `validation`
- `build` → `product`
- `launch` → `growth`
- `scale` → `strategy`
- `fund` → `fundraising`

### Journey Progress → `journey_events`

Each completed milestone generates:
```json
{
  "event_type": "milestone_achieved",
  "event_data": {
    "stage": "idea",
    "milestone": "Define the problem you solve",
    "milestoneIndex": 0,
    "source": "funnel_migration"
  }
}
```

## Database Schema

### `funnel_leads` (new staging table)

```sql
CREATE TABLE funnel_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  chat_messages JSONB NOT NULL DEFAULT '[]',
  journey_progress JSONB NOT NULL DEFAULT '{}',
  migrated BOOLEAN NOT NULL DEFAULT FALSE,
  migrated_at TIMESTAMPTZ,
  funnel_version TEXT NOT NULL DEFAULT '1.0',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### RLS Policies

- **Service role:** Full access (migrations run server-side)
- **Authenticated users:** Can read their own linked leads
- **Anonymous:** Can insert leads (funnel visitors aren't authenticated)

## Idempotency & Safety

- **Upsert on session_id:** Repeated syncs update the same row
- **migrated flag:** Prevents re-processing the same lead
- **Batch inserts:** Chat messages are inserted in batches of 50
- **Non-fatal warnings:** Individual item failures don't abort the migration
- **ON DELETE SET NULL:** If a user is deleted, funnel leads are preserved but unlinked

## API Endpoints

### `POST /api/funnel/sync`
- **Auth:** None (anonymous)
- **Body:** `{ sessionId, chatMessages, journeyProgress, funnelVersion }`
- **Response:** `{ success: true, id: "uuid" }`

### `POST /api/funnel/migrate`
- **Auth:** Required (Supabase JWT)
- **Body:** `{ sessionId? }` (optional, to link before migrating)
- **Response:** `MigrationResult` (see types)

## Testing

Run the migration tests:
```bash
npm run test -- lib/db/__tests__/funnel-migration.test.ts
```

Tests validate:
- Shared data model types and constants
- Data mapping transformations
- Edge cases (empty payloads, special characters, large histories)
- Migration result shapes

## Future Considerations

1. **Funnel Analytics:** The `funnel_leads` table enables funnel-to-signup conversion tracking
2. **Embedding Generation:** Migrated chat messages will get embeddings via the existing fire-and-forget mechanism
3. **Real-time Sync:** Consider WebSocket-based sync for immediate server persistence
4. **GDPR/Privacy:** Anonymous funnel data should be purged after 90 days if never linked to a user
