"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  ActivityLogIcon,
  ClockIcon,
  CheckCircledIcon,
  BarChartIcon,
  LightningBoltIcon,
  ExclamationTriangleIcon,
  TargetIcon,
  RocketIcon,
} from "@radix-ui/react-icons";

interface ABTestResult {
  experimentName: string;
  variants: Array<{
    variantName: string;
    totalRequests: number;
    avgLatency: number;
    errorRate: number;
    conversionRate?: number;
  }>;
  isActive: boolean;
  startDate: string;
  endDate?: string;
}

interface AIAnalytics {
  totalRequests: number;
  avgResponseTime: number;
  successRate: number;
  totalTokensUsed: number;
  requestsByAnalyzer: Array<{
    analyzer: string;
    count: number;
    avgLatency: number;
    errorRate: number;
  }>;
}

interface TopInsight {
  id: string;
  type: "breakthrough" | "warning" | "opportunity" | "pattern" | "recommendation";
  title: string;
  content: string;
  importance: number;
  tags: string[];
  sourceType: string;
  createdAt: string;
}

// Mock data for demonstration
const mockABTests: ABTestResult[] = [
  {
    experimentName: "Pitch Deck Analysis Model",
    variants: [
      { variantName: "GPT-4", totalRequests: 234, avgLatency: 2340, errorRate: 0.02, conversionRate: 0.78 },
      { variantName: "Claude-3", totalRequests: 221, avgLatency: 1890, errorRate: 0.01, conversionRate: 0.82 },
    ],
    isActive: true,
    startDate: "2024-12-15",
  },
  {
    experimentName: "Insight Extraction Prompt",
    variants: [
      { variantName: "v1-detailed", totalRequests: 156, avgLatency: 1200, errorRate: 0.03 },
      { variantName: "v2-concise", totalRequests: 148, avgLatency: 890, errorRate: 0.02 },
    ],
    isActive: true,
    startDate: "2024-12-20",
  },
];

const mockAnalytics: AIAnalytics = {
  totalRequests: 1247,
  avgResponseTime: 1650,
  successRate: 0.973,
  totalTokensUsed: 4560000,
  requestsByAnalyzer: [
    { analyzer: "idea_analyzer", count: 456, avgLatency: 1200, errorRate: 0.02 },
    { analyzer: "pitch_reviewer", count: 234, avgLatency: 2100, errorRate: 0.03 },
    { analyzer: "market_scanner", count: 312, avgLatency: 1800, errorRate: 0.01 },
    { analyzer: "insight_extractor", count: 245, avgLatency: 950, errorRate: 0.02 },
  ],
};

const mockInsights: TopInsight[] = [
  {
    id: "1",
    type: "breakthrough",
    title: "AI-First SaaS showing 3x faster growth",
    content: "Analysis of 50+ pitch decks reveals AI-native products are achieving product-market fit 3x faster than traditional SaaS.",
    importance: 9,
    tags: ["AI", "SaaS", "Growth"],
    sourceType: "pitch_analysis",
    createdAt: "2024-12-27",
  },
  {
    id: "2",
    type: "opportunity",
    title: "Underserved B2B vertical identified",
    content: "Healthcare compliance automation shows high demand signals but low competitive density. Strong opportunity for new entrants.",
    importance: 8,
    tags: ["Healthcare", "Compliance", "B2B"],
    sourceType: "market_scan",
    createdAt: "2024-12-26",
  },
  {
    id: "3",
    type: "pattern",
    title: "Successful founders share key trait",
    content: "87% of pitches that received positive scores came from founders with previous failed startups - resilience matters.",
    importance: 7,
    tags: ["Founders", "Pattern", "Success"],
    sourceType: "idea_analysis",
    createdAt: "2024-12-25",
  },
  {
    id: "4",
    type: "warning",
    title: "Market saturation in productivity tools",
    content: "Note-taking and task management space showing signs of commoditization. New entrants face uphill battle.",
    importance: 6,
    tags: ["Productivity", "Market", "Warning"],
    sourceType: "market_scan",
    createdAt: "2024-12-24",
  },
];

