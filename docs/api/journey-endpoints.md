# Journey Dashboard API Endpoints

## Overview
The Journey Dashboard uses 4 main API endpoints to display user progress, insights, milestones, and timeline events.

All endpoints require authentication via server-side session (handled by `requireAuth()`).

---

## 1. GET /api/journey/stats

**Purpose**: Fetch aggregate statistics for the dashboard header cards

**Response Structure**:
```typescript
{
  success: true,
  data: {
    ideaScore: number | null,           // Latest Reality Lens score
    investorReadiness: number | null,   // Latest Investor Score
    executionStreak: number,            // Consecutive days with activity
    milestones: {
      completed: number,
      inProgress: number,
      pending: number,
      total: number
    },
    insights: {
      total: number,
      active: number,                   // Not dismissed
      pinned: number,
      highImportance: number            // importance >= 7
    }
  }
}
```

**Example Usage**:
```bash
curl http://localhost:3000/api/journey/stats \
  -H "Cookie: your-session-cookie"
```

**Expected Response** (empty state):
```json
{
  "success": true,
  "data": {
    "ideaScore": null,
    "investorReadiness": null,
    "executionStreak": 0,
    "milestones": {
      "completed": 0,
      "inProgress": 0,
      "pending": 0,
      "total": 0
    },
    "insights": {
      "total": 0,
      "active": 0,
      "pinned": 0,
      "highImportance": 0
    }
  }
}
```

---

## 2. GET /api/journey/insights

**Purpose**: Fetch AI-generated insights for the user

**Query Parameters**:
- `source_type` (optional): Filter by source type (e.g., "reality_lens", "pitch_deck")
- `insight_type` (optional): Filter by type ("warning", "opportunity", "recommendation", etc.)
- `min_importance` (optional): Minimum importance level (1-10)
- `limit` (optional, default: 50): Max number of insights to return
- `pinned` (optional): Set to "true" to only show pinned (non-dismissed) insights

**Response Structure**:
```typescript
{
  success: true,
  data: Array<{
    id: string,
    type: "breakthrough" | "warning" | "opportunity" | "pattern" | "recommendation",
    title: string,
    content: string,
    importance: number,              // 1-10
    tags: string[],
    sourceType: string,
    sourceId: string,
    isDismissed: boolean,
    createdAt: string               // ISO timestamp
  }>,
  meta: {
    count: number,
    limit: number,
    filters: object
  }
}
```

**Example Usage**:
```bash
# Get all insights
curl http://localhost:3000/api/journey/insights?limit=10

# Get only high-importance insights
curl http://localhost:3000/api/journey/insights?min_importance=7
```

---

## 3. PATCH /api/journey/insights

**Purpose**: Update insight status (pin, unpin, dismiss)

**Request Body**:
```json
{
  "insightId": "uuid",
  "action": "pin" | "unpin" | "dismiss"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Insight pinned"
}
```

**Example Usage**:
```bash
curl -X PATCH http://localhost:3000/api/journey/insights \
  -H "Content-Type: application/json" \
  -d '{"insightId": "abc123", "action": "pin"}'
```

---

## 4. GET /api/journey/milestones

**Purpose**: Fetch user milestones with optional filtering

**Query Parameters**:
- `category` (optional): Filter by category ("fundraising", "product", "team", "growth", "legal")
- `status` (optional): Filter by status ("pending", "in_progress", "completed", "skipped")
- `limit` (optional, default: 100): Max number of milestones to return

**Response Structure**:
```typescript
{
  success: true,
  data: Array<{
    id: string,
    userId: string,
    title: string,
    description: string | null,
    category: string,
    status: string,
    targetDate: string | null,       // YYYY-MM-DD
    completedAt: string | null,      // ISO timestamp
    metadata: object,
    createdAt: string,
    updatedAt: string
  }>,
  meta: {
    count: number,
    limit: number
  }
}
```

