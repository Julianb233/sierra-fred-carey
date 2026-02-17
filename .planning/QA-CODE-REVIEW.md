# QA Code Review: Source Verification of All Debug Fixes

**Reviewer:** code-reviewer (qa-squad)
**Date:** 2026-02-16
**Method:** Read every source file referenced by the 4 audit reports and DEBUG-REPORT.md. Each fix verified by reading the actual code.

---

## Summary

| Result | Count |
|--------|-------|
| PASS   | 25    |
| FAIL   | 0     |
| Total  | 25    |

All 25 verified fixes are correctly implemented.

---

## BLOCKERS

### 1. Shared Page Operator Precedence (B1 from LAUNCH-AUDIT-CODE)
- **File:** `app/shared/[token]/page.tsx:55-59`
- **Expected:** Parenthesized ternary so `NEXT_PUBLIC_APP_URL` takes priority.
- **Actual (line 55-59):**
  ```ts
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000");
  ```
- **Verdict:** **PASS** -- Correct operator precedence with parentheses around the ternary.

### 2. Documents Page Crash (B2 from LAUNCH-AUDIT-CODE)
- **File:** `app/dashboard/documents/page.tsx:92`
- **Expected:** `documents` defaults to `[]` so `.filter()` never throws on undefined.
- **Actual (line 92):**
  ```ts
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  ```
- **Verdict:** **PASS** -- Initialized to empty array. No crash risk.

### 3. Test File Jest Import (B3 from LAUNCH-AUDIT-CODE)
- **File:** `tests/auth/profile-creation.test.ts:1-14`
- **Expected:** No `@jest/globals` import; uses Vitest globals.
- **Actual (line 12-13):**
  ```ts
  import { createServiceClient } from "@/lib/supabase/server";
  import { supabaseSignUp } from "@/lib/supabase/auth-helpers";
  ```
- **Verdict:** **PASS** -- No `@jest/globals` import. Uses Vitest globals (bare `describe`).

### 4. Pricing "Coming Soon" Badges (B1 from LAUNCH-AUDIT-FEATURES)
- **File:** `app/pricing/page.tsx:76-77`
- **Expected:** No `comingSoon: true` on Boardy or Investor features.
- **Actual (lines 76-77):**
  ```ts
  { name: "Boardy Integration", included: true },
  { name: "Investor Matching & Warm Intros", included: true },
  ```
- **Verdict:** **PASS** -- `comingSoon` property removed from both features.

### 5. Monitoring Dashboard Mock Data (B2 from LAUNCH-AUDIT-FEATURES)
- **File:** `components/monitoring/panels/LiveMetricsPanel.tsx:68-71`
- **Expected:** No `Math.random()` fallback; uses `0` instead.
- **Actual (lines 68-71):**
  ```ts
  requestCount: result.data?.totalRequests24h || 0,
  avgLatency: result.data?.avgLatency || 0,
  errorRate: result.data?.errorRate || 0,
  uptime: result.data?.uptime || 0,
  ```
- **Verdict:** **PASS** -- All `Math.random()` fallbacks replaced with `0`.

---

## HIGH SEVERITY

### 6. LiveKit WebhookReceiver Module Scope (H-03 from LAUNCH-AUDIT-API)
- **File:** `app/api/livekit/webhook/route.ts:16-29`
- **Expected:** Receiver instantiated inside POST handler with env guard.
- **Actual (lines 16-29):**
  ```ts
  export async function POST(req: NextRequest) {
    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;
    if (!apiKey || !apiSecret) {
      return NextResponse.json({ error: 'LiveKit webhook not configured' }, { status: 503 });
    }
    const receiver = new WebhookReceiver(apiKey, apiSecret);
    ...
  }
  ```
- **Verdict:** **PASS** -- Lazy initialization inside handler with explicit env guard returning 503.

