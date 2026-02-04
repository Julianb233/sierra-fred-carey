# User Journey Dashboard Documentation

## Overview

The Journey Dashboard provides founders with a comprehensive view of their startup progress, combining insights, milestones, and timeline tracking in a single interface.

## Files Created

### Main Dashboard Page
- **Location**: `/app/dashboard/journey/page.tsx`
- **Route**: `/dashboard/journey`
- **Description**: Main dashboard page with tabs for Insights, Milestones, and Timeline

### Components

1. **InsightCard** (`/components/journey/insight-card.tsx`)
   - Displays AI-generated insights with visual indicators
   - Supports 5 insight types: breakthrough, warning, opportunity, pattern, recommendation
   - Features:
     - Pin/unpin functionality
     - Dismissible cards
     - Expandable content for long insights
     - Importance rating (1-5)
     - Source badge (Reality Lens, Market Analysis, etc.)

2. **MilestoneList** (`/components/journey/milestone-list.tsx`)
   - Tracks startup milestones across 5 categories
   - Categories: fundraising, product, team, growth, legal
   - Features:
     - Checkbox to mark complete
     - Status badges (pending, in_progress, completed, skipped)
     - Due date tracking with overdue/upcoming indicators
     - Category icons and badges

3. **Timeline** (`/components/journey/timeline.tsx`)
   - Chronological view of all journey events
   - Event types:
     - analysis_completed
     - milestone_achieved
     - insight_discovered
     - score_improved
     - document_created
   - Features:
     - Grouped by date
     - Visual timeline with icons
     - Score change indicators
     - Load more functionality

4. **AddMilestoneModal** (`/components/journey/add-milestone-modal.tsx`)
   - Modal form for creating new milestones
   - Fields:
     - Title (required)
     - Description (optional)
     - Category (required dropdown)
     - Target Date (optional date picker)
   - Validation and form state management

### Supporting Files

- **Loading State**: `/app/dashboard/journey/loading.tsx`
  - Skeleton loading UI matching the dashboard layout

- **Component Index**: `/components/journey/index.ts`
  - Barrel export for cleaner imports

## Dashboard Features

