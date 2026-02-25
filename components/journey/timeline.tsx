"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  CheckCircle,
  Lightbulb,
  FileText,
  TrendingUp,
  ArrowUp,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface JourneyEvent {
  id: string;
  eventType: string;
  eventData: Record<string, unknown>;
  scoreBefore?: number;
  scoreAfter?: number;
  createdAt: string;
}

interface TimelineProps {
  events: JourneyEvent[];
  onLoadMore?: () => void;
}

const eventConfig: Record<
  string,
  {
    icon: typeof CheckCircle;
    color: string;
    bgColor: string;
    getTitle: (data: Record<string, unknown>) => string;
  }
> = {
  analysis_completed: {
    icon: CheckCircle,
    color: "text-green-600",
    bgColor: "bg-green-100 dark:bg-green-900/20",
    getTitle: (data) => "Completed Reality Lens analysis",
  },
  milestone_achieved: {
    icon: CheckCircle,
    color: "text-purple-600",
    bgColor: "bg-purple-100 dark:bg-purple-900/20",
    getTitle: (data) => `Achieved milestone: ${data.milestoneName || "Unknown"}`,
  },
  insight_discovered: {
    icon: Lightbulb,
    color: "text-amber-600",
    bgColor: "bg-amber-100 dark:bg-amber-900/20",
    getTitle: (data) => `New insight: ${data.insightTitle || "Unknown"}`,
  },
  score_improved: {
    icon: TrendingUp,
    color: "text-[#ff6a1a]",
    bgColor: "bg-orange-100 dark:bg-orange-900/20",
    getTitle: (data) => "Score improved",
  },
  document_created: {
    icon: FileText,
    color: "text-blue-600",
    bgColor: "bg-blue-100 dark:bg-blue-900/20",
    getTitle: (data) => `Created document: ${data.documentTitle || "Unknown"}`,
  },
  default: {
    icon: Clock,
    color: "text-gray-600",
    bgColor: "bg-gray-100 dark:bg-gray-900/20",
    getTitle: (data) => "Activity recorded",
  },
};

export function Timeline({ events, onLoadMore }: TimelineProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;

    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
  };

  // Group events by date
  const groupedEvents = events.reduce((acc, event) => {
    const date = new Date(event.createdAt).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(event);
    return acc;
  }, {} as Record<string, JourneyEvent[]>);

  return (
    <div className="space-y-6">
      {Object.entries(groupedEvents).map(([date, dateEvents]) => (
        <div key={date} className="space-y-4">
          {/* Date Header */}
          <div className="flex items-center gap-3">
            <div className="h-px bg-border flex-1" />
            <Badge variant="secondary" className="text-xs font-normal">
              {date}
            </Badge>
            <div className="h-px bg-border flex-1" />
          </div>

          {/* Events for this date */}
          <div className="space-y-3 relative">
            {/* Timeline line */}
            <div className="absolute left-[23px] top-4 bottom-4 w-px bg-border" />

            {dateEvents.map((event, index) => {
              const config =
                eventConfig[event.eventType] || eventConfig.default;
              const Icon = config.icon;
              const scoreChange =
                event.scoreAfter !== undefined && event.scoreBefore !== undefined
                  ? event.scoreAfter - event.scoreBefore
                  : null;

              return (
                <div key={event.id} className="relative">
                  <Card className="ml-12 transition-all hover:shadow-md">
                    <CardContent className="py-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-medium text-sm">
                              {config.getTitle(event.eventData)}
                            </p>
                            {scoreChange !== null && scoreChange !== 0 && (
                              <Badge
                                variant="outline"
                                className={cn(
                                  "gap-1",
                                  scoreChange > 0
                                    ? "bg-green-500/10 text-green-600 border-green-500/20"
                                    : "bg-red-500/10 text-red-600 border-red-500/20"
                                )}
                              >
                                <ArrowUp
                                  className={cn(
                                    "h-3 w-3",
                                    scoreChange < 0 && "rotate-180"
                                  )}
                                />
                                {Math.abs(scoreChange)} points
                              </Badge>
                            )}
                          </div>

                          {!!event.eventData.description && (
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {String(event.eventData.description)}
                            </p>
                          )}
                        </div>

                        <span className="text-xs text-muted-foreground shrink-0">
                          {formatTime(event.createdAt)}
                        </span>
                      </div>

                      {/* Additional event metadata */}
                      {(event.scoreBefore !== undefined ||
                        event.scoreAfter !== undefined) && (
                        <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                          {event.scoreBefore !== undefined && (
                            <span>Before: {event.scoreBefore}</span>
                          )}
                          {event.scoreBefore !== undefined &&
                            event.scoreAfter !== undefined && (
                              <span>→</span>
                            )}
                          {event.scoreAfter !== undefined && (
                            <span className="font-medium text-[#ff6a1a]">
                              After: {event.scoreAfter}
                            </span>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Timeline dot */}
                  <div
                    className={cn(
                      "absolute left-[11px] top-4 p-2 rounded-full border-2 border-background z-10",
                      config.bgColor
                    )}
                  >
                    <Icon className={cn("h-4 w-4", config.color)} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {/* Load More */}
      {onLoadMore && (
        <div className="flex justify-center pt-4">
          <Button variant="outline" onClick={onLoadMore}>
            Load More
          </Button>
        </div>
      )}

      {events.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center">
            <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
            <p className="text-muted-foreground">No events yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              Your journey will be tracked here
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
