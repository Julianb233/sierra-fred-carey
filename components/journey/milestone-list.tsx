"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DollarSign,
  Package,
  Users,
  TrendingUp,
  Scale,
  Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Milestone {
  id: string;
  title: string;
  description?: string;
  category: "fundraising" | "product" | "team" | "growth" | "legal";
  status: "pending" | "in_progress" | "completed" | "skipped";
  targetDate?: string;
  completedAt?: string;
}

interface MilestoneListProps {
  milestones: Milestone[];
  onStatusChange?: (id: string, status: Milestone["status"]) => void;
  onAdd?: () => void;
}

const categoryConfig = {
  fundraising: {
    icon: DollarSign,
    color: "text-green-600",
    bgColor: "bg-green-100 dark:bg-green-900/20",
    label: "Fundraising",
  },
  product: {
    icon: Package,
    color: "text-blue-600",
    bgColor: "bg-blue-100 dark:bg-blue-900/20",
    label: "Product",
  },
  team: {
    icon: Users,
    color: "text-purple-600",
    bgColor: "bg-purple-100 dark:bg-purple-900/20",
    label: "Team",
  },
  growth: {
    icon: TrendingUp,
    color: "text-[#ff6a1a]",
    bgColor: "bg-orange-100 dark:bg-orange-900/20",
    label: "Growth",
  },
  legal: {
    icon: Scale,
    color: "text-gray-600",
    bgColor: "bg-gray-100 dark:bg-gray-900/20",
    label: "Legal",
  },
};

export function MilestoneList({
  milestones,
  onStatusChange,
  onAdd,
}: MilestoneListProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const isOverdue = (targetDate?: string) => {
    if (!targetDate) return false;
    const target = new Date(targetDate);
    const now = new Date();
    return target < now;
  };

  const isUpcoming = (targetDate?: string) => {
    if (!targetDate) return false;
    const target = new Date(targetDate);
    const now = new Date();
    const diff = target.getTime() - now.getTime();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return days >= 0 && days <= 7;
  };

  // Group and sort milestones
  const sortedMilestones = [...milestones].sort((a, b) => {
    const statusOrder = { in_progress: 0, pending: 1, completed: 2, skipped: 3 };
    return statusOrder[a.status] - statusOrder[b.status];
  });

  const handleCheckboxChange = (id: string, currentStatus: Milestone["status"]) => {
    if (!onStatusChange) return;
    const newStatus: Milestone["status"] = currentStatus === "completed" ? "pending" : "completed";
    onStatusChange(id, newStatus);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Milestones</h3>
        {onAdd && (
          <Button
            variant="outline"
            size="sm"
            onClick={onAdd}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            Add New
          </Button>
        )}
      </div>

      {/* Milestone Cards */}
      <div className="space-y-3">
        {sortedMilestones.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-muted-foreground">No milestones yet</p>
              {onAdd && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onAdd}
                  className="mt-4 gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Add Your First Milestone
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          sortedMilestones.map((milestone) => {
            const config = categoryConfig[milestone.category];
            const Icon = config.icon;
            const overdue = isOverdue(milestone.targetDate);
            const upcoming = isUpcoming(milestone.targetDate);

            return (
              <Card
                key={milestone.id}
                className={cn(
                  "transition-all hover:shadow-md",
                  milestone.status === "completed" && "opacity-60"
                )}
              >
                <CardContent className="py-4">
                  <div className="flex items-start gap-3">
                    {/* Checkbox */}
                    <Checkbox
                      checked={milestone.status === "completed"}
                      onCheckedChange={() =>
                        handleCheckboxChange(milestone.id, milestone.status)
                      }
                      className="mt-1"
                    />

                    {/* Icon */}
                    <div
                      className={cn(
                        "p-2 rounded-lg shrink-0",
                        config.bgColor
                      )}
                    >
                      <Icon className={cn("h-4 w-4", config.color)} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3 mb-1">
                        <h4
                          className={cn(
                            "font-medium",
                            milestone.status === "completed" &&
                              "line-through text-muted-foreground"
                          )}
                        >
                          {milestone.title}
                        </h4>

                        {/* Status badges */}
                        <div className="flex items-center gap-2 shrink-0">
                          {milestone.status === "in_progress" && (
                            <Badge
                              variant="outline"
                              className="bg-blue-500/10 text-blue-600 border-blue-500/20"
                            >
                              In Progress
                            </Badge>
                          )}

                          {milestone.targetDate && milestone.status !== "completed" && (
                            <Badge
                              variant="outline"
                              className={cn(
                                overdue &&
                                  "bg-red-500/10 text-red-600 border-red-500/20",
                                upcoming &&
                                  !overdue &&
                                  "bg-amber-500/10 text-amber-600 border-amber-500/20"
                              )}
                            >
                              {overdue ? "Overdue" : formatDate(milestone.targetDate)}
                            </Badge>
                          )}

                          {milestone.completedAt && (
                            <Badge
                              variant="outline"
                              className="bg-green-500/10 text-green-600 border-green-500/20"
                            >
                              Completed
                            </Badge>
                          )}
                        </div>
                      </div>

                      {milestone.description && (
                        <p className="text-sm text-muted-foreground mb-2">
                          {milestone.description}
                        </p>
                      )}

                      <Badge
                        variant="secondary"
                        className={cn("text-xs", config.color)}
                      >
                        {config.label}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
