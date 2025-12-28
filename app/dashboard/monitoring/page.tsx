"use client";

import { useState } from "react";
import { MetricsCard } from "@/components/monitoring/MetricsCard";
import { ExperimentList } from "@/components/monitoring/ExperimentList";
import { AlertsTable } from "@/components/monitoring/AlertsTable";
import { LiveMetricsPanel } from "@/components/monitoring/panels/LiveMetricsPanel";
import { PerformanceCharts } from "@/components/monitoring/charts";
import { ExperimentDetailModal } from "@/components/monitoring/ExperimentDetailModal";
import { DateRangeSelector } from "@/components/monitoring/DateRangeSelector";
import { ExperimentFilters } from "@/components/monitoring/ExperimentFilters";
import { ExportMenu } from "@/components/monitoring/ExportMenu";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import {
  ActivityLogIcon,
  RocketIcon,
  MixIcon,
  ReloadIcon,
  BarChartIcon,
  ExclamationTriangleIcon,
  PlusIcon,
} from "@radix-ui/react-icons";
import { useMonitoringData } from "@/hooks/useMonitoringData";
import { useExperimentFilters } from "@/hooks/useExperimentFilters";
import { useDateRange } from "@/hooks/useDateRange";
import type { UIExperiment } from "@/types/monitoring";

export default function MonitoringDashboardEnhanced() {
  // Custom hooks for data management
  const { data, loading, error, refreshing, lastUpdate, refresh } = useMonitoringData({
    autoRefresh: true,
    refreshInterval: 30000,
  });

  const { dateRange, setDateRange } = useDateRange("7d");

  const {
    filters,
    setFilters,
    filteredExperiments,
    totalCount,
    filteredCount,
  } = useExperimentFilters(data?.experiments || []);

  // Modal state
  const [selectedExperiment, setSelectedExperiment] = useState<UIExperiment | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const handleExperimentClick = (experiment: UIExperiment) => {
    setSelectedExperiment(experiment);
    setModalOpen(true);
  };

  const handlePromotion = async (experimentName: string) => {
    try {
      const response = await fetch(
        `/api/monitoring/experiments/${encodeURIComponent(experimentName)}/promote`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        }
      );

      if (!response.ok) {
        throw new Error("Promotion failed");
      }

      toast.success("Variant promoted successfully!", {
        description: `${experimentName} winner has been promoted to production.`,
      });

      // Refresh data and close modal
      refresh();
      setModalOpen(false);
    } catch (err) {
      toast.error("Promotion failed", {
        description: err instanceof Error ? err.message : "Unknown error occurred",
      });
    }
  };

  const handleCreateExperiment = () => {
    toast.info("Create Experiment", {
      description: "This feature is coming soon!",
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-2">
            Monitoring Dashboard
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Real-time A/B test metrics, system performance, and alerts
          </p>
        </div>
        <div className="flex items-center gap-2">
          <DateRangeSelector value={dateRange} onChange={setDateRange} />
          <Button
            onClick={refresh}
            disabled={refreshing}
            variant="outline"
            size="sm"
            className="gap-2"
          >
            <ReloadIcon className={refreshing ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <Card className="border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <ExclamationTriangleIcon className="h-5 w-5 text-red-600" />
              <div>
                <p className="font-medium text-red-900 dark:text-red-200">
                  Failed to load dashboard data
                </p>
                <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Live Metrics Panel with Real-time Updates */}
      <LiveMetricsPanel
        refreshInterval={10000}
        onError={(err) => console.error("Live metrics error:", err)}
      />

      {/* Summary Metrics Cards */}
      {data && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricsCard
            title="Active Experiments"
            value={data.metrics.activeExperimentCount}
            icon={<MixIcon className="h-5 w-5" />}
            description="Running A/B tests"
            loading={loading}
            color="text-purple-600"
          />
          <MetricsCard
            title="Total Requests"
            value={data.metrics.totalRequests.toLocaleString()}
            change={12.5}
            trend="up"
            icon={<ActivityLogIcon className="h-5 w-5" />}
            description="Last 24 hours"
            loading={loading}
          />
          <MetricsCard
            title="Avg Latency"
            value={`${data.metrics.avgLatency}ms`}
            change={8.3}
            trend="down"
            icon={<BarChartIcon className="h-5 w-5" />}
            description="Response time"
            loading={loading}
            color="text-blue-600"
          />
          <MetricsCard
            title="Success Rate"
            value={`${((1 - data.metrics.errorRate) * 100).toFixed(2)}%`}
            change={0.2}
            trend="up"
            icon={<RocketIcon className="h-5 w-5" />}
            description="API success rate"
            loading={loading}
            color="text-green-600"
          />
        </div>
      )}

      {/* Critical Alerts Banner */}
      {data && data.metrics.criticalAlertCount > 0 && (
        <Card className="border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <ExclamationTriangleIcon className="h-6 w-6 text-red-600" />
                <div>
                  <p className="font-semibold text-red-900 dark:text-red-200">
                    {data.metrics.criticalAlertCount} Critical Alert
                    {data.metrics.criticalAlertCount !== 1 ? "s" : ""}
                  </p>
                  <p className="text-sm text-red-700 dark:text-red-300">
                    Immediate attention required
                  </p>
                </div>
              </div>
              <Button variant="destructive" size="sm">
                View Details
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Performance Analytics with Advanced Charts */}
      <PerformanceCharts />

      {/* Main Content Tabs */}
      <Tabs defaultValue="experiments" className="space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <TabsList className="grid w-full sm:w-auto grid-cols-2">
            <TabsTrigger value="experiments">Experiments</TabsTrigger>
            <TabsTrigger value="alerts">
              Alerts
              {data && data.alerts.length > 0 && (
                <span className="ml-2 px-2 py-0.5 text-xs bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 rounded-full">
                  {data.alerts.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <ExportMenu data={filteredExperiments} filename="monitoring-experiments" />
            <Button
              onClick={handleCreateExperiment}
              size="sm"
              className="bg-[#ff6a1a] hover:bg-[#ea580c] text-white gap-2"
            >
              <PlusIcon className="h-4 w-4" />
              <span className="hidden sm:inline">New Experiment</span>
            </Button>
          </div>
        </div>

        <TabsContent value="experiments" className="space-y-6">
          {/* Filters */}
          <ExperimentFilters
            filters={filters}
            onChange={setFilters}
            totalCount={totalCount}
            filteredCount={filteredCount}
          />

          {/* Experiment List */}
          <ExperimentList
            experiments={filteredExperiments}
            loading={loading}
            onExperimentClick={handleExperimentClick}
          />
        </TabsContent>

        <TabsContent value="alerts" className="space-y-6">
          <AlertsTable alerts={data?.alerts || []} loading={loading} maxItems={20} />
        </TabsContent>
      </Tabs>

      {/* Status Footer */}
      <div className="pt-6 border-t border-gray-200 dark:border-gray-800">
        <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
          <div className="flex items-center gap-2">
            <div
              className={`h-2 w-2 rounded-full ${
                error ? "bg-red-500" : "bg-green-500"
              } ${!error && "animate-pulse"}`}
            ></div>
            <span>System Status: {error ? "Error" : "Operational"}</span>
          </div>
          <div>
            Last updated: {lastUpdate ? lastUpdate.toLocaleTimeString() : "Never"}
          </div>
        </div>
      </div>

      {/* Experiment Detail Modal */}
      <ExperimentDetailModal
        experiment={selectedExperiment}
        open={modalOpen}
        onOpenChange={setModalOpen}
        onPromote={handlePromotion}
      />
    </div>
  );
}
