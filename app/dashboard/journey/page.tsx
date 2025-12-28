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
  CheckCircle,
} from "lucide-react";
import Link from "next/link";

export default function JourneyDashboard() {
  const [isAddMilestoneOpen, setIsAddMilestoneOpen] = useState(false);
  const [insights, setInsights] = useState<any[]>([]);
  const [milestones, setMilestones] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Mock data - replace with actual API calls
  useEffect(() => {
    const loadData = async () => {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Mock insights
      setInsights([
        {
          id: "1",
          insightType: "warning",
          title: "Team score is your biggest gap",
          content:
            "Your team composition score is currently at 45/100. Consider adding a technical co-founder or highlighting key team members' experience in your pitch deck. Investors typically look for complementary skills and proven execution capability.",
          importance: 5,
          sourceType: "Reality Lens",
          isPinned: true,
          createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        },
        {
          id: "2",
          insightType: "opportunity",
          title: "Market timing is excellent",
          content:
            "Based on market analysis, your industry is experiencing 23% YoY growth with increasing investor interest. This is an optimal time to raise capital.",
          importance: 4,
          sourceType: "Market Analysis",
          isPinned: false,
          createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
        },
        {
          id: "3",
          insightType: "recommendation",
          title: "Strengthen your financial projections",
          content:
            "Your financial model shows conservative growth estimates. Consider creating both conservative and ambitious scenarios to demonstrate scalability potential.",
          importance: 4,
          sourceType: "Pitch Deck Review",
          isPinned: false,
          createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        },
      ]);

      // Mock milestones
      setMilestones([
        {
          id: "1",
          title: "Complete pitch deck review",
          description: "Upload and review final pitch deck with AI analysis",
          category: "fundraising",
          status: "in_progress",
          targetDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split("T")[0],
        },
        {
          id: "2",
          title: "First investor meeting",
          description: "Met with Sequoia partner",
          category: "fundraising",
          status: "completed",
          completedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        },
        {
          id: "3",
          title: "Finalize MVP roadmap",
          category: "product",
          status: "pending",
          targetDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split("T")[0],
        },
        {
          id: "4",
          title: "Hire technical co-founder",
          description: "Source and interview candidates with ML/AI background",
          category: "team",
          status: "in_progress",
        },
      ]);

      // Mock events
      setEvents([
        {
          id: "1",
          eventType: "analysis_completed",
          eventData: { description: "AI-Powered CRM for Real Estate" },
          scoreBefore: 65,
          scoreAfter: 78,
          createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        },
        {
          id: "2",
          eventType: "milestone_achieved",
          eventData: { milestoneName: "First investor meeting" },
          createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        },
        {
          id: "3",
          eventType: "insight_discovered",
          eventData: {
            insightTitle: "Market timing is excellent",
            description: "Industry showing 23% YoY growth",
          },
          createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
        },
        {
          id: "4",
          eventType: "score_improved",
          eventData: { description: "Updated team information" },
          scoreBefore: 78,
          scoreAfter: 82,
          createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        },
      ]);

      setIsLoading(false);
    };

    loadData();
  }, []);

  const handlePinInsight = (id: string) => {
    setInsights((prev) =>
      prev.map((insight) =>
        insight.id === id
          ? { ...insight, isPinned: !insight.isPinned }
          : insight
      )
    );
  };

  const handleDismissInsight = (id: string) => {
    setInsights((prev) => prev.filter((insight) => insight.id !== id));
  };

  const handleAddMilestone = (newMilestone: any) => {
    const milestone = {
      id: Date.now().toString(),
      ...newMilestone,
      status: "pending",
    };
    setMilestones((prev) => [milestone, ...prev]);
  };

  const handleMilestoneStatusChange = (id: string, status: string) => {
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
  };

  // Calculate stats
  const ideaScore = 78;
  const investorReadiness = 45;
  const executionStreak = 6;

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
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl sm:text-4xl font-bold mb-2">
          Your Founder Journey
        </h1>
        <p className="text-muted-foreground">
          Track your progress, insights, and milestones in one place
        </p>
      </div>

      {/* Score Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold text-blue-600">
                  {investorReadiness}
                </span>
                <span className="text-xl text-muted-foreground">%</span>
              </div>
              <Progress value={investorReadiness} className="h-2" />
              <Link
                href="/dashboard/investor-score"
                className="inline-flex items-center text-sm text-blue-600 hover:text-blue-700 gap-1 mt-2"
              >
                Improve score
                <ArrowRight className="h-4 w-4" />
              </Link>
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
                Keep the momentum going!
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="insights" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-grid">
          <TabsTrigger value="insights" className="gap-2">
            <Lightbulb className="h-4 w-4" />
            Insights
          </TabsTrigger>
          <TabsTrigger value="milestones" className="gap-2">
            <Target className="h-4 w-4" />
            Milestones
          </TabsTrigger>
          <TabsTrigger value="timeline" className="gap-2">
            <TrendingUp className="h-4 w-4" />
            Timeline
          </TabsTrigger>
        </TabsList>

        {/* Insights Tab */}
        <TabsContent value="insights" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">Recent Insights</h2>
              <p className="text-sm text-muted-foreground">
                AI-generated recommendations for your startup
              </p>
            </div>
            <Button variant="outline" size="sm" asChild>
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
          <Timeline events={events} />
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
