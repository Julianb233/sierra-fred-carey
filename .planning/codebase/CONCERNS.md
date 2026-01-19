# Codebase Concerns

**Analysis Date:** 2026-01-19

## Tech Debt

**Deprecated Auth Functions Still Exported:**
- Issue: Legacy auth functions (hashPassword, verifyPassword, createToken, verifyToken, setAuthCookie, getAuthCookie, clearAuthCookie) are exported from `lib/auth.ts` that throw errors or log warnings when called
- Files: `/opt/agency-workspace/sierra-fred-carey/lib/auth.ts` (lines 70-117)
- Impact: Code that imports these functions will fail at runtime. Maintains confusion about which auth functions to use.
- Fix approach: Remove deprecated exports entirely or rename file to clearly indicate migration status. Grep codebase for any remaining usage and update.

**In-Memory Rate Limiter:**
- Issue: Notification rate limiter uses in-memory Map instead of Redis/persistent storage
- Files: `/opt/agency-workspace/sierra-fred-carey/lib/notifications/index.ts` (lines 93-96)
- Impact: Rate limits reset on server restart; ineffective in multi-instance deployments
- Fix approach: Migrate to Redis-based rate limiting with `@upstash/ratelimit` or similar

**In-Memory Session Store:**
- Issue: Voice agent sessions stored in Map, comment acknowledges "use Redis in production"
- Files: `/opt/agency-workspace/sierra-fred-carey/lib/voice-agent.ts` (line 66-67)
- Impact: Agent sessions lost on restart; breaks in multi-server environment
- Fix approach: Move to Supabase table or Redis for session persistence

**TypeScript `any` Usage:**
- Issue: Extensive use of `any` type throughout codebase (100+ occurrences)
- Files: Multiple, including:
  - `/opt/agency-workspace/sierra-fred-carey/lib/monitoring/alert-notifier.ts` (lines 146, 193, 238)
  - `/opt/agency-workspace/sierra-fred-carey/lib/ai/client.ts` (lines 138, 191, 327)
  - `/opt/agency-workspace/sierra-fred-carey/lib/db/neon.ts` (lines 22, 28, 89)
- Impact: Loss of type safety, potential runtime errors, harder refactoring
- Fix approach: Add proper TypeScript interfaces, enable strict mode incrementally

**@ts-ignore Comments:**
- Issue: 5 instances of `@ts-ignore` suppressing TypeScript errors
- Files:
  - `/opt/agency-workspace/sierra-fred-carey/app/dashboard/pitch-deck/page.tsx` (line 152)
  - `/opt/agency-workspace/sierra-fred-carey/lib/ai/config-loader.ts` (line 266)
  - `/opt/agency-workspace/sierra-fred-carey/app/api/admin/config/route.ts` (line 181)
  - `/opt/agency-workspace/sierra-fred-carey/app/api/admin/ab-tests/route.ts` (line 347)
  - `/opt/agency-workspace/sierra-fred-carey/app/api/admin/ab-tests/[id]/route.ts` (line 284)
- Impact: Hidden type errors may cause runtime issues
- Fix approach: Fix underlying type issues, likely related to `sql.unsafe` typing

**Unimplemented TODO:**
- Issue: Digest email template marked as TODO since initial implementation
- Files: `/opt/agency-workspace/sierra-fred-carey/lib/notifications/index.ts` (line 608)
- Impact: Users cannot receive digest emails; feature incomplete
- Fix approach: Implement email digest template using react-email

**Console.log Statements in Production Code:**
- Issue: 90+ console.log/error/warn statements throughout codebase
- Files: Throughout `/opt/agency-workspace/sierra-fred-carey/lib/`, `/opt/agency-workspace/sierra-fred-carey/app/api/`
- Impact: Potential data leakage in logs, noisy production logs, no structured logging
- Fix approach: Implement proper logging library (pino, winston), remove debug logs

## Known Bugs

**None explicitly documented in codebase TODOs/FIXMEs.**

## Security Considerations

