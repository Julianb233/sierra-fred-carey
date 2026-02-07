"use client";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import type {
  InboxMessage as InboxMessageType,
  MessagePriority,
  MessageSource,
} from "@/lib/inbox/types";

// ============================================================================
// Priority Color Mapping
// ============================================================================

const PRIORITY_BORDER: Record<MessagePriority, string> = {
  urgent: "border-l-red-500",
  high: "border-l-orange-400",
  normal: "border-l-gray-300 dark:border-l-gray-600",
  low: "border-l-blue-400",
};

const PRIORITY_DOT: Record<MessagePriority, string> = {
  urgent: "bg-red-500",
  high: "bg-orange-400",
  normal: "bg-gray-400",
  low: "bg-blue-400",
};

const PRIORITY_LABEL: Record<MessagePriority, string> = {
  urgent: "Urgent",
  high: "High",
  normal: "Normal",
  low: "Low",
};

// ============================================================================
// Source Badge Mapping
// ============================================================================

const SOURCE_COLORS: Record<MessageSource, string> = {
  "founder-ops":
    "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  fundraising:
    "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  growth:
    "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  system:
    "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
};

const SOURCE_LABELS: Record<MessageSource, string> = {
  "founder-ops": "Founder Ops",
  fundraising: "Fundraising",
  growth: "Growth",
  system: "System",
};

// ============================================================================
// Time Formatting
// ============================================================================

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  if (diffDay < 30) return `${diffDay}d ago`;
  return date.toLocaleDateString();
}

// ============================================================================
// Component
// ============================================================================

interface InboxMessageProps {
  message: InboxMessageType;
  onAction?: (id: string, action: "dismiss" | "read") => void;
}

export function InboxMessage({ message, onAction }: InboxMessageProps) {
  const isUnread = message.status === "unread";

  return (
    <Card
      className={`
        border-l-4 ${PRIORITY_BORDER[message.priority]}
        p-4 hover:shadow-md transition-all duration-200
        ${isUnread ? "bg-white dark:bg-gray-900" : "bg-gray-50/50 dark:bg-gray-900/50"}
      `}
    >
      <div className="flex items-start gap-3">
        {/* Priority indicator */}
        <div className="flex-shrink-0 pt-1.5">
          <div
            className={`h-2.5 w-2.5 rounded-full ${PRIORITY_DOT[message.priority]}`}
            title={PRIORITY_LABEL[message.priority]}
          />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Top row: source badge + timestamp */}
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${SOURCE_COLORS[message.source]}`}
            >
              {SOURCE_LABELS[message.source]}
            </span>
            {message.priority === "urgent" && (
              <Badge variant="destructive" className="text-xs px-1.5 py-0">
                Urgent
              </Badge>
            )}
            <span className="text-xs text-gray-500 dark:text-gray-400 ml-auto">
              {formatRelativeTime(message.createdAt)}
            </span>
          </div>

          {/* Title */}
          <h3
            className={`text-sm leading-snug mb-1 ${
              isUnread
                ? "font-semibold text-gray-900 dark:text-white"
                : "font-medium text-gray-700 dark:text-gray-300"
            }`}
          >
            {message.title}
          </h3>

          {/* Summary */}
          <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
            {message.summary}
          </p>

          {/* Actions */}
          <div className="flex items-center gap-2 mt-3">
            {message.actionUrl && (
              <Button variant="outline" size="sm" asChild>
                <Link href={message.actionUrl}>View</Link>
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              onClick={() => onAction?.(message.id, "dismiss")}
            >
              Dismiss
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
