"use client";

import { Bot, Mail, TrendingUp, Briefcase, Activity, Settings, Clock, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface AgentData {
  name: string;
  icon: typeof Bot;
  status: "active" | "idle" | "offline";
  lastTask: string;
  tasksToday: number;
  color: string;
}

interface ActivityLog {
  agent: string;
  action: string;
  timestamp: string;
  icon: typeof Bot;
}

const agents: AgentData[] = [
  {
    name: "Founder Ops Agent",
    icon: Bot,
    status: "active",
    lastTask: "Compiled weekly metrics report",
    tasksToday: 8,
    color: "bg-orange-500",
  },
  {
    name: "Fundraise Ops Agent",
    icon: Briefcase,
    status: "active",
    lastTask: "Updated investor CRM",
    tasksToday: 5,
    color: "bg-blue-500",
  },
  {
    name: "Growth Ops Agent",
    icon: TrendingUp,
    status: "active",
    lastTask: "Analyzed campaign performance",
    tasksToday: 6,
    color: "bg-green-500",
  },
  {
    name: "Inbox Agent",
    icon: Mail,
    status: "active",
    lastTask: "Drafted 3 email responses",
    tasksToday: 4,
    color: "bg-purple-500",
  },
];

const recentActivity: ActivityLog[] = [
  {
    agent: "Founder Ops Agent",
    action: "Compiled weekly metrics report",
    timestamp: "2 minutes ago",
    icon: Bot,
  },
  {
    agent: "Inbox Agent",
    action: "Drafted 3 email responses",
    timestamp: "15 minutes ago",
    icon: Mail,
  },
  {
    agent: "Growth Ops Agent",
    action: "Analyzed campaign performance",
    timestamp: "32 minutes ago",
    icon: TrendingUp,
  },
  {
    agent: "Fundraise Ops Agent",
    action: "Updated investor CRM",
    timestamp: "1 hour ago",
    icon: Briefcase,
  },
  {
    agent: "Founder Ops Agent",
    action: "Sent daily standup summary",
    timestamp: "2 hours ago",
    icon: Bot,
  },
];

const stats = [
  {
    label: "Active Agents",
    value: "4/4",
    icon: Bot,
    color: "text-orange-600",
  },
  {
    label: "Tasks Completed Today",
    value: "23",
    icon: CheckCircle2,
    color: "text-green-600",
  },
  {
    label: "Hours Saved This Week",
    value: "32h",
    icon: Clock,
    color: "text-blue-600",
  },
  {
    label: "Response Time",
    value: "<5min",
    icon: Activity,
    color: "text-purple-600",
  },
];

export default function AgentsPage() {
  return (
    <div className="p-8 space-y-8">
      {/* Coming Soon Banner */}
      <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0 w-10 h-10 bg-amber-100 dark:bg-amber-900/40 rounded-full flex items-center justify-center">
            <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <h3 className="font-semibold text-amber-800 dark:text-amber-200">Coming Soon</h3>
            <p className="text-sm text-amber-700 dark:text-amber-300">
              Virtual Team Agents are currently in development. The preview below shows planned functionality.
            </p>
          </div>
        </div>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold">Virtual Team Agents</h1>
            <Badge className="bg-[#ff6a1a] hover:bg-[#ff6a1a]/90">Studio</Badge>
            <Badge variant="outline" className="border-amber-500 text-amber-600">Preview</Badge>
          </div>
          <p className="text-muted-foreground">
            4 AI agents working 24/7 to handle your startup operations.
          </p>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                    <p className="text-2xl font-bold mt-1">{stat.value}</p>
                  </div>
                  <Icon className={`h-8 w-8 ${stat.color}`} />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Agent Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {agents.map((agent) => {
          const Icon = agent.icon;
          return (
            <Card key={agent.name} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`${agent.color} p-3 rounded-lg`}>
                      <Icon className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{agent.name}</CardTitle>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex items-center gap-1.5">
                          <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                          <span className="text-xs text-muted-foreground capitalize">
                            {agent.status}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <Badge variant="secondary" className="bg-orange-50 text-orange-700 border-orange-200">
                    {agent.tasksToday} tasks
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Last Task</p>
                  <p className="text-sm font-medium">{agent.lastTask}</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1">
                    <Activity className="h-4 w-4 mr-2" />
                    View Activity
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 border-[#ff6a1a] text-[#ff6a1a] hover:bg-[#ff6a1a] hover:text-white"
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    Configure
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Recent Activity Log */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Latest actions performed by your virtual team</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentActivity.map((activity, index) => {
              const Icon = activity.icon;
              return (
                <div
                  key={index}
                  className="flex items-start gap-4 pb-4 last:pb-0 border-b last:border-0"
                >
                  <div className="p-2 rounded-lg bg-muted">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{activity.agent}</p>
                    <p className="text-sm text-muted-foreground">{activity.action}</p>
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {activity.timestamp}
                  </span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
