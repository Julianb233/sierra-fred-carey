# Phase 66: Content Library — Schema & Backend - Research

**Researched:** 2026-02-25
**Domain:** Mux Video, Supabase PostgreSQL, Next.js App Router, Tier-Gated Content
**Confidence:** HIGH (Mux SDK, tier system, RLS patterns all verified against codebase and official docs)

---

## Summary

Phase 66 builds the backend foundation for a tier-gated video course library using Mux for video
hosting. The existing codebase already has the full tier system (`free` / `pro` / `studio`) wired
up in `lib/api/tier-middleware.ts` and `lib/stripe/config.ts`, so content gating should reuse that
infrastructure rather than building anything new. The actual plan names in production are `free`,
`fundraising`, and `venture_studio` — not `free/pro/studio`. The planner must use the existing
`UserTier` enum and `requireTier()` / `checkTierForRequest()` wrappers.

Mux is not yet installed. Three packages are approved: `@mux/mux-node` (v12.8.1, server SDK),
`@mux/mux-player-react` (v3.11.4, Phase 67 player), and `@mux/mux-uploader-react` (Phase 67
uploader). Phase 66 only needs `@mux/mux-node` on the server. The upload workflow is:
server creates a signed upload URL → admin client PUTs the file → Mux fires webhooks →
backend associates the asset with the lesson row.

FRED's `recommendContentTool` in `lib/fred/tools/content-recommender.ts` is a stub that returns
`coming_soon`. Phase 66 must implement the database queries that stub will call; Phase 66 should
expose a search/filter function the stub can delegate to without changing the tool's interface.

**Primary recommendation:** Build 5 tables (courses, modules, lessons, enrollments,
content_progress), store `mux_asset_id` and `mux_playback_id` per lesson, gate content via RLS
using a helper function that joins `user_subscriptions`, and serve signed JWT playback tokens from
a dedicated API route.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @mux/mux-node | 12.8.1 | Server SDK: direct uploads, asset management, JWT signing, webhook verification | Official Mux Node SDK with full TypeScript types |
| @supabase/supabase-js | ^2.89.0 (installed) | Database + RLS | Already in project |
| stripe | ^20.1.0 (installed) | Subscription tier source of truth | Already in project |
| zod | ^4.3.6 (installed) | Request validation | Already in project |

### Supporting (Phase 66 backend only)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @mux/mux-player-react | 3.11.4 | Video playback component | Phase 67 frontend only |
| @mux/mux-uploader-react | latest | Drag-and-drop upload UI | Phase 67 frontend only |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Mux signed playback | Cloudflare Stream | Mux already approved; signed playback tokens are the right call for tier gating |
| RLS for tier gating | API-layer-only checks | RLS provides defense-in-depth; both should be used |
| `requireTier()` wrapper | Custom auth middleware | Reuse existing `lib/api/tier-middleware.ts` — do not reinvent |

**Installation (Phase 66 only needs server SDK):**
```bash
npm install @mux/mux-node
```

---

## Architecture Patterns

### Recommended Project Structure
```
supabase/migrations/
└── 20260225000010_content_library.sql   # All 5 tables + RLS + indexes

app/api/
├── content/
│   ├── route.ts                          # GET: course catalog with filtering
│   └── [courseId]/
│       ├── route.ts                      # GET: single course + modules
│       └── lessons/[lessonId]/
│           └── playback-token/route.ts   # GET: generate signed Mux JWT
├── admin/
│   └── content/
│       ├── route.ts                      # POST: create course; GET: list all
│       ├── [courseId]/route.ts           # PATCH/DELETE: edit course
│       ├── [courseId]/modules/route.ts   # POST: add module
│       ├── [courseId]/modules/[moduleId]/lessons/route.ts  # POST: add lesson
│       └── upload-url/route.ts          # POST: create Mux direct upload URL
└── mux/
    └── webhooks/route.ts                 # POST: Mux webhook handler

lib/
├── mux/
│   ├── client.ts                         # Mux singleton (new Mux())
│   ├── uploads.ts                        # createDirectUpload(), getAsset()
│   └── tokens.ts                         # signPlaybackToken(playbackId, userId)
└── db/
    └── content.ts                        # DB helpers: getCatalog(), getLesson()
```

