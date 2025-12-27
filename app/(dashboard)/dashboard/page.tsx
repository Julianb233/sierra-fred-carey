"use client";

import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  TrendingUp, 
  FileText, 
  MessageSquare, 
  ArrowRight,
  Telescope,
  BarChart3,
  CheckCircle2,
  Clock
} from "lucide-react";

export default function DashboardPage() {
  const stats = [
    {
      title: "Readiness Score",
      value: "67/100",
      change: "+12 from last month",
      icon: TrendingUp,
      color: "text-green-500"
    },
    {
      title: "Documents",
      value: "5",
      change: "2 in progress",
      icon: FileText,
      color: "text-blue-500"
    },
    {
      title: "Check-ins",
      value: "12",
      change: "This month",
      icon: MessageSquare,
      color: "text-purple-500"
    }
  ];

  const recentActivity = [
    {
      title: "Reality Lens Analysis Completed",
      description: "Your startup idea has been evaluated",
      time: "2 hours ago",
      status: "completed"
    },
    {
      title: "Investor Readiness Assessment",
      description: "Score improved by 5 points",
      time: "1 day ago",
      status: "completed"
    },
    {
      title: "One-Pager Generated",
      description: "Your startup one-pager is ready",
      time: "2 days ago",
      status: "completed"
    },
    {
      title: "Pitch Deck Template",
      description: "In progress - 60% complete",
      time: "3 days ago",
      status: "in-progress"
    }
  ];

  const quickActions = [
    {
      title: "Analyze Your Idea",
      description: "Run Reality Lens evaluation",
      icon: Telescope,
      href: "/reality-lens",
      color: "bg-blue-500"
    },
    {
      title: "Check Readiness",
      description: "Assess investor readiness",
      icon: BarChart3,
      href: "/investor-score",
      color: "bg-green-500"
    },
    {
      title: "Generate Document",
      description: "Create strategy documents",
      icon: FileText,
      href: "/documents",
      color: "bg-purple-500"
    }
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Welcome back!</h1>
        <p className="text-muted-foreground mt-2">
          Here's what's happening with your startup journey
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.title}
              </CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {stat.change}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>
              Jump right into your startup strategy
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {quickActions.map((action) => (
              <Button
                key={action.title}
                variant="outline"
                className="w-full justify-start h-auto py-4"
                asChild
              >
                <a href={action.href}>
                  <div className={`${action.color} text-white p-2 rounded-md mr-4`}>
                    <action.icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 text-left">
                    <div className="font-semibold">{action.title}</div>
                    <div className="text-sm text-muted-foreground">
                      {action.description}
                    </div>
                  </div>
                  <ArrowRight className="h-5 w-5 ml-2" />
                </a>
              </Button>
            ))}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>
              Your latest updates and progress
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivity.map((activity, index) => (
                <div key={index} className="flex items-start gap-3">
                  <div className="mt-1">
                    {activity.status === "completed" ? (
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    ) : (
                      <Clock className="h-5 w-5 text-yellow-500" />
                    )}
                  </div>
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {activity.title}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {activity.description}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {activity.time}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Next Steps */}
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="text-lg">What's Next?</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <p className="text-sm text-muted-foreground">
                Complete your investor readiness assessment to get personalized recommendations
              </p>
            </div>
            <Button asChild>
              <a href="/investor-score">
                Get Started <ArrowRight className="ml-2 h-4 w-4" />
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