### 7. Health Endpoint Auth (H1 from LAUNCH-AUDIT-SECURITY / M-01 from LAUNCH-AUDIT-API)
- **File:** `app/api/health/ai/route.ts:13,17-19`
- **Expected:** Admin auth check via `isAdminRequest()`.
- **Actual (lines 13, 17-19):**
  ```ts
  import { isAdminRequest } from "@/lib/auth/admin";
  ...
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  ```
- **Verdict:** **PASS** -- `isAdminRequest()` guard added.

### 8. Setup-DB Auth (H2 from LAUNCH-AUDIT-SECURITY / M-02 from LAUNCH-AUDIT-API)
- **File:** `app/api/setup-db/route.ts:3,15-27`
- **Expected:** `isAdminRequest()` check alongside `NODE_ENV` check.
- **Actual (lines 3, 15-27):**
  ```ts
  import { isAdminRequest } from "@/lib/auth/admin";
  ...
  if (process.env.NODE_ENV === "production") { return 403; }
  if (!isAdminRequest(request)) { return 401; }
  ```
- **Verdict:** **PASS** -- Both `NODE_ENV` and `isAdminRequest()` guards present.

### 9. SMS Verification Code Crypto (M-04 from LAUNCH-AUDIT-API)
- **File:** `app/api/sms/verify/route.ts:13,57`
- **Expected:** Uses `crypto.randomInt()` instead of `Math.random()`.
- **Actual:**
  ```ts
  import { randomInt } from "crypto";   // line 13
  const code = randomInt(100000, 999999).toString();  // line 57
  ```
- **Verdict:** **PASS** -- Cryptographically secure random via `crypto.randomInt`.

### 10. AI Model IDs Updated (M-03 from LAUNCH-AUDIT-API)
- **File:** `lib/ai/providers.ts:67,75,83,99` and `lib/ai/client.ts:84,102`
- **Expected:** Updated model identifiers.
- **Actual:**
  - `providers.ts:67` -- `openai("gpt-4o")` (was `gpt-4-turbo-preview`)
  - `providers.ts:75` -- `anthropic("claude-sonnet-4-5-20250929")` (was `claude-3-5-sonnet-20241022`)
  - `providers.ts:83` -- `google("gemini-2.0-flash")` (was `gemini-1.5-flash`)
  - `providers.ts:99` -- `openai("o3")` (was `o1`)
  - `client.ts:84` -- `"claude-sonnet-4-5-20250929"` (was `claude-3-5-sonnet-20241022`)
  - `client.ts:102` -- `"gemini-2.0-flash"` (was `gemini-1.5-flash`)
- **Verdict:** **PASS** -- All 6 model references updated to latest versions.

### 11. Timing-Safe Secret Comparison (M1 from LAUNCH-AUDIT-SECURITY)
- **File:** `app/api/monitoring/auto-promotion/check/route.ts:29-34` and `app/api/monitoring/alerts/check/route.ts:22-29`
- **Expected:** Uses HMAC + `timingSafeEqual` instead of `===`.
- **Actual (auto-promotion lines 32-34):**
  ```ts
  const hmac1 = createHmac("sha256", "cron-auth").update(String(cronSecret)).digest();
  const hmac2 = createHmac("sha256", "cron-auth").update(expectedSecret).digest();
  hasCronSecret = timingSafeEqual(hmac1, hmac2);
  ```
  **Actual (alerts lines 27-29):**
  ```ts
  const hmac1 = createHmac("sha256", "cron-auth").update(authHeader).digest();
  const hmac2 = createHmac("sha256", "cron-auth").update(expected).digest();
  hasCronSecret = timingSafeEqual(hmac1, hmac2);
  ```
- **Verdict:** **PASS** -- Both endpoints now use HMAC + `timingSafeEqual`.

### 12. Community Detail Posts Gated Behind Membership (NEW-01 from DEBUG-REPORT)
- **File:** `app/api/communities/[slug]/route.ts:67-70`
- **Expected:** Posts only fetched if user is a member.
- **Actual (lines 67-70):**
  ```ts
  const recentPosts = membership
    ? (await getPosts(community.id, { limit: 5 })).posts
    : [];
  ```