**CRITICAL - .env File Contains Real Secrets and IS NOT GITIGNORED:**
- Risk: Database credentials, API keys, and secrets are committed to version control
- Files: `/opt/agency-workspace/sierra-fred-carey/.env`
- Current mitigation: None - .gitignore only ignores `.env*.local`, not `.env`
- Recommendations:
  1. IMMEDIATELY add `.env` to `.gitignore`
  2. Rotate ALL credentials in the file (DATABASE_URL, LIVEKIT_API_SECRET, etc.)
  3. Use environment variable injection from hosting platform (Vercel)

**Incomplete Security Fix Migration:**
- Risk: Multiple API routes still vulnerable to user ID spoofing via x-user-id header
- Files: Per `/opt/agency-workspace/sierra-fred-carey/SECURITY_FIX_SUMMARY.md`:
  - `/opt/agency-workspace/sierra-fred-carey/app/api/journey/stats/route.ts`
  - `/opt/agency-workspace/sierra-fred-carey/app/api/journey/timeline/route.ts`
  - `/opt/agency-workspace/sierra-fred-carey/app/api/journey/references/route.ts`
  - `/opt/agency-workspace/sierra-fred-carey/app/api/documents/[id]/route.ts`
  - `/opt/agency-workspace/sierra-fred-carey/app/api/reality-lens/route.ts`
  - `/opt/agency-workspace/sierra-fred-carey/app/api/pitch-deck/upload/route.ts`
  - `/opt/agency-workspace/sierra-fred-carey/app/api/pitch-deck/parse/route.ts`
  - `/opt/agency-workspace/sierra-fred-carey/app/api/user/subscription/route.ts`
  - `/opt/agency-workspace/sierra-fred-carey/app/api/stripe/portal/route.ts`
  - `/opt/agency-workspace/sierra-fred-carey/app/api/stripe/checkout/route.ts`
- Current mitigation: Some routes fixed, middleware added
- Recommendations: Complete migration using `requireAuth()` from `/opt/agency-workspace/sierra-fred-carey/lib/auth.ts`

**Admin Routes Use Header-Based Auth:**
- Risk: Admin authentication relies on `x-admin-key` header compared to env var
- Files:
  - `/opt/agency-workspace/sierra-fred-carey/app/api/admin/ab-tests/[id]/promote/route.ts` (lines 13-16)
  - `/opt/agency-workspace/sierra-fred-carey/app/api/admin/ab-tests/route.ts`
  - `/opt/agency-workspace/sierra-fred-carey/app/api/admin/prompts/route.ts`
- Current mitigation: Key checked against `ADMIN_SECRET_KEY` env var
- Recommendations: Implement proper admin role check via Supabase Auth roles/claims

**SQL Injection via sql.unsafe:**
- Risk: `sql.unsafe()` allows raw SQL string interpolation
- Files: `/opt/agency-workspace/sierra-fred-carey/lib/db/neon.ts` (lines 14-16, 35-36)
- Current mitigation: Only used for dynamic column/table names, not user input
- Recommendations: Audit all `sql.unsafe` usage, add input validation

## Performance Bottlenecks

**Large API Route Files:**
- Problem: Several API route files exceed 500-1000 lines
- Files:
  - `/opt/agency-workspace/sierra-fred-carey/app/api/investor-lens/route.ts` (1020 lines)
  - `/opt/agency-workspace/sierra-fred-carey/app/api/positioning/route.ts` (675 lines)
- Cause: All business logic in single route handler, extensive data transformation
- Improvement path: Extract services into `/opt/agency-workspace/sierra-fred-carey/lib/services/`, separate DB operations

**Large Component Files:**
- Problem: Complex components with 500+ lines
- Files:
  - `/opt/agency-workspace/sierra-fred-carey/components/startup-process/step-form.tsx` (781 lines)
  - `/opt/agency-workspace/sierra-fred-carey/app/interactive/page.tsx` (871 lines)
  - `/opt/agency-workspace/sierra-fred-carey/app/demo/virtual-team/page.tsx` (757 lines)
- Cause: Multiple concerns in single component
- Improvement path: Split into smaller components, use composition

**Database Query in SQL Compatibility Layer:**
- Problem: The Supabase compatibility layer attempts parsing and fallback for every query
- Files: `/opt/agency-workspace/sierra-fred-carey/lib/db/neon.ts` (lines 46-84)
- Cause: Migration from Neon to Supabase not complete; RPC not set up
- Improvement path: Set up proper `exec_sql` RPC function in Supabase or migrate queries to Supabase client methods

