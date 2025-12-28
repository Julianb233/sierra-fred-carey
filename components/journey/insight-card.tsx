"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Lightbulb,
  AlertTriangle,
  Target,
  TrendingUp,
  CheckCircle,
  Pin,
  X,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface InsightCardProps {
  insight: {
    id: string;
    insightType: "breakthrough" | "warning" | "opportunity" | "pattern" | "recommendation";
    title: string;
    content: string;
    importance: number;
    sourceType: string;
    isPinned: boolean;
    createdAt: string;
  };
  onPin?: (id: string) => void;
  onDismiss?: (id: string) => void;
}

const insightConfig = {
  breakthrough: {
    icon: Lightbulb,
    color: "text-green-500",
    bgColor: "bg-green-500/10",
    borderColor: "border-green-500/20",
  },
  warning: {
    icon: AlertTriangle,
    color: "text-amber-500",
    bgColor: "bg-amber-500/10",
    borderColor: "border-amber-500/20",
  },
  opportunity: {
    icon: Target,
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
    borderColor: "border-blue-500/20",
  },
  pattern: {
    icon: TrendingUp,
    color: "text-purple-500",
    bgColor: "bg-purple-500/10",
    borderColor: "border-purple-500/20",
  },
  recommendation: {
    icon: CheckCircle,
    color: "text-emerald-500",
    bgColor: "bg-emerald-500/10",
    borderColor: "border-emerald-500/20",
  },
};

export function InsightCard({ insight, onPin, onDismiss }: InsightCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const config = insightConfig[insight.insightType];
  const Icon = config.icon;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return "Today";
    if (days === 1) return "Yesterday";
    if (days < 7) return `${days} days ago`;
    return date.toLocaleDateString();
  };

  return (
    <Card
      className={cn(
        "relative overflow-hidden transition-all hover:shadow-lg",
        config.borderColor,
        "border-l-4"
      )}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className={cn("p-2 rounded-lg shrink-0", config.bgColor)}>
              <Icon className={cn("h-5 w-5", config.color)} />
            </div>
            <div className="flex-1 min-w-0">
              <CardTitle className="text-base mb-1">{insight.title}</CardTitle>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge
                  variant="outline"
                  className={cn("text-xs", config.color, "border-current")}
                >
                  {insight.insightType}
                </Badge>
                <Badge variant="secondary" className="text-xs">
                  {insight.sourceType}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {formatDate(insight.createdAt)}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {onPin && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => onPin(insight.id)}
              >
                <Pin
                  className={cn(
                    "h-4 w-4",
                    insight.isPinned ? "fill-current text-[#ff6a1a]" : ""
                  )}
                />
                <span className="sr-only">
                  {insight.isPinned ? "Unpin" : "Pin"}
                </span>
              </Button>
            )}
            {onDismiss && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => onDismiss(insight.id)}
              >
                <X className="h-4 w-4" />
                <span className="sr-only">Dismiss</span>
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <p
          className={cn(
            "text-sm text-muted-foreground",
            !isExpanded && "line-clamp-2"
          )}
        >
          {insight.content}
        </p>

        {insight.content.length > 150 && (
          <Button
            variant="ghost"
            size="sm"
            className="mt-2 h-auto p-0 text-[#ff6a1a] hover:text-[#ea580c]"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? (
              <>
                Show less <ChevronUp className="ml-1 h-4 w-4" />
              </>
            ) : (
              <>
                Read more <ChevronDown className="ml-1 h-4 w-4" />
              </>
            )}
          </Button>
        )}

        {/* Importance indicator */}
        <div className="mt-3 flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Importance:</span>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((level) => (
              <div
                key={level}
                className={cn(
                  "h-1.5 w-6 rounded-full",
                  level <= insight.importance
                    ? "bg-[#ff6a1a]"
                    : "bg-gray-200 dark:bg-gray-800"
                )}
              />
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
