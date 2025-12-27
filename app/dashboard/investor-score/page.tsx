"use client"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  PersonIcon,
  CheckCircledIcon,
  CrossCircledIcon,
  RocketIcon,
  TargetIcon,
  LightningBoltIcon,
  BarChartIcon,
  LayersIcon,
  StarIcon,
  CubeIcon,
  CalendarIcon,
  ArrowRightIcon,
} from "@radix-ui/react-icons"

export default function InvestorScorePage() {
  const dimensions = [
    {
      name: "Team Strength",
      score: 75,
      icon: PersonIcon,
      feedback: "Strong founding team with complementary skills. Consider adding advisor with industry expertise.",
      status: "good",
    },
    {
      name: "Market Opportunity",
      score: 82,
      icon: TargetIcon,
      feedback: "Excellent TAM/SAM/SOM analysis. Market timing is favorable.",
      status: "excellent",
    },
    {
      name: "Product-Market Fit",
      score: 65,
      icon: RocketIcon,
      feedback: "Good initial validation. Need more data on retention and engagement metrics.",
      status: "moderate",
    },
    {
      name: "Traction & Metrics",
      score: 55,
      icon: BarChartIcon,
      feedback: "Early traction visible. Focus on improving MRR growth rate and reducing churn.",
      status: "needs-work",
    },
    {
      name: "Business Model",
      score: 70,
      icon: LayersIcon,
      feedback: "Clear revenue model with multiple streams. Unit economics need refinement.",
      status: "good",
    },
    {
      name: "Competitive Advantage",
      score: 45,
      icon: StarIcon,
      feedback: "Competitive positioning unclear. Strengthen unique value proposition and defensibility.",
      status: "needs-work",
    },
    {
      name: "Financials",
      score: 60,
      icon: CubeIcon,
      feedback: "Burn rate manageable. Improve financial projections with more realistic assumptions.",
      status: "moderate",
    },
    {
      name: "Fundraising Readiness",
      score: 72,
      icon: LightningBoltIcon,
      feedback: "Pitch deck is solid. Data room organization needs improvement.",
      status: "good",
    },
  ]

  const actionItems = [
    {
      priority: "High",
      item: "Add 2-3 industry advisors to strengthen team credibility",
      dimension: "Team Strength",
    },
    {
      priority: "High",
      item: "Develop clear competitive moat - focus on network effects or proprietary data",
      dimension: "Competitive Advantage",
    },
    {
      priority: "Medium",
      item: "Increase MRR growth rate to 15%+ month-over-month",
      dimension: "Traction & Metrics",
    },
    {
      priority: "Medium",
      item: "Conduct 20+ user interviews to validate product-market fit assumptions",
      dimension: "Product-Market Fit",
    },
    {
      priority: "Low",
      item: "Organize data room with financial statements, cap table, and legal documents",
      dimension: "Fundraising Readiness",
    },
  ]

  const getScoreColor = (score: number) => {
    if (score >= 75) return "text-green-500"
    if (score >= 60) return "text-yellow-500"
    return "text-red-500"
  }

  const getProgressColor = (score: number) => {
    if (score >= 75) return "bg-green-500"
    if (score >= 60) return "bg-yellow-500"
    return "bg-red-500"
  }

  const getPriorityBadgeColor = (priority: string) => {
    if (priority === "High") return "bg-red-500/10 text-red-500 border-red-500/20"
    if (priority === "Medium") return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20"
    return "bg-blue-500/10 text-blue-500 border-blue-500/20"
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold">Investor Readiness Score</h1>
            <Badge className="bg-[#ff6a1a] hover:bg-[#ff6a1a]/90 text-white border-0">
              Pro
            </Badge>
          </div>
          <p className="text-muted-foreground max-w-2xl">
            Know exactly where you stand before approaching investors. Get scored on 8 critical dimensions.
          </p>
        </div>
        <Button className="bg-[#ff6a1a] hover:bg-[#ff6a1a]/90 text-white">
          <ArrowRightIcon className="mr-2 h-4 w-4" />
          Download Report
        </Button>
      </div>

      {/* Stats Row */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Overall Score</p>
              <p className="text-3xl font-bold mt-1 text-yellow-500">68/100</p>
            </div>
            <div className="h-12 w-12 rounded-full bg-yellow-500/10 flex items-center justify-center">
              <BarChartIcon className="h-6 w-6 text-yellow-500" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Strengths</p>
              <p className="text-3xl font-bold mt-1">5/8</p>
            </div>
            <div className="h-12 w-12 rounded-full bg-green-500/10 flex items-center justify-center">
              <CheckCircledIcon className="h-6 w-6 text-green-500" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Areas to Improve</p>
              <p className="text-3xl font-bold mt-1">3</p>
            </div>
            <div className="h-12 w-12 rounded-full bg-red-500/10 flex items-center justify-center">
              <CrossCircledIcon className="h-6 w-6 text-red-500" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Last Updated</p>
              <p className="text-3xl font-bold mt-1">Today</p>
            </div>
            <div className="h-12 w-12 rounded-full bg-[#ff6a1a]/10 flex items-center justify-center">
              <CalendarIcon className="h-6 w-6 text-[#ff6a1a]" />
            </div>
          </div>
        </Card>
      </div>

      {/* Dimensions Grid */}
      <div>
        <h2 className="text-2xl font-bold mb-4">Score Breakdown</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {dimensions.map((dimension) => {
            const Icon = dimension.icon
            return (
              <Card key={dimension.name} className="p-6">
                <div className="flex items-start gap-4">
                  <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold">{dimension.name}</h3>
                      <span className={`font-bold ${getScoreColor(dimension.score)}`}>
                        {dimension.score}%
                      </span>
                    </div>
                    <Progress
                      value={dimension.score}
                      className="h-2"
                      indicatorClassName={getProgressColor(dimension.score)}
                    />
                    <p className="text-sm text-muted-foreground">
                      {dimension.feedback}
                    </p>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      </div>

      {/* Action Items */}
      <div>
        <h2 className="text-2xl font-bold mb-4">Recommended Actions</h2>
        <Card className="p-6">
          <div className="space-y-4">
            {actionItems.map((action, index) => (
              <div
                key={index}
                className="flex items-start gap-4 pb-4 border-b last:border-0 last:pb-0"
              >
                <Badge
                  variant="outline"
                  className={`shrink-0 ${getPriorityBadgeColor(action.priority)}`}
                >
                  {action.priority}
                </Badge>
                <div className="flex-1">
                  <p className="font-medium">{action.item}</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Impact: {action.dimension}
                  </p>
                </div>
                <Button variant="ghost" size="sm">
                  <ArrowRightIcon className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Bottom CTA */}
      <Card className="p-6 bg-gradient-to-r from-[#ff6a1a]/10 to-transparent border-[#ff6a1a]/20">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-lg mb-1">Ready to improve your score?</h3>
            <p className="text-sm text-muted-foreground">
              Book a 1-on-1 session with an investor to get personalized feedback.
            </p>
          </div>
          <Button className="bg-[#ff6a1a] hover:bg-[#ff6a1a]/90 text-white">
            Book Session
          </Button>
        </div>
      </Card>
    </div>
  )
}
