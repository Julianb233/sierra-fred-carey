# 20-01 Summary: Investor CSV Upload, AI Matching, and Targeting Page

## Status: COMPLETE
**Completed:** 2026-02-07

## What Was Built

### Migration: `lib/db/migrations/038_investor_tables.sql`
- 4 tables created: `investor_lists`, `investors`, `investor_matches`, `investor_match_scores`
- Full RLS policies: users access only their own data, service role has full access
- Indexes on user_id, list_id, overall_score for query performance
- Check constraints on scores (0-100) and status enum

### Library: `lib/investors/csv-parser.ts`
- `parseInvestorCSV(csvText)` -- parses CSV text into structured `InvestorRow[]`
- `InvestorRow` interface with all investor fields
- Flexible header mapping: 40+ header aliases (e.g., "fund" -> firm, "ticket size" -> checkSizeMin)
- Dollar amount parsing: handles `$500K`, `$2M`, `$1,000,000`, plain numbers
- Quoted field handling (commas inside quotes, escaped quotes)
- BOM removal for Windows-generated CSVs
- Validation: name required, errors tracked per row

### Library: `lib/investors/matching.ts`
- `matchInvestors(userId, listId?)` -- AI-powered investor matching engine
- `InvestorMatch` interface for typed results
- Scoring dimensions:
  - **Stage (35%)**: Compares founder stage to investor stage_focus with adjacency scoring
  - **Sector (35%)**: Substring + term-overlap matching between founder industry and investor sectors
  - **Size (30%)**: Estimates raise amount from stage, checks overlap with investor check range
  - **Location bonus (up to +3 points)**: Geographic alignment bonus
- AI reasoning generation using `generateStructuredReliable` with Fred's investor voice
- Fallback to rule-based reasoning if AI fails
- Batched reasoning generation (groups of 10) for API efficiency
- Upserts results into `investor_matches` and `investor_match_scores`
- Returns top 25 matches sorted by overall score

### API: `app/api/investors/upload/route.ts`
- POST: accepts multipart/form-data CSV upload
- Studio tier required (via `checkTierForRequest`)
- 1MB file size limit, CSV format validation
- Rejects if >50% of rows have parsing errors
- Creates `investor_lists` row + bulk inserts `investors`
- Returns 201 with `{ listId, investorCount, errors }`

### API: `app/api/investors/match/route.ts`
- POST: triggers AI matching, accepts optional `{ listId }` body
- GET: retrieves existing matches with investor details, supports `?listId=` filter
- Studio tier required for both endpoints
- Returns formatted match results with investor metadata

### Page: `app/dashboard/investor-targeting/page.tsx`
- "use client" with FeatureLock (Studio tier)
- CSV upload form with file input, list name, progress indicator
- Upload result display with error reporting
- Investor list cards showing name, count, date, source badge
- "Run Matching" button per list with loading state
- "View Matches" link per list
- Empty state with call to action

### Page: `app/dashboard/investor-targeting/matches/page.tsx`
- "use client" with FeatureLock (Studio tier)
- Fetches matches from GET /api/investors/match with optional listId
- Score circle (color-coded: green 70+, yellow 40-69, red <40)
- Score breakdown bars: stage, sector, size (animated)
- AI reasoning display with Fred's voice
- Status badges (new, contacted, passed, interested)
- Contact actions: email, website links
- Sort toggle: by score (default) or name
- Loading skeleton and empty state
- Summary stats (count, average score)

## Key Design Decisions
1. **No new npm dependencies** -- CSV parsing uses built-in string operations
2. **Service client for DB operations** -- avoids RLS complexity in API routes while RLS policies protect direct access
3. **Upsert for matches** -- re-running matching updates existing scores rather than creating duplicates
4. **Batched AI reasoning** -- groups of 10 investors per API call for cost/latency efficiency
5. **Rule-based fallback** -- if AI reasoning fails, generates deterministic explanations from scores

## Files Modified
- `lib/db/migrations/038_investor_tables.sql` (new)
- `lib/investors/csv-parser.ts` (new)
- `lib/investors/matching.ts` (new)
- `app/api/investors/upload/route.ts` (new)
- `app/api/investors/match/route.ts` (new)
- `app/dashboard/investor-targeting/page.tsx` (new)
- `app/dashboard/investor-targeting/matches/page.tsx` (new)

## TypeScript
- All 7 new files compile with zero errors
- Pre-existing errors in other phases (red-flags, burnout-detector) are unrelated
