"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import {
  MessageSquare,
  Loader2,
  ArrowRight,
  Brain,
  Lightbulb,
  Clock,
  Download,
  ChevronDown,
  FileJson,
  FileText,
  Table,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  confidence?: "high" | "medium" | "low";
  action?: string;
}

interface Decision {
  id: string;
  type: string;
  recommendation?: Record<string, unknown>;
  confidence?: number;
  createdAt: string;
}

interface Fact {
  category: string;
  key: string;
  value: Record<string, unknown>;
  updatedAt: string;
}

interface SessionDetail {
  sessionId: string;
  messages: Message[];
  decisions: Decision[];
  facts: Fact[];
}

interface ConversationViewProps {
  sessionId: string;
  onContinue?: () => void;
  className?: string;
}

const CONFIDENCE_COLORS = {
  high: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  medium: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  low: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
};

type ExportFormat = "json" | "markdown" | "csv";

const EXPORT_OPTIONS: { format: ExportFormat; label: string; icon: typeof FileJson }[] = [
  { format: "json", label: "JSON", icon: FileJson },
  { format: "markdown", label: "Markdown", icon: FileText },
  { format: "csv", label: "CSV", icon: Table },
];

export function ConversationView({
  sessionId,
  onContinue,
  className,
}: ConversationViewProps) {
  const [detail, setDetail] = useState<SessionDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const exportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (sessionId) {
      fetchSessionDetail();
    }
  }, [sessionId]);

  // Close export dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) {
        setExportOpen(false);
      }
    }
    if (exportOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [exportOpen]);

  const fetchSessionDetail = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(`/api/fred/history?sessionId=${sessionId}`);
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to fetch session");
      }

      setDetail(data.data);
    } catch (err) {
      console.error("[ConversationView] Error:", err);
      setError(err instanceof Error ? err.message : "Failed to load conversation");
    } finally {
      setIsLoading(false);
    }
  };

  const handleExport = async (fmt: ExportFormat) => {
    setExportOpen(false);
    try {
      const url = `/api/fred/export?sessionId=${sessionId}&format=${fmt}`;
      const res = await fetch(url);

      if (!res.ok) {
        console.error("[ConversationView] Export failed:", res.status);
        return;
      }

      // Trigger browser download
      const blob = await res.blob();
      const disposition = res.headers.get("Content-Disposition") || "";
      const filenameMatch = disposition.match(/filename="?([^"]+)"?/);
      const filename = filenameMatch?.[1] || `fred-chat-export.${fmt === "markdown" ? "md" : fmt}`;

      const anchor = document.createElement("a");
      anchor.href = URL.createObjectURL(blob);
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(anchor.href);
    } catch (err) {
      console.error("[ConversationView] Export error:", err);
    }
  };

  if (isLoading) {
    return (
      <div className={cn("flex items-center justify-center h-full", className)}>
        <Loader2 className="h-6 w-6 animate-spin text-[#ff6a1a]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn("flex flex-col items-center justify-center h-full", className)}>
        <p className="text-sm text-red-500">{error}</p>
        <button
          onClick={fetchSessionDetail}
          className="mt-2 text-sm text-[#ff6a1a] hover:underline"
        >
          Try again
        </button>
      </div>
    );
  }

  if (!detail) {
    return (
      <div className={cn("flex flex-col items-center justify-center h-full", className)}>
        <MessageSquare className="h-12 w-12 text-gray-300 dark:text-gray-600 mb-4" />
        <p className="text-gray-500">Select a conversation to view</p>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
        <div>
          <h3 className="font-medium text-gray-900 dark:text-white">
            Conversation
          </h3>
          {detail.messages.length > 0 && (
            <p className="text-xs text-gray-500">
              {format(new Date(detail.messages[0].timestamp), "MMM d, yyyy 'at' h:mm a")}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Export dropdown */}
          <div className="relative" ref={exportRef}>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setExportOpen(!exportOpen)}
              className="flex items-center gap-1.5"
            >
              <Download className="h-4 w-4" />
              Export
              <ChevronDown className={cn("h-3 w-3 transition-transform", exportOpen && "rotate-180")} />
            </Button>

            <AnimatePresence>
              {exportOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className="absolute right-0 top-full mt-1 z-20 w-40 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-lg overflow-hidden"
                >
                  {EXPORT_OPTIONS.map((opt) => {
                    const Icon = opt.icon;
                    return (
                      <button
                        key={opt.format}
                        onClick={() => handleExport(opt.format)}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                      >
                        <Icon className="h-4 w-4 text-gray-400" />
                        {opt.label}
                      </button>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {onContinue && (
            <Button
              size="sm"
              onClick={onContinue}
              className="bg-[#ff6a1a] hover:bg-[#ea580c] text-white"
            >
              Continue
              <ArrowRight className="ml-1.5 h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1" ref={scrollRef}>
        <div className="p-4 space-y-4">
          <AnimatePresence mode="popLayout">
            {detail.messages.map((message, index) => (
              <MessageBubble key={message.id} message={message} index={index} />
            ))}
          </AnimatePresence>
        </div>
      </ScrollArea>

      {/* Decisions panel (if any) */}
      {detail.decisions.length > 0 && (
        <>
          <Separator />
          <div className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Brain className="h-4 w-4 text-amber-500" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Decisions Made ({detail.decisions.length})
              </span>
            </div>
            <div className="space-y-2">
              {detail.decisions.slice(0, 3).map((decision) => (
                <DecisionCard key={decision.id} decision={decision} />
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

interface MessageBubbleProps {
  message: Message;
  index: number;
}

function MessageBubble({ message, index }: MessageBubbleProps) {
  const isUser = message.role === "user";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className={cn("flex", isUser ? "justify-end" : "justify-start")}
    >
      <div
        className={cn(
          "max-w-[80%] rounded-2xl px-4 py-2.5",
          isUser
            ? "bg-[#ff6a1a] text-white rounded-tr-sm"
            : "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded-tl-sm"
        )}
      >
        <p className="text-sm whitespace-pre-wrap">{message.content}</p>

        {/* Metadata footer */}
        <div
          className={cn(
            "flex items-center gap-2 mt-1.5 text-xs",
            isUser ? "text-white/70" : "text-gray-500"
          )}
        >
          <Clock className="h-3 w-3" />
          <span>{format(new Date(message.timestamp), "h:mm a")}</span>

          {message.confidence && (
            <Badge
              variant="secondary"
              className={cn("text-xs px-1.5", CONFIDENCE_COLORS[message.confidence])}
            >
              {message.confidence}
            </Badge>
          )}

          {message.action && message.action !== "defer" && (
            <Badge
              variant="outline"
              className="text-xs px-1.5 border-[#ff6a1a]/50 text-[#ff6a1a]"
            >
              <Lightbulb className="h-3 w-3 mr-0.5" />
              {formatAction(message.action)}
            </Badge>
          )}
        </div>
      </div>
    </motion.div>
  );
}

interface DecisionCardProps {
  decision: Decision;
}

function DecisionCard({ decision }: DecisionCardProps) {
  return (
    <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50">
      <div className="flex items-center justify-between">
        <Badge variant="outline" className="border-amber-400 text-amber-700 dark:text-amber-400">
          {formatDecisionType(decision.type)}
        </Badge>
        <span className="text-xs text-gray-500">
          {format(new Date(decision.createdAt), "h:mm a")}
        </span>
      </div>

      {decision.recommendation && (
        <p className="text-sm text-gray-700 dark:text-gray-300 mt-2 line-clamp-2">
          {JSON.stringify(decision.recommendation).slice(0, 100)}...
        </p>
      )}

      {decision.confidence !== undefined && (
        <div className="flex items-center gap-1 mt-2">
          <span className="text-xs text-gray-500">Confidence:</span>
          <div className="flex-1 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-amber-500 rounded-full transition-all"
              style={{ width: `${decision.confidence * 100}%` }}
            />
          </div>
          <span className="text-xs text-gray-600 dark:text-gray-400">
            {Math.round(decision.confidence * 100)}%
          </span>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Helpers
// ============================================================================

function formatAction(action: string): string {
  return action
    .replace(/_/g, " ")
    .replace(/([A-Z])/g, " $1")
    .toLowerCase()
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")
    .trim();
}

function formatDecisionType(type: string): string {
  const types: Record<string, string> = {
    auto: "Auto Decision",
    recommended: "Recommended",
    escalated: "User Decision",
  };
  return types[type] || type;
}
