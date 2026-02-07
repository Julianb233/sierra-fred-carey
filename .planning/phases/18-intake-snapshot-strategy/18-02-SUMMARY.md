# 18-02 Summary: Auto-Enrichment Extractor + Strategy Reframing

## Status: COMPLETE

## What was done

### Task 1: Auto-enrichment extractor and chat wiring

1. **Enrichment extractor** (`lib/fred/enrichment/extractor.ts`) -- New heuristic (non-AI) extractor that mines user conversation messages for profile-relevant data. Exports `extractProfileEnrichment()` which scans user messages for:
   - **Industry** -- keyword matching against 20+ industry categories (SaaS, FinTech, HealthTech, etc.)
   - **Revenue hints** -- regex for dollar amounts near MRR/ARR/revenue keywords
   - **Team size** -- regex for numbers near "team", "employees", "people", "engineers", etc.
   - **Funding status** -- keyword matching for "raised", "bootstrapped", "seed", "series", "angel", etc.
   - **Challenges** -- sentences containing "struggling with", "challenge", "problem", "stuck on", etc.
   - **Competitors** -- sentences containing "competitor", "competing with", "vs", "alternative", etc.
   - **Metrics** -- regex for 13 common startup metrics (MRR, ARR, CAC, LTV, churn, NPS, DAU, MAU, burn rate, runway, GMV, conversion rate, revenue growth)
   - Returns `null` if no enrichment data was found (avoids unnecessary DB writes)

2. **Chat route wiring** (`app/api/fred/chat/route.ts`) -- Added fire-and-forget enrichment after both streaming and non-streaming response paths:
   - Imports `extractProfileEnrichment` and `createServiceClient`
   - `fireEnrichment()` helper runs asynchronously without blocking the response
   - Fetches existing profile to avoid overwriting existing data
   - Only updates fields that are currently null/empty
   - Merges arrays (challenges, competitors) and objects (metrics) with existing data
   - Sets `enriched_at` and `enrichment_source = 'conversation'` on update
   - All errors are caught and logged, never thrown -- completely non-blocking

### Task 2: Strategy reframing UI and API

1. **Reframe API** (`app/api/dashboard/strategy/reframe/route.ts`) -- POST endpoint that:
   - Authenticates user via `requireAuth()`
   - Validates request body: `challenge` (required, min 20 chars), `currentApproach` (optional), `constraints` (optional)
   - Builds system prompt using Fred's identity from `fred-brain.ts`, referencing the 9-step startup process and core principles
   - Uses `generate()` from `@/lib/ai/fred-client` with Fred's voice
   - Returns structured JSON with 6 sections: `reframed_problem`, `root_causes`, `alternative_approaches` (3 with risk levels), `recommended_action`, `metrics_to_track`, `timeline`
   - Returns 401 if not authenticated, 400 if validation fails, 502 if AI response parsing fails

2. **Reframing page** (`app/dashboard/strategy/reframing/page.tsx`) -- "use client" page at `/dashboard/strategy/reframing`:
   - **Input section**: 3 textareas (challenge required, current approach optional, constraints optional) with "Reframe with Fred" submit button
   - **Loading state**: 6 skeleton cards with pulse animation while API processes
   - **Results section**: 6 cards matching API response sections, each with icon and title:
     1. Reframed Problem (Lightbulb icon)
     2. Root Causes (Search icon) -- numbered list
     3. Alternative Approaches (Compass icon) -- 3 sub-cards with risk level badges
     4. Recommended Action (Target icon) -- orange accent border (highlighted card)
     5. Metrics to Track (BarChart3 icon) -- bulleted list
     6. Timeline (Clock icon)
   - **Error state**: friendly error message with retry button
   - **Footer**: "Continue this conversation with Fred" link to `/chat`
   - Responsive layout matching existing dashboard card styling with orange (#ff6a1a) accent theme

## Files created
- `lib/fred/enrichment/extractor.ts` -- Conversation-based profile enrichment extractor
- `app/api/dashboard/strategy/reframe/route.ts` -- POST endpoint for strategy reframing
- `app/dashboard/strategy/reframing/page.tsx` -- Strategy Reframing UI page

## Files modified
- `app/api/fred/chat/route.ts` -- Added enrichment imports and fire-and-forget enrichment calls

## Verification
- `npx tsc --noEmit` passes with zero errors
- All 4 files exist and contain expected exports/imports
- `extractProfileEnrichment` is exported from extractor and imported in chat route
- Reframe API and page exist at expected paths
