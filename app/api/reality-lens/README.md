# Reality Lens API

Fred Carey's "5 Dimensions of Reality" framework for analyzing startup ideas using AI.

## Endpoints

### POST `/api/reality-lens`

Analyze a startup idea across 5 critical dimensions.

**Request Body:**
```json
{
  "idea": "AI-powered platform that helps founders validate their startup ideas",
  "stage": "Pre-seed", // optional
  "market": "B2B SaaS for founders" // optional
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "overallScore": 72,
    "dimensions": {
      "feasibility": {
        "score": 75,
        "analysis": "Technical implementation is straightforward with existing AI APIs..."
      },
      "economics": {
        "score": 68,
        "analysis": "Subscription model has proven viability in founder tools space..."
      },
      "demand": {
        "score": 80,
        "analysis": "Strong market need from 10,000+ founders seeking validation..."
      },
      "distribution": {
        "score": 65,
        "analysis": "Founder communities and accelerators provide clear channels..."
      },
      "timing": {
        "score": 72,
        "analysis": "AI adoption in founder tools is accelerating rapidly..."
      }
    },
    "strengths": [
      "Clear problem/solution fit for founder validation",
      "Growing AI adoption creates market tailwinds",
      "Multiple monetization paths available"
    ],
    "weaknesses": [
      "Competitive landscape includes established players",
      "Customer acquisition may be slow initially",
      "AI accuracy could be questioned by skeptical founders"
    ],
    "recommendations": [
      "Focus on one specific founder persona initially",
      "Build social proof through case studies quickly",
      "Integrate with existing founder workflows (Notion, Slack)"
    ],
    "createdAt": "2025-01-15T10:30:00Z"
  },
  "message": "Idea analyzed successfully"
}
```

**Validation:**
- `idea` is required (20-2000 characters)
- `stage` is optional (e.g., "Pre-seed", "Seed", "Series A")
- `market` is optional (e.g., "B2B SaaS", "Consumer mobile")

**Error Responses:**

400 Bad Request:
```json
{
  "success": false,
  "error": "Startup idea is required"
}
```

500 Internal Server Error:
```json
{
  "success": false,
  "error": "Failed to analyze startup idea. Please try again."
}
```

---

### GET `/api/reality-lens`

Get user's analysis history.

**Query Parameters:**
- `userId` (optional) - Filter by user ID (defaults to authenticated user)
- `limit` (optional) - Number of results (default: 50, max: 100)
- `offset` (optional) - Pagination offset (default: 0)

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "idea": "AI-powered platform...",
      "stage": "Pre-seed",
      "market": "B2B SaaS for founders",
      "overallScore": 72,
      "dimensions": { ... },
      "strengths": [ ... ],
      "weaknesses": [ ... ],
      "recommendations": [ ... ],
      "createdAt": "2025-01-15T10:30:00Z"
    }
  ],
  "pagination": {
    "total": 15,
    "limit": 50,
    "offset": 0,
    "hasMore": false
  }
}
```

---

## Authentication

Currently uses cookie-based authentication:
- `x-user-id` header (preferred)
- `userId` cookie (fallback)
- Falls back to "anonymous" user

This will be upgraded to proper auth (Clerk/NextAuth) in production.

---

## Database Schema

```sql
CREATE TABLE reality_lens_analyses (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  idea TEXT NOT NULL,
  stage VARCHAR(100),
  market VARCHAR(255),
  overall_score INTEGER NOT NULL CHECK (overall_score >= 0 AND overall_score <= 100),
  feasibility_score INTEGER NOT NULL,
  feasibility_analysis TEXT,
  economics_score INTEGER NOT NULL,
  economics_analysis TEXT,
  demand_score INTEGER NOT NULL,
  demand_analysis TEXT,
  distribution_score INTEGER NOT NULL,
  distribution_analysis TEXT,
  timing_score INTEGER NOT NULL,
  timing_analysis TEXT,
  strengths JSONB DEFAULT '[]',
  weaknesses JSONB DEFAULT '[]',
  recommendations JSONB DEFAULT '[]',
  created_at TIMESTAMP DEFAULT NOW()
);
```

**Indexes:**
- `user_id` - Fast user lookups
- `created_at DESC` - Recent analyses first
- `overall_score DESC` - Top-scoring ideas

---

## The 5 Dimensions Framework

**FEASIBILITY (0-100)** - Can this be built?
- Technical complexity and expertise required
- Time to market and development resources
- Dependencies on emerging technology
- Regulatory or compliance barriers

**ECONOMICS (0-100)** - Is the business model viable?
- Revenue model clarity and sustainability
- CAC vs LTV ratio
- Path to profitability and margins
- Pricing power and competitive positioning

**DEMAND (0-100)** - Is there real market need?
- Problem severity and frequency
- Willingness to pay for solution
- Market size and growth trajectory
- Evidence of customer pain points

**DISTRIBUTION (0-100)** - Can you reach customers?
- Accessible customer acquisition channels
- Sales cycle length and complexity
- Partnership or platform opportunities
- Competitive moat and defensibility

**TIMING (0-100)** - Is the market ready?
- Market maturity and adoption readiness
- Competitive landscape dynamics
- Technology enablers availability
- Regulatory or social trends alignment

---

## AI Analysis

The API uses Fred Carey's expertise (10,000+ founders coached) to provide:
- Objective scoring across all 5 dimensions
- Specific, actionable feedback
- Pattern recognition from thousands of startups
- Honest assessment without sugar-coating

**AI Providers (fallback chain):**
1. OpenAI (GPT-4 Turbo)
2. Anthropic (Claude 3.5 Sonnet)
3. Google (Gemini 1.5 Flash)

---

## Example Usage

```typescript
// Analyze a startup idea
const response = await fetch("/api/reality-lens", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "x-user-id": "user_123" // optional
  },
  body: JSON.stringify({
    idea: "AI-powered personal trainer app that adapts to user's fitness level and goals",
    stage: "Pre-seed",
    market: "B2C fitness mobile app"
  })
});

const { data } = await response.json();
console.log("Overall Score:", data.overallScore);
console.log("Top Recommendation:", data.recommendations[0]);

// Get analysis history
const history = await fetch("/api/reality-lens?limit=10");
const { data: analyses } = await history.json();
console.log("Total analyses:", analyses.length);
```

---

## Migration

Run the migration to create the database table:

```bash
# Execute migration
psql $DATABASE_URL -f lib/db/migrations/003_reality_lens.sql

# Or use your migration tool
npm run db:migrate
```

---

## Monitoring

The API logs key events for observability:
- `[Reality Lens] Analyzing idea for user: {userId}`
- `[Reality Lens] Analysis saved with ID: {id}`
- `[Reality Lens] AI response parse error:` (on failures)
- `[Reality Lens] Analysis error:` (on exceptions)

Monitor these logs for:
- API usage patterns
- AI response quality
- Error rates and types
- User engagement metrics
