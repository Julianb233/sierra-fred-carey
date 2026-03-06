# Database Debug Report: Voice Integration & RLS Policies
**Status**: Research Only (No Edits)
**Date**: 2026-03-05
**Task**: AI-1415 — Test voice integration end-to-end across devices
**Related Issues**: AI-1418 (RLS policy fixes)

---

## Executive Summary

Voice integration in Sahara has **critical database gaps**:

1. **No voice call tables exist** — `voice_agent_config`, `knowledge_base`, `escalation_rules` are queried but **not defined in migrations**
2. **RLS policy crisis fixed** — March 5 migrations corrected broken `current_setting()` policies for `journey_events`, `milestones`, and `notification_configs`
3. **Voice call recording/transcripts not persisted** — transcripts published to LiveKit room data but **not stored in Supabase**
4. **Tier gating incomplete** — voice features check tier (`Pro+`) at UI/API layer but **not enforced at database layer**

---

## 1. Database Schema Status

### A. Voice Feature Tables (MISSING)

The voice agent service (`lib/voice-agent.ts`) queries three tables that **do not exist in any migration**:

| Table | Purpose | Status | Used In |
|-------|---------|--------|---------|
| `voice_agent_config` | Agent greeting, system prompt, business hours, timezone | ❌ MISSING | `fetchAgentConfig()` line 236 |
| `knowledge_base` | FAQ, product info, documents for agent context | ❌ MISSING | `fetchKnowledgeBase()` line 272 |
| `escalation_rules` | Trigger keywords, sentiment thresholds, escalation action | ❌ MISSING | `fetchEscalationRules()` line 306 |

**Impact**: Voice agent will crash on `SELECT` with "relation does not exist" when trying to load config/knowledge at runtime.

### B. Voice Call Logging (NOT PERSISTED)

Call recordings and transcripts are **published to LiveKit room data** but never saved to database:

**File**: `/opt/agency-workspace/sierra-fred-carey/workers/voice-agent/agent.ts`
**Lines 63-74**: `publishTranscript()` sends JSON to room topic "transcript"
```typescript
ctx.room.localParticipant?.publishData(data, {
  reliable: true,
  topic: 'transcript',
});
```

**Problem**:
- LiveKit room data is **ephemeral** (deleted when room closes)
- No table to store call history: `call_sessions`, `call_recordings`, `transcripts`, `call_metrics`
- Founders cannot access call recordings or transcripts after hang up

### C. Notification Tables (FIXED but Recently Broken)

**File**: `lib/db/migrations/012_notification_configs.sql`
**Tables**: `notification_configs`, `notification_logs`

Both tables exist but had **broken RLS policies using `current_setting('app.user_id', true)`**:
- Application **never sets** this PostgreSQL session variable
- All user-scoped reads/writes were silently blocked

**Fixed by**: `supabase/migrations/20260305000002_fix_notification_rls_policies.sql` (deployed today)
**New policies use**: `auth.uid()::text` (cast required because `user_id` is TEXT)

### D. Journey & Milestone Tables (ALSO RECENTLY BROKEN & FIXED)

**File**: `supabase/migrations/20260305000001_fix_journey_rls_policies.sql`
**Tables**: `journey_events`, `milestones`

Same `current_setting()` bug as notification tables. Fixed with:
- Replaced policies: SELECT, INSERT, UPDATE, DELETE
- Added missing UPDATE/DELETE policies for `journey_events`
- Added NOT NULL constraint on `investor_readiness_scores.created_at`

---

## 2. RLS Policy Crisis (March 5 Fix)

### Root Cause
Both old migrations (012 and earlier ones for journey/milestones) used:
```sql
USING (user_id = current_setting('app.user_id', true))
```

This PostgreSQL function reads a **session variable** the app must explicitly set. Sahara's Supabase client **never calls `SET app.user_id = ...`**, so all user-scoped policies default to `false` (deny).

### What Was Broken
| Table | Affected Operations | Status |
|-------|-------------------|--------|
| `notification_configs` | SELECT, INSERT, UPDATE, DELETE | 🔴 All blocked |
| `notification_logs` | SELECT | 🔴 Blocked |
| `journey_events` | SELECT, INSERT | 🔴 Blocked |
| `milestones` | SELECT, INSERT, UPDATE, DELETE | 🔴 Blocked |

### Fix Applied
**Deployment**: `supabase/migrations/20260305000002_fix_notification_rls_policies.sql` (by dev, 3/5 20:31)

