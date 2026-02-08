"use client";

import { useState, useEffect } from "react";
import { MetricsCard } from "@/components/monitoring/MetricsCard";
import { ExperimentList } from "@/components/monitoring/ExperimentList";
import { AlertsTable } from "@/components/monitoring/AlertsTable";
import { LiveMetricsPanel } from "@/components/monitoring/panels/LiveMetricsPanel";
import { PerformanceCharts } from "@/components/monitoring/charts";
import { AutoPromotionPanel } from "@/components/monitoring/AutoPromotionPanel";
import { AlertConfig } from "@/components/monitoring/AlertConfig";
import { DashboardFilters } from "@/components/monitoring/DashboardFilters";
import { SystemHealth } from "@/components/monitoring/SystemHealth";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  ActivityLogIcon,
  RocketIcon,
  MixIcon,
  ReloadIcon,
  BarChartIcon,
  ExclamationTriangleIcon,
  GearIcon,
} from "@radix-ui/react-icons";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from "recharts";
import type {
  DashboardResponse,
  AlertsResponse,
  UIExperiment,
  UIAlert,
} from "@/types/monitoring";
import {
  transformExperiment,
  transformAlert,
  calculateMetrics,
  generateChartData,
} from "@/types/monitoring";
import type { FilterState } from "@/components/monitoring/DashboardFilters";
import { toast } from "sonner";
import { logger } from "@/lib/logger";