### Score Overview (Top Cards)
1. **Idea Score** (0-100)
   - Orange theme (#ff6a1a)
   - Progress bar visualization
   - Links to Reality Lens

2. **Investor Readiness** (0-100%)
   - Blue theme
   - Progress bar visualization
   - Links to Investor Score

3. **Execution Streak** (days)
   - Green theme
   - Motivational metric

### Tabs

#### 1. Insights Tab
- Lists all AI-generated insights
- Sorted by pinned status (pinned first)
- Empty state with CTA to Reality Lens
- Each insight shows:
  - Icon based on type
  - Title and content
  - Source badge
  - Importance rating (1-5 bars)
  - Pin/dismiss actions
  - Expandable for long content

#### 2. Milestones Tab
- Grouped and sorted milestones (in_progress → pending → completed)
- Add new milestone button
- Each milestone shows:
  - Category icon
  - Checkbox for completion
  - Status badges
  - Due date with overdue/upcoming warnings
  - Category badge

#### 3. Timeline Tab
- Reverse chronological event feed
- Date group headers
- Visual timeline with connecting line
- Event icons and descriptions
- Score change badges (+X points)
- Load more functionality

## Navigation

Added to sidebar navigation in `/app/dashboard/layout.tsx`:
- Name: "Your Journey"
- Icon: RocketIcon
- Badge: "Free" (accessible to all tiers)
- Position: Between "Reality Lens" and "Investor Score"

## Design System

### Colors
- Primary Orange: `#ff6a1a` (from globals.css)
- Insight Types:
  - Breakthrough: Green (`text-green-500`)
  - Warning: Amber (`text-amber-500`)
  - Opportunity: Blue (`text-blue-500`)
  - Pattern: Purple (`text-purple-500`)
  - Recommendation: Emerald (`text-emerald-500`)

### UI Components Used
- Card, CardHeader, CardTitle, CardContent
- Button (default, outline, ghost variants)
- Badge (default, outline, secondary variants)
- Progress
- Tabs, TabsList, TabsTrigger, TabsContent
- Dialog, DialogContent, DialogHeader, etc.
- Input, Textarea, Label
- Select, SelectTrigger, SelectContent, SelectItem
- Checkbox
- Skeleton (for loading states)

### Icons (Lucide React)
- Lightbulb (insights, breakthroughs)
- AlertTriangle (warnings)
- Target (opportunities, milestones)
- TrendingUp (patterns, timeline)
- CheckCircle (recommendations, completions)
- DollarSign (fundraising)
- Package (product)
- Users (team)
- Scale (legal)
- Flame (streak)
- Pin, X (actions)
- ChevronDown, ChevronUp (expand/collapse)
- Plus (add new)
- ArrowRight, ArrowUp (navigation, indicators)
- Clock (timeline empty state)

## Mock Data Structure

### Insights
```typescript
{
  id: string;
  insightType: "breakthrough" | "warning" | "opportunity" | "pattern" | "recommendation";
  title: string;
  content: string;
  importance: number; // 1-5
  sourceType: string; // "Reality Lens", "Market Analysis", etc.
  isPinned: boolean;
  createdAt: string; // ISO date
}
```

### Milestones
```typescript
{
  id: string;
  title: string;
  description?: string;
  category: "fundraising" | "product" | "team" | "growth" | "legal";
  status: "pending" | "in_progress" | "completed" | "skipped";
  targetDate?: string; // YYYY-MM-DD
  completedAt?: string; // ISO date
}
```

### Events
```typescript
{
  id: string;
  eventType: string; // "analysis_completed", "milestone_achieved", etc.
  eventData: any; // Event-specific data
  scoreBefore?: number;
  scoreAfter?: number;
  createdAt: string; // ISO date
}
```

## API Integration (TODO)

Replace mock data with API calls:

1. **GET /api/journey/insights**
   - Fetch user insights
   - Filter by pinned, type, importance

2. **POST /api/journey/insights/:id/pin**
   - Toggle pin status

3. **DELETE /api/journey/insights/:id**
   - Dismiss insight

4. **GET /api/journey/milestones**
   - Fetch user milestones
   - Filter by category, status

5. **POST /api/journey/milestones**
   - Create new milestone

6. **PATCH /api/journey/milestones/:id**
   - Update milestone status

7. **GET /api/journey/events**
   - Fetch timeline events
   - Pagination support

8. **GET /api/journey/stats**
   - Get score overview (idea score, investor readiness, streak)

## Accessibility Features

- All interactive elements have min-height 44px (touch targets)
- Proper ARIA labels on icon buttons (sr-only text)
- Keyboard navigation support via native components
- Focus visible states on all interactive elements
- Semantic HTML structure
- Color contrast meets WCAG AA standards

## Responsive Design

- Mobile-first approach
- Grid layouts adjust for screen size:
  - Score cards: 1 column mobile, 3 columns desktop
  - Tabs: Full width on mobile, inline on desktop
- Sidebar hidden on mobile (hamburger menu)
- Touch-friendly spacing and targets

## Performance Considerations

- Client-side rendering with loading states
- Lazy loading via Suspense boundary (loading.tsx)
- Optimized re-renders with proper key props
- useState for local state management
- Future: Consider React Query for API caching

## Future Enhancements

1. **Real-time Updates**
   - WebSocket connection for live insights
   - Toast notifications for new milestones

2. **Filtering and Search**
   - Filter insights by type, source
   - Search timeline events
   - Date range picker for timeline

3. **Export Functionality**
   - Export journey as PDF
   - CSV export for milestones

4. **Gamification**
   - Achievement badges
   - Streak rewards
   - Progress levels

5. **Collaboration**
   - Share insights with team
   - Assign milestones to team members
   - Comment on insights

6. **Analytics**
   - Track engagement with insights
   - Milestone completion rate
   - Score improvement trends

## Testing

Recommended test coverage:

1. **Component Tests** (React Testing Library)
   - InsightCard: Pin/dismiss/expand functionality
   - MilestoneList: Status changes, add new
   - Timeline: Event rendering, date grouping
   - AddMilestoneModal: Form validation, submission

2. **Integration Tests**
   - Full page navigation
   - Tab switching
   - Modal interactions

3. **E2E Tests** (Playwright/Cypress)
   - Complete user journey
   - Add milestone → mark complete → view timeline
   - Pin insight → dismiss insight

## Browser Support

- Modern browsers (Chrome, Firefox, Safari, Edge)
- Fallback styles for older browsers
- Progressive enhancement approach
