# Current Blockers

> Last Updated: 2026-02-05T10:00:00Z
> Active Blockers: 1

---

## Critical Blockers

(None currently)

---

## Warning Blockers

### [ACTIVE] Missing A/B Testing Database Tables

**ID:** blocker_db_tables_001
**Discovered:** 2026-02-05 by bussit-worker
**Status:** ACTIVE

**Issue:**
The following database tables required for the monitoring dashboard are missing from Supabase:
- `ab_experiments` - A/B testing experiments
- `ab_variants` - Experiment variants
- `ai_insights` - AI-extracted insights

**Impact:**
- Monitoring dashboard shows error when loading
- `/api/monitoring/dashboard` returns 500 error
- A/B testing features are non-functional

**Solution:**
Run the migration SQL in Supabase SQL Editor:
1. Go to https://supabase.com/dashboard/project/ggiywhpgzjdjeeldjdnp/sql/new
2. Copy contents from `lib/db/migrations/007_unified_intelligence_supabase.sql`
3. Execute the SQL
4. Verify by calling `/api/setup-db`

**Tables that DO exist:**
- `ai_requests` (has data)
- `ai_responses` (has data)
- `ai_config` (has data)
- `ai_prompts` (empty)
- `profiles` (empty)
- `contact_submissions` (has data)

---

## Resolved Blockers

### [RESOLVED] GSAP Draggable TypeScript Casing Error

**ID:** blocker_gsap_casing_001
**Discovered:** 2025-12-28 by Bubba-Orchestrator
**Resolved:** 2025-12-28 by Bubba-Orchestrator

**Original Issue:**
TypeScript compilation failed due to file casing conflict - `gsap/Draggable` vs `gsap/types/draggable.d.ts`.

**Resolution:**
1. Added `forceConsistentCasingInFileNames: false` to tsconfig.json
2. Created `/types/gsap.d.ts` with proper module declaration
3. Added `types/**/*.d.ts` to tsconfig include array

**Verification:**
- Build passes: `npm run build` ✓
- No TypeScript errors

---

### [RESOLVED] Mock Data in Dashboard

**ID:** blocker_mock_data_001
**Resolved:** 2025-12-28 by Fiona-Frontend

**Original Issue:**
Monitoring dashboard was using mock data fallbacks instead of real API data.

**Resolution:**
Connected dashboard to real `/api/monitoring/dashboard` endpoint. All mock data removed. Dashboard now shows live experiment data with 30-second auto-refresh.

**Verification:**
- No `setMockData()` calls in codebase
- Console logs show real data loading
- API responses contain actual experiment data

---

## Blocker Resolution Protocol

1. **Identify** - Document the blocker using template above
2. **Assess** - Determine impact and priority
3. **Assign** - Tag appropriate agent
4. **Fix** - Implement solution
5. **Verify** - Confirm fix works
6. **Document** - Move to Resolved section with solution

---

## Quick Fix Reference

| Error Pattern | Likely Cause | Quick Fix |
|---------------|--------------|-----------|
| Casing mismatch | File system case sensitivity | Match import casing to actual file |
| Module not found | Missing dependency | `pnpm install` |
| Type errors | TypeScript strict mode | Fix types or add @ts-ignore |
| Build timeout | Too many files | Increase timeout or optimize |

---

*Managed by Diana-Debugger and Bubba-Orchestrator*