export default function InsightsDashboardPage() {
  const [abTests] = useState<ABTestResult[]>(mockABTests);
  const [analytics] = useState<AIAnalytics>(mockAnalytics);
  const [topInsights] = useState<TopInsight[]>(mockInsights);

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

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl sm:text-4xl font-bold mb-2">
          Insights Dashboard
        </h1>
        <p className="text-muted-foreground">
          A/B test results, AI analytics, and top insights from your journey
        </p>
      </div>

      {/* Key Metrics */}
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

      {/* Main Content Tabs */}
      <Tabs defaultValue="insights" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-grid">
          <TabsTrigger value="insights">
            Top Insights
            <Badge variant="secondary" className="ml-2">
              {topInsights.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="ab-tests">
            A/B Tests
            <Badge variant="secondary" className="ml-2">
              {abTests.filter(t => t.isActive).length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="analytics">
            AI Analytics
          </TabsTrigger>
        </TabsList>

        {/* Top Insights Tab */}
        <TabsContent value="insights" className="space-y-4">
          <div>
            <h2 className="text-2xl font-bold mb-1">Top AI-Extracted Insights</h2>
            <p className="text-sm text-muted-foreground">
              The most important insights from all your analyses
            </p>
          </div>

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
                          <span className="mr-1">{getInsightIcon(insight.type)}</span>
                          {insight.type}
                        </Badge>
                        <Badge variant="secondary">
                          Importance: {insight.importance}/10
                        </Badge>
                      </div>
                      <CardTitle className="text-lg">{insight.title}</CardTitle>
                    </div>
                    <div className="text-right text-sm text-muted-foreground">
                      {new Date(insight.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-3">{insight.content}</p>
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
        </TabsContent>

        {/* A/B Tests Tab */}
        <TabsContent value="ab-tests" className="space-y-4">
          <div>
            <h2 className="text-2xl font-bold mb-1">A/B Test Results</h2>
            <p className="text-sm text-muted-foreground">
              Compare performance across different AI variants
            </p>
          </div>

          <div className="space-y-4">
            {abTests.map((test) => (
              <Card key={test.experimentName}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        {test.experimentName}
                        {test.isActive && (
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
                            Active
                          </Badge>
                        )}
                      </CardTitle>
                      <CardDescription>
                        Started {new Date(test.startDate).toLocaleDateString()}
                        {test.endDate && ` • Ended ${new Date(test.endDate).toLocaleDateString()}`}
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
                            <span className="text-muted-foreground">Requests:</span>
                            <span className="font-medium">{variant.totalRequests}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Avg Latency:</span>
                            <span className="font-medium">{variant.avgLatency.toFixed(0)}ms</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Error Rate:</span>
                            <span className={`font-medium ${variant.errorRate > 0.05 ? 'text-red-600' : 'text-green-600'}`}>
                              {(variant.errorRate * 100).toFixed(1)}%
                            </span>
                          </div>
                          {variant.conversionRate !== undefined && (
                            <div className="flex justify-between pt-2 border-t">
                              <span className="text-muted-foreground">Conversion:</span>
                              <span className="font-bold text-[#ff6a1a]">
                                {(variant.conversionRate * 100).toFixed(1)}%
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* AI Analytics Tab */}
        <TabsContent value="analytics" className="space-y-4">
          <div>
            <h2 className="text-2xl font-bold mb-1">AI Performance Analytics</h2>
            <p className="text-sm text-muted-foreground">
              Detailed metrics across all AI analyzers
            </p>
          </div>

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
                      <span className="text-sm text-muted-foreground">Total Requests</span>
                      <span className="text-2xl font-bold">{analyzer.count}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Avg Response Time</span>
                      <span className="font-semibold">{analyzer.avgLatency.toFixed(0)}ms</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Error Rate</span>
                      <span className={`font-semibold ${analyzer.errorRate > 0.05 ? 'text-red-600' : 'text-green-600'}`}>
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
        </TabsContent>
      </Tabs>
    </div>
  );
}
