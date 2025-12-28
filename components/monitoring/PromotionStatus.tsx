"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  CheckCircledIcon,
  CrossCircledIcon,
  ExclamationTriangleIcon,
  InfoCircledIcon,
  RocketIcon,
} from "@radix-ui/react-icons";
import { cn } from "@/lib/utils";

interface SafetyCheck {
  passed: boolean;
  checkName: string;
  message: string;
  severity: "info" | "warning" | "critical";
  value?: number;
  threshold?: number;
}

interface PromotionEligibility {
  eligible: boolean;
  experimentId: string;
  experimentName: string;
  winningVariant: string | null;
  confidenceLevel: number | null;
  improvement: number | null;
  safetyChecks: SafetyCheck[];
  recommendation: "promote" | "wait" | "manual_review" | "not_ready";
  reason: string;
}

interface PromotionStatusProps {
  experimentId: string;
  experimentName: string;
  isActive: boolean;
  eligibility?: PromotionEligibility;
  onPromote?: () => void;
  onCheckEligibility?: () => void;
  loading?: boolean;
}

export function PromotionStatus({
  experimentId,
  experimentName,
  isActive,
  eligibility,
  onPromote,
  onCheckEligibility,
  loading = false,
}: PromotionStatusProps) {
  const [expanded, setExpanded] = useState(false);

  const getRecommendationBadge = (recommendation: PromotionEligibility["recommendation"]) => {
    const variants = {
      promote: {
        variant: "default" as const,
        className: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 border-green-200",
        icon: <RocketIcon className="h-3 w-3" />,
        label: "Ready to Promote",
      },
      wait: {
        variant: "secondary" as const,
        className: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 border-blue-200",
        icon: <InfoCircledIcon className="h-3 w-3" />,
        label: "Keep Monitoring",
      },
      manual_review: {
        variant: "outline" as const,
        className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 border-yellow-200",
        icon: <ExclamationTriangleIcon className="h-3 w-3" />,
        label: "Manual Review",
      },
      not_ready: {
        variant: "destructive" as const,
        className: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 border-red-200",
        icon: <CrossCircledIcon className="h-3 w-3" />,
        label: "Not Ready",
      },
    };

    const config = variants[recommendation];
    return (
      <Badge variant={config.variant} className={cn("flex items-center gap-1 w-fit", config.className)}>
        {config.icon}
        {config.label}
      </Badge>
    );
  };

  const getSeverityIcon = (severity: SafetyCheck["severity"]) => {
    switch (severity) {
      case "critical":
        return <CrossCircledIcon className="h-4 w-4 text-red-600" />;
      case "warning":
        return <ExclamationTriangleIcon className="h-4 w-4 text-yellow-600" />;
      case "info":
        return <InfoCircledIcon className="h-4 w-4 text-blue-600" />;
    }
  };

  if (!isActive) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Promotion Status</CardTitle>
          <CardDescription>Experiment is not active</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            This experiment is not currently running
          </div>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card className="animate-pulse">
        <CardHeader>
          <div className="h-6 w-40 bg-gray-200 dark:bg-gray-800 rounded mb-2"></div>
          <div className="h-4 w-64 bg-gray-200 dark:bg-gray-800 rounded"></div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="h-20 bg-gray-200 dark:bg-gray-800 rounded"></div>
            <div className="h-40 bg-gray-200 dark:bg-gray-800 rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!eligibility) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Promotion Status</CardTitle>
          <CardDescription>Check if this experiment is ready for promotion</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={onCheckEligibility} variant="outline" className="w-full">
            Check Promotion Eligibility
          </Button>
        </CardContent>
      </Card>
    );
  }

  const criticalFailed = eligibility.safetyChecks.filter(
    (c) => !c.passed && c.severity === "critical"
  ).length;
  const warningFailed = eligibility.safetyChecks.filter(
    (c) => !c.passed && c.severity === "warning"
  ).length;
  const allPassed = eligibility.safetyChecks.filter((c) => c.passed).length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Promotion Status</span>
          {getRecommendationBadge(eligibility.recommendation)}
        </CardTitle>
        <CardDescription>{eligibility.reason}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Key Metrics */}
        {eligibility.winningVariant && (
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Winner</div>
              <div className="text-lg font-semibold text-[#ff6a1a]">
                {eligibility.winningVariant}
              </div>
            </div>
            <div className="text-center p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Confidence</div>
              <div className="text-lg font-semibold text-gray-900 dark:text-white">
                {eligibility.confidenceLevel?.toFixed(1)}%
              </div>
            </div>
            <div className="text-center p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Improvement</div>
              <div className="text-lg font-semibold text-green-600">
                +{((eligibility.improvement || 0) * 100).toFixed(2)}%
              </div>
            </div>
          </div>
        )}

        {/* Safety Checks Summary */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-gray-900 dark:text-white">Safety Checks</h4>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setExpanded(!expanded)}
              className="text-[#ff6a1a] hover:text-[#ff6a1a]/80"
            >
              {expanded ? "Hide Details" : "Show Details"}
            </Button>
          </div>

          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-green-600">{allPassed}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Passed</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-yellow-600">{warningFailed}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Warnings</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-red-600">{criticalFailed}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Critical</div>
            </div>
          </div>

          {/* Detailed Safety Checks */}
          {expanded && (
            <div className="mt-4 space-y-2 max-h-96 overflow-y-auto">
              {eligibility.safetyChecks.map((check, index) => (
                <div
                  key={index}
                  className={cn(
                    "p-3 border rounded-lg flex items-start gap-3",
                    check.passed
                      ? "border-green-200 bg-green-50 dark:bg-green-950 dark:border-green-900"
                      : check.severity === "critical"
                        ? "border-red-200 bg-red-50 dark:bg-red-950 dark:border-red-900"
                        : "border-yellow-200 bg-yellow-50 dark:bg-yellow-950 dark:border-yellow-900"
                  )}
                >
                  <div className="flex-shrink-0 mt-0.5">
                    {check.passed ? (
                      <CheckCircledIcon className="h-4 w-4 text-green-600" />
                    ) : (
                      getSeverityIcon(check.severity)
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      {check.checkName.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {check.message}
                    </div>
                    {check.value !== undefined && check.threshold !== undefined && (
                      <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                        Value: {check.value.toFixed(2)} / Threshold: {check.threshold.toFixed(2)}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        {eligibility.recommendation === "promote" && onPromote && (
          <Button
            onClick={onPromote}
            className="w-full bg-[#ff6a1a] hover:bg-[#ff6a1a]/90 text-white"
          >
            <RocketIcon className="mr-2 h-4 w-4" />
            Promote Winning Variant
          </Button>
        )}

        {eligibility.recommendation === "manual_review" && onPromote && (
          <div className="space-y-2">
            <div className="text-sm text-gray-600 dark:text-gray-400 text-center">
              Manual review recommended but you can proceed if confident
            </div>
            <Button onClick={onPromote} variant="outline" className="w-full">
              Promote Anyway
            </Button>
          </div>
        )}

        {onCheckEligibility && (
          <Button
            onClick={onCheckEligibility}
            variant="ghost"
            className="w-full text-gray-600 dark:text-gray-400"
          >
            Refresh Status
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
