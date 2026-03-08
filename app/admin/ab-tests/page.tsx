"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PlusIcon } from "lucide-react";
import { ExperimentFeedbackCard } from "@/components/admin/experiment-feedback-card";
import type { PreRegistration } from "@/lib/feedback/pre-registration-shared";

interface ABTest {
  id: string;
  name: string;
  description: string;
  status: "running" | "completed" | "paused";
  startDate: string;
  endDate: string | null;
  preRegistration?: PreRegistration | null;
  variants: Array<{
    variantName: string;
    trafficPercentage: number;
    totalRequests: number;
    avgLatency: number;
    errorRate: number;
    thumbsUpRatio: number | null;
    avgSentimentScore: number | null;
    sessionCompletionRate: number | null;
    totalFeedbackSignals: number;
  }>;
  totalRequests: number;
  statisticalSignificance: number;
  feedbackComparison?: {
    thumbsSignificant: boolean;
    sentimentSignificant: boolean;
    sessionCompletionSignificant: boolean;
    feedbackWinner: string | null;
  };
}

type FilterTab = "all" | "running" | "completed" | "significant";

export default function ABTestsPage() {
  const router = useRouter();
  const [tests, setTests] = useState<ABTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterTab>("all");

  useEffect(() => {
    fetchTests();
  }, []);

  async function fetchTests() {
    try {
      const response = await fetch("/api/admin/ab-tests");
      if (response.ok) {
        const data = await response.json();
        // Map API response to ABTest shape
        const experiments = (data.experiments || data || []).map(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (exp: any) => ({
            id: exp.id,
            name: exp.name,
            description: exp.description || "",
            status: exp.isActive
              ? "running"
              : exp.endDate
                ? "completed"
                : "paused",
            startDate: exp.startDate || exp.createdAt,
            endDate: exp.endDate,
            preRegistration: exp.preRegistration,
            variants: (exp.variants || []).map(
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              (v: any) => ({
                variantName: v.variantName,
                trafficPercentage: v.trafficPercentage || 0,
                totalRequests: v.totalRequests || 0,
                avgLatency: v.avgLatency || 0,
                errorRate: v.errorRate || 0,
                thumbsUpRatio: v.thumbsUpRatio ?? null,
                avgSentimentScore: v.avgSentimentScore ?? null,
                sessionCompletionRate: v.sessionCompletionRate ?? null,
                totalFeedbackSignals: v.totalFeedbackSignals || 0,
              })
            ),
            totalRequests: (exp.variants || []).reduce(
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              (sum: number, v: any) =>
                sum + (parseInt(v.totalRequests, 10) || 0),
              0
            ),
            statisticalSignificance: 0,
            feedbackComparison: exp.feedbackComparison || null,
          })
        );
        setTests(experiments);
      }
    } catch (error) {
      console.error("Error fetching A/B tests:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleEndTest(testId: string) {
    try {
      const response = await fetch(`/api/admin/ab-tests/${testId}`, {
        method: "DELETE",
      });
      if (response.ok) {
        fetchTests();
      }
    } catch (error) {
      console.error("Error ending test:", error);
    }
  }

  function handleViewDetails(testId: string) {
    // For now, could navigate to a detail page
    router.push(`/admin/ab-tests/${testId}`);
  }

  const filteredTests = tests.filter((test) => {
    switch (filter) {
      case "running":
        return test.status === "running";
      case "completed":
        return test.status === "completed";
      case "significant":
        return test.statisticalSignificance >= 95 ||
          test.feedbackComparison?.thumbsSignificant ||
          test.feedbackComparison?.sentimentSignificant ||
          test.feedbackComparison?.sessionCompletionSignificant;
      default:
        return true;
    }
  });

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="space-y-4">
          {[...Array(2)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-32 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // Summary stats
  const activeTests = tests.filter((t) => t.status === "running").length;
  const totalFeedback = tests.reduce(
    (sum, t) =>
      sum + t.variants.reduce((vs, v) => vs + v.totalFeedbackSignals, 0),
    0
  );
  const significantTests = tests.filter(
    (t) =>
      t.feedbackComparison?.thumbsSignificant ||
      t.feedbackComparison?.sentimentSignificant ||
      t.feedbackComparison?.sessionCompletionSignificant
  ).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            A/B Tests
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage and analyze A/B experiments with feedback metrics
          </p>
        </div>
        <Button
          variant="orange"
          onClick={() => router.push("/admin/ab-tests/new")}
        >
          <PlusIcon className="mr-2 h-4 w-4" />
          New Experiment
        </Button>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-lg border border-gray-200 dark:border-gray-800 p-3 text-center">
          <div className="text-2xl font-bold">{activeTests}</div>
          <div className="text-xs text-muted-foreground">Active</div>
        </div>
        <div className="rounded-lg border border-gray-200 dark:border-gray-800 p-3 text-center">
          <div className="text-2xl font-bold">{totalFeedback}</div>
          <div className="text-xs text-muted-foreground">
            Feedback Signals
          </div>
        </div>
        <div className="rounded-lg border border-gray-200 dark:border-gray-800 p-3 text-center">
          <div className="text-2xl font-bold">{significantTests}</div>
          <div className="text-xs text-muted-foreground">Significant</div>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1">
        {(
          [
            ["all", "All"],
            ["running", "Running"],
            ["completed", "Completed"],
            ["significant", "Significant"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`text-sm px-3 py-1.5 rounded-md transition-colors ${
              filter === key
                ? "bg-[#ff6a1a]/10 text-[#ff6a1a] font-medium"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Experiment cards */}
      <div className="space-y-6">
        {filteredTests.map((test) => (
          <ExperimentFeedbackCard
            key={test.id}
            experiment={test}
            onEndTest={handleEndTest}
            onViewDetails={handleViewDetails}
          />
        ))}

        {filteredTests.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-gray-500 dark:text-gray-400">
                {filter === "all"
                  ? "No A/B tests found. Create your first experiment to get started."
                  : `No ${filter} experiments found.`}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
