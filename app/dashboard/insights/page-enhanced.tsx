"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ActivityLogIcon,
  ClockIcon,
  CheckCircledIcon,
  BarChartIcon,
  LightningBoltIcon,
  ExclamationTriangleIcon,
  TargetIcon,
  RocketIcon,
  ReloadIcon,
  DownloadIcon,
  Cross2Icon,
  FileTextIcon,
} from "@radix-ui/react-icons";
import { cn } from "@/lib/utils";
import { TrendCharts } from "@/components/insights/trend-charts";
import { generateInsightsPDF } from "@/lib/utils/pdf-export";
import type {
  ABTestResult,
  AIAnalytics,
  TopInsight,
  TrendDataPoint,
} from "@/lib/types/insights";

export default function InsightsDashboardPage() {
  const [abTests, setAbTests] = useState<ABTestResult[]>([]);
  const [analytics, setAnalytics] = useState<AIAnalytics | null>(null);
  const [topInsights, setTopInsights] = useState<TopInsight[]>([]);
  const [trends, setTrends] = useState<TrendDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState("30");
  const [minImportance, setMinImportance] = useState("5");
  const [filterType, setFilterType] = useState<string>("all");

  // Fetch all data
  const fetchData = async () => {
    setLoading(true);
    try {
      const [analyticsRes, abTestsRes, insightsRes, trendsRes] = await Promise.all([
        fetch(`/api/insights/analytics?days=${dateRange}`),
        fetch("/api/insights/ab-tests"),
        fetch(
          `/api/insights/top-insights?limit=20&minImportance=${minImportance}${
            filterType !== "all" ? `&type=${filterType}` : ""
          }`
        ),
        fetch(`/api/insights/trends?days=${dateRange}`),
      ]);

      if (analyticsRes.ok) {
        const data = await analyticsRes.json();
        setAnalytics(data.success ? data.data : null);
      }

      if (abTestsRes.ok) {
        const data = await abTestsRes.json();
        setAbTests(data.success ? data.data : []);
      }

      if (insightsRes.ok) {
        const data = await insightsRes.json();
        setTopInsights(data.success ? data.data : []);
      }

      if (trendsRes.ok) {
        const data = await trendsRes.json();
        setTrends(data.success ? data.data : []);
      }
    } catch (error) {
      console.error("Error fetching insights data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [dateRange, minImportance, filterType]);

  const dismissInsight = async (insightId: string) => {
    try {
      const response = await fetch("/api/insights/top-insights", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ insightId, isDismissed: true }),
      });

      if (response.ok) {
        setTopInsights((prev) =>
          prev.filter((insight) => insight.id !== insightId)
        );
      }
    } catch (error) {
      console.error("Error dismissing insight:", error);
    }
  };

  const exportToCSV = () => {
    if (!analytics) return;

    const csvData = [
      ["Metric", "Value"],
      ["Total Requests", analytics.totalRequests],
      ["Avg Response Time (ms)", analytics.avgResponseTime],
      ["Success Rate", (analytics.successRate * 100).toFixed(2) + "%"],
      ["Total Tokens Used", analytics.totalTokensUsed],
      [],
      ["Analyzer", "Requests", "Avg Latency (ms)", "Error Rate"],
      ...analytics.requestsByAnalyzer.map((a) => [
        a.analyzer,
        a.count,
        a.avgLatency,
        (a.errorRate * 100).toFixed(2) + "%",
      ]),
    ];

    const csv = csvData.map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ai-insights-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const exportToPDF = () => {
    generateInsightsPDF(
      {
        analytics,
        insights: topInsights,
        abTests,
        trends,
      },
      `Last ${dateRange} days`
    );
  };

  const getInsightIcon = (type: TopInsight["type"]) => {
    switch (type) {
      case "breakthrough":
        return <LightningBoltIcon className="h-4 w-4" />;
      case "warning":
        return <ExclamationTriangleIcon className="h-4 w-4" />;
      case "opportunity":
        return <TargetIcon className="h-4 w-4" />;
      case "pattern":
        return <BarChartIcon className="h-4 w-4" />;
      case "recommendation":
        return <RocketIcon className="h-4 w-4" />;
    }
  };

  const getInsightColor = (type: TopInsight["type"]) => {
    switch (type) {
      case "breakthrough":
        return "text-purple-600 bg-purple-100 dark:bg-purple-950 border-purple-300";
      case "warning":
        return "text-red-600 bg-red-100 dark:bg-red-950 border-red-300";
      case "opportunity":
        return "text-green-600 bg-green-100 dark:bg-green-950 border-green-300";
      case "pattern":
        return "text-blue-600 bg-blue-100 dark:bg-blue-950 border-blue-300";
      case "recommendation":
        return "text-amber-600 bg-amber-100 dark:bg-amber-950 border-amber-300";
    }
  };

  if (loading && !analytics) {
    return (
      <div className="flex items-center justify-center h-96">
        <ReloadIcon className="h-8 w-8 animate-spin text-[#ff6a1a]" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold mb-2">
            AI Insights Dashboard
          </h1>
          <p className="text-muted-foreground">
            Comprehensive analytics, A/B test results, and AI-extracted insights
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="icon"
            onClick={fetchData}
            disabled={loading}
          >
            <ReloadIcon className={cn("h-4 w-4", loading && "animate-spin")} />
          </Button>
          <Button variant="outline" onClick={exportToCSV}>
            <DownloadIcon className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button variant="outline" onClick={exportToPDF}>
            <FileTextIcon className="h-4 w-4 mr-2" />
            Export PDF
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      {analytics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total AI Requests
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <ActivityLogIcon className="h-5 w-5 text-[#ff6a1a]" />
                <span className="text-3xl font-bold">
                  {analytics.totalRequests.toLocaleString()}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Avg Response Time
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <ClockIcon className="h-5 w-5 text-blue-600" />
                <span className="text-3xl font-bold">
                  {analytics.avgResponseTime.toFixed(0)}ms
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Success Rate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <CheckCircledIcon className="h-5 w-5 text-green-600" />
                <span className="text-3xl font-bold">
                  {(analytics.successRate * 100).toFixed(1)}%
                </span>
              </div>
              <Progress
                value={analytics.successRate * 100}
                className="h-2 mt-2"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Tokens Used
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <BarChartIcon className="h-5 w-5 text-purple-600" />
                <span className="text-3xl font-bold">
                  {(analytics.totalTokensUsed / 1000000).toFixed(1)}M
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content Tabs */}
      <Tabs defaultValue="trends" className="space-y-6">
        <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
          <TabsList className="inline-flex w-auto min-w-full sm:min-w-0 sm:grid sm:w-full sm:grid-cols-4 lg:w-auto lg:inline-grid">
            <TabsTrigger value="trends" className="text-xs sm:text-sm whitespace-nowrap">
              Trends
            </TabsTrigger>
            <TabsTrigger value="insights" className="text-xs sm:text-sm whitespace-nowrap">
              Top Insights
              <Badge variant="secondary" className="ml-1 sm:ml-2 text-xs">
                {topInsights.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="ab-tests" className="text-xs sm:text-sm whitespace-nowrap">
              A/B Tests
              <Badge variant="secondary" className="ml-1 sm:ml-2 text-xs">
                {abTests.filter((t) => t.isActive).length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="analytics" className="text-xs sm:text-sm whitespace-nowrap">AI Analytics</TabsTrigger>
          </TabsList>
        </div>

        {/* Trends Tab */}
        <TabsContent value="trends" className="space-y-4">
          <div>
            <h2 className="text-2xl font-bold mb-1">Performance Trends</h2>
            <p className="text-sm text-muted-foreground">
              Visualize AI performance and activity patterns over time
            </p>
          </div>
          <TrendCharts data={trends} />
        </TabsContent>

        {/* Top Insights Tab */}
        <TabsContent value="insights" className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold mb-1">
                Top AI-Extracted Insights
              </h2>
              <p className="text-sm text-muted-foreground">
                The most important insights from all your analyses
              </p>
            </div>
            <div className="flex gap-2">
              <Select value={minImportance} onValueChange={setMinImportance}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Min importance" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Importance 1+</SelectItem>
                  <SelectItem value="5">Importance 5+</SelectItem>
                  <SelectItem value="7">Importance 7+</SelectItem>
                  <SelectItem value="9">Importance 9+</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="breakthrough">Breakthrough</SelectItem>
                  <SelectItem value="warning">Warning</SelectItem>
                  <SelectItem value="opportunity">Opportunity</SelectItem>
                  <SelectItem value="pattern">Pattern</SelectItem>
                  <SelectItem value="recommendation">
                    Recommendation
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {topInsights.length === 0 ? (
            <Card className="py-12">
              <CardContent className="text-center text-muted-foreground">
                No insights found. Start using the platform to generate insights!
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {topInsights.map((insight) => (
                <Card
                  key={insight.id}
                  className={`border-l-4 ${getInsightColor(insight.type)}`}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge
                            variant="outline"
                            className={getInsightColor(insight.type)}
                          >
                            <span className="mr-1">
                              {getInsightIcon(insight.type)}
                            </span>
                            {insight.type}
                          </Badge>
                          <Badge variant="secondary">
                            Importance: {insight.importance}/10
                          </Badge>
                        </div>
                        <CardTitle className="text-lg">{insight.title}</CardTitle>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-right text-sm text-muted-foreground">
                          {new Date(insight.createdAt).toLocaleDateString()}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => dismissInsight(insight.id)}
                        >
                          <Cross2Icon className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground mb-3">
                      {insight.content}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {insight.tags.map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                      <Badge variant="outline" className="text-xs">
                        {insight.sourceType}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* A/B Tests Tab */}
        <TabsContent value="ab-tests" className="space-y-4">
          <div>
            <h2 className="text-2xl font-bold mb-1">A/B Test Results</h2>
            <p className="text-sm text-muted-foreground">
              Compare performance across different AI variants
            </p>
          </div>

          {abTests.length === 0 ? (
            <Card className="py-12">
              <CardContent className="text-center text-muted-foreground">
                No A/B tests currently running.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {abTests.map((test) => (
                <Card key={test.experimentName}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          {test.experimentName}
                          {test.isActive && (
                            <Badge
                              variant="outline"
                              className="bg-green-50 text-green-700 border-green-300 dark:bg-green-950"
                            >
                              Active
                            </Badge>
                          )}
                        </CardTitle>
                        <CardDescription>
                          {test.description ||
                            `Started ${new Date(test.startDate).toLocaleDateString()}`}
                          {test.endDate &&
                            ` • Ended ${new Date(test.endDate).toLocaleDateString()}`}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {test.variants.map((variant) => (
                        <div
                          key={variant.variantName}
                          className="p-4 rounded-lg border bg-card"
                        >
                          <div className="font-semibold mb-3">
                            {variant.variantName}
                          </div>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">
                                Requests:
                              </span>
                              <span className="font-medium">
                                {variant.totalRequests}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">
                                Avg Latency:
                              </span>
                              <span className="font-medium">
                                {variant.avgLatency.toFixed(0)}ms
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">
                                Error Rate:
                              </span>
                              <span
                                className={`font-medium ${
                                  variant.errorRate > 0.05
                                    ? "text-red-600"
                                    : "text-green-600"
                                }`}
                              >
                                {(variant.errorRate * 100).toFixed(1)}%
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* AI Analytics Tab */}
        <TabsContent value="analytics" className="space-y-4">
          <div>
            <h2 className="text-2xl font-bold mb-1">
              AI Performance Analytics
            </h2>
            <p className="text-sm text-muted-foreground">
              Detailed metrics across all AI analyzers
            </p>
          </div>

          {analytics && analytics.requestsByAnalyzer.length === 0 ? (
            <Card className="py-12">
              <CardContent className="text-center text-muted-foreground">
                No AI analytics data available yet.
              </CardContent>
            </Card>
          ) : (
            analytics && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {analytics.requestsByAnalyzer.map((analyzer) => (
                  <Card key={analyzer.analyzer}>
                    <CardHeader>
                      <CardTitle className="capitalize">
                        {analyzer.analyzer.replace(/_/g, " ")}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">
                            Total Requests
                          </span>
                          <span className="text-2xl font-bold">
                            {analyzer.count}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">
                            Avg Response Time
                          </span>
                          <span className="font-semibold">
                            {analyzer.avgLatency.toFixed(0)}ms
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">
                            Error Rate
                          </span>
                          <span
                            className={`font-semibold ${
                              analyzer.errorRate > 0.05
                                ? "text-red-600"
                                : "text-green-600"
                            }`}
                          >
                            {(analyzer.errorRate * 100).toFixed(2)}%
                          </span>
                        </div>
                        <Progress
                          value={(1 - analyzer.errorRate) * 100}
                          className="h-2"
                        />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