### Pattern 1: Mux Client Singleton

Initialize once; reads `MUX_TOKEN_ID`, `MUX_TOKEN_SECRET`, `MUX_WEBHOOK_SECRET`,
`MUX_SIGNING_KEY_ID`, `MUX_SIGNING_PRIVATE_KEY` from environment.

```typescript
// lib/mux/client.ts
// Source: https://github.com/muxinc/mux-node-sdk/blob/master/README.md
import Mux from "@mux/mux-node";

export const mux = new Mux({
  tokenId: process.env.MUX_TOKEN_ID!,
  tokenSecret: process.env.MUX_TOKEN_SECRET!,
  webhookSecret: process.env.MUX_WEBHOOK_SECRET,
});
```

### Pattern 2: Admin Creates Direct Upload URL

The admin API creates a signed upload URL; the admin client (mux-uploader-react in Phase 67)
PUTs directly to that URL. The server never proxies video bytes.

```typescript
// app/api/admin/content/upload-url/route.ts
// Source: https://www.mux.com/docs/guides/upload-files-directly
import { mux } from "@/lib/mux/client";
import { isAdminSession } from "@/lib/auth/admin";

export async function POST(req: NextRequest) {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { lessonId } = await req.json();

  const upload = await mux.video.uploads.create({
    cors_origin: process.env.NEXT_PUBLIC_APP_URL!,
    new_asset_settings: {
      playback_policies: ["signed"],   // IMPORTANT: signed, not public
      passthrough: lessonId,           // Links Mux asset back to lessons row
    },
  });

  return NextResponse.json({ uploadId: upload.id, uploadUrl: upload.url });
}
```

**Key decisions baked in:**
- `playback_policies: ["signed"]` — all content videos require a valid JWT to play.
  This is the correct default for tier-gated content. Free preview content can use `"public"`.
- `passthrough: lessonId` — when the `video.asset.ready` webhook fires, `data.passthrough`
  gives the lessonId to update the DB row.

### Pattern 3: Mux Webhook Handler

```typescript
// app/api/mux/webhooks/route.ts
// Source: Mux SDK README + https://www.mux.com/docs/core/listen-for-webhooks
import { mux } from "@/lib/mux/client";
import { sql } from "@/lib/db/supabase-sql";

export async function POST(req: NextRequest) {
  const body = await req.text();           // MUST be raw text, not parsed JSON
  const headers = req.headers;

  let event;
  try {
    event = mux.webhooks.unwrap(body, headers);  // verifies HMAC-SHA256 signature
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  if (event.type === "video.asset.ready") {
    const assetId = event.object.id;
    const playbackId = event.data.playback_ids?.[0]?.id;
    const lessonId = event.data.passthrough;   // set when creating upload

    if (lessonId && assetId && playbackId) {
      await sql`
        UPDATE lessons
        SET mux_asset_id = ${assetId},
            mux_playback_id = ${playbackId},
            mux_status = 'ready',
            updated_at = now()
        WHERE id = ${lessonId}::uuid
      `;
    }
  }

  if (event.type === "video.upload.asset_created") {
    // Optionally update status to 'processing'
    const lessonId = event.data.passthrough;
    if (lessonId) {
      await sql`
        UPDATE lessons SET mux_status = 'processing' WHERE id = ${lessonId}::uuid
      `;
    }
  }

  return NextResponse.json({ ok: true });
}
```

**Critical:** `await req.text()` before any JSON parsing. Mux webhook signature verification
requires the raw request body string. If you call `req.json()` first, the signature check fails.

### Pattern 4: Signed Playback Token Generation

