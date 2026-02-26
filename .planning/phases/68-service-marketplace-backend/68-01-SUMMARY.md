---
phase: "68"
plan: "01"
name: "service-marketplace-schema-and-backend"
subsystem: "marketplace"
tags: ["supabase", "rls", "api-routes", "fred-tools", "stripe-connect-stub"]

dependency-graph:
  requires:
    - "66-content-library-backend"   # createServiceClient pattern
    - "63-fred-upgrade"              # tool() with inputSchema pattern
  provides:
    - "service_providers table"
    - "service_listings table"
    - "bookings table"
    - "provider_reviews table"
    - "marketplace API routes"
    - "provider-finder FRED tool (real DB)"
  affects:
    - "69-service-marketplace-frontend"  # will consume these APIs

tech-stack:
  added: []
  patterns:
    - "createServiceClient() for all DB helper queries (consistent with content.ts)"
    - "Route handler auth: createClient() + getUser() gating"
    - "FRED tool graceful degradation on DB error"
    - "Review triggers rating recalculation (updateProviderRating)"

key-files:
  created:
    - "supabase/migrations/20260225000020_service_marketplace.sql"
    - "lib/db/marketplace.ts"
    - "app/api/marketplace/route.ts"
    - "app/api/marketplace/[slug]/route.ts"
    - "app/api/marketplace/bookings/route.ts"
    - "app/api/marketplace/reviews/route.ts"
  modified:
    - "lib/fred/tools/provider-finder.ts"

decisions:
  - "provider-finder.ts kept same export name (findProviderTool) so index.ts needed no changes"
  - "Stripe Connect stubbed gracefully — stripe_account_id column present but unused"
  - "Service role client used in DB helpers (consistent with content.ts pattern)"
  - "serviceType → category mapping via keyword matching (not enum constraint)"
  - "updateProviderRating called synchronously after createReview (simpler, acceptable latency)"

metrics:
  duration: "22 minutes"
  completed: "2026-02-26"
  tasks-completed: 5
  tasks-total: 5
  build-pages: 221
  typescript-errors: 0
---

# Phase 68 Plan 01: Service Marketplace — Schema & Backend Summary

**One-liner:** Service marketplace backend with 4-table Supabase schema + RLS, 5 typed API routes, and FRED provider-finder upgraded from stub to real DB queries.

## What Was Built

### Database Migration (`supabase/migrations/20260225000020_service_marketplace.sql`)

4 tables with RLS policies:

- **service_providers** — vetted provider profiles with category check, stage_fit array, Stripe Connect stub, rating/review_count denormalized for query performance
- **service_listings** — individual service packages with price_type check (fixed/hourly/monthly/custom)
- **bookings** — founder-to-provider requests with status FSM (pending→accepted/rejected→completed/cancelled), Stripe payment intent stub
- **provider_reviews** — rated reviews with UNIQUE(user_id, provider_id) constraint; triggers rating recalculation

RLS: authenticated users can read active providers/listings; write only their own bookings/reviews; service_role has unrestricted access for admin operations.

### DB Helpers (`lib/db/marketplace.ts`)

6 exported functions following the `lib/db/content.ts` pattern:

- `getProviders(filters?)` — filter by category, stage (array contains), full-text search via ilike
- `getProvider(slug)` — single provider with joined listings[] and reviews[]
- `createBooking(userId, data)` — inserts booking with status "pending"
- `getUserBookings(userId)` — bookings with provider name/slug joined
- `createReview(userId, data)` — validates booking ownership + completion if bookingId provided
- `updateProviderRating(providerId)` — recalculates avg from all reviews, updates denormalized rating + review_count

### API Routes (5 endpoints)

- `GET /api/marketplace` — list providers, auth required, supports `?category=&stage=&search=`
- `GET /api/marketplace/[slug]` — provider detail with listings + reviews, 404 if not found
- `GET /api/marketplace/bookings` — user's booking history
- `POST /api/marketplace/bookings` — create booking, validates providerId required
- `POST /api/marketplace/reviews` — submit review, validates rating 1-5, calls updateProviderRating

### FRED Tool Upgrade (`lib/fred/tools/provider-finder.ts`)

Replaced "coming soon" stub with real DB implementation:
- Maps serviceType string (legal/finance/marketing/growth/tech/hr/operations) to category enum via keyword matching
- Filters by founder stage when provided
- Returns top 5 providers with rating, review_count, is_verified
- Same graceful degradation pattern as content-recommender.ts
- Same export name `findProviderTool` — `index.ts` needed zero changes

## Decisions Made

| Decision | Rationale |
|---|---|
| Same export name in provider-finder.ts | Avoided touching index.ts — zero ripple risk |
| Stripe Connect stubbed (stripe_account_id column only) | Complex setup deferred; column is present for future migration |
| serviceType → category keyword matching | More flexible than enum; handles "lawyer", "attorney", "contract" all mapping to "legal" |
| updateProviderRating called sync after createReview | Simpler than background job; acceptable latency for review submission |
| Service role client in all DB helpers | Consistent with content.ts pattern; auth enforcement at API route layer |

## Deviations from Plan

None — plan executed exactly as written.

## Build Results

- 221 pages compiled
- 0 TypeScript errors
- 1 pre-existing warning (app/global-error.tsx — unrelated to this phase)

## Next Phase Readiness

Phase 69 (Service Marketplace Frontend) can build immediately on:
- `GET /api/marketplace` for provider listing page
- `GET /api/marketplace/[slug]` for provider detail page
- `POST /api/marketplace/bookings` for booking flow
- `POST /api/marketplace/reviews` for review submission
- FRED will recommend real providers when marketplace is populated
