"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { InsightCard } from "@/components/journey/insight-card";
import { MilestoneList } from "@/components/journey/milestone-list";
import { Timeline } from "@/components/journey/timeline";
import { AddMilestoneModal } from "@/components/journey/add-milestone-modal";
import {
  Lightbulb,
  Target,
  Flame,
  ArrowRight,
  TrendingUp,
  AlertTriangle,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

interface JourneyStats {
  ideaScore: number | null;
  investorReadiness: number | null;
  executionStreak: number;
  milestones: {
    completed: number;
    inProgress: number;
    pending: number;
    total: number;
  };
  insights: {
    total: number;
    active: number;
    pinned: number;
    highImportance: number;
  };
}

interface Insight {
  id: string;
  insightType: "breakthrough" | "warning" | "opportunity" | "pattern" | "recommendation";
  title: string;
  content: string;
  importance: number;
  sourceType: string;
  isPinned: boolean;
  isDismissed: boolean;
  createdAt: string;
}

interface Milestone {
  id: string;
  title: string;
  description?: string;
  category: "fundraising" | "product" | "team" | "growth" | "legal";
  status: "pending" | "in_progress" | "completed" | "skipped";
  targetDate?: string;
  completedAt?: string;
}

interface TimelineEvent {
  id: string;
  eventType: string;
  eventData: any;
  scoreBefore?: number;
  scoreAfter?: number;
  createdAt: string;
}

export default function JourneyDashboard() {
  const [isAddMilestoneOpen, setIsAddMilestoneOpen] = useState(false);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [stats, setStats] = useState<JourneyStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load data from real API endpoints
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // Fetch all data in parallel
        const [statsRes, insightsRes, milestonesRes, timelineRes] = await Promise.all([
          fetch("/api/journey/stats"),
          fetch("/api/journey/insights?limit=10"),
          fetch("/api/journey/milestones?limit=50"),
          fetch("/api/journey/timeline?limit=20"),
        ]);

        // Parse responses gracefully - don't fail if individual endpoints error
        const statsData = statsRes.ok ? await statsRes.json() : { success: false };
        const insightsData = insightsRes.ok ? await insightsRes.json() : { success: false };
        const milestonesData = milestonesRes.ok ? await milestonesRes.json() : { success: false };
        const timelineData = timelineRes.ok ? await timelineRes.json() : { success: false };

        // Update state
        if (statsData.success) {
          setStats(statsData.data);
        }

        if (insightsData.success) {
          setInsights(insightsData.data.map((insight: any) => ({
            id: insight.id,
            insightType: insight.type || "recommendation",
            title: insight.title,
            content: insight.content,
            importance: insight.importance,
            sourceType: insight.sourceType,
            isPinned: insight.isPinned ?? insight.is_pinned ?? false,
            isDismissed: insight.isDismissed ?? insight.is_dismissed ?? false,
            createdAt: insight.createdAt,
          })));
        }

        if (milestonesData.success) {
          setMilestones(milestonesData.data.map((m: any) => ({
            id: m.id,
            title: m.title,
            description: m.description,
            category: m.category as Milestone["category"],
            status: m.status as Milestone["status"],
            targetDate: m.targetDate,
            completedAt: m.completedAt,
          })));
        }

        if (timelineData.success) {
          setEvents(timelineData.data.map((e: any) => ({
            id: e.id,
            eventType: e.eventType,
            eventData: e.eventData,
            scoreBefore: e.scoreBefore ?? undefined,
            scoreAfter: e.scoreAfter ?? undefined,
            createdAt: e.createdAt,
          })));
        }
      } catch (err) {
        console.error("Error loading journey data:", err);
        setError(err instanceof Error ? err.message : "Failed to load journey data");
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  const handlePinInsight = async (id: string) => {
    const insight = insights.find((i) => i.id === id);
    if (!insight) return;

    const action = insight.isPinned ? "unpin" : "pin";

    try {
      const res = await fetch("/api/journey/insights", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ insightId: id, action }),
      });

      if (!res.ok) {
        throw new Error(`Failed to ${action} insight`);
      }

      // Optimistically update UI
      setInsights((prev) =>
        prev.map((insight) =>
          insight.id === id
            ? { ...insight, isPinned: !insight.isPinned }
            : insight
        )
      );
    } catch (err) {
      console.error(`Error ${action}ning insight:`, err);
      // Could show a toast notification here
    }
  };

  const handleDismissInsight = async (id: string) => {
    try {
      const res = await fetch("/api/journey/insights", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ insightId: id, action: "dismiss" }),
      });

      if (!res.ok) {
        throw new Error("Failed to dismiss insight");
      }

      // Remove from UI
      setInsights((prev) => prev.filter((insight) => insight.id !== id));
    } catch (err) {
      console.error("Error dismissing insight:", err);
      // Could show a toast notification here
    }
  };

  const handleAddMilestone = async (newMilestone: any) => {
    try {
      const res = await fetch("/api/journey/milestones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newMilestone),
      });

      if (!res.ok) {
        throw new Error("Failed to create milestone");
      }

      const data = await res.json();

      if (data.success) {
        setMilestones((prev) => [data.data, ...prev]);
        toast.success("Milestone created");
      } else {
        toast.error("Failed to create milestone");
      }
    } catch (err) {
      console.error("Error creating milestone:", err);
      toast.error("Failed to create milestone");
    }
  };

  const handleMilestoneStatusChange = async (id: string, status: Milestone["status"]) => {
    try {
      const res = await fetch(`/api/journey/milestones/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });

      if (!res.ok) {
        throw new Error("Failed to update milestone");
      }

      // Optimistically update UI
      setMilestones((prev) =>
        prev.map((m) =>
          m.id === id
            ? {
                ...m,
                status,
                completedAt:
                  status === "completed" ? new Date().toISOString() : undefined,
              }
            : m
        )
      );
    } catch (err) {
      console.error("Error updating milestone:", err);
      // Could show a toast notification here
    }
  };

  // Calculate display values
  const ideaScore = stats?.ideaScore ?? 0;
  const investorReadiness = stats?.investorReadiness ?? 0;
  const executionStreak = stats?.executionStreak ?? 0;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-gray-200 dark:bg-gray-800 rounded animate-pulse w-64" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-32 bg-gray-200 dark:bg-gray-800 rounded-lg animate-pulse"
            />
          ))}
        </div>
        <div className="h-96 bg-gray-200 dark:bg-gray-800 rounded-lg animate-pulse" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold mb-2">
            Your Founder Journey
          </h1>
          <p className="text-muted-foreground">
            Track your progress, insights, and milestones in one place
          </p>
        </div>
        <Card className="border-red-200 bg-red-50 dark:bg-red-950 dark:border-red-900">
          <CardContent className="py-12 text-center">
            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-3" />
            <p className="text-red-700 dark:text-red-300 mb-2 font-semibold">
              Unable to load journey data
            </p>
            <p className="text-sm text-red-600 dark:text-red-400 mb-4">
              {error}
            </p>
            <Button
              onClick={() => window.location.reload()}
              variant="outline"
              className="border-red-300 hover:bg-red-100"
            >
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-2">
          Your Founder Journey
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          Track your progress, insights, and milestones in one place
        </p>
      </div>

      {/* Score Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {/* Idea Score */}
        <Card className="relative overflow-hidden border-l-4 border-[#ff6a1a]">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Idea Score
              </CardTitle>
              <Lightbulb className="h-5 w-5 text-[#ff6a1a]" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {ideaScore > 0 ? (
                <>
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-bold text-[#ff6a1a]">
                      {ideaScore}
                    </span>
                    <span className="text-xl text-muted-foreground">/100</span>
                  </div>
                  <Progress value={ideaScore} className="h-2" />
                  <Link
                    href="/dashboard/reality-lens"
                    className="inline-flex items-center text-sm text-[#ff6a1a] hover:text-[#ea580c] gap-1 mt-2"
                  >
                    View details
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground mb-3">
                    No score yet
                  </p>
                  <Link href="/dashboard/reality-lens">
                    <Button size="sm" className="w-full">
                      Analyze Your Idea
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Investor Readiness */}
        <Card className="relative overflow-hidden border-l-4 border-blue-500">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Investor Ready
              </CardTitle>
              <Target className="h-5 w-5 text-blue-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {investorReadiness > 0 ? (
                <>
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-bold text-blue-600">
                      {investorReadiness}
                    </span>
                    <span className="text-xl text-muted-foreground">%</span>
                  </div>
                  <Progress value={investorReadiness} className="h-2" />
                  <Link
                    href="/dashboard/investor-readiness"
                    className="inline-flex items-center text-sm text-blue-600 hover:text-blue-700 gap-1 mt-2"
                  >
                    Improve score
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground mb-3">
                    Not assessed yet
                  </p>
                  <Link href="/dashboard/investor-readiness">
                    <Button size="sm" variant="outline" className="w-full">
                      Get Assessed
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Execution Streak */}
        <Card className="relative overflow-hidden border-l-4 border-green-500">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Execution Streak
              </CardTitle>
              <Flame className="h-5 w-5 text-green-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold text-green-600">
                  {executionStreak}
                </span>
                <span className="text-xl text-muted-foreground">days</span>
              </div>
              <p className="text-sm text-muted-foreground">
                {executionStreak > 0
                  ? "Keep the momentum going!"
                  : "Start your journey today!"}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="insights" className="space-y-4 sm:space-y-6">
        <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
          <TabsList className="inline-flex w-auto min-w-full sm:min-w-0 sm:grid sm:w-full sm:grid-cols-3 lg:w-auto lg:inline-grid">
            <TabsTrigger value="insights" className="gap-1 sm:gap-2 text-xs sm:text-sm whitespace-nowrap">
              <Lightbulb className="h-3 w-3 sm:h-4 sm:w-4" />
              Insights
              {stats && stats.insights.active > 0 && (
                <Badge variant="secondary" className="ml-1 text-xs">
                  {stats.insights.active}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="milestones" className="gap-1 sm:gap-2 text-xs sm:text-sm whitespace-nowrap">
              <Target className="h-3 w-3 sm:h-4 sm:w-4" />
              Milestones
              {stats && stats.milestones.inProgress > 0 && (
              <Badge variant="secondary" className="ml-1 text-xs">
                {stats.milestones.inProgress}
              </Badge>
            )}
            </TabsTrigger>
            <TabsTrigger value="timeline" className="gap-1 sm:gap-2 text-xs sm:text-sm whitespace-nowrap">
              <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4" />
              Timeline
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Insights Tab */}
        <TabsContent value="insights" className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold">Recent Insights</h2>
              <p className="text-xs sm:text-sm text-muted-foreground">
                AI-generated recommendations for your startup
              </p>
            </div>
            <Button variant="outline" size="sm" asChild className="w-fit">
              <Link href="/dashboard/reality-lens">
                <Lightbulb className="h-4 w-4 mr-2" />
                Generate New
              </Link>
            </Button>
          </div>

          {insights.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Lightbulb className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                <p className="text-muted-foreground mb-2">No insights yet</p>
                <p className="text-sm text-muted-foreground mb-4">
                  Run a Reality Lens analysis to get started
                </p>
                <Button asChild>
                  <Link href="/dashboard/reality-lens">Analyze Your Idea</Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {insights
                .sort((a, b) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0))
                .map((insight) => (
                  <InsightCard
                    key={insight.id}
                    insight={insight}
                    onPin={handlePinInsight}
                    onDismiss={handleDismissInsight}
                  />
                ))}
            </div>
          )}
        </TabsContent>

        {/* Milestones Tab */}
        <TabsContent value="milestones" className="space-y-4">
          <MilestoneList
            milestones={milestones}
            onStatusChange={handleMilestoneStatusChange}
            onAdd={() => setIsAddMilestoneOpen(true)}
          />
        </TabsContent>

        {/* Timeline Tab */}
        <TabsContent value="timeline" className="space-y-4">
          <div>
            <h2 className="text-2xl font-bold mb-1">Your Journey Timeline</h2>
            <p className="text-sm text-muted-foreground">
              A complete history of your progress
            </p>
          </div>
          {events.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                <p className="text-muted-foreground mb-2">No events yet</p>
                <p className="text-sm text-muted-foreground">
                  Your journey timeline will appear here as you make progress
                </p>
              </CardContent>
            </Card>
          ) : (
            <Timeline events={events} />
          )}
        </TabsContent>
      </Tabs>

      {/* Add Milestone Modal */}
      <AddMilestoneModal
        isOpen={isAddMilestoneOpen}
        onClose={() => setIsAddMilestoneOpen(false)}
        onSubmit={handleAddMilestone}
      />
    </div>
  );
}
