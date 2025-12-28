"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowUpIcon, ArrowDownIcon } from "@radix-ui/react-icons";
import { cn } from "@/lib/utils";

interface MetricsCardProps {
  title: string;
  value: string | number;
  change?: number;
  icon?: React.ReactNode;
  description?: string;
  trend?: "up" | "down" | "neutral";
  color?: string;
  loading?: boolean;
}

export function MetricsCard({
  title,
  value,
  change,
  icon,
  description,
  trend = "neutral",
  color = "text-[#ff6a1a]",
  loading = false,
}: MetricsCardProps) {
  const getTrendColor = () => {
    if (trend === "up") return "text-green-600 dark:text-green-400";
    if (trend === "down") return "text-red-600 dark:text-red-400";
    return "text-gray-600 dark:text-gray-400";
  };

  const getTrendIcon = () => {
    if (trend === "up") return <ArrowUpIcon className="h-4 w-4" />;
    if (trend === "down") return <ArrowDownIcon className="h-4 w-4" />;
    return null;
  };

  if (loading) {
    return (
      <Card className="animate-pulse">
        <CardHeader>
          <div className="h-4 w-24 bg-gray-200 dark:bg-gray-800 rounded"></div>
        </CardHeader>
        <CardContent>
          <div className="h-8 w-32 bg-gray-200 dark:bg-gray-800 rounded mb-2"></div>
          <div className="h-3 w-20 bg-gray-200 dark:bg-gray-800 rounded"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
            {title}
          </CardTitle>
          {icon && <div className={cn("shrink-0", color)}>{icon}</div>}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="flex items-baseline gap-2">
            <p className="text-3xl font-bold text-gray-900 dark:text-white">
              {value}
            </p>
            {change !== undefined && (
              <div className={cn("flex items-center gap-1 text-sm font-medium", getTrendColor())}>
                {getTrendIcon()}
                <span>{Math.abs(change)}%</span>
              </div>
            )}
          </div>
          {description && (
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {description}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
