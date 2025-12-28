"use client";

import { useState, useEffect } from "react";
import { MetricsCard } from "@/components/monitoring/MetricsCard";
import { ExperimentList } from "@/components/monitoring/ExperimentList";
import { AlertsTable } from "@/components/monitoring/AlertsTable";
import { LiveMetricsPanel } from "@/components/monitoring/panels/LiveMetricsPanel";
import { PerformanceCharts } from "@/components/monitoring/charts";
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

      // Update state
      setTotalRequests(totalRequests24h);
      setAvgLatency(metrics.avgLatency);
      setErrorRate(metrics.errorRate);
      setActiveExperimentCount(totalActiveTests);

      setExperiments(activeExperiments.map(transformExperiment));
      setCriticalAlertCount(criticalAlerts.length);

    } catch (err) {
      console.error("Failed to fetch dashboard data:", err);
      setError(err instanceof Error ? err.message : "Unknown error");
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
        console.error("Failed to fetch alerts:", response.statusText);
        return;
      }

      const alertsData: AlertsResponse = await response.json();

      if (alertsData.success) {
        const transformedAlerts = alertsData.data.alerts.map(transformAlert);
        setAlerts(transformedAlerts);
      }
    } catch (err) {
      console.error("Failed to fetch alerts:", err);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    fetchAlerts();

    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      fetchDashboardData();
      fetchAlerts();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
    fetchAlerts();
  };

  // Generate chart data using utility function
  const chartData = generateChartData(totalRequests, avgLatency, errorRate, 24);

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
              <Button variant="destructive" size="sm">
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
      <Tabs defaultValue="experiments" className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="experiments">Experiments</TabsTrigger>
          <TabsTrigger value="alerts">
            Alerts
            {alerts.length > 0 && (
              <span className="ml-2 px-2 py-0.5 text-xs bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 rounded-full">
                {alerts.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

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

        <TabsContent value="alerts" className="space-y-6">
          <AlertsTable alerts={alerts} loading={loading} maxItems={20} />
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
