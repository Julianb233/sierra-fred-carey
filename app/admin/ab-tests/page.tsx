"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { PlusIcon, TrendingUpIcon, TrendingDownIcon } from "lucide-react";

interface VariantStats {
  variantName: string;
  trafficPercentage: number;
  totalRequests: number;
  avgRating: number;
  conversionRate: number;
}

interface ABTest {
  id: string;
  name: string;
  description: string;
  status: "running" | "completed" | "paused";
  startDate: string;
  endDate: string | null;
  variants: VariantStats[];
  totalRequests: number;
  statisticalSignificance: number;
}

export default function ABTestsPage() {
  const [tests, setTests] = useState<ABTest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTests();
  }, []);

  async function fetchTests() {
    try {
      const response = await fetch("/api/admin/ab-tests");
      if (response.ok) {
        const data = await response.json();
        setTests(data);
      }
    } catch (error) {
      console.error("Error fetching A/B tests:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleEndTest(testId: string) {
    try {
      const response = await fetch(`/api/admin/ab-tests/${testId}/end`, {
        method: "POST",
      });

      if (response.ok) {
        fetchTests();
      }
    } catch (error) {
      console.error("Error ending test:", error);
    }
  }

  async function handleAdjustTraffic(
    testId: string,
    variantName: string,
    percentage: number
  ) {
    try {
      const response = await fetch(`/api/admin/ab-tests/${testId}/traffic`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ variantName, percentage }),
      });

      if (response.ok) {
        fetchTests();
      }
    } catch (error) {
      console.error("Error adjusting traffic:", error);
    }
  }

  function getStatusColor(status: string) {
    switch (status) {
      case "running":
        return "bg-green-500";
      case "completed":
        return "bg-blue-500";
      case "paused":
        return "bg-yellow-500";
      default:
        return "bg-gray-500";
    }
  }

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
              <CardHeader>
                <Skeleton className="h-6 w-64" />
                <Skeleton className="h-4 w-48" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-32 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            A/B Tests
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage and analyze A/B experiments
          </p>
        </div>
        <Button variant="orange">
          <PlusIcon className="mr-2 h-4 w-4" />
          New Test
        </Button>
      </div>

      <div className="space-y-6">
        {tests.map((test) => (
          <Card key={test.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-3">
                    <CardTitle>{test.name}</CardTitle>
                    <Badge
                      variant="outline"
                      className="capitalize"
                    >
                      <div
                        className={`w-2 h-2 rounded-full mr-2 ${getStatusColor(
                          test.status
                        )}`}
                      />
                      {test.status}
                    </Badge>
                  </div>
                  <CardDescription className="mt-2">
                    {test.description}
                  </CardDescription>
                  <div className="flex items-center gap-4 mt-2 text-sm text-gray-600 dark:text-gray-400">
                    <span>
                      Started: {new Date(test.startDate).toLocaleDateString()}
                    </span>
                    <span>•</span>
                    <span>Requests: {test.totalRequests.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Variants comparison */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {test.variants.map((variant, index) => {
                  const isWinning =
                    test.variants.length > 1 &&
                    variant.avgRating ===
                      Math.max(...test.variants.map((v) => v.avgRating));

                  return (
                    <div
                      key={variant.variantName}
                      className={`border rounded-lg p-4 ${
                        isWinning
                          ? "border-[#ff6a1a] bg-[#ff6a1a]/5"
                          : "border-gray-200 dark:border-gray-800"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold capitalize">
                            {variant.variantName}
                          </h4>
                          {isWinning && (
                            <TrendingUpIcon className="h-4 w-4 text-[#ff6a1a]" />
                          )}
                        </div>
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          {variant.trafficPercentage}% traffic
                        </span>
                      </div>

                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">
                            Avg Rating:
                          </span>
                          <span className="font-semibold">
                            {variant.avgRating.toFixed(2)}★
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">
                            Conversion:
                          </span>
                          <span className="font-semibold">
                            {(variant.conversionRate * 100).toFixed(1)}%
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">
                            Requests:
                          </span>
                          <span className="font-semibold">
                            {variant.totalRequests.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Statistical significance */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">
                    Statistical Significance:
                  </span>
                  <span className="font-semibold">
                    {test.statisticalSignificance.toFixed(0)}%
                    {test.statisticalSignificance >= 95 && " ✓"}
                  </span>
                </div>
                <Progress
                  value={test.statisticalSignificance}
                  className="h-2"
                />
                {test.statisticalSignificance < 95 && (
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Need 95% confidence to reach statistical significance
                  </p>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-2 border-t border-gray-200 dark:border-gray-800">
                {test.status === "running" && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEndTest(test.id)}
                    >
                      End Test
                    </Button>
                    <Button variant="outline" size="sm">
                      Adjust Traffic
                    </Button>
                  </>
                )}
                <Button variant="outline" size="sm">
                  View Details
                </Button>
                <Button variant="outline" size="sm">
                  Export Results
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}

        {tests.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-gray-500 dark:text-gray-400">
                No A/B tests found. Create your first test to get started.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