- **Verdict:** **PASS** -- Posts gated behind membership check.

### 13. VAPID Environment Guard (M2 from LAUNCH-AUDIT-SECURITY)
- **File:** `lib/push/index.ts:97-104`
- **Expected:** Guard clause checking for missing VAPID vars before use.
- **Actual (lines 97-104):**
  ```ts
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;
  if (!publicKey || !privateKey || !subject) {
    logger.info("[push] VAPID env vars missing -- skipping notification");
    return false;
  }
  ```
- **Verdict:** **PASS** -- Guard clause replaces non-null assertions. Returns `false` gracefully.

### 14. Permissions-Policy Microphone (M3 from LAUNCH-AUDIT-SECURITY)
- **File:** `next.config.mjs:43-44`
- **Expected:** `microphone=(self)` instead of `microphone=()`.
- **Actual (line 44):**
  ```
  "camera=(), microphone=(self), geolocation=()"
  ```
- **Verdict:** **PASS** -- Microphone allowed for same origin.

### 15. Invite Rate Limiter (M4 from LAUNCH-AUDIT-SECURITY)
- **File:** `app/api/onboard/invite/route.ts:3,15`
- **Expected:** Uses `checkRateLimit` from `lib/api/rate-limit.ts` (Upstash Redis-backed).
- **Actual (lines 3, 15):**
  ```ts
  import { checkRateLimit, createRateLimitResponse } from "@/lib/api/rate-limit";
  const rateLimitResult = await checkRateLimit(`invite:${ip}`, { limit: 5, windowSeconds: 60 });
  ```
- **Verdict:** **PASS** -- Migrated from in-memory to Upstash Redis-backed rate limiter.

### 16. mockDocuments Export Removed (M1 from LAUNCH-AUDIT-CODE / H5 from LAUNCH-AUDIT-FEATURES)
- **File:** `lib/document-types.ts`
- **Expected:** No `mockDocuments` export.
- **Actual:** File ends at line 241 (the `documentPrompts` array). Grep for `mockDocuments` returns no matches.
- **Verdict:** **PASS** -- Dead code removed.

### 17. middleware-example.ts Deleted (M2 from LAUNCH-AUDIT-CODE)
- **File:** `lib/auth/middleware-example.ts`
- **Expected:** File deleted.
- **Actual:** Glob returns no matches. File does not exist.
- **Verdict:** **PASS** -- Example file deleted.

### 18. Agent Sparkline Removed (H1 from LAUNCH-AUDIT-FEATURES / M8 from LAUNCH-AUDIT-CODE)
- **File:** `components/agents/AgentCard.tsx:184-193`
- **Expected:** No `Math.random()` sparkline. Activity section replaced or removed.
- **Actual (lines 184-193):** The sparkline section has been replaced with a "View Details" CTA:
  ```tsx
  {/* CTA */}
  <div className="flex items-center justify-between pt-4 ...">
    <span ...>View Details</span>
    <ArrowRight ... />
  </div>
  ```
- **Verdict:** **PASS** -- `Math.random()` sparkline removed. Replaced with clean CTA.

---

## FRONTEND COMMUNITY FIXES

### 19. handleReact Guards Against Undefined (BUG-F01 from DEBUG-REPORT)
- **File:** `app/dashboard/communities/[slug]/page.tsx:166-228`
- **Expected:** Guard against undefined `added`, optimistic UI with rollback.
- **Actual:** Full optimistic UI implementation:
  - Lines 167-183: Optimistic toggle before API call using `wasReacted` captured state.
  - Line 193: `if (added === undefined) return;` -- guard against malformed response.
  - Lines 195-209: Server reconciliation if response disagrees with optimistic state.
  - Lines 211-224: API error rollback to original state.
  - Lines 226-240 (catch): Network error rollback to original state.
- **Verdict:** **PASS** -- Comprehensive fix with optimistic UI, undefined guard, reconciliation, and rollback.

