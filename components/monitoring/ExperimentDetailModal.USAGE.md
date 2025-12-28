# ExperimentDetailModal Usage Guide

## Overview
A comprehensive modal component for displaying detailed experiment information with tabs for variants, promotion status, and performance metrics.

## Location
`/root/github-repos/sierra-fred-carey/components/monitoring/ExperimentDetailModal.tsx`

## Component Props

```typescript
interface ExperimentDetailModalProps {
  experiment: UIExperiment | null;  // Experiment data to display
  open: boolean;                     // Controls modal visibility
  onOpenChange: (open: boolean) => void;  // Callback when modal should close
  onPromote?: (experimentName: string) => void;  // Optional: Callback when promoting winner
  userId?: string;                   // Optional: User ID for API calls
}
```

## UIExperiment Type

```typescript
interface UIExperiment {
  id: string;
  name: string;
  status: "active" | "completed" | "paused" | "draft";
  variants: string[];
  traffic: number;
  startDate: string;
  endDate?: string;
  winner?: string;
  significance?: number;
}
```

## Features

### Three Tabs

1. **Variants Tab**
   - Uses `VariantComparison` component
   - Shows conversion rates, visitors, improvements
   - Highlights winner with visual badges
   - Statistical significance display

2. **Promotion Tab**
   - Uses `PromotionStatus` component
   - Async eligibility checking via API
   - Safety checks display
   - Promotion recommendation badge
   - "Promote Winner" action button

3. **Performance Tab**
   - Custom metrics display
   - Latency comparison across variants
   - Error rate tracking
   - Color-coded thresholds (green < 2%, yellow < 5%, red >= 5%)

### Status Badges
- Active/Completed status
- Winner badge with variant name
- Confidence level percentage

### Actions
- "Check Promotion Eligibility" button
- "Promote Winner" button (shown when eligible)
- Loading states for async operations
- Automatic modal close on successful promotion

## Basic Usage Example

```typescript
import { ExperimentDetailModal } from "@/components/monitoring/ExperimentDetailModal";
import { useState } from "react";

export default function MonitoringDashboard() {
  const [selectedExperiment, setSelectedExperiment] = useState<UIExperiment | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const handlePromote = async (experimentName: string) => {
    console.log("Promoting experiment:", experimentName);
    // Call your promotion API
    await fetch(`/api/ab-testing/promotion/promote`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ experimentName }),
    });
  };

  const handleExperimentClick = (experiment: UIExperiment) => {
    setSelectedExperiment(experiment);
    setModalOpen(true);
  };

  return (
    <div>
      {/* Your experiment list */}
      <button onClick={() => handleExperimentClick(experiment)}>
        View Details
      </button>

      {/* Modal */}
      <ExperimentDetailModal
        experiment={selectedExperiment}
        open={modalOpen}
        onOpenChange={setModalOpen}
        onPromote={handlePromote}
        userId="user-123"
      />
    </div>
  );
}
```

## API Integration

### Promotion Eligibility Check
```typescript
GET /api/ab-testing/promotion/check?experimentName={name}&userId={userId}

Response:
{
  success: boolean;
  data: {
    eligible: boolean;
    experimentId: string;
    experimentName: string;
    winningVariant: string | null;
    confidenceLevel: number | null;
    improvement: number | null;
    safetyChecks: SafetyCheck[];
    recommendation: "promote" | "wait" | "manual_review" | "not_ready";
    reason: string;
  };
}
```

### Promotion Action
Called via the `onPromote` prop callback - implement your own promotion logic.

## Styling

- Uses brand color `#ff6a1a` for primary actions
- Max width: `max-w-4xl`
- Responsive design with mobile-first approach
- Dark mode support via Tailwind classes
- Smooth animations for tab transitions

## Current Limitations

1. **Mock Variant Data**: Currently uses hardcoded variant data in the component. In production, this should come from the `experiment` prop with an extended interface that includes variant details.

2. **API URLs**: The component makes fetch calls to:
   - `/api/ab-testing/promotion/check` - Needs to exist
   - Called via `onPromote` prop - Implement your promotion endpoint

## Next Steps for Integration

1. **Extend UIExperiment Interface**:
   ```typescript
   interface UIExperiment {
     // ... existing fields
     variantDetails?: UIVariant[];  // Add this
   }
   ```

2. **Pass Real Variant Data**:
   - Modify the component to use `experiment.variantDetails` instead of `mockVariants`
   - Or fetch variant details separately when modal opens

3. **Integrate into Dashboard**:
   - Add modal state management to monitoring page
   - Connect experiment list clicks to modal open
   - Implement promotion handler

4. **Connect to Real APIs**:
   - Ensure promotion check endpoint exists
   - Implement promotion execution endpoint
   - Add error handling for API failures

## Dependencies

- `@/components/ui/dialog`
- `@/components/ui/tabs`
- `@/components/ui/button`
- `@/components/ui/badge`
- `@/components/ui/card`
- `@/components/monitoring/VariantComparison`
- `@/components/monitoring/PromotionStatus`
- `lucide-react` (for icons)
- `@/lib/utils` (for cn function)

## File Size
319 lines, 11KB

## Created By
Adam-API on 2025-12-28 17:15
