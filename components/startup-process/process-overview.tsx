"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  CheckCircle,
  Circle,
  Loader2,
  AlertTriangle,
  Clock,
  Trophy,
  Target,
  TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ProcessOverviewProps, StepNumber, StepStatus } from "@/types/startup-process";
import { STEP_TITLES } from "@/types/startup-process";

const statusConfig: Record<
  StepStatus,
  { icon: typeof CheckCircle; color: string; bgColor: string }
> = {
  not_started: {
    icon: Circle,
    color: "text-gray-400",
    bgColor: "bg-gray-100 dark:bg-gray-800",
  },
  in_progress: {
    icon: Loader2,
    color: "text-blue-500",
    bgColor: "bg-blue-100 dark:bg-blue-900",
  },
  validated: {
    icon: CheckCircle,
    color: "text-green-500",
    bgColor: "bg-green-100 dark:bg-green-900",
  },
  blocked: {
    icon: AlertTriangle,
    color: "text-amber-500",
    bgColor: "bg-amber-100 dark:bg-amber-900",
  },
};

export function ProcessOverview({ process, onStepClick }: ProcessOverviewProps) {
  const completedSteps = process.steps.filter((s) => s.status === "validated").length;
  const inProgressSteps = process.steps.filter((s) => s.status === "in_progress").length;
  const blockedSteps = process.steps.filter((s) => s.status === "blocked").length;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const getDaysInProcess = () => {
    const start = new Date(process.startedAt);
    const now = new Date();
    const diff = now.getTime() - start.getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  };

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Overall Progress */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Target className="h-4 w-4" />
              Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-[#ff6a1a]">
                {process.overallProgress}%
              </span>
            </div>
            <Progress value={process.overallProgress} className="h-2 mt-2" />
          </CardContent>
        </Card>

        {/* Completed Steps */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              Completed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-green-500">
                {completedSteps}
              </span>
              <span className="text-muted-foreground">/ 9 steps</span>
            </div>
          </CardContent>
        </Card>

        {/* Days in Process */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Days Active
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold">{getDaysInProcess()}</span>
              <span className="text-muted-foreground">days</span>
            </div>
          </CardContent>
        </Card>

        {/* Current Step */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Current Step
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-[#ff6a1a]">
                {process.currentStep}
              </span>
              <span className="text-muted-foreground text-sm truncate">
                {STEP_TITLES[process.currentStep]}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Step Progress Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>9-Step Journey</span>
            <div className="flex items-center gap-4 text-sm font-normal">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-green-500" />
                <span className="text-muted-foreground">{completedSteps} Validated</span>
              </div>
              {inProgressSteps > 0 && (
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-full bg-blue-500" />
                  <span className="text-muted-foreground">{inProgressSteps} In Progress</span>
                </div>
              )}
              {blockedSteps > 0 && (
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-full bg-amber-500" />
                  <span className="text-muted-foreground">{blockedSteps} Blocked</span>
                </div>
              )}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Visual Timeline */}
          <div className="relative">
            {/* Progress Line */}
            <div className="absolute top-5 left-5 right-5 h-1 bg-gray-200 dark:bg-gray-700 rounded-full">
              <div
                className="h-full bg-gradient-to-r from-green-500 to-[#ff6a1a] rounded-full transition-all duration-500"
                style={{ width: `${(completedSteps / 9) * 100}%` }}
              />
            </div>

            {/* Step Indicators */}
            <div className="relative flex justify-between">
              {process.steps.map((step) => {
                const config = statusConfig[step.status];
                const StatusIcon = config.icon;
                const isAccessible =
                  step.stepNumber <= process.currentStep ||
                  step.status === "validated";

                return (
                  <button
                    key={step.stepNumber}
                    onClick={() => isAccessible && onStepClick?.(step.stepNumber)}
                    disabled={!isAccessible}
                    className={cn(
                      "flex flex-col items-center gap-2 relative z-10 transition-all",
                      isAccessible
                        ? "cursor-pointer hover:scale-110"
                        : "cursor-not-allowed opacity-50"
                    )}
                  >
                    <div
                      className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all",
                        step.status === "validated"
                          ? "bg-green-500 border-green-500 text-white"
                          : step.status === "in_progress"
                          ? "bg-blue-500 border-blue-500 text-white"
                          : step.status === "blocked"
                          ? "bg-amber-500 border-amber-500 text-white"
                          : step.stepNumber === process.currentStep
                          ? "bg-[#ff6a1a] border-[#ff6a1a] text-white"
                          : "bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600"
                      )}
                    >
                      {step.status === "validated" ? (
                        <CheckCircle className="h-5 w-5" />
                      ) : step.status === "in_progress" ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : step.status === "blocked" ? (
                        <AlertTriangle className="h-5 w-5" />
                      ) : (
                        <span className="font-bold text-sm">
                          {step.stepNumber}
                        </span>
                      )}
                    </div>
                    <span
                      className={cn(
                        "text-xs font-medium text-center max-w-[60px] leading-tight hidden sm:block",
                        step.stepNumber === process.currentStep
                          ? "text-[#ff6a1a]"
                          : step.status === "validated"
                          ? "text-green-600"
                          : "text-muted-foreground"
                      )}
                    >
                      {STEP_TITLES[step.stepNumber].split(" ").slice(0, 2).join(" ")}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Step List */}
      <Card>
        <CardHeader>
          <CardTitle>Step Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {process.steps.map((step) => {
              const config = statusConfig[step.status];
              const StatusIcon = config.icon;
              const isAccessible =
                step.stepNumber <= process.currentStep ||
                step.status === "validated";

              return (
                <button
                  key={step.stepNumber}
                  onClick={() => isAccessible && onStepClick?.(step.stepNumber)}
                  disabled={!isAccessible}
                  className={cn(
                    "w-full flex items-center gap-4 p-3 rounded-lg border transition-all text-left",
                    isAccessible
                      ? "hover:bg-accent hover:border-[#ff6a1a]/50 cursor-pointer"
                      : "opacity-50 cursor-not-allowed",
                    step.stepNumber === process.currentStep &&
                      "border-[#ff6a1a] bg-[#ff6a1a]/5"
                  )}
                >
                  {/* Step Number */}
                  <div
                    className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                      config.bgColor
                    )}
                  >
                    {step.status === "validated" ? (
                      <CheckCircle className={cn("h-4 w-4", config.color)} />
                    ) : step.status === "in_progress" ? (
                      <Loader2
                        className={cn("h-4 w-4 animate-spin", config.color)}
                      />
                    ) : (
                      <span
                        className={cn("font-bold text-sm", config.color)}
                      >
                        {step.stepNumber}
                      </span>
                    )}
                  </div>

                  {/* Step Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{step.title}</span>
                      {step.stepNumber === process.currentStep && (
                        <Badge className="bg-[#ff6a1a] text-white text-xs">
                          Current
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-1">
                      {step.description}
                    </p>
                  </div>

                  {/* Status Badge */}
                  <Badge
                    variant="outline"
                    className={cn("shrink-0", config.color)}
                  >
                    <StatusIcon
                      className={cn(
                        "mr-1 h-3 w-3",
                        step.status === "in_progress" && "animate-spin"
                      )}
                    />
                    {step.status === "not_started"
                      ? "Not Started"
                      : step.status === "in_progress"
                      ? "In Progress"
                      : step.status === "validated"
                      ? "Validated"
                      : "Blocked"}
                  </Badge>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Milestones / Key Achievements */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-[#ff6a1a]" />
            Key Milestones
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {completedSteps >= 1 && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-green-50 dark:bg-green-950">
                <CheckCircle className="h-5 w-5 text-green-500 shrink-0" />
                <div>
                  <p className="font-medium text-green-700 dark:text-green-300">
                    Problem Defined
                  </p>
                  <p className="text-sm text-green-600 dark:text-green-400">
                    You've clearly articulated the problem you're solving.
                  </p>
                </div>
              </div>
            )}
            {completedSteps >= 3 && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-green-50 dark:bg-green-950">
                <CheckCircle className="h-5 w-5 text-green-500 shrink-0" />
                <div>
                  <p className="font-medium text-green-700 dark:text-green-300">
                    Foundation Set
                  </p>
                  <p className="text-sm text-green-600 dark:text-green-400">
                    Problem, customer, and founder edge are defined.
                  </p>
                </div>
              </div>
            )}
            {completedSteps >= 5 && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-green-50 dark:bg-green-950">
                <CheckCircle className="h-5 w-5 text-green-500 shrink-0" />
                <div>
                  <p className="font-medium text-green-700 dark:text-green-300">
                    Demand Validated
                  </p>
                  <p className="text-sm text-green-600 dark:text-green-400">
                    You've proven people will pay for your solution.
                  </p>
                </div>
              </div>
            )}
            {completedSteps >= 8 && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-green-50 dark:bg-green-950">
                <CheckCircle className="h-5 w-5 text-green-500 shrink-0" />
                <div>
                  <p className="font-medium text-green-700 dark:text-green-300">
                    Pilot Complete
                  </p>
                  <p className="text-sm text-green-600 dark:text-green-400">
                    You've run a successful pilot program.
                  </p>
                </div>
              </div>
            )}
            {completedSteps === 9 && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-[#ff6a1a]/10">
                <Trophy className="h-5 w-5 text-[#ff6a1a] shrink-0" />
                <div>
                  <p className="font-medium text-[#ff6a1a]">
                    Process Complete!
                  </p>
                  <p className="text-sm text-[#ff6a1a]/80">
                    You've completed the entire 9-step startup process.
                  </p>
                </div>
              </div>
            )}
            {completedSteps === 0 && (
              <div className="text-center py-6 text-muted-foreground">
                <Circle className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>Complete steps to unlock milestones</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Timestamps */}
      <div className="flex flex-wrap items-center justify-between gap-4 text-sm text-muted-foreground px-1">
        <div>
          Started: {formatDate(process.startedAt)}
        </div>
        <div>
          Last Activity: {formatDate(process.lastActivityAt)}
        </div>
        {process.completedAt && (
          <div className="text-green-600">
            Completed: {formatDate(process.completedAt)}
          </div>
        )}
      </div>
    </div>
  );
}