export default function MonitoringDashboard() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Dashboard metrics
  const [totalRequests, setTotalRequests] = useState(0);
  const [avgLatency, setAvgLatency] = useState(0);
  const [errorRate, setErrorRate] = useState(0);
  const [activeExperimentCount, setActiveExperimentCount] = useState(0);

  // Experiments and alerts
  const [experiments, setExperiments] = useState<UIExperiment[]>([]);
  const [alerts, setAlerts] = useState<UIAlert[]>([]);
  const [criticalAlertCount, setCriticalAlertCount] = useState(0);

  // Active tab (controlled for programmatic switching)
  const [activeTab, setActiveTab] = useState("experiments");

  // Filters
  const [filters, setFilters] = useState<FilterState>({
    dateRange: "24h",
    selectedExperiments: [],
    metricType: "all",
  });

  // Fetch dashboard data from API
  const fetchDashboardData = async () => {
    try {
      setError(null);
      const response = await fetch("/api/monitoring/dashboard");

      if (!response.ok) {
        throw new Error(`Failed to fetch dashboard: ${response.statusText}`);
      }

      const dashboardData: DashboardResponse = await response.json();

      if (!dashboardData.success) {
        throw new Error("Dashboard API returned error");
      }

      const { activeExperiments, totalActiveTests, totalRequests24h, criticalAlerts } = dashboardData.data;

      // Calculate aggregate metrics using utility function
      const metrics = calculateMetrics(activeExperiments);

      // Update state with real API data
      setTotalRequests(totalRequests24h);
      setAvgLatency(metrics.avgLatency);
      setErrorRate(metrics.errorRate);
      setActiveExperimentCount(totalActiveTests);

      // Transform experiments for UI components
      setExperiments(activeExperiments.map(transformExperiment));
      setCriticalAlertCount(criticalAlerts.length);

      logger.log({
        experiments: activeExperiments.length,
        totalRequests: totalRequests24h,
        criticalAlerts: criticalAlerts.length,
      }, "[Dashboard] Data loaded successfully");

    } catch (err) {
      console.error("[Dashboard] Failed to fetch dashboard data:", err);
      setError(err instanceof Error ? err.message : "Unknown error");

      // In development, provide helpful context
      if (process.env.NODE_ENV === "development") {
        console.error("[Dashboard] Debug info:", {
          endpoint: "/api/monitoring/dashboard",
          error: err,
        });
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Fetch alerts separately
  const fetchAlerts = async () => {
    try {
      const response = await fetch("/api/monitoring/alerts");

      if (!response.ok) {
        console.error("[Dashboard] Failed to fetch alerts:", response.statusText);
        return;
      }

      const alertsData: AlertsResponse = await response.json();

      if (alertsData.success) {
        const transformedAlerts = alertsData.data.alerts.map(transformAlert);
        setAlerts(transformedAlerts);

        logger.log({
          total: alertsData.data.total,
          critical: alertsData.data.breakdown.critical,
          warning: alertsData.data.breakdown.warning,
          info: alertsData.data.breakdown.info,
        }, "[Dashboard] Alerts loaded successfully");
      }
    } catch (err) {
      console.error("[Dashboard] Failed to fetch alerts:", err);
    }
  };

  useEffect(() => {
    // Initial data fetch
    fetchDashboardData();
    fetchAlerts();

    // Auto-refresh every 30 seconds to keep dashboard data current
    const interval = setInterval(() => {
      logger.log("[Dashboard] Auto-refreshing data...");
      fetchDashboardData();
      fetchAlerts();
    }, 30000);

    // Cleanup interval on unmount
    return () => clearInterval(interval);
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
    fetchAlerts();
  };

  const handleFilterChange = (newFilters: FilterState) => {
    setFilters(newFilters);
    logger.log({ filters: newFilters }, "[Dashboard] Filters updated");
    fetchDashboardData();
    fetchAlerts();
  };

  const handleExportCSV = () => {
    try {
      logger.log({ filters }, "[Dashboard] Exporting CSV");
      const rows = [
        ["Experiment", "Status", "Variants", "Total Requests", "Avg Latency", "Error Rate"],
        ...experiments.map(exp => [
          exp.name,
          exp.isActive ? "Active" : "Ended",
          String(exp.variantCount ?? 0),
          String(exp.totalRequests ?? 0),
          String(exp.avgLatency ?? 0),
          String(exp.errorRate ?? 0),
        ]),
      ];

      // Add alerts section with blank row separator
      if (alerts.length > 0) {
        rows.push([]); // blank row separator
        rows.push(["Severity", "Message", "Timestamp", "Resolved", "Source"]);
        alerts.forEach(alert => {
          rows.push([
            alert.type,
            alert.message,
            alert.timestamp,
            alert.resolved ? "Yes" : "No",
            alert.source ?? "",
          ]);
        });
      }

      const csv = rows.map(r => r.map(c => `"${c}"`).join(",")).join("\n");
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `monitoring-export-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Export downloaded");
    } catch (err) {
      logger.error({ err }, "[Dashboard] CSV export failed");
      toast.error("Failed to export CSV");
    }
  };

  const handleExportJSON = () => {
    try {
      logger.log({ filters }, "[Dashboard] Exporting JSON");
      const data = {
        exportedAt: new Date().toISOString(),
        filters,
        metrics: { totalRequests, avgLatency, errorRate, activeExperimentCount },
        experiments,
        alerts: alerts.map(alert => ({
          id: alert.id,
          severity: alert.type,
          message: alert.message,
          timestamp: alert.timestamp,
          resolved: alert.resolved ?? false,
          source: alert.source ?? null,
        })),
      };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `monitoring-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Export downloaded");
    } catch (err) {
      logger.error({ err }, "[Dashboard] JSON export failed");
      toast.error("Failed to export JSON");
    }
  };

  // Generate chart data using utility function
  const chartData = generateChartData(totalRequests, avgLatency, errorRate, 24);

  // Transform experiments for filter component
  const experimentsForFilter = experiments.map((exp) => ({
    id: exp.id,
    name: exp.name,
  }));

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-2">
            Monitoring Dashboard
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Real-time A/B test metrics, system performance, and alerts
          </p>
        </div>
        <Button
          onClick={handleRefresh}
          disabled={refreshing}
          variant="outline"
          className="gap-2"
        >
          <ReloadIcon className={refreshing ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
          Refresh
        </Button>
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
                <p className="text-sm text-red-700 dark:text-red-300">
                  {error}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dashboard Filters and System Health */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <DashboardFilters
            experiments={experimentsForFilter}
            onFilterChange={handleFilterChange}
            onExportCSV={handleExportCSV}
            onExportJSON={handleExportJSON}
            loading={loading}
          />
        </div>
        <div className="lg:col-span-1">
          <SystemHealth
            refreshInterval={30000}
            onError={(err) => console.error("System health error:", err)}
          />
        </div>
      </div>

      {/* Live Metrics Panel - Real-time updating metrics with sparklines */}
      <LiveMetricsPanel
        refreshInterval={10000}
        onError={(err) => console.error("Live metrics error:", err)}
      />

      {/* Legacy Metrics Cards - Keep for comparison */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricsCard
          title="Active Experiments"
          value={activeExperimentCount}
          icon={<MixIcon className="h-5 w-5" />}
          description="Running A/B tests"
          loading={loading}
          color="text-purple-600"
        />
        <MetricsCard
          title="Total Requests"
          value={totalRequests.toLocaleString()}
          change={12.5}
          trend="up"
          icon={<ActivityLogIcon className="h-5 w-5" />}
          description="Last 24 hours"
          loading={loading}
        />
        <MetricsCard
          title="Avg Latency"
          value={`${avgLatency}ms`}
          change={8.3}
          trend="down"
          icon={<BarChartIcon className="h-5 w-5" />}
          description="Response time"
          loading={loading}
          color="text-blue-600"
        />
        <MetricsCard
          title="Success Rate"
          value={`${((1 - errorRate) * 100).toFixed(2)}%`}
          change={0.2}
          trend="up"
          icon={<RocketIcon className="h-5 w-5" />}
          description="API success rate"
          loading={loading}
          color="text-green-600"
        />
      </div>

      {/* Critical Alerts Banner */}
      {criticalAlertCount > 0 && (
        <Card className="border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <ExclamationTriangleIcon className="h-6 w-6 text-red-600" />
                <div>
                  <p className="font-semibold text-red-900 dark:text-red-200">
                    {criticalAlertCount} Critical Alert{criticalAlertCount !== 1 ? 's' : ''}
                  </p>
                  <p className="text-sm text-red-700 dark:text-red-300">
                    Immediate attention required
                  </p>
                </div>
              </div>
              <Button variant="destructive" size="sm" onClick={() => setActiveTab("alerts")}>
                View Details
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Performance Analytics - Advanced Charts with Tabs */}
      <PerformanceCharts />

      {/* Legacy Performance Charts */}
      {!loading && totalRequests > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Request Volume</CardTitle>
              <CardDescription>Requests per hour (last 24 hours)</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" />
                  <YAxis />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="requests"
                    stroke="#ff6a1a"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Performance Metrics</CardTitle>
              <CardDescription>Latency and errors (last 24 hours)</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="latency" fill="#3b82f6" name="Latency (ms)" />
                  <Bar dataKey="errors" fill="#ef4444" name="Errors" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
          <TabsList className="inline-flex w-auto min-w-full sm:min-w-0 sm:grid sm:w-full sm:max-w-2xl sm:grid-cols-4 lg:w-auto lg:inline-grid">
            <TabsTrigger value="experiments" className="text-xs sm:text-sm whitespace-nowrap">Experiments</TabsTrigger>
            <TabsTrigger value="promotion" className="text-xs sm:text-sm whitespace-nowrap">Auto-Promotion</TabsTrigger>
            <TabsTrigger value="alerts" className="text-xs sm:text-sm whitespace-nowrap">
              Alerts
              {alerts.length > 0 && (
                <span className="ml-2 px-2 py-0.5 text-xs bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 rounded-full">
                  {alerts.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="settings" className="text-xs sm:text-sm whitespace-nowrap">
              <GearIcon className="mr-2 h-4 w-4" />
              Settings
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="experiments" className="space-y-6">
          <ExperimentList experiments={experiments} loading={loading} />

          {/* Quick Actions */}
          {!loading && experiments.length > 0 && (
            <div className="flex gap-3">
              <Button className="bg-[#ff6a1a] hover:bg-[#ea580c] text-white">
                <MixIcon className="mr-2 h-4 w-4" />
                Create New Experiment
              </Button>
              <Button variant="outline">View All Experiments</Button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="promotion" className="space-y-6">
          <AutoPromotionPanel
            onPromotionComplete={() => {
              fetchDashboardData();
              fetchAlerts();
            }}
          />
        </TabsContent>

        <TabsContent value="alerts" className="space-y-6">
          <AlertsTable alerts={alerts} loading={loading} maxItems={20} />
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <AlertConfig />
        </TabsContent>
      </Tabs>

      {/* Status Footer */}
      <div className="pt-6 border-t border-gray-200 dark:border-gray-800">
        <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
          <div className="flex items-center gap-2">
            <div className={`h-2 w-2 rounded-full ${error ? 'bg-red-500' : 'bg-green-500'} ${!error && 'animate-pulse'}`}></div>
            <span>System Status: {error ? 'Error' : 'Operational'}</span>
          </div>
          <div>
            Last updated: {new Date().toLocaleTimeString()}
          </div>
        </div>
      </div>
    </div>
  );
}