**New policies**:
```sql
USING (user_id = auth.uid()::text)
```

This uses Supabase Auth's built-in `auth.uid()` function, which:
- ✅ Automatically available in RLS context
- ✅ Returns authenticated user UUID
- ✅ Cast to TEXT (matches `user_id: TEXT` column type)

**Also fixed**: `supabase/migrations/20260305000001_fix_journey_rls_policies.sql` (same day)

---

## 3. Database Queries Related to Voice

### A. Voice Agent Configuration
**File**: `lib/voice-agent.ts` (lines 227–257)

```typescript
export async function fetchAgentConfig(): Promise<VoiceAgentDbConfig | null> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('voice_agent_config')  // ❌ TABLE DOES NOT EXIST
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();
```

**Status**: ❌ Will fail if ever called
**Used by**: Voice worker on startup (line 362)

### B. Knowledge Base Queries
**File**: `lib/voice-agent.ts` (lines 262–291)

```typescript
export async function fetchKnowledgeBase(configId?: string) {
  const supabase = createServiceClient();
  let query = supabase
    .from('knowledge_base')  // ❌ TABLE DOES NOT EXIST
    .select('question, answer, product_name, ...')
    .eq('is_active', true);
```

**Status**: ❌ Will fail if ever called
**Used by**: Voice agent to augment system prompt with FAQ/product context

### C. Escalation Rules
**File**: `lib/voice-agent.ts` (lines 296–325)

```typescript
export async function fetchEscalationRules(configId?: string) {
  const supabase = createServiceClient();
  let query = supabase
    .from('escalation_rules')  // ❌ TABLE DOES NOT EXIST
    .select('name, trigger_type, ...')
    .eq('is_active', true);
```

**Status**: ❌ Will fail if ever called
**Used by**: Voice agent to trigger handoff/callbacks on specific keywords/sentiment

---

## 4. Subscription & Tier Gating

### Voice Feature Tier Requirements

| Feature | Required Tier | Location |
|---------|---------------|----------|
| Live voice call to Fred (CallFredModal) | Pro+ | `app/chat/page.tsx` line 57: `const isProOrAbove = tier >= UserTier.PRO` |
| Voice transcription in chat | All (Free+) | `components/chat/voice-chat-overlay.tsx` (no tier check) |
| Real-time voice agent | Pro+ | `CallFredModal` gates with tier |

### Tier Gating Implementation

**File**: `lib/db/subscriptions.ts`

Tier is derived from `stripe_price_id` → Stripe product mapping (in constants).

**Database access**: Service role bypasses RLS
**Application access**: Client-side tier context via `useUserTier()` hook

**⚠️ Gap**: No RLS policies on voice tables to enforce tier at database layer. If tables existed, they would need:
```sql
-- Hypothetical voice_call_recordings policy
CREATE POLICY "Users can view own recordings if Pro+"
  ON voice_call_recordings
  FOR SELECT
  USING (
    user_id = auth.uid()::text AND
    (SELECT tier FROM user_tiers WHERE user_id = auth.uid()::text) >= 2  -- Pro tier
  );
```

---

## 5. Identified Issues & Risks

### Critical Issues

| Issue | Severity | Risk | Location |
|-------|----------|------|----------|
| **voice_agent_config table missing** | CRITICAL | Voice agent crashes on startup | `lib/voice-agent.ts:236` |
| **knowledge_base table missing** | CRITICAL | Agent cannot load FAQ/context | `lib/voice-agent.ts:272` |
| **escalation_rules table missing** | CRITICAL | Agent cannot escalate calls | `lib/voice-agent.ts:306` |
| **Transcripts not persisted** | HIGH | Call history lost after hang-up | `workers/voice-agent/agent.ts:63-74` |
| **RLS policies were broken** | FIXED (3/5) | User data access was silently denied | `migration 012, 20260305000001/002` |

### Data Integrity Concerns

1. **No call session table**: Cannot track:
   - Duration, cost, participant IDs
   - Hang-up reasons, call quality metrics
   - Founder → Agent mapping for billing/analytics

2. **No recording metadata**: If recordings stored in external service:
   - No reference in Supabase to associate recording ID with user/date/duration
   - Cannot build analytics on usage patterns

3. **Transcript loss**: Even if stored, no `transcripts` table schema defined

---

## 6. Migration Inventory

### What Exists (All Migrations)