```typescript
// app/api/content/[courseId]/lessons/[lessonId]/playback-token/route.ts
// Source: https://www.mux.com/docs/guides/secure-video-playback
import { mux } from "@/lib/mux/client";
import { checkTierForRequest } from "@/lib/api/tier-middleware";
import { UserTier } from "@/lib/constants";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ courseId: string; lessonId: string }> }
) {
  const { lessonId } = await params;

  // Fetch lesson to find required tier
  const lesson = await getLessonById(lessonId);
  if (!lesson) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Enforce tier access
  const requiredTier = tierFromString(lesson.tier_required); // "free"|"pro"|"studio"
  const tierCheck = await checkTierForRequest(req, requiredTier);
  if (!tierCheck.allowed) {
    return NextResponse.json({ error: "Upgrade required", upgradeUrl: "/pricing" }, { status: 403 });
  }

  // Generate short-lived signed token (1 hour)
  const token = await mux.jwt.signPlaybackId(lesson.mux_playback_id, {
    expiration: "1h",
    type: "playback",
  });

  return NextResponse.json({ token, playbackId: lesson.mux_playback_id });
}
```

### Pattern 5: Content Catalog API with Filtering

```typescript
// app/api/content/route.ts
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const stage = searchParams.get("stage");     // "idea"|"pre-seed"|"seed"|"series-a"|"growth"
  const topic = searchParams.get("topic");
  const tierFilter = searchParams.get("tier");  // show only courses user can access

  const courses = await sql`
    SELECT
      c.id, c.title, c.description, c.stage, c.topic,
      c.tier_required, c.thumbnail_url, c.is_published,
      COUNT(l.id) AS lesson_count
    FROM courses c
    LEFT JOIN modules m ON m.course_id = c.id
    LEFT JOIN lessons l ON l.module_id = m.id
    WHERE c.is_published = true
      AND (${stage}::text IS NULL OR c.stage = ${stage})
      AND (${topic}::text IS NULL OR c.topic = ${topic})
    GROUP BY c.id
    ORDER BY c.created_at DESC
  `;

  return NextResponse.json({ courses });
}
```

Note: The catalog API does NOT gate by tier — it returns all published courses with their
`tier_required` field so the frontend can show upgrade prompts. The actual content (video tokens)
is gated. This is the standard pattern: catalog is open, playback is gated.

### Anti-Patterns to Avoid

- **Raw request body for webhooks:** Never call `req.json()` before passing body to
  `mux.webhooks.unwrap()`. The signature check requires the raw string.
- **Public playback policy for paid content:** Gated lessons must use `"signed"` playback policy.
  Only free-tier preview content should use `"public"`.
- **Long-lived playback tokens:** Do not issue tokens without expiration. Use `"1h"` for
  lesson viewing, not permanent tokens.
- **Duplicating tier logic:** Do not write custom tier checks. Use `checkTierForRequest()` and
  `requireTier()` from `lib/api/tier-middleware.ts`.
- **Building a custom video upload proxy:** Never stream video through the Next.js server.
  Mux direct upload means the client PUTs to the Mux URL, not your server.

---

## Database Schema Design

### Table: courses

