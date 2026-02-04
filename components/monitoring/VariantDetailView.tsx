"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  CheckCircledIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  ReloadIcon,
  CrossCircledIcon,
} from "@radix-ui/react-icons";
import { cn } from "@/lib/utils";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import type { ExperimentComparison, VariantMetrics } from "@/lib/monitoring/ab-test-metrics";
import type { UIVariant } from "@/types/monitoring";
import { transformVariant } from "@/types/monitoring";

interface VariantDetailViewProps {
  experimentName: string;
  onClose?: () => void;
}

export function VariantDetailView({ experimentName, onClose }: VariantDetailViewProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [experiment, setExperiment] = useState<ExperimentComparison | null>(null);
  const [variants, setVariants] = useState<UIVariant[]>([]);

  const fetchExperimentDetails = async () => {
    try {
      setError(null);
      setLoading(true);

      const response = await fetch(
        `/api/monitoring/experiments/${encodeURIComponent(experimentName)}?days=7`
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch experiment: ${response.statusText}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error("Failed to load experiment data");
      }

      const experimentData: ExperimentComparison = data.data;
      setExperiment(experimentData);

      // Transform variants
      const control = experimentData.variants.find(v => v.variantName.toLowerCase() === "control");
      const controlRate = control?.conversionRate || 0;

      const transformedVariants = experimentData.variants.map(v => {
        const variant = transformVariant(v, controlRate);
        return {
          ...variant,
          isWinner: v.variantName === experimentData.winningVariant,
        };
      });

      setVariants(transformedVariants);
    } catch (err) {
      console.error("Failed to fetch experiment details:", err);
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExperimentDetails();
  }, [experimentName]);

  if (loading) {
    return (
      <Card className="animate-pulse">
        <CardHeader>
          <div className="h-6 w-48 bg-gray-200 dark:bg-gray-800 rounded mb-2"></div>
          <div className="h-4 w-64 bg-gray-200 dark:bg-gray-800 rounded"></div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-40 bg-gray-200 dark:bg-gray-800 rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !experiment) {
    return (
      <Card className="border-red-200 dark:border-red-800">
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <CrossCircledIcon className="h-12 w-12 mx-auto mb-4 text-red-500" />
            <p className="text-lg font-medium text-red-900 dark:text-red-200 mb-2">
              Failed to load experiment
            </p>
            <p className="text-sm text-red-700 dark:text-red-300 mb-4">{error}</p>
            <Button onClick={fetchExperimentDetails} variant="outline">
              <ReloadIcon className="mr-2 h-4 w-4" />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const maxConversionRate = Math.max(...variants.map((v) => v.conversionRate));

  // Prepare chart data
  const chartData = variants.map(v => ({
    variant: v.name,
    conversionRate: v.conversionRate,
    visitors: v.visitors,
    conversions: v.conversions,
    latency: v.latency || 0,
    errorRate: (v.errorRate || 0) * 100,
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-2xl">{experiment.experimentName}</CardTitle>
              <CardDescription className="mt-2">
                Detailed variant performance analysis
              </CardDescription>
            </div>
            <div className="flex items-center gap-3">
              {experiment.hasStatisticalSignificance && experiment.confidenceLevel && (
                <div className="text-right">
                  <div className="text-2xl font-bold text-green-600">
                    {experiment.confidenceLevel}%
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    Significance
                  </div>
                </div>
              )}
              {onClose && (
                <Button onClick={onClose} variant="outline" size="sm">
                  Close
                </Button>
              )}
            </div>
          </div>

          {/* Experiment metadata */}
          <div className="flex items-center gap-4 mt-4 text-sm text-gray-600 dark:text-gray-400">
            <Badge variant={experiment.isActive ? "default" : "secondary"}>
              {experiment.isActive ? "Active" : "Completed"}
            </Badge>
            <span>Started: {experiment.startDate.toLocaleDateString()}</span>
            {experiment.endDate && (
              <>
                <span>•</span>
                <span>Ended: {experiment.endDate.toLocaleDateString()}</span>
              </>
            )}
            <span>•</span>
            <span>{experiment.totalRequests.toLocaleString()} total requests</span>
            <span>•</span>
            <span>{experiment.totalUsers.toLocaleString()} unique users</span>
          </div>
        </CardHeader>
      </Card>

      {/* Performance Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Conversion Rate by Variant</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="variant" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="conversionRate" fill="#ff6a1a" name="Conversion Rate %" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Performance Metrics</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="variant" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="latency" fill="#3b82f6" name="Latency (ms)" />
                <Bar dataKey="errorRate" fill="#ef4444" name="Error Rate %" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Variant Details */}
      <div className="space-y-4">
        {variants.map((variant, index) => (
          <Card
            key={index}
            className={cn(
              "transition-all",
              variant.isWinner && "border-2 border-green-500 bg-green-50 dark:bg-green-950"
            )}
          >
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-xl">{variant.name}</CardTitle>
                  {variant.isControl && (
                    <Badge variant="outline" className="text-xs">
                      Control
                    </Badge>
                  )}
                  {variant.isWinner && (
                    <Badge className="bg-green-500 text-white flex items-center gap-1">
                      <CheckCircledIcon className="h-3 w-3" />
                      Winner
                    </Badge>
                  )}
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold text-[#ff6a1a]">
                    {variant.conversionRate.toFixed(2)}%
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    Conversion Rate
                  </div>
                </div>
              </div>
            </CardHeader>

            <CardContent>
              {/* Key metrics grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                    Visitors
                  </div>
                  <div className="text-2xl font-semibold text-gray-900 dark:text-white">
                    {variant.visitors.toLocaleString()}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                    Conversions
                  </div>
                  <div className="text-2xl font-semibold text-gray-900 dark:text-white">
                    {variant.conversions.toLocaleString()}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                    Avg Latency
                  </div>
                  <div className="text-2xl font-semibold text-gray-900 dark:text-white">
                    {variant.latency?.toFixed(0) || 0}ms
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                    Error Rate
                  </div>
                  <div className="text-2xl font-semibold text-gray-900 dark:text-white">
                    {((variant.errorRate || 0) * 100).toFixed(2)}%
                  </div>
                </div>
              </div>

              {/* Performance bar */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">
                    Relative Performance
                  </span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {((variant.conversionRate / maxConversionRate) * 100).toFixed(0)}%
                  </span>
                </div>
                <Progress
                  value={(variant.conversionRate / maxConversionRate) * 100}
                  className={cn(
                    "h-3",
                    variant.isWinner && "[&>div]:bg-green-500"
                  )}
                />
              </div>

              {/* Improvement indicator */}
              {variant.improvement !== undefined && variant.improvement !== 0 && (
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-800">
                  <div className="flex items-center gap-2">
                    {variant.improvement > 0 ? (
                      <>
                        <ArrowUpIcon className="h-5 w-5 text-green-600" />
                        <span className="text-lg font-semibold text-green-600">
                          +{variant.improvement.toFixed(2)}%
                        </span>
                      </>
                    ) : (
                      <>
                        <ArrowDownIcon className="h-5 w-5 text-red-600" />
                        <span className="text-lg font-semibold text-red-600">
                          {variant.improvement.toFixed(2)}%
                        </span>
                      </>
                    )}
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      vs control
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Alerts for this experiment */}
      {experiment.alerts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Alerts</CardTitle>
            <CardDescription>Issues detected for this experiment</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {experiment.alerts.map((alert, index) => {
                const levelColors = {
                  critical: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 border-red-200",
                  warning: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 border-yellow-200",
                  info: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 border-blue-200",
                };

                return (
                  <div
                    key={index}
                    className={cn(
                      "p-3 rounded-lg border",
                      levelColors[alert.level]
                    )}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className="text-xs">
                            {alert.level}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {alert.type}
                          </Badge>
                          {alert.variantName && (
                            <span className="text-xs font-medium">
                              {alert.variantName}
                            </span>
                          )}
                        </div>
                        <p className="text-sm font-medium">{alert.message}</p>
                        {alert.metric && alert.value !== undefined && (
                          <p className="text-xs mt-1 opacity-80">
                            {alert.metric}: {alert.value.toFixed(2)}
                            {alert.threshold && ` (threshold: ${alert.threshold})`}
                          </p>
                        )}
                      </div>
                      <span className="text-xs opacity-60">
                        {alert.timestamp.toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Statistical significance note */}
      {!experiment.hasStatisticalSignificance && (
        <Card className="border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-950">
          <CardContent className="pt-6">
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              <strong>Note:</strong> This experiment has not reached statistical
              significance yet (95% required). Continue running the test for more
              reliable results. Current sample size: {experiment.totalRequests.toLocaleString()} requests.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
