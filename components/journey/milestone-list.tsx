"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DollarSign,
  Package,
  Users,
  TrendingUp,
  Scale,
  Plus,
  Trophy,
  MessageSquare,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";
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
  /** Show the mentoring support card under the progress score. Defaults to true. */
  showMentoring?: boolean;
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

/**
 * Mentoring feedback aligned to the progress score. Keeps the milestone
 * checklist, the progress visual, and the mentor's encouragement consistent
 * so the founder never sees a "100% checklist / 60% progress" mismatch.
 */
function mentoringFeedback(pct: number, completed: number, total: number) {
  if (total === 0) {
    return {
      headline: "Set your first milestone",
      body: "Break your next 90 days into milestones. Each one you complete moves your progress score and unlocks tailored mentor feedback.",
    };
  }
  if (pct === 100) {
    return {
      headline: "Every milestone complete — outstanding work",
      body: "You've cleared the board. Talk to your mentor about setting the next set of stretch milestones to keep your momentum compounding.",
    };
  }
  if (pct >= 75) {
    return {
      headline: "You're in the home stretch",
      body: `${total - completed} milestone${total - completed === 1 ? "" : "s"} left. Your mentor can help you close out the hardest ones — bring them up in chat.`,
    };
  }
  if (pct >= 40) {
    return {
      headline: "Strong, steady progress",
      body: "You're past the halfway mark on momentum. Ask your mentor to pressure-test the milestones still in progress so nothing stalls.",
    };
  }
  return {
    headline: "Great start — let's build momentum",
    body: "Completing milestones is what moves your progress score. Pick one in-progress item and ask your mentor for the fastest path to done.",
  };
}

export function MilestoneList({
  milestones,
  onStatusChange,
  onAdd,
  showMentoring = true,
}: MilestoneListProps) {
  // Milestone awaiting completion confirmation (final confirmation step).
  const [pendingComplete, setPendingComplete] = useState<Milestone | null>(null);

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

  // Progress scoring — drives the progress bar AND the mentoring feedback so
  // the checklist and the visual indicator can never drift apart.
  const totalCount = milestones.length;
  const completedCount = milestones.filter((m) => m.status === "completed").length;
  const progressPct =
    totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const feedback = mentoringFeedback(progressPct, completedCount, totalCount);

  const handleCheckboxChange = (milestone: Milestone) => {
    if (!onStatusChange) return;
    if (milestone.status === "completed") {
      // Un-completing is reversible and low-risk — apply immediately.
      onStatusChange(milestone.id, "pending");
      return;
    }
    // Completing is the final step — require explicit confirmation.
    setPendingComplete(milestone);
  };

  const confirmComplete = () => {
    if (pendingComplete && onStatusChange) {
      onStatusChange(pendingComplete.id, "completed");
    }
    setPendingComplete(null);
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

      {/* Progress Score — single source of truth shared with mentoring + visuals */}
      {totalCount > 0 && (
        <Card className="border-[#ff6a1a]/20">
          <CardContent className="py-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Trophy className="h-4 w-4 text-[#ff6a1a]" />
                <span className="text-sm font-semibold">Milestone Progress</span>
              </div>
              <span className="text-sm text-muted-foreground">
                {completedCount} of {totalCount} completed
                <span className="ml-2 font-semibold text-[#ff6a1a]">
                  {progressPct}%
                </span>
              </span>
            </div>
            <Progress value={progressPct} className="h-2" />
          </CardContent>
        </Card>
      )}

      {/* Mentoring support — feedback that tracks the progress score */}
      {showMentoring && (
        <Card className="bg-orange-50/60 dark:bg-orange-950/20 border-[#ff6a1a]/20">
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/30 shrink-0">
                <MessageSquare className="h-4 w-4 text-[#ff6a1a]" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-sm mb-1">{feedback.headline}</h4>
                <p className="text-sm text-muted-foreground mb-2">
                  {feedback.body}
                </p>
                <Link
                  href="/chat"
                  className="inline-flex items-center gap-1.5 text-sm text-[#ff6a1a] hover:text-[#ea580c] font-medium"
                >
                  <MessageSquare className="h-3.5 w-3.5" />
                  Talk to your Mentor
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

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
                      onCheckedChange={() => handleCheckboxChange(milestone)}
                      aria-label={
                        milestone.status === "completed"
                          ? `Mark "${milestone.title}" as not complete`
                          : `Mark "${milestone.title}" as complete`
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

      {/* Final confirmation before marking a milestone complete */}
      <AlertDialog
        open={pendingComplete !== null}
        onOpenChange={(open) => {
          if (!open) setPendingComplete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-[#ff6a1a]" />
              Mark milestone complete?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingComplete ? (
                <>
                  You&apos;re about to mark{" "}
                  <span className="font-medium text-foreground">
                    {pendingComplete.title}
                  </span>{" "}
                  as complete. This updates your progress score and timeline. You
                  can always un-check it later if you need to.
                </>
              ) : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Not yet</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmComplete}
              className="bg-[#ff6a1a] hover:bg-[#ea580c]"
            >
              Yes, mark complete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
