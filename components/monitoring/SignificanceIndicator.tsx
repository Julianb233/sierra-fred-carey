"use client";

import { cn } from "@/lib/utils";
import {
  CheckCircledIcon,
  CrossCircledIcon,
  QuestionMarkCircledIcon,
  ExclamationTriangleIcon,
} from "@radix-ui/react-icons";

export interface SignificanceIndicatorProps {
  value: number;
  threshold?: number;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  showIcon?: boolean;
  variant?: "default" | "compact" | "detailed";
  className?: string;
}

export function SignificanceIndicator({
  value,
  threshold = 95,
  size = "md",
  showLabel = true,
  showIcon = true,
  variant = "default",
  className,
}: SignificanceIndicatorProps) {
  const isSignificant = value >= threshold;
  const isHighlySignificant = value >= 99;
  const isNearSignificant = value >= 90 && value < threshold;
  const isLowConfidence = value < 90;

  const getStatusConfig = () => {
    if (isHighlySignificant) {
      return {
        color: "text-green-600 dark:text-green-400",
        bgColor: "bg-green-100 dark:bg-green-900/30",
        borderColor: "border-green-300 dark:border-green-700",
        icon: <CheckCircledIcon className={cn("text-green-600", iconSize)} />,
        label: "Highly Significant",
        shortLabel: "99%+",
      };
    }
    if (isSignificant) {
      return {
        color: "text-green-600 dark:text-green-400",
        bgColor: "bg-green-50 dark:bg-green-900/20",
        borderColor: "border-green-200 dark:border-green-800",
        icon: <CheckCircledIcon className={cn("text-green-500", iconSize)} />,
        label: "Statistically Significant",
        shortLabel: "95%+",
      };
    }
    if (isNearSignificant) {
      return {
        color: "text-yellow-600 dark:text-yellow-400",
        bgColor: "bg-yellow-50 dark:bg-yellow-900/20",
        borderColor: "border-yellow-200 dark:border-yellow-800",
        icon: <ExclamationTriangleIcon className={cn("text-yellow-500", iconSize)} />,
        label: "Approaching Significance",
        shortLabel: "90-95%",
      };
    }
    return {
      color: "text-gray-600 dark:text-gray-400",
      bgColor: "bg-gray-50 dark:bg-gray-800/50",
      borderColor: "border-gray-200 dark:border-gray-700",
      icon: <QuestionMarkCircledIcon className={cn("text-gray-400", iconSize)} />,
      label: "Not Yet Significant",
      shortLabel: "<90%",
    };
  };

  const sizeConfig = {
    sm: {
      text: "text-lg",
      label: "text-xs",
      icon: "h-3 w-3",
      padding: "px-2 py-1",
      gap: "gap-1",
    },
    md: {
      text: "text-2xl",
      label: "text-xs",
      icon: "h-4 w-4",
      padding: "px-3 py-2",
      gap: "gap-1.5",
    },
    lg: {
      text: "text-3xl",
      label: "text-sm",
      icon: "h-5 w-5",
      padding: "px-4 py-3",
      gap: "gap-2",
    },
  };

  const iconSize = sizeConfig[size].icon;
  const config = getStatusConfig();

  if (variant === "compact") {
    return (
      <div
        className={cn(
          "inline-flex items-center gap-1 rounded-full",
          config.bgColor,
          config.borderColor,
          "border",
          "px-2 py-0.5",
          className
        )}
      >
        {showIcon && config.icon}
        <span className={cn("font-semibold", config.color, "text-sm")}>
          {value.toFixed(1)}%
        </span>
      </div>
    );
  }

  if (variant === "detailed") {
    return (
      <div
        className={cn(
          "rounded-lg border",
          config.borderColor,
          config.bgColor,
          sizeConfig[size].padding,
          className
        )}
      >
        <div className={cn("flex items-center", sizeConfig[size].gap)}>
          {showIcon && config.icon}
          <div className="flex flex-col">
            <span className={cn("font-bold", config.color, sizeConfig[size].text)}>
              {value.toFixed(1)}%
            </span>
            {showLabel && (
              <span className={cn("text-gray-500 dark:text-gray-400", sizeConfig[size].label)}>
                {config.label}
              </span>
            )}
          </div>
        </div>
        {/* Progress bar */}
        <div className="mt-2">
          <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-500",
                isHighlySignificant
                  ? "bg-green-500"
                  : isSignificant
                  ? "bg-green-400"
                  : isNearSignificant
                  ? "bg-yellow-400"
                  : "bg-gray-400"
              )}
              style={{ width: `${Math.min(value, 100)}%` }}
            />
          </div>
          <div className="flex justify-between mt-1 text-xs text-gray-400">
            <span>0%</span>
            <span className={cn(value >= threshold && "font-medium text-green-600 dark:text-green-400")}>
              {threshold}% threshold
            </span>
            <span>100%</span>
          </div>
        </div>
      </div>
    );
  }

  // Default variant
  return (
    <div
      className={cn(
        "flex flex-col items-center text-center",
        className
      )}
    >
      <div className={cn("flex items-center", sizeConfig[size].gap)}>
        {showIcon && config.icon}
        <span className={cn("font-bold", config.color, sizeConfig[size].text)}>
          {value.toFixed(1)}%
        </span>
      </div>
      {showLabel && (
        <span className={cn("text-gray-500 dark:text-gray-400", sizeConfig[size].label)}>
          Significance
        </span>
      )}
    </div>
  );
}

// Helper component for inline significance badge
export function SignificanceBadge({
  value,
  threshold = 95,
  className,
}: {
  value: number;
  threshold?: number;
  className?: string;
}) {
  const isSignificant = value >= threshold;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium",
        isSignificant
          ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
          : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
        className
      )}
    >
      {isSignificant ? (
        <CheckCircledIcon className="h-3 w-3" />
      ) : (
        <CrossCircledIcon className="h-3 w-3" />
      )}
      {value.toFixed(0)}%
    </span>
  );
}