### 20. fetchMembers in useCallback + deps (BUG-F02 from DEBUG-REPORT)
- **File:** `app/dashboard/communities/[slug]/page.tsx:84-107`
- **Expected:** `fetchMembers` wrapped in `useCallback` and included in useEffect deps.
- **Actual:**
  - Line 84: `const fetchMembers = useCallback(async () => {`
  - Line 95: `}, [community, slug]);` -- proper deps.
  - Line 107: `}, [community, isMember, fetchPosts, fetchMembers]);` -- included in useEffect.
- **Verdict:** **PASS** -- Stale closure fixed.

### 21. Leave Confirmation Dialog (BUG-F03 from DEBUG-REPORT)
- **File:** `app/dashboard/communities/[slug]/page.tsx:128` and `app/dashboard/communities/page.tsx:79`
- **Expected:** `window.confirm()` before leave action on both pages.
- **Actual:**
  - Detail page line 128: `if (!window.confirm("Leave this community?")) return;`
  - Browse page line 79: `if (!window.confirm("Leave this community?")) return;`
- **Verdict:** **PASS** -- Confirmation added on both pages.

### 22. ReplyThread Re-fetches After Submit (BUG-F04 from DEBUG-REPORT)
- **File:** `components/communities/ReplyThread.tsx:42-51`
- **Expected:** Re-fetches replies after successful submission.
- **Actual (lines 46-48):**
  ```ts
  await onReply(postId, replyText.trim());
  setReplyText("");
  await fetchReplies();
  ```
- **Verdict:** **PASS** -- `fetchReplies()` called after reply submission.

### 23. Error Toast on Join/Leave Failure (BUG-F08 from DEBUG-REPORT)
- **File:** `app/dashboard/communities/page.tsx:52-75, 78-99`
- **Expected:** `toast.error()` on non-OK responses.
- **Actual:**
  - Join (line 64-65): `} else { toast.error("Failed to join community"); }`
  - Join catch (line 67-68): `} catch { toast.error("Failed to join community"); }`
  - Leave (line 91-92): `} else { toast.error("Failed to leave community"); }`
  - Leave catch (line 94-95): `} catch { toast.error("Failed to leave community"); }`
- **Verdict:** **PASS** -- Error feedback added for all failure paths.

### 24. setPostPage(0) on Re-fetch (BUG-F09 from DEBUG-REPORT)
- **File:** `app/dashboard/communities/[slug]/page.tsx:97-107`
- **Expected:** `setPostPage(0)` alongside `fetchPosts(0)`.
- **Actual (lines 100-101):**
  ```ts
  fetchPosts(0);
  setPostPage(0);
  ```
- **Verdict:** **PASS** -- Post page state properly reset.

### 25. Set<string> for joiningSlugs (BUG-F10 from DEBUG-REPORT)
- **File:** `app/dashboard/communities/page.tsx:28`
- **Expected:** `Set<string>` instead of single `string | null`.
- **Actual (line 28):**
  ```ts
  const [joiningSlugs, setJoiningSlugs] = useState<Set<string>>(new Set());
  ```
  Usage in `handleJoin` (line 53): `setJoiningSlugs((prev) => new Set(prev).add(communitySlug));`
  Cleanup in `finally` (lines 70-74): removes the specific slug from the Set.
- **Verdict:** **PASS** -- Concurrent join/leave race condition resolved.

---

## BONUS: .env.example Updates Verified

- **H-01 (UPSTASH vars):** `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` now present in `.env.example` (lines 184-185). **PASS**
- **H-02 (COMMUNITIES_ENABLED):** `COMMUNITIES_ENABLED=true` now documented in `.env.example` (line 190). **PASS**

---

## New Issues Spotted During Review

No new issues found. All 25 fixes are correctly implemented and match the audit recommendations.

---

## Final Verdict

**25/25 fixes PASS** -- All debug fixes from the 4 launch audit reports and the community DEBUG-REPORT have been correctly implemented in the source code. The codebase is ready for launch from a code-correctness perspective.
