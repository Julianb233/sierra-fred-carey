# Phase 19-01: Inbox Ops Agent Message Hub and Aggregation

## Status: COMPLETE

## What Was Built

### Types (`lib/inbox/types.ts`)
- `MessagePriority` type: "urgent" | "high" | "normal" | "low"
- `MessageSource` type: "founder-ops" | "fundraising" | "growth" | "system"
- `MessageStatus` type: "unread" | "read" | "actioned" | "dismissed"
- `InboxMessage` interface with id, userId, source, priority, status, title, summary, detail, actionUrl, agentTaskId, createdAt, readAt
- `InboxFilters` interface for source/priority/status/limit/offset filtering
- `InboxCounts` interface for badge metadata (total, unread, urgent)

### Aggregator (`lib/inbox/aggregator.ts`)
- `aggregateInboxMessages(userId, filters?)` — queries `agent_tasks` table for completed tasks, maps to prioritized `InboxMessage` objects
- `getInboxCount(userId)` — returns badge counts (total, unread, urgent)
- Priority logic: "urgent"/"critical" keywords in output → urgent; fundraising tasks → high; < 24h old → high; default → normal
- Sorting: urgent first, then high, then normal/low, with recency as tiebreaker
- Source mapping: founder_ops → "founder-ops", fundraising → "fundraising", growth → "growth"
- Action URL mapping to relevant dashboard pages
- Pagination support (default 20 per page, max 200 window)

### API Route (`app/api/inbox/route.ts`)
- `GET /api/inbox` — authenticated endpoint returning paginated inbox messages
- Query params: source, priority, status, limit (1-100), offset
- Returns `{ success, messages, meta: { total, unread, urgent } }`
- 401 for unauthenticated requests via `requireAuth()`
- Validates all filter values against allowed enums

### InboxMessage Component (`components/inbox/inbox-message.tsx`)
- Priority-coded left border: red (urgent), orange (high), gray (normal), blue (low)
- Priority dot indicator with tooltip
- Source badge with color-coded pill (purple=Founder Ops, amber=Fundraising, green=Growth)
- Urgent badge for urgent priority messages
- Bold title for unread messages, muted for read
- Summary text truncated to 2 lines via `line-clamp-2`
- Relative timestamp formatting (e.g., "2h ago", "3d ago")
- "View" button linking to actionUrl, "Dismiss" button with callback

### InboxFilter Component (`components/inbox/inbox-filter.tsx`)
- Source dropdown: All Sources, Founder Ops, Fundraising, Growth
- Priority dropdown: All Priorities, Urgent, High, Normal, Low
- Status dropdown: All, Unread, Read, Actioned
- "Clear Filters" button appears when any filter is active
- Resets offset to 0 on filter change
- Compact horizontal layout that wraps on mobile

### Inbox Page (`app/dashboard/inbox/page.tsx`)
- Page header with "Inbox" title and unread/urgent count badges
- InboxFilter component at top
- Scrollable list of InboxMessage cards
- Fetches from GET /api/inbox on mount and when filters change
- "Load More" button for pagination (20 per page)
- Empty state: "All caught up!" with checkmark icon
- Loading state: 4 skeleton message cards
- Error state: error message with retry button
- Responsive layout: max-width on desktop, full-width on mobile

## Files Created
| File | Purpose |
|------|---------|
| `lib/inbox/types.ts` | InboxMessage, MessagePriority, MessageSource type definitions |
| `lib/inbox/aggregator.ts` | Aggregator querying agent_tasks to produce prioritized InboxMessages |
| `app/api/inbox/route.ts` | GET endpoint returning paginated inbox messages |
| `components/inbox/inbox-message.tsx` | Message card component with priority indicator and actions |
| `components/inbox/inbox-filter.tsx` | Filter and sort controls for inbox |
| `app/dashboard/inbox/page.tsx` | Message hub page with list and filters |

## Verification
- All 6 files created and present
- TypeScript compiles with zero errors (`npx tsc --noEmit`)
- No new database tables (reads from existing `agent_tasks`)
- No new npm dependencies
- All key_links satisfied (aggregator imports types, API calls aggregator, page renders components)

## Architecture Notes
- Messages are derived on-the-fly from `agent_tasks` table — no separate inbox table needed
- Read/actioned/dismissed status is client-side only for now (future: persist to DB)
- Priority is computed from task output keywords, agent type, and recency
- The aggregator fetches up to 200 tasks and filters/sorts in-memory for flexibility
