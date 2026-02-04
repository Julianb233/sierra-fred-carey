"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ExclamationTriangleIcon,
  InfoCircledIcon,
  CheckCircledIcon,
  BellIcon,
  ChevronRightIcon,
  Cross2Icon,
} from "@radix-ui/react-icons";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

export interface AlertItem {
  id: string;
  type: "error" | "warning" | "info" | "success";
  message: string;
  timestamp: string;
  source?: string;
  resolved?: boolean;
  experimentName?: string;
  variantName?: string;
}

export interface AlertsPanelProps {
  alerts: AlertItem[];
  loading?: boolean;
  maxItems?: number;
  showHeader?: boolean;
  compact?: boolean;
  onAlertClick?: (alert: AlertItem) => void;
  onDismiss?: (alertId: string) => void;
  onViewAll?: () => void;
  className?: string;
}

export function AlertsPanel({
  alerts,
  loading = false,
  maxItems = 5,
  showHeader = true,
  compact = false,
  onAlertClick,
  onDismiss,
  onViewAll,
  className,
}: AlertsPanelProps) {
  const getAlertConfig = (type: AlertItem["type"]) => {
    const configs = {
      error: {
        icon: <ExclamationTriangleIcon className="h-4 w-4" />,
        className: "bg-red-50 border-red-200 dark:bg-red-950/50 dark:border-red-900",
        iconColor: "text-red-600 dark:text-red-400",
        badgeClass: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
      },
      warning: {
        icon: <ExclamationTriangleIcon className="h-4 w-4" />,
        className: "bg-yellow-50 border-yellow-200 dark:bg-yellow-950/50 dark:border-yellow-900",
        iconColor: "text-yellow-600 dark:text-yellow-400",
        badgeClass: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
      },
      info: {
        icon: <InfoCircledIcon className="h-4 w-4" />,
        className: "bg-blue-50 border-blue-200 dark:bg-blue-950/50 dark:border-blue-900",
        iconColor: "text-blue-600 dark:text-blue-400",
        badgeClass: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
      },
      success: {
        icon: <CheckCircledIcon className="h-4 w-4" />,
        className: "bg-green-50 border-green-200 dark:bg-green-950/50 dark:border-green-900",
        iconColor: "text-green-600 dark:text-green-400",
        badgeClass: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
      },
    };
    return configs[type];
  };

  const formatTimestamp = (timestamp: string) => {
    try {
      return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
    } catch {
      return "Unknown time";
    }
  };

  const displayAlerts = alerts.slice(0, maxItems);
  const hasMoreAlerts = alerts.length > maxItems;
  const criticalCount = alerts.filter((a) => a.type === "error").length;
  const warningCount = alerts.filter((a) => a.type === "warning").length;

  if (loading) {
    return (
      <Card className={cn("animate-pulse", className)}>
        {showHeader && (
          <CardHeader className="pb-3">
            <div className="h-5 w-32 bg-gray-200 dark:bg-gray-800 rounded" />
          </CardHeader>
        )}
        <CardContent>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 dark:bg-gray-800 rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      {showHeader && (
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BellIcon className="h-5 w-5 text-gray-500" />
              <CardTitle className="text-lg">Alerts</CardTitle>
              {alerts.length > 0 && (
                <Badge
                  variant="secondary"
                  className={cn(
                    criticalCount > 0
                      ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                      : warningCount > 0
                      ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                      : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300"
                  )}
                >
                  {alerts.length}
                </Badge>
              )}
            </div>
            {criticalCount > 0 && (
              <Badge className="bg-red-600 text-white animate-pulse">
                {criticalCount} Critical
              </Badge>
            )}
          </div>
        </CardHeader>
      )}
      <CardContent className={!showHeader ? "pt-4" : ""}>
        {displayAlerts.length === 0 ? (
          <div className="text-center py-8">
            <CheckCircledIcon className="h-12 w-12 mx-auto mb-2 text-green-500" />
            <p className="text-gray-500 dark:text-gray-400 font-medium">
              All systems operational
            </p>
            <p className="text-sm text-gray-400 dark:text-gray-500">
              No active alerts
            </p>
          </div>
        ) : (
          <ScrollArea className={cn(compact ? "h-auto" : "h-[300px]")}>
            <div className="space-y-2">
              {displayAlerts.map((alert) => {
                const config = getAlertConfig(alert.type);
                return (
                  <div
                    key={alert.id}
                    className={cn(
                      "group relative rounded-lg border p-3 transition-all",
                      config.className,
                      alert.resolved && "opacity-50",
                      onAlertClick && "cursor-pointer hover:shadow-md"
                    )}
                    onClick={() => onAlertClick?.(alert)}
                  >
                    <div className="flex items-start gap-3">
                      <div className={cn("shrink-0 mt-0.5", config.iconColor)}>
                        {config.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge
                            variant="outline"
                            className={cn("capitalize text-xs", config.badgeClass)}
                          >
                            {alert.type}
                          </Badge>
                          {alert.source && (
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {alert.source}
                            </span>
                          )}
                        </div>
                        <p
                          className={cn(
                            "text-sm font-medium text-gray-900 dark:text-white",
                            alert.resolved && "line-through"
                          )}
                        >
                          {alert.message}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {formatTimestamp(alert.timestamp)}
                          </span>
                          {alert.experimentName && (
                            <>
                              <span className="text-gray-300 dark:text-gray-600">|</span>
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                {alert.experimentName}
                                {alert.variantName && ` / ${alert.variantName}`}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                      {onDismiss && !alert.resolved && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDismiss(alert.id);
                          }}
                        >
                          <Cross2Icon className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}

        {hasMoreAlerts && onViewAll && (
          <Button
            variant="ghost"
            className="w-full mt-3"
            onClick={onViewAll}
          >
            View all {alerts.length} alerts
            <ChevronRightIcon className="h-4 w-4 ml-2" />
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

// Compact inline version
export function AlertsBanner({
  alerts,
  onViewAll,
  className,
}: {
  alerts: AlertItem[];
  onViewAll?: () => void;
  className?: string;
}) {
  const criticalCount = alerts.filter((a) => a.type === "error").length;
  const warningCount = alerts.filter((a) => a.type === "warning").length;

  if (criticalCount === 0 && warningCount === 0) {
    return null;
  }

  return (
    <div
      className={cn(
        "flex items-center justify-between p-3 rounded-lg border",
        criticalCount > 0
          ? "bg-red-50 border-red-200 dark:bg-red-950/50 dark:border-red-900"
          : "bg-yellow-50 border-yellow-200 dark:bg-yellow-950/50 dark:border-yellow-900",
        className
      )}
    >
      <div className="flex items-center gap-3">
        <ExclamationTriangleIcon
          className={cn(
            "h-5 w-5",
            criticalCount > 0 ? "text-red-600" : "text-yellow-600"
          )}
        />
        <div>
          <p className={cn(
            "font-medium",
            criticalCount > 0 ? "text-red-900 dark:text-red-200" : "text-yellow-900 dark:text-yellow-200"
          )}>
            {criticalCount > 0
              ? `${criticalCount} Critical Alert${criticalCount !== 1 ? "s" : ""}`
              : `${warningCount} Warning${warningCount !== 1 ? "s" : ""}`}
          </p>
          <p className={cn(
            "text-sm",
            criticalCount > 0 ? "text-red-700 dark:text-red-300" : "text-yellow-700 dark:text-yellow-300"
          )}>
            Immediate attention required
          </p>
        </div>
      </div>
      {onViewAll && (
        <Button
          variant={criticalCount > 0 ? "destructive" : "outline"}
          size="sm"
          onClick={onViewAll}
        >
          View Details
        </Button>
      )}
    </div>
  );
}