```sql
CREATE TABLE IF NOT EXISTS courses (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title           TEXT NOT NULL,
  description     TEXT NOT NULL DEFAULT '',
  slug            TEXT NOT NULL UNIQUE,
  thumbnail_url   TEXT,
  stage           TEXT,   -- "idea"|"pre-seed"|"seed"|"series-a"|"growth"|null (all stages)
  topic           TEXT,   -- "fundraising"|"go-to-market"|"product"|"hiring"|etc
  tier_required   TEXT NOT NULL DEFAULT 'free'
                  CHECK (tier_required IN ('free', 'pro', 'studio')),
  is_published    BOOLEAN NOT NULL DEFAULT false,
  sort_order      INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

**Note on `tier_required`:** Use the string names `'free'`, `'pro'`, `'studio'` to match
`ModelTier` in `lib/ai/tier-routing.ts`. The normalizeTier() function in that file translates
`'fundraising'` → `'pro'` and `'venture_studio'` → `'studio'`, but for content gating use the
normalized form directly to avoid confusion.

### Table: modules

```sql
CREATE TABLE IF NOT EXISTS modules (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id   UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### Table: lessons

```sql
CREATE TABLE IF NOT EXISTS lessons (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id        UUID NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
  title            TEXT NOT NULL,
  description      TEXT NOT NULL DEFAULT '',
  sort_order       INTEGER NOT NULL DEFAULT 0,
  duration_seconds INTEGER,              -- populated from Mux asset metadata
  mux_upload_id    TEXT,                 -- Mux direct upload ID (temporary)
  mux_asset_id     TEXT,                 -- Mux asset ID (set by webhook)
  mux_playback_id  TEXT,                 -- Mux playback ID (set by webhook)
  mux_status       TEXT NOT NULL DEFAULT 'pending'
                   CHECK (mux_status IN ('pending', 'processing', 'ready', 'error')),
  is_preview       BOOLEAN NOT NULL DEFAULT false,  -- free preview for any tier
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

**Note on `is_preview`:** When `is_preview = true`, the playback token endpoint returns a
token even for free-tier users, regardless of the course's `tier_required`. This enables teaser
content without special-casing the tier logic.

### Table: enrollments

```sql
CREATE TABLE IF NOT EXISTS enrollments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id   UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  enrolled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, course_id)
);
```

**Decision point:** Whether to require explicit enrollment or auto-enroll when a user accesses
a course. The roadmap says "tier gating" not "explicit enrollment." Either approach works, but
auto-enrollment (create row on first lesson view) is simpler for the user. Explicit enrollment
enables "My Courses" UX. Recommend explicit enrollment to support progress tracking.

### Table: content_progress

```sql
CREATE TABLE IF NOT EXISTS content_progress (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lesson_id     UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  watched_pct   INTEGER NOT NULL DEFAULT 0 CHECK (watched_pct BETWEEN 0 AND 100),
  completed     BOOLEAN NOT NULL DEFAULT false,
  last_watched  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, lesson_id)
);
```

**Note:** Progress tracking is Phase 67 frontend concern (Mux Player fires progress events).
The table should be created in Phase 66 so Phase 67 can write to it immediately. Phase 66 API
needs a `POST /api/content/progress` endpoint for the player to call.

---

## RLS Policy Design

### Design principle

The admin system uses a separate cookie-based session (`adminSession`), not Supabase auth roles.
Therefore RLS admin bypass must use `service_role` (as in all existing migrations), not a
user-level admin flag. All admin mutations happen through API routes that call `isAdminSession()`,
then use the service client (`createServiceClient()`) to bypass RLS.

For regular users, tier gating is enforced at the API layer by `checkTierForRequest()` before
any DB query. RLS provides defense-in-depth for direct DB access.

### RLS pattern for content tables

```sql
-- courses: published courses are readable by all authenticated users;
-- tier enforcement is API-layer. RLS just ensures auth.
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read published courses"
  ON courses FOR SELECT TO authenticated
  USING (is_published = true);

CREATE POLICY "Service role manages courses"
  ON courses FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- lessons: same pattern
ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read lessons"
  ON lessons FOR SELECT TO authenticated
  USING (true);   -- tier check is in API, not here

CREATE POLICY "Service role manages lessons"
  ON lessons FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- enrollments: users see only their own
ALTER TABLE enrollments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own enrollments"
  ON enrollments FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users create own enrollments"
  ON enrollments FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role manages enrollments"
  ON enrollments FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- content_progress: users see only their own
ALTER TABLE content_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own progress"
  ON content_progress FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users upsert own progress"
  ON content_progress FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role manages content_progress"
  ON content_progress FOR ALL TO service_role
  USING (true) WITH CHECK (true);