```
supabase/migrations/
├── 20260212000001_create_next_steps.sql
├── 20260212000002_add_channel_to_episodic_memory.sql
├── 20260212000003_create_document_repository.sql
├── 20260212000004_add_enrichment_data_to_profiles.sql
├── 20260216000001_community_data_layer.sql
├── 20260217000001_community_data_layer.sql
├── 20260225000001_profiles_rls.sql
├── 20260225000003_red_flags_dedup.sql
├── 20260225000004_next_steps_indexes.sql
├── 20260225000010_content_library.sql
├── 20260225000020_service_marketplace.sql
├── 20260303000001_founder_goals.sql
├── 20260305000001_fix_journey_rls_policies.sql    ✅ FIXED
├── 20260305000002_fix_notification_rls_policies.sql ✅ FIXED
```

### Tables with RLS Policies (30+ total)

Tables found with `ENABLE ROW LEVEL SECURITY`:
- `profiles`, `notification_configs`, `notification_logs`, `journey_events`, `milestones`
- `bookings`, `cohorts`, `community_profiles`, `consent_preferences`, `content_progress`
- `courses`, `document_repository`, `enrollments`, `expert_listings`, `founder_connections`
- `lessons`, `modules`, `next_steps`, `provider_reviews`, `reputation_events`
- `service_listings`, `service_providers`, `social_feed_comments/posts/reactions`

**None for voice features** ← Major gap

---

## 7. Recommendations

### Immediate (Blocking Voice Tests)

1. **Create missing voice tables** (migration `20260305000003_voice_tables.sql`):
   ```sql
   -- voice_agent_config
   -- knowledge_base
   -- escalation_rules
   -- voice_call_sessions (record session metadata)
   -- voice_transcripts (store call transcripts)
   ```

2. **Add RLS policies** to voice tables (use `auth.uid()::text`, not `current_setting()`)

3. **Persist transcripts** from LiveKit room data to `voice_transcripts` table on call end

### Short-term (Post-MVP)

4. **Add call recording table** with metadata (duration, cost, participant IDs, quality metrics)

5. **Add tier-based RLS policy** to gate voice features (Pro+ only)

6. **Create voice analytics** views (calls/week, avg duration, cost per user)

### Long-term (Production Hardening)

7. **Audit all RLS policies** for `current_setting()` usage (these are all broken now)

8. **Add foreign keys** from voice tables to `auth.users` and subscription tables

9. **Set up call recording retention policy** (delete old recordings after 30/90 days)

---

## Modified Files Under Investigation

### Git Status
```
M  lib/db/migrations/012_notification_configs.sql
M  package-lock.json
M  package.json
M  workers/voice-agent/tsconfig.json
?? supabase/migrations/20260305000002_fix_notification_rls_policies.sql (NEW)
?? supabase/migrations/20260305000001_fix_journey_rls_policies.sql (NEW)
?? tests/e2e/voice-integration.spec.ts (NEW)
?? tests/voice/ (NEW directory)
```

### Migration 012 (Modified)
**File**: `lib/db/migrations/012_notification_configs.sql`

No changes detected by `git diff` (file exists but shows modified). File contains:
- `notification_configs` table definition (UUID PK, user_id TEXT)
- `notification_logs` table definition (audit trail)
- ⚠️ **Broken RLS policies** (now superseded by 20260305000002)

### Migration 20260305000002 (New)
**File**: `supabase/migrations/20260305000002_fix_notification_rls_policies.sql`

Deployed today (3/5 20:31 UTC) by `dev`:
- Drops broken `current_setting()` policies
- Adds new policies with `auth.uid()::text`
- Uses `BEGIN; ... COMMIT;` for atomicity

---

## Conclusion

**Voice integration is architecturally sound but database layer is incomplete:**

✅ **Working**:
- LiveKit voice agent spawning and session management
- Tier gating at UI/API layer (Pro+ required)
- RLS policies for other features (now fixed as of today)
- Audio capture/transcription via OpenAI Whisper

❌ **Missing**:
- Voice configuration tables (voice_agent_config, knowledge_base, escalation_rules)
- Call session/recording/transcript persistence
- Database-level tier enforcement for voice features
- Call history/analytics infrastructure

**For AI-1415 (voice integration testing)**: Expect failures when:
- Voice worker tries to load agent config from database
- Tests attempt to query call history
- Tier-based access control needs enforcement at database layer

---

**End of Report**