**Example Usage**:
```bash
# Get all milestones
curl http://localhost:3000/api/journey/milestones

# Get only fundraising milestones in progress
curl http://localhost:3000/api/journey/milestones?category=fundraising&status=in_progress
```

---

## 5. POST /api/journey/milestones

**Purpose**: Create a new milestone

**Request Body**:
```json
{
  "title": "Complete pitch deck",
  "description": "Upload final version with financial projections",
  "category": "fundraising",
  "targetDate": "2025-01-15",
  "metadata": {}
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "userId": "uuid",
    "title": "Complete pitch deck",
    "description": "Upload final version with financial projections",
    "category": "fundraising",
    "status": "pending",
    "targetDate": "2025-01-15",
    "createdAt": "2025-12-28T10:00:00Z"
  }
}
```

**Example Usage**:
```bash
curl -X POST http://localhost:3000/api/journey/milestones \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Complete pitch deck",
    "category": "fundraising",
    "targetDate": "2025-01-15"
  }'
```

---

## 6. PATCH /api/journey/milestones/[id]

**Purpose**: Update milestone status

**Request Body**:
```json
{
  "status": "completed"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "status": "completed",
    "completedAt": "2025-12-28T10:00:00Z"
  }
}
```

**Example Usage**:
```bash
curl -X PATCH http://localhost:3000/api/journey/milestones/abc123 \
  -H "Content-Type: application/json" \
  -d '{"status": "completed"}'
```

---

## 7. GET /api/journey/timeline

**Purpose**: Fetch unified timeline of journey events

**Query Parameters**:
- `event_type` (optional): Filter by event type
- `limit` (optional, default: 50): Max number of events
- `offset` (optional, default: 0): Pagination offset

**Response Structure**:
```typescript
{
  success: true,
  data: Array<{
    id: string,
    userId: string,
    eventType: string,               // e.g., "analysis_completed", "milestone_achieved"
    eventData: object,               // Event-specific data
    scoreBefore: number | null,
    scoreAfter: number | null,
    createdAt: string               // ISO timestamp
  }>,
  meta: {
    limit: number,
    offset: number,
    count: number
  }
}
```

**Example Usage**:
```bash
# Get recent timeline events
curl http://localhost:3000/api/journey/timeline?limit=20

# Get only milestone events
curl http://localhost:3000/api/journey/timeline?event_type=milestone_achieved
```

---

## Testing Checklist

### Initial Load Test
1. Open browser to `/dashboard/journey`
2. Should see loading skeleton
3. Should transition to empty state with:
   - "No score yet" for Idea Score
   - "Not assessed yet" for Investor Readiness
   - "0 days" for Execution Streak
   - "No insights yet" message
   - Empty milestones list
   - "No events yet" in timeline

### Error Handling Test
1. Stop the database or backend
2. Reload page
3. Should see red error card with "Unable to load journey data" message
4. Should have a "Retry" button

### With Data Test
1. Create some data manually in database:
   ```sql
   -- Insert a milestone
   INSERT INTO milestones (user_id, title, category, status)
   VALUES ('your-user-id', 'First milestone', 'fundraising', 'completed');

   -- Insert a journey event
   INSERT INTO journey_events (user_id, event_type, event_data, score_after)
   VALUES ('your-user-id', 'milestone_achieved', '{"milestoneName": "First milestone"}', 75);
   ```
2. Reload dashboard
3. Should see data populated in all sections

### Interactive Features Test
1. Pin an insight (if any exist) - should update immediately
2. Dismiss an insight - should remove from list
3. Add a new milestone - should appear at top of list
4. Mark milestone as complete - status should update

---

## Common Issues

### 401 Unauthorized
- User not logged in
- Session cookie missing
- Check authentication middleware

### 500 Internal Server Error
- Database connection issue
- Check Supabase database is running
- Verify environment variables (DATABASE_URL)

### Empty Data
- User has not performed any analyses yet
- Migration not run (check tables exist)
- UserId mismatch between frontend and backend

### Type Mismatches
- Check that frontend interfaces match API response structure
- Verify camelCase/snake_case conversions are correct