```

**Why no tier check in RLS:** Embedding a join to `user_subscriptions` in RLS is possible
but has two downsides: (1) performance — the subquery runs on every row evaluated; (2) the tier
system already has a normalized helper in `lib/api/tier-middleware.ts` that handles edge cases
(archived price IDs, profile.tier fallback). Duplicating that logic in SQL would create
maintenance burden and drift. Use API-layer tier checks; use RLS for ownership/auth checks only.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Signed playback tokens | Custom JWT signing | `mux.jwt.signPlaybackId()` | Mux SDK handles RS256, key ID, exp correctly |
| Webhook signature verification | Manual HMAC | `mux.webhooks.unwrap(body, headers)` | Timing-safe, validated, typed result |
| Video upload | Proxy through Next.js | Mux direct upload URL | Video bytes should never touch your server |
| Tier resolution | Re-implement | `checkTierForRequest()` from `lib/api/tier-middleware.ts` | Already handles Stripe → profiles fallback |
| Admin auth | New auth system | `isAdminSession()` from `lib/auth/admin.ts` | Existing admin cookie session already works |

---

## Common Pitfalls

### Pitfall 1: Parsing Webhook Body Before Signature Verification

**What goes wrong:** Calling `await req.json()` before passing body to `mux.webhooks.unwrap()`
makes the signature check fail. The error message is: "Webhook body must be passed as the raw
JSON string sent from the server (do not parse it first)."

**How to avoid:** Always `const body = await req.text()`, then pass `body` (string) to
`mux.webhooks.unwrap(body, req.headers)`.

**Warning signs:** 401 errors on all Mux webhook deliveries in production.

### Pitfall 2: Using Public Playback Policy for Gated Content

**What goes wrong:** If lessons are created with `playback_policies: ["public"]`, the Mux
playback URL works without any token. Anyone who discovers the playback ID can watch the video.

**How to avoid:** All gated lessons must use `playback_policies: ["signed"]`. Only set `"public"`
for free-preview lessons where `is_preview = true`.

### Pitfall 3: Not Storing mux_upload_id

**What goes wrong:** When the admin starts an upload but navigates away before the webhook fires,
there is no way to associate the Mux asset with the lesson row. The asset is orphaned.

**How to avoid:** Store `mux_upload_id` on the lesson row when creating the upload URL. The
webhook handler can then fall back to querying lessons by `mux_upload_id` if `passthrough` is
missing.

### Pitfall 4: Missing Webhook Endpoint Registration

**What goes wrong:** Mux never calls your webhook until you register the endpoint URL in the
Mux dashboard. In development, use ngrok or similar tunneling.

**How to avoid:** The phase plan should include a task: "Register MUX_WEBHOOK_URL in Mux
dashboard." Note that this is a manual step outside the codebase.

### Pitfall 5: Tier Name Mismatch

**What goes wrong:** The Stripe `PLANS` config uses IDs `"free"`, `"fundraising"`,
`"venture_studio"`. The tier-routing file normalizes these to `"free"`, `"pro"`, `"studio"`.
If the database column stores `"fundraising"` and the API checks against `"pro"`, the check fails.

**How to avoid:** In the `courses.tier_required` column, store only the normalized values
`'free'`, `'pro'`, `'studio'`. The API tier check uses `UserTier.PRO` (numeric enum), and
`canAccessFeature()` from `lib/constants` handles the comparison correctly.

### Pitfall 6: Mux Asset Duration Not Available Immediately

**What goes wrong:** After `video.asset.ready`, the asset duration may be in a separate field.
Trying to store `duration_seconds` from the webhook requires reading `event.data.duration` (float
seconds) and converting to integer.

**How to avoid:** In the webhook handler: `Math.round(event.data.duration ?? 0)`.

---

## Code Examples

### Create Direct Upload URL (server)
```typescript
// Source: https://www.mux.com/docs/guides/upload-files-directly
const upload = await mux.video.uploads.create({
  cors_origin: process.env.NEXT_PUBLIC_APP_URL!,
  new_asset_settings: {
    playback_policies: ["signed"],
    passthrough: lessonId,
  },
});
// Returns: { id: string, url: string, status: "waiting_for_upload" }
```

### Verify and Parse Mux Webhook
```typescript
// Source: https://github.com/muxinc/mux-node-sdk README
const body = await req.text();  // raw string required
const event = mux.webhooks.unwrap(body, req.headers);
// event.type: "video.asset.ready" | "video.upload.asset_created" | etc.
// event.data.passthrough: your custom string (lessonId)
// event.data.playback_ids[0].id: the playback ID
// event.data.duration: float seconds
```

### Generate Signed Playback Token
```typescript
// Source: https://www.mux.com/docs/guides/secure-video-playback
const token = await mux.jwt.signPlaybackId(playbackId, {
  expiration: "1h",
  type: "playback",
});
// Pass to mux-player-react as playbackToken prop
```

### Tier Check in API Route
```typescript
// Source: lib/api/tier-middleware.ts (project codebase)
import { checkTierForRequest } from "@/lib/api/tier-middleware";
import { UserTier } from "@/lib/constants";

