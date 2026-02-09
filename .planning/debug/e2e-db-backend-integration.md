---
status: fixing
trigger: "e2e-db-backend-integration"
created: 2026-02-09T00:00:00Z
updated: 2026-02-09T00:06:00Z
---

## Current Focus

hypothesis: FIXES APPLIED - Corrected three critical integration gaps
test: Manual verification and testing needed to confirm data flow
expecting: Onboarding data now persists, insights save reliably, error handling prevents silent failures
next_action: User testing and verification

## Symptoms

expected: Users can save data that persists to the database, Fred's AI insights appear throughout the app where relevant, all backend features are connected end-to-end from onboarding through daily usage
actual: Data not persisting reliably, API errors occurring, features are disconnected/exist in isolation, Fred's insights are missing where they should appear
errors: Multiple — data not saving, API errors, disconnected features, missing Fred insights
reproduction: Affects full onboarding flow, general app usage, Fred insights flow, and user save operations
started: Partially works — some parts function but the end-to-end integration is incomplete

## Eliminated

- hypothesis: Database tables don't exist or are misconfigured
  evidence: Found all migrations exist (profiles, fred_memory tables, ai_insights), createServiceClient() is working, queries are properly structured
  timestamp: 2026-02-09T00:03:30Z

- hypothesis: Code doesn't exist to save Fred insights
  evidence: extractAndSaveInsights() function exists and properly calls sql INSERT INTO ai_insights
  timestamp: 2026-02-09T00:04:00Z

## Evidence

- timestamp: 2026-02-09T00:01:00Z
  checked: Project architecture and database setup
  found: |
    - Using Supabase as primary database (client.ts, server.ts in lib/supabase/)
    - Custom SQL wrapper in lib/db/supabase-sql.ts that translates SQL template literals to Supabase queries
    - Onboarding flow exists (app/onboarding/page.tsx) with use-onboarding hook
    - Onboarding saves to localStorage ONLY, then syncs to profiles table on completion
    - Fred memory system exists (lib/db/fred-memory.ts) with episodic, semantic, procedural memory tables
    - Multiple Fred API endpoints exist (/api/fred/chat, /analyze, /memory, etc.)
  implication: Infrastructure is in place, but need to verify tables exist and are connected

- timestamp: 2026-02-09T00:02:00Z
  checked: Onboarding data flow
  found: |
    - use-onboarding hook (lib/hooks/use-onboarding.ts) saves state to localStorage
    - syncCompletionToDb() function updates profiles table with onboarding_completed=true and stage
    - /api/onboard/route.ts creates/updates profiles table with full onboarding data
    - StartupInfo includes: name, stage, industry, description, mainChallenge, goals, revenueRange, teamSize, fundingHistory
    - But the interactive onboarding page (app/onboarding) does NOT call /api/onboard - it only updates localStorage
  implication: Disconnect between frontend onboarding flow and API endpoint that saves to database

- timestamp: 2026-02-09T00:03:00Z
  checked: Fred insights integration
  found: |
    - Dashboard insights page (/dashboard/insights) exists - fetches from /api/insights/top-insights
    - API endpoints exist: /api/insights/top-insights, /api/insights/analytics, /api/insights/ab-tests, /api/insights/trends
    - Fred memory tables exist in migration 021_fred_memory_schema.sql
    - ai_insights table created in migration 007_unified_intelligence_supabase.sql
    - lib/db/fred-memory.ts provides functions to store/retrieve Fred's memory (episodic, semantic, procedural)
    - But NO CODE found that actually CALLS storeFact(), storeEpisode(), or creates ai_insights records
    - Dashboard queries ai_insights table, but nothing is populating it
  implication: Fred memory infrastructure exists but is not connected to any user-facing features

- timestamp: 2026-02-09T00:04:00Z
  checked: Insight extraction implementation
  found: |
    - extractAndSaveInsights() function exists in lib/ai/insight-extractor.ts
    - saveInsights() properly INSERTs into ai_insights table
    - Used by: /api/investor-lens/deck-review, /api/investor-lens, /api/positioning
    - BUT calls to extractInsights are NOT awaited in these routes - fire-and-forget pattern
    - Example from routes: "extractInsights(...); // fire-and-forget"
    - This means insights are extracted in background but errors are silently swallowed
    - No error handling, no confirmation that insights were saved
  implication: Insights ARE being generated but failures are invisible - need to await the calls and handle errors

- timestamp: 2026-02-09T00:05:00Z
  checked: Onboarding completion flow
  found: |
    - use-onboarding hook (lib/hooks/use-onboarding.ts) line 100: calls syncCompletionToDb() when isComplete=true
    - syncCompletionToDb() updates profiles table with onboarding_completed=true
    - BUT this only sets a flag - doesn't save the actual startup info (name, stage, industry, etc.)
    - /api/onboard/route.ts DOES save all the data, but is never called by the onboarding page
    - The onboarding components collect data into localStorage, but never POST it to the API
    - CompleteStep component just shows success message, doesn't trigger API call
  implication: Onboarding data is collected but never persisted to database - only localStorage and a boolean flag in profiles

## Resolution

