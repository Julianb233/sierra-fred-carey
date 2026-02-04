"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import {
  CheckCircledIcon,
  CrossCircledIcon,
  UpdateIcon,
  ChevronRightIcon,
  BarChartIcon,
} from "@radix-ui/react-icons";
import { cn } from "@/lib/utils";
import { SignificanceIndicator } from "./SignificanceIndicator";

export interface ExperimentCardProps {
  id: string;
  name: string;
  status: "active" | "completed" | "paused" | "draft";
  variants: string[];
  traffic: number;
  startDate: string;
  endDate?: string;
  winner?: string;
  significance?: number;
  conversionRate?: number;
  totalRequests?: number;
  onClick?: () => void;
  onViewDetails?: () => void;
  className?: string;
}

export function ExperimentCard({
  id,
  name,
  status,
  variants,
  traffic,
  startDate,
  endDate,
  winner,
  significance,
  conversionRate,
  totalRequests,
  onClick,
  onViewDetails,
  className,
}: ExperimentCardProps) {
  const getStatusConfig = (status: ExperimentCardProps["status"]) => {
    const configs = {
      active: {
        variant: "default" as const,
        className: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 border-green-200",
        icon: <UpdateIcon className="h-3 w-3 animate-spin" />,
        label: "Active",
      },
      completed: {
        variant: "secondary" as const,
        className: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 border-blue-200",
        icon: <CheckCircledIcon className="h-3 w-3" />,
        label: "Completed",
      },
      paused: {
        variant: "outline" as const,
        className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 border-yellow-200",
        icon: <CrossCircledIcon className="h-3 w-3" />,
        label: "Paused",
      },
      draft: {
        variant: "outline" as const,
        className: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200 border-gray-200",
        icon: null,
        label: "Draft",
      },
    };
    return configs[status];
  };

  const statusConfig = getStatusConfig(status);
  const formattedStartDate = new Date(startDate).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const formattedEndDate = endDate
    ? new Date(endDate).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : null;

  return (
    <Card
      className={cn(
        "transition-all duration-200 hover:shadow-lg cursor-pointer group",
        status === "active" && "border-l-4 border-l-green-500",
        status === "completed" && winner && "border-l-4 border-l-blue-500",
        className
      )}
      onClick={onClick}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <CardTitle className="text-lg truncate">{name}</CardTitle>
              <Badge
                variant={statusConfig.variant}
                className={cn("capitalize flex items-center gap-1 shrink-0", statusConfig.className)}
              >
                {statusConfig.icon}
                {statusConfig.label}
              </Badge>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
              <span>ID: {id.slice(0, 8)}...</span>
              <span className="text-gray-300 dark:text-gray-600">|</span>
              <span>{variants.length} variants</span>
            </div>
          </div>
          {significance !== undefined && (
            <SignificanceIndicator
              value={significance}
              size="md"
              showLabel
              className="shrink-0 ml-4"
            />
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Variant chips */}
        <div className="flex flex-wrap gap-2">
          {variants.map((variant, index) => (
            <Badge
              key={variant}
              variant="outline"
              className={cn(
                "text-xs",
                winner === variant && "bg-green-50 border-green-300 text-green-700 dark:bg-green-900/30 dark:border-green-700 dark:text-green-300"
              )}
            >
              {variant}
              {winner === variant && (
                <CheckCircledIcon className="ml-1 h-3 w-3" />
              )}
            </Badge>
          ))}
        </div>

        {/* Traffic progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-400">Traffic Allocation</span>
            <span className="font-medium text-gray-900 dark:text-white">{traffic}%</span>
          </div>
          <Progress value={traffic} className="h-2" />
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 gap-4 pt-2">
          <div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Started</div>
            <div className="text-sm font-medium text-gray-900 dark:text-white">
              {formattedStartDate}
            </div>
          </div>
          {formattedEndDate ? (
            <div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Ended</div>
              <div className="text-sm font-medium text-gray-900 dark:text-white">
                {formattedEndDate}
              </div>
            </div>
          ) : totalRequests !== undefined ? (
            <div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Total Requests</div>
              <div className="text-sm font-medium text-gray-900 dark:text-white">
                {totalRequests.toLocaleString()}
              </div>
            </div>
          ) : conversionRate !== undefined ? (
            <div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Conversion</div>
              <div className="text-sm font-medium text-[#ff6a1a]">
                {conversionRate.toFixed(2)}%
              </div>
            </div>
          ) : null}
        </div>

        {/* Winner banner */}
        {winner && status === "completed" && (
          <div className="pt-3 border-t border-gray-200 dark:border-gray-800">
            <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
              <CheckCircledIcon className="h-4 w-4" />
              <span className="text-sm font-medium">
                Winner: <span className="font-bold">{winner}</span>
              </span>
              {significance !== undefined && significance >= 95 && (
                <Badge className="ml-auto bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 text-xs">
                  Significant
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* View details button */}
        {onViewDetails && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full group-hover:bg-gray-100 dark:group-hover:bg-gray-800"
            onClick={(e) => {
              e.stopPropagation();
              onViewDetails();
            }}
          >
            <BarChartIcon className="h-4 w-4 mr-2" />
            View Details
            <ChevronRightIcon className="h-4 w-4 ml-auto" />
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
