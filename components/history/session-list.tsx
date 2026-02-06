"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import { MessageSquare, Brain, ChevronRight, Loader2, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface Session {
  sessionId: string;
  firstMessage: string;
  messageCount: number;
  decisionCount: number;
  startedAt: string;
  lastActivityAt: string;
}

interface SessionListProps {
  onSelectSession: (sessionId: string) => void;
  selectedSessionId?: string;
  className?: string;
}

export function SessionList({
  onSelectSession,
  selectedSessionId,
  className,
}: SessionListProps) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch("/api/fred/history?limit=50");
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to fetch sessions");
      }

      setSessions(data.data);
    } catch (err) {
      console.error("[SessionList] Error:", err);
      setError(err instanceof Error ? err.message : "Failed to load history");
    } finally {
      setIsLoading(false);
    }
  };

  // Filter sessions by search query
  const filteredSessions = sessions.filter((session) =>
    session.firstMessage.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Group sessions by date
  const groupedSessions = groupSessionsByDate(filteredSessions);

  if (isLoading) {
    return (
      <div className={cn("flex items-center justify-center py-12", className)}>
        <Loader2 className="h-6 w-6 animate-spin text-[#ff6a1a]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn("text-center py-12", className)}>
        <p className="text-sm text-red-500">{error}</p>
        <button
          onClick={fetchSessions}
          className="mt-2 text-sm text-[#ff6a1a] hover:underline"
        >
          Try again
        </button>
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div className={cn("text-center py-12", className)}>
        <MessageSquare className="h-12 w-12 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
        <p className="text-gray-500 dark:text-gray-400">No conversations yet</p>
        <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
          Start chatting with FRED to see your history
        </p>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Search */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-800">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search conversations..."
            className="pl-9"
          />
        </div>
      </div>

      {/* Session list */}
      <ScrollArea className="flex-1">
        <div className="p-2">
          <AnimatePresence mode="popLayout">
            {Object.entries(groupedSessions).map(([dateGroup, groupSessions]) => (
              <div key={dateGroup} className="mb-4">
                {/* Date header */}
                <div className="px-2 py-1.5 sticky top-0 bg-background/80 backdrop-blur-sm z-10">
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {dateGroup}
                  </span>
                </div>

                {/* Sessions in this group */}
                {groupSessions.map((session) => (
                  <SessionCard
                    key={session.sessionId}
                    session={session}
                    isSelected={session.sessionId === selectedSessionId}
                    onClick={() => onSelectSession(session.sessionId)}
                  />
                ))}
              </div>
            ))}
          </AnimatePresence>

          {filteredSessions.length === 0 && searchQuery && (
            <div className="text-center py-8">
              <p className="text-sm text-gray-500">No conversations match "{searchQuery}"</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

interface SessionCardProps {
  session: Session;
  isSelected: boolean;
  onClick: () => void;
}

function SessionCard({ session, isSelected, onClick }: SessionCardProps) {
  return (
    <motion.button
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      onClick={onClick}
      className={cn(
        "w-full text-left p-3 rounded-lg mb-1 transition-colors group",
        isSelected
          ? "bg-[#ff6a1a]/10 border border-[#ff6a1a]/30"
          : "hover:bg-gray-100 dark:hover:bg-gray-800/50"
      )}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div
          className={cn(
            "mt-0.5 p-2 rounded-lg",
            isSelected
              ? "bg-[#ff6a1a]/20 text-[#ff6a1a]"
              : "bg-gray-100 dark:bg-gray-800 text-gray-500"
          )}
        >
          <MessageSquare className="h-4 w-4" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p
            className={cn(
              "text-sm font-medium truncate",
              isSelected ? "text-[#ff6a1a]" : "text-gray-900 dark:text-white"
            )}
          >
            {truncateMessage(session.firstMessage, 50)}
          </p>

          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {formatDistanceToNow(new Date(session.lastActivityAt), {
                addSuffix: true,
              })}
            </span>

            {/* Stats badges */}
            <div className="flex items-center gap-1">
              <Badge variant="secondary" className="text-xs px-1.5 py-0">
                {session.messageCount} msgs
              </Badge>
              {session.decisionCount > 0 && (
                <Badge
                  variant="outline"
                  className="text-xs px-1.5 py-0 border-amber-300 text-amber-600"
                >
                  <Brain className="h-3 w-3 mr-0.5" />
                  {session.decisionCount}
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Arrow */}
        <ChevronRight
          className={cn(
            "h-4 w-4 text-gray-400 transition-transform",
            isSelected && "text-[#ff6a1a]",
            "group-hover:translate-x-0.5"
          )}
        />
      </div>
    </motion.button>
  );
}

// ============================================================================
// Helpers
// ============================================================================

function groupSessionsByDate(sessions: Session[]): Record<string, Session[]> {
  const groups: Record<string, Session[]> = {};
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const lastWeek = new Date(today);
  lastWeek.setDate(lastWeek.getDate() - 7);

  for (const session of sessions) {
    const date = new Date(session.lastActivityAt);
    let group: string;

    if (isSameDay(date, today)) {
      group = "Today";
    } else if (isSameDay(date, yesterday)) {
      group = "Yesterday";
    } else if (date > lastWeek) {
      group = "This Week";
    } else {
      group = date.toLocaleDateString(undefined, { month: "long", year: "numeric" });
    }

    if (!groups[group]) {
      groups[group] = [];
    }
    groups[group].push(session);
  }

  return groups;
}

function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

function truncateMessage(message: string, maxLength: number): string {
  if (message.length <= maxLength) return message;
  return message.slice(0, maxLength).trim() + "...";
}