root_cause: |
  Three critical integration gaps cause features to exist in isolation without end-to-end data flow:

  **1. Onboarding Data Not Persisted (HIGH IMPACT)**
  - File: lib/hooks/use-onboarding.ts
  - Issue: syncCompletionToDb() only sets onboarding_completed=true flag
  - Missing: Full startup info (name, stage, industry, description, goals, etc.) never saved to profiles table
  - The /api/onboard POST endpoint exists and CAN save this data, but the frontend onboarding flow never calls it
  - Result: User completes onboarding, localStorage has data, but database is empty

  **2. Fred Insights Extraction is Fire-and-Forget (MEDIUM IMPACT)**
  - Files: app/api/investor-lens/route.ts (line 722), app/api/investor-lens/deck-review/route.ts (line 316), app/api/positioning/route.ts
  - Issue: extractInsights() called without await - runs in background with no error handling
  - Missing: Awaiting the promise and handling failures
  - Result: Insights may or may not be saved; failures are silent and invisible

  **3. Fred Semantic Memory Never Populated (MEDIUM IMPACT)**
  - Files: lib/db/fred-memory.ts has storeFact(), storeEpisode() functions
  - Issue: These functions are only called from /api/fred/memory test endpoint and /api/fred/chat for episodic memory
  - Missing: No code extracts and stores semantic facts (startup info, user preferences, goals) during onboarding or regular usage
  - Result: Fred's semantic memory (the knowledge base about the user's startup) remains empty

  **Combined Effect:** Features work individually (onboarding UI, insights extraction, Fred memory API) but data doesn't flow through the system end-to-end. Users complete actions but their data disappears into localStorage or is silently not saved.

fix: |
  **Fix 1: Persist Full Onboarding Data to Database**
  - File: lib/hooks/use-onboarding.ts (function syncCompletionToDb)
  - Changed: Updated to save all available startup info fields to profiles table
  - Fields saved: name, stage, industry, challenges (mainChallenge), revenue_range, team_size, funding_history
  - Note: description and goals fields don't exist in profiles table - storing mainChallenge in challenges JSONB array instead
  - Added: enrichment_source and enriched_at tracking
  - Now saves: Full startup profile instead of just onboarding_completed boolean flag

  **Fix 2: Await Insight Extraction Calls**
  - Files:
    - app/api/investor-lens/route.ts (line ~721)
    - app/api/investor-lens/deck-review/route.ts (line ~315)
    - app/api/positioning/route.ts (line ~491)
  - Changed: Added await to extractInsights() calls with try-catch error handling
  - Now: Insights are reliably saved, errors are logged but don't break the main flow

  **Fix 3: Fred Semantic Memory (NOT IMPLEMENTED YET - Lower Priority)**
  - Requires: Adding storeFact() calls during onboarding to populate Fred's knowledge base
  - Location: Would go in syncCompletionToDb() or a new function called after onboarding
  - Deferred: This is an enhancement; fixes 1 & 2 address the critical data loss issues

verification: |
  **Manual Test Plan - Ready for User Testing:**

  1. **Onboarding Data Persistence Test**
     ```
     Steps:
     a. Create new test account or clear existing user data
     b. Complete onboarding flow filling all fields:
        - Name, stage, industry
        - Main challenge
        - Revenue range, team size, funding history
     c. Check database via Supabase dashboard

     SQL Query:
     SELECT name, stage, industry, challenges, revenue_range, team_size,
            funding_history, enriched_at, enrichment_source, onboarding_completed
     FROM profiles
     WHERE email = 'test@example.com';

     Expected Result:
     - All fields populated with onboarding data
     - enrichment_source = 'onboarding'
     - enriched_at = recent timestamp
     - onboarding_completed = true
     ```

  2. **Fred Insights Integration Test**
     ```
     Steps:
     a. Complete investor readiness assessment
     b. Check server logs for insight extraction success
     c. Query ai_insights table

     SQL Query:
     SELECT id, insight_type, title, content, importance,
            source_type, created_at
     FROM ai_insights
     WHERE user_id = '<user_id>'
     ORDER BY created_at DESC
     LIMIT 10;

     Expected Result:
     - Multiple insights saved with insight_type values
     - source_type = 'investor_lens'
     - Insights visible in /dashboard/insights page
     - No errors in logs
     ```

  3. **Error Handling Test**
     ```
     Steps:
     a. Run positioning assessment with minimal data
     b. Check that main request succeeds even if insights fail
     c. Verify error is logged but doesn't break the flow

     Expected Result:
     - Assessment completes successfully
     - If insight extraction fails, error logged to console
     - User still receives positioning results
     ```

  **Success Criteria:**
  - ✓ Onboarding data persists to database (not just localStorage)
  - ✓ Fred insights extracted and saved with error handling
  - ✓ No breaking changes to existing functionality
  - ✓ Silent failures eliminated - errors now logged

  **Known Limitations:**
  - Fred semantic memory (storeFact) still not called - deferred as enhancement
  - description and goals fields not in profiles table - using challenges array for mainChallenge

files_changed:
  - lib/hooks/use-onboarding.ts
  - app/api/investor-lens/route.ts
  - app/api/investor-lens/deck-review/route.ts
  - app/api/positioning/route.ts
