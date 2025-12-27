"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  RocketIcon,
  OpenInNewWindowIcon,
  PersonIcon,
  FileTextIcon,
  CheckCircledIcon,
  ArrowRightIcon,
  LockClosedIcon,
} from "@radix-ui/react-icons";
import Link from "next/link";

export default function DashboardPage() {
  // Mock user data
  const user = {
    tier: 0, // 0 = Free, 1 = Pro ($99/mo), 2 = Studio ($249/mo)
    name: "Fred",
  };

  // Mock stats
  const stats = [
    {
      label: "Ideas Analyzed",
      value: "3",
      icon: <OpenInNewWindowIcon className="h-5 w-5" />,
      color: "text-[#ff6a1a]",
    },
    {
      label: "Pitch Decks Reviewed",
      value: user.tier >= 1 ? "1" : "-",
      icon: <FileTextIcon className="h-5 w-5" />,
      color: "text-amber-500",
      locked: user.tier < 1,
    },
    {
      label: "Check-ins Completed",
      value: user.tier >= 1 ? "2" : "-",
      icon: <CheckCircledIcon className="h-5 w-5" />,
      color: "text-green-500",
      locked: user.tier < 1,
    },
    {
      label: "Active Agents",
      value: user.tier >= 2 ? "4" : "-",
      icon: <RocketIcon className="h-5 w-5" />,
      color: "text-purple-500",
      locked: user.tier < 2,
    },
  ];

  const quickActions = [
    {
      title: "Analyze New Idea",
      description: "Run your startup idea through the Reality Lens",
      icon: <OpenInNewWindowIcon className="h-6 w-6" />,
      href: "/dashboard/reality-lens",
      gradient: "from-[#ff6a1a] to-orange-400",
      tier: 0,
    },
    {
      title: "Check Investor Readiness",
      description: "Get your current fundraising score",
      icon: <PersonIcon className="h-6 w-6" />,
      href: "/dashboard/investor-score",
      gradient: "from-amber-500 to-[#ff6a1a]",
      tier: 1,
    },
    {
      title: "Review Pitch Deck",
      description: "Upload your deck for AI analysis",
      icon: <FileTextIcon className="h-6 w-6" />,
      href: "/dashboard/pitch-deck",
      gradient: "from-orange-500 to-red-500",
      tier: 1,
    },
    {
      title: "Activate AI Agent",
      description: "Deploy your virtual team members",
      icon: <RocketIcon className="h-6 w-6" />,
      href: "/dashboard/agents",
      gradient: "from-purple-500 to-[#ff6a1a]",
      tier: 2,
    },
  ];

  const recentActivity = [
    {
      action: "Analyzed",
      item: "AI-Powered CRM for Real Estate",
      time: "2 hours ago",
      score: 78,
    },
    {
      action: "Completed",
      item: "Weekly Founder Check-in",
      time: "1 day ago",
      score: null,
    },
    {
      action: "Reviewed",
      item: "Series A Pitch Deck v3",
      time: "3 days ago",
      score: 85,
    },
  ];

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div>
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-2">
          Welcome back, {user.name}!
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Here's what's happening with your startup today.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <Card key={index} className="p-6 relative overflow-hidden">
            {stat.locked && (
              <div className="absolute top-2 right-2">
                <LockClosedIcon className="h-4 w-4 text-gray-400" />
              </div>
            )}
            <div className="flex items-center justify-between mb-2">
              <div className={stat.color}>{stat.icon}</div>
            </div>
            <div className="space-y-1">
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {stat.value}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {stat.label}
              </p>
            </div>
            {stat.locked && (
              <div className="mt-3">
                <Badge variant="outline" className="text-xs">
                  {stat.locked && user.tier === 0 ? "Pro" : "Studio"}
                </Badge>
              </div>
            )}
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {quickActions.map((action, index) => {
            const isLocked = user.tier < action.tier;
            return (
              <Card
                key={index}
                className="p-6 hover:shadow-lg transition-shadow cursor-pointer relative overflow-hidden group"
              >
                {isLocked && (
                  <div className="absolute inset-0 bg-gray-900/5 dark:bg-gray-900/20 backdrop-blur-[1px] z-10 flex items-center justify-center">
                    <div className="text-center">
                      <LockClosedIcon className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                      <Badge variant="outline">
                        {action.tier === 1 ? "Pro" : "Studio"} Feature
                      </Badge>
                    </div>
                  </div>
                )}
                <Link href={isLocked ? "#" : action.href}>
                  <div className="flex items-start gap-4">
                    <div
                      className={`p-3 rounded-lg bg-gradient-to-br ${action.gradient} text-white`}
                    >
                      {action.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 dark:text-white mb-1 group-hover:text-[#ff6a1a] transition-colors">
                        {action.title}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {action.description}
                      </p>
                      <div className="mt-3 flex items-center text-[#ff6a1a] text-sm font-medium">
                        Get started
                        <ArrowRightIcon className="ml-1 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  </div>
                </Link>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Recent Activity */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
          Recent Activity
        </h2>
        <Card className="divide-y divide-gray-200 dark:divide-gray-800">
          {recentActivity.map((activity, index) => (
            <div key={index} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900 dark:text-white">
                    <span className="font-medium">{activity.action}</span>{" "}
                    <span className="text-gray-600 dark:text-gray-400">
                      {activity.item}
                    </span>
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                    {activity.time}
                  </p>
                </div>
                {activity.score && (
                  <div className="ml-4 text-right">
                    <p className="text-2xl font-bold text-[#ff6a1a]">
                      {activity.score}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-500">
                      Score
                    </p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </Card>
      </div>

      {/* Upgrade CTA for Free Users */}
      {user.tier === 0 && (
        <Card className="p-8 bg-gradient-to-br from-[#ff6a1a]/10 to-orange-400/10 border-[#ff6a1a]/20">
          <div className="max-w-2xl">
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Ready to raise capital?
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Upgrade to Pro for investor readiness scoring, pitch deck reviews, and weekly check-ins. Get fundraise-ready in weeks, not months.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                size="lg"
                className="bg-[#ff6a1a] hover:bg-[#ea580c] text-white shadow-lg shadow-[#ff6a1a]/25"
              >
                <RocketIcon className="mr-2 h-4 w-4" />
                Upgrade to Pro - $99/mo
              </Button>
              <Button variant="outline" size="lg">
                Learn More
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
