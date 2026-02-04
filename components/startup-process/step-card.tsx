"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle,
  Circle,
  Loader2,
  Lock,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { StepCardProps, StepStatus } from "@/types/startup-process";

const statusConfig: Record<
  StepStatus,
  {
    icon: typeof CheckCircle;
    color: string;
    bgColor: string;
    borderColor: string;
    label: string;
  }
> = {
  not_started: {
    icon: Circle,
    color: "text-gray-400",
    bgColor: "bg-gray-100 dark:bg-gray-800",
    borderColor: "border-gray-200 dark:border-gray-700",
    label: "Not Started",
  },
  in_progress: {
    icon: Loader2,
    color: "text-blue-500",
    bgColor: "bg-blue-50 dark:bg-blue-950",
    borderColor: "border-blue-200 dark:border-blue-800",
    label: "In Progress",
  },
  validated: {
    icon: CheckCircle,
    color: "text-green-500",
    bgColor: "bg-green-50 dark:bg-green-950",
    borderColor: "border-green-200 dark:border-green-800",
    label: "Validated",
  },
  blocked: {
    icon: AlertTriangle,
    color: "text-amber-500",
    bgColor: "bg-amber-50 dark:bg-amber-950",
    borderColor: "border-amber-200 dark:border-amber-800",
    label: "Needs Work",
  },
};

export function StepCard({ step, isActive, isAccessible, onClick }: StepCardProps) {
  const config = statusConfig[step.status];
  const StatusIcon = config.icon;

  return (
    <Card
      className={cn(
        "relative transition-all duration-200",
        isAccessible
          ? "cursor-pointer hover:shadow-md"
          : "cursor-not-allowed opacity-60",
        isActive && "ring-2 ring-[#ff6a1a] ring-offset-2",
        config.borderColor
      )}
      onClick={isAccessible ? onClick : undefined}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            {/* Step Number */}
            <div
              className={cn(
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-full font-bold text-lg",
                isActive
                  ? "bg-[#ff6a1a] text-white"
                  : step.status === "validated"
                  ? "bg-green-500 text-white"
                  : step.status === "blocked"
                  ? "bg-amber-500 text-white"
                  : "bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
              )}
            >
              {step.status === "validated" ? (
                <CheckCircle className="h-5 w-5" />
              ) : (
                step.stepNumber
              )}
            </div>

            <div className="min-w-0 flex-1">
              <CardTitle className="text-base">{step.title}</CardTitle>
              <p className="text-sm text-muted-foreground line-clamp-1">
                {step.description}
              </p>
            </div>
          </div>

          {/* Status / Lock Indicator */}
          <div className="flex items-center gap-2 shrink-0">
            {!isAccessible && (
              <Lock className="h-4 w-4 text-gray-400" />
            )}
            <Badge
              variant="outline"
              className={cn(
                "text-xs",
                config.color,
                step.status === "in_progress" && "animate-pulse"
              )}
            >
              <StatusIcon
                className={cn(
                  "mr-1 h-3 w-3",
                  step.status === "in_progress" && "animate-spin"
                )}
              />
              {config.label}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {/* Key Questions Preview */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Key Questions
          </p>
          <ul className="space-y-1">
            {step.keyQuestions.slice(0, 2).map((question, index) => (
              <li
                key={index}
                className="text-sm text-muted-foreground flex items-start gap-2"
              >
                <span className="text-[#ff6a1a] mt-0.5">-</span>
                <span className="line-clamp-1">{question}</span>
              </li>
            ))}
            {step.keyQuestions.length > 2 && (
              <li className="text-xs text-muted-foreground pl-4">
                +{step.keyQuestions.length - 2} more questions
              </li>
            )}
          </ul>
        </div>

        {/* Validation Status Indicator */}
        {step.validation && (
          <div
            className={cn(
              "mt-4 p-2 rounded-lg text-sm",
              step.validation.status === "pass"
                ? "bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300"
                : step.validation.status === "needs_work"
                ? "bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300"
                : "bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300"
            )}
          >
            {step.validation.status === "pass" && "Validated and ready to proceed"}
            {step.validation.status === "needs_work" && "Review feedback before continuing"}
            {step.validation.status === "blocked" && "Blockers must be resolved"}
          </div>
        )}

        {/* Completed At Timestamp */}
        {step.completedAt && (
          <p className="mt-3 text-xs text-muted-foreground">
            Completed {new Date(step.completedAt).toLocaleDateString()}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