## Fragile Areas

**AI Response Parsing:**
- Files: `/opt/agency-workspace/sierra-fred-carey/app/api/investor-lens/route.ts` (lines 542-565)
- Why fragile: Relies on AI returning valid JSON without markdown code blocks; manual string cleaning
- Safe modification: Add robust JSON extraction utility, test with malformed responses
- Test coverage: No tests found for AI response parsing

**Database Compatibility Layer:**
- Files: `/opt/agency-workspace/sierra-fred-carey/lib/db/neon.ts`
- Why fragile: Complex regex parsing of SQL queries, multiple fallback paths, handles Neon-to-Supabase migration
- Safe modification: Extensive testing required; consider completing migration to native Supabase methods
- Test coverage: No dedicated tests

**Authentication Middleware Chain:**
- Files:
  - `/opt/agency-workspace/sierra-fred-carey/middleware.ts`
  - `/opt/agency-workspace/sierra-fred-carey/lib/supabase/middleware.ts`
  - `/opt/agency-workspace/sierra-fred-carey/lib/supabase/auth-helpers.ts`
- Why fragile: Session refresh logic, cookie handling, multiple redirect scenarios
- Safe modification: Test auth flows thoroughly, preserve redirect preservation logic
- Test coverage: `/opt/agency-workspace/sierra-fred-carey/lib/auth/__tests__/token.test.ts` exists but limited

## Scaling Limits

**Supabase Row-Level Security:**
- Current capacity: Works for moderate user counts
- Limit: Complex policies may slow queries at scale
- Scaling path: Add indexes, review RLS policies for performance

**AI Rate Limits:**
- Current capacity: No rate limiting on AI endpoints
- Limit: API costs, provider rate limits (OpenAI, Anthropic)
- Scaling path: Implement user-level rate limiting, add caching for similar prompts

## Dependencies at Risk

**Multiple AI Provider Dependencies:**
- Risk: Maintaining 3 AI providers (OpenAI, Anthropic, Google) increases surface area
- Impact: Version conflicts, different response formats, maintenance burden
- Migration plan: Consider standardizing on one provider or using AI gateway

**Old Stripe SDK:**
- Risk: Stripe SDK at v20.1.0, API changes frequently
- Impact: Breaking changes in Stripe API
- Migration plan: Keep Stripe SDK updated, test webhook handling

## Missing Critical Features

**No Error Boundary Implementation:**
- Problem: No React error boundaries for graceful failure handling
- Blocks: Users see blank pages on component errors

**No Request Logging/Tracing:**
- Problem: No distributed tracing (e.g., OpenTelemetry)
- Blocks: Debugging production issues, performance analysis

## Test Coverage Gaps

**API Routes Largely Untested:**
- What's not tested: 80+ API routes, only 1 route has unit tests (`/opt/agency-workspace/sierra-fred-carey/app/api/pitch-deck/upload/__tests__/route.test.ts`)
- Files: All routes in `/opt/agency-workspace/sierra-fred-carey/app/api/`
- Risk: Breaking changes go undetected; auth vulnerabilities not caught
- Priority: High

**Core Library Functions Partially Tested:**
- What's not tested: Most lib functions (AI client, notifications, stripe, voice-agent)
- Files:
  - `/opt/agency-workspace/sierra-fred-carey/lib/ai/` - No tests
  - `/opt/agency-workspace/sierra-fred-carey/lib/voice-agent.ts` - No tests
  - `/opt/agency-workspace/sierra-fred-carey/lib/stripe/` - No tests
- Risk: Integration failures, billing bugs
- Priority: High

**Component Testing Limited:**
- What's not tested: Most UI components, only 4 page-level tests exist
- Files: `/opt/agency-workspace/sierra-fred-carey/tests/pages/` (4 files)
- Risk: UI regressions, accessibility issues
- Priority: Medium

**E2E Tests Missing:**
- What's not tested: Full user flows (signup, subscription, AI evaluation)
- Risk: Integration issues between frontend and backend
- Priority: Medium

---

*Concerns audit: 2026-01-19*
