"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  CheckCircle,
  AlertTriangle,
  XCircle,
  Lightbulb,
  ArrowRight,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ValidationFeedbackProps } from "@/types/startup-process";
import { STEP_TITLES } from "@/types/startup-process";

const statusConfig = {
  pass: {
    icon: CheckCircle,
    color: "text-green-500",
    bgColor: "bg-green-50 dark:bg-green-950",
    borderColor: "border-green-200 dark:border-green-800",
    title: "Validated",
    description: "This step has been validated and you can proceed.",
  },
  needs_work: {
    icon: AlertTriangle,
    color: "text-amber-500",
    bgColor: "bg-amber-50 dark:bg-amber-950",
    borderColor: "border-amber-200 dark:border-amber-800",
    title: "Needs Work",
    description: "Review the feedback below and make improvements.",
  },
  blocked: {
    icon: XCircle,
    color: "text-red-500",
    bgColor: "bg-red-50 dark:bg-red-950",
    borderColor: "border-red-200 dark:border-red-800",
    title: "Blocked",
    description: "Critical issues must be resolved before proceeding.",
  },
};

export function ValidationFeedback({ validation, stepNumber }: ValidationFeedbackProps) {
  if (!validation) {
    return (
      <Card className="border-dashed border-2 border-gray-200 dark:border-gray-800">
        <CardContent className="py-8 text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
            <RefreshCw className="h-6 w-6 text-gray-400" />
          </div>
          <p className="text-muted-foreground mb-2">
            No validation yet for Step {stepNumber}
          </p>
          <p className="text-sm text-muted-foreground">
            Complete the form and submit for validation
          </p>
        </CardContent>
      </Card>
    );
  }

  const config = statusConfig[validation.status];
  const StatusIcon = config.icon;

  return (
    <Card className={cn("transition-all", config.borderColor, "border-l-4")}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "p-2 rounded-lg shrink-0",
                config.bgColor
              )}
            >
              <StatusIcon className={cn("h-5 w-5", config.color)} />
            </div>
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                {config.title}
                <Badge
                  variant="outline"
                  className={cn("text-xs", config.color, "border-current")}
                >
                  Step {stepNumber}: {STEP_TITLES[stepNumber]}
                </Badge>
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {config.description}
              </p>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Main Feedback */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Feedback</h4>
          <p className="text-sm text-muted-foreground bg-accent/50 p-3 rounded-lg">
            {validation.feedback}
          </p>
        </div>

        {/* Blocker Reasons */}
        {validation.blockerReasons && validation.blockerReasons.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium flex items-center gap-2 text-red-600">
              <XCircle className="h-4 w-4" />
              Blockers to Resolve
            </h4>
            <ul className="space-y-2">
              {validation.blockerReasons.map((reason, index) => (
                <li
                  key={index}
                  className="flex items-start gap-2 text-sm p-2 rounded-lg bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300"
                >
                  <span className="font-medium shrink-0">{index + 1}.</span>
                  <span>{reason}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Suggestions */}
        {validation.suggestions && validation.suggestions.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium flex items-center gap-2 text-blue-600">
              <Lightbulb className="h-4 w-4" />
              Suggestions for Improvement
            </h4>
            <ul className="space-y-2">
              {validation.suggestions.map((suggestion, index) => (
                <li
                  key={index}
                  className="flex items-start gap-2 text-sm p-2 rounded-lg bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300"
                >
                  <ArrowRight className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{suggestion}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Success State - Next Steps */}
        {validation.status === "pass" && (
          <div className="p-4 rounded-lg bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800">
            <div className="flex items-center gap-2 text-green-700 dark:text-green-300">
              <CheckCircle className="h-5 w-5" />
              <span className="font-medium">Ready to proceed</span>
            </div>
            <p className="text-sm text-green-600 dark:text-green-400 mt-2">
              {stepNumber < 9
                ? `You can now move on to Step ${stepNumber + 1}: ${STEP_TITLES[(stepNumber + 1) as keyof typeof STEP_TITLES]}`
                : "Congratulations! You've completed the entire startup process."}
            </p>
          </div>
        )}

        {/* Validated Timestamp */}
        {validation.validatedAt && (
          <p className="text-xs text-muted-foreground pt-2 border-t">
            Validated on {new Date(validation.validatedAt).toLocaleString()}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// Compact version for inline display
export function ValidationFeedbackCompact({ validation, stepNumber }: ValidationFeedbackProps) {
  if (!validation) {
    return null;
  }

  const config = statusConfig[validation.status];
  const StatusIcon = config.icon;

  return (
    <div
      className={cn(
        "flex items-center gap-2 p-2 rounded-lg text-sm",
        config.bgColor
      )}
    >
      <StatusIcon className={cn("h-4 w-4 shrink-0", config.color)} />
      <span className={config.color}>{config.title}</span>
      {validation.blockerReasons && validation.blockerReasons.length > 0 && (
        <Badge variant="outline" className="text-xs ml-auto">
          {validation.blockerReasons.length} blocker{validation.blockerReasons.length > 1 ? "s" : ""}
        </Badge>
      )}
    </div>
  );
}