const tierCheck = await checkTierForRequest(req, UserTier.PRO);
if (!tierCheck.allowed) {
  return NextResponse.json({ error: "Upgrade required" }, { status: 403 });
}
```

### Updating FRED's Content Recommender Stub

Phase 66 should implement the real DB query and update the stub's `execute` function to call it.
The stub interface (inputSchema) does not change.

```typescript
// Current stub returns { status: "coming_soon" }
// Phase 66 replaces execute body with:
execute: async ({ query, stage, format }) => {
  const courses = await searchContentLibrary({ query, stage, format });
  return { status: "success", courses };
}
```

---

## Environment Variables Required

These must be added to `.env.local` and Vercel environment config:

| Variable | Source | Purpose |
|----------|--------|---------|
| `MUX_TOKEN_ID` | Mux dashboard > Settings > API Access Tokens | Server SDK auth |
| `MUX_TOKEN_SECRET` | Mux dashboard > Settings > API Access Tokens | Server SDK auth |
| `MUX_WEBHOOK_SECRET` | Mux dashboard > Settings > Webhooks | Signature verification |
| `MUX_SIGNING_KEY_ID` | Mux dashboard > Settings > Signing Keys | Signed playback JWTs |
| `MUX_SIGNING_PRIVATE_KEY` | Mux dashboard > Settings > Signing Keys (base64) | Signed playback JWTs |

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual JWT with jsonwebtoken | `mux.jwt.signPlaybackId()` | Mux SDK v8+ | No manual key loading required |
| Polling for asset status | `video.asset.ready` webhook | Always best practice | No polling needed |
| Separate Mux webhook library | Built into `@mux/mux-node` | SDK v8+ | `mux.webhooks.unwrap()` handles signature |
| Custom video upload endpoints | Mux direct upload + `@mux/mux-uploader-react` | Always Mux pattern | Zero video bytes touch your server |

---

## Key Decisions to Make Before Planning

1. **Free preview per lesson or per course?**
   - Option A: `lessons.is_preview = true` enables watching without tier check (recommended)
   - Option B: First N lessons of a course are always free (requires sorting logic)
   - Recommendation: Option A (is_preview flag per lesson) for maximum flexibility

2. **Explicit enrollment or implicit?**
   - Option A: User must click "Enroll" to add row to `enrollments` (enables "My Courses" UX)
   - Option B: Auto-enroll on first lesson view
   - Recommendation: Option A for richer UX in Phase 67

3. **FRED tool stub update in Phase 66 or Phase 67?**
   - The `recommendContentTool` currently returns `coming_soon`
   - Phase 66 creates the DB schema; Phase 67 adds the search UI
   - Recommendation: Implement the DB search function in Phase 66, wire the stub in Phase 66
     so FRED can recommend content once the DB is populated

4. **Mux signing key creation**
   - Signing keys must be created in the Mux dashboard manually
   - The plan should include an explicit task for this (not automatable)

5. **Admin route location**
   - Existing admin routes are at `app/api/admin/` (API) and `app/admin/` (UI)
   - Content admin CRUD should go to `app/api/admin/content/`
   - The admin UI page is Phase 67 concern

---

## Open Questions

1. **Mux environment (test vs production)**
   - Mux has separate test and production environments
   - What is unclear: does the project have a `MUX_ENV=test` convention or just two sets of
     API keys?
   - Recommendation: Follow Stripe's pattern — use test keys in dev, prod keys in production,
     document in `.env.example`

2. **Content duration source**
   - Mux fires `video.asset.ready` with `data.duration` (float)
   - What is unclear: whether the FRED tool stub needs duration in its response
   - Recommendation: Store duration, expose it in the catalog API for Phase 67 display

3. **Mux upload webhook `passthrough` vs lessonId flow**
   - The upload URL creation endpoint receives `lessonId` in the request body
   - What is unclear: whether the lesson row should exist before the upload or be created
     after the webhook. If the lesson must exist first, the admin flow is:
     create lesson (mux_status='pending') → create upload URL → client uploads → webhook updates
   - Recommendation: Create lesson row first, then upload. This ensures referential integrity
     and enables the webhook handler to `UPDATE lessons SET mux_asset_id...`.

---

## Sources

### Primary (HIGH confidence)
- `lib/api/tier-middleware.ts` — tier check functions, `getUserTier()`, `requireTier()`,
  `checkTierForRequest()`, exact behavior verified
- `lib/stripe/config.ts` — PLANS object with actual plan IDs (`free`, `fundraising`,
  `venture_studio`)
- `lib/ai/tier-routing.ts` — `ModelTier` type (`"free" | "pro" | "studio"`), `normalizeTier()`
- `lib/db/migrations/033_user_subscriptions.sql` — `user_subscriptions` table schema
- `lib/db/migrations/032_profiles_table_trigger.sql` — `profiles.tier` column (INTEGER)
- `lib/fred/tools/content-recommender.ts` — stub interface that Phase 66 must implement behind
- `app/api/admin/dashboard/route.ts` — admin API pattern (`isAdminSession()`, `sql` template tag)
- [Mux SDK README](https://github.com/muxinc/mux-node-sdk/blob/master/README.md) — v12.8.1,
  `mux.video.uploads.create()`, `mux.jwt.signPlaybackId()`, `mux.webhooks.unwrap()` verified
- [Mux Direct Upload Guide](https://www.mux.com/docs/guides/upload-files-directly) — workflow
  verified: create upload URL → client PUT → webhook → associate asset

### Secondary (MEDIUM confidence)
- [Mux Secure Playback Guide](https://www.mux.com/docs/guides/secure-video-playback) — JWT
  generation with RS256, signing key setup, `playback_policies: ["signed"]`
- [Mux Webhooks Reference](https://www.mux.com/docs/core/listen-for-webhooks) — event types
  `video.asset.ready`, `video.upload.asset_created`, `video.upload.errored`, payload structure
- [@mux/mux-player-react npm page](https://www.npmjs.com/package/@mux/mux-player-react) — v3.11.4
- [@mux/mux-node npm versions](https://www.npmjs.com/package/@mux/mux-node) — v12.8.1

### Tertiary (LOW confidence)
- None — all key claims verified with primary or secondary sources

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — Mux SDK version verified on npm; packages not yet in project but approved
- Architecture: HIGH — patterns derived from official Mux docs and verified against existing codebase
- Database schema: HIGH — follows existing migration conventions; LMS schema is well-established
- Tier gating: HIGH — verified against existing `lib/api/tier-middleware.ts` implementation
- Pitfalls: HIGH — webhook body pitfall is documented in SDK error messages; others from official docs

**Research date:** 2026-02-25
**Valid until:** 2026-03-25 (Mux SDK stable; Supabase RLS patterns stable)
