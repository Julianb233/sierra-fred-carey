/**
 * INTEGRATION EXAMPLE: How to use ExperimentDetailModal in the Monitoring Dashboard
 *
 * This file shows how to integrate the ExperimentDetailModal into the main
 * monitoring dashboard page. Copy relevant sections to:
 * /app/dashboard/monitoring/page.tsx
 */

"use client";

import { useState } from "react";
import { ExperimentDetailModal } from "@/components/monitoring/ExperimentDetailModal";
import type { UIExperiment } from "@/types/monitoring";

export default function MonitoringDashboardExample() {
  // State for modal control
  const [selectedExperiment, setSelectedExperiment] = useState<UIExperiment | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  // Mock experiments data - replace with real data from your API
  const experiments: UIExperiment[] = [
    {
      id: "exp-001",
      name: "Homepage CTA Test",
      status: "active",
      variants: ["control", "variant-a"],
      traffic: 50,
      startDate: new Date().toISOString(),
      winner: "variant-a",
      significance: 96.5,
    },
    {
      id: "exp-002",
      name: "Pricing Page Layout",
      status: "completed",
      variants: ["control", "variant-b"],
      traffic: 100,
      startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      endDate: new Date().toISOString(),
      winner: "control",
      significance: 98.2,
    },
  ];

  // Handler for opening modal with experiment details
  const handleViewDetails = (experiment: UIExperiment) => {
    setSelectedExperiment(experiment);
    setModalOpen(true);
  };

  // Handler for promoting winner
  const handlePromote = async (experimentName: string) => {
    try {
      const response = await fetch(`/api/ab-testing/promotion/promote`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          experimentName,
          // Optional parameters:
          dryRun: false,
          rolloutPercentage: 100,
          notifyTeam: true,
        }),
      });

      const result = await response.json();

      if (result.success) {
        console.log("Successfully promoted:", experimentName);
        // Optionally: Show success toast, refresh data, etc.

        // Refresh experiment list
        // refreshExperiments();
      } else {
        console.error("Failed to promote:", result.error);
        // Optionally: Show error toast
      }
    } catch (error) {
      console.error("Error promoting experiment:", error);
      // Optionally: Show error toast
    }
  };

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">A/B Test Monitoring</h1>

      {/* Example: Experiment Cards/List */}
      <div className="grid gap-4">
        {experiments.map((experiment) => (
          <div
            key={experiment.id}
            className="p-4 border rounded-lg hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => handleViewDetails(experiment)}
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-lg">{experiment.name}</h3>
                <p className="text-sm text-gray-500">
                  Status: {experiment.status} | Variants: {experiment.variants.length}
                </p>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleViewDetails(experiment);
                }}
                className="px-4 py-2 bg-[#ff6a1a] text-white rounded hover:bg-[#ff6a1a]/90"
              >
                View Details
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal Component */}
      <ExperimentDetailModal
        experiment={selectedExperiment}
        open={modalOpen}
        onOpenChange={setModalOpen}
        onPromote={handlePromote}
        userId="user-123" // Optional: Pass actual user ID
      />
    </div>
  );
}

/**
 * ALTERNATIVE INTEGRATION PATTERNS
 */

// Pattern 1: Using with ExperimentList component
export function WithExperimentListExample() {
  const [selectedExperiment, setSelectedExperiment] = useState<UIExperiment | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      {/*
      <ExperimentList
        experiments={experiments}
        onExperimentClick={(exp) => {
          setSelectedExperiment(exp);
          setModalOpen(true);
        }}
      />
      */}

      <ExperimentDetailModal
        experiment={selectedExperiment}
        open={modalOpen}
        onOpenChange={setModalOpen}
        onPromote={async (name) => {
          // Promotion logic
        }}
      />
    </>
  );
}

// Pattern 2: Using with URL state (shareable links)
export function WithURLStateExample() {
  const [selectedExperiment, setSelectedExperiment] = useState<UIExperiment | null>(null);

  // Read experiment ID from URL
  // const searchParams = useSearchParams();
  // const experimentId = searchParams.get('experiment');

  // Open modal automatically if URL has experiment ID
  // useEffect(() => {
  //   if (experimentId) {
  //     const exp = experiments.find(e => e.id === experimentId);
  //     if (exp) {
  //       setSelectedExperiment(exp);
  //     }
  //   }
  // }, [experimentId]);

  return (
    <>
      {/* Your dashboard content */}

      <ExperimentDetailModal
        experiment={selectedExperiment}
        open={!!selectedExperiment}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedExperiment(null);
            // Update URL: router.push('/dashboard/monitoring');
          }
        }}
        onPromote={async (name) => {
          // Promotion logic
        }}
      />
    </>
  );
}

// Pattern 3: Using with data hooks (recommended)
export function WithDataHooksExample() {
  const [selectedExperimentName, setSelectedExperimentName] = useState<string | null>(null);

  // Use the custom hook
  // const { experiment, loading, error } = useExperimentDetail(selectedExperimentName);

  return (
    <>
      {/* Dashboard content */}

      <ExperimentDetailModal
        experiment={null /* experiment from hook */}
        open={!!selectedExperimentName}
        onOpenChange={(open) => {
          if (!open) setSelectedExperimentName(null);
        }}
        onPromote={async (name) => {
          // Use promotion workflow hook
          // await promoteWinner(name);
        }}
      />
    </>
  );
}

/**
 * RECOMMENDED IMPLEMENTATION STEPS:
 *
 * 1. Add state management to monitoring page:
 *    - const [selectedExperiment, setSelectedExperiment] = useState<UIExperiment | null>(null);
 *    - const [modalOpen, setModalOpen] = useState(false);
 *
 * 2. Add click handlers to experiment list items:
 *    - onClick={() => { setSelectedExperiment(exp); setModalOpen(true); }}
 *
 * 3. Add promotion handler:
 *    - const handlePromote = async (name: string) => { ... }
 *
 * 4. Add modal component at end of page:
 *    - <ExperimentDetailModal experiment={selectedExperiment} open={modalOpen} ... />
 *
 * 5. Test the flow:
 *    - Click experiment → modal opens
 *    - Switch between tabs → content updates
 *    - Check eligibility → API call works
 *    - Promote winner → success/error handling
 *    - Close modal → state resets
 */
