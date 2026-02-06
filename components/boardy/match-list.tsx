"use client";

/**
 * Match List Component
 * Phase 04: Studio Tier Features - Plan 06
 *
 * Renders Boardy match cards in a grid with status-aware action buttons.
 * Match score shown as colored bar, type shown as colored badge.
 */

import { useState } from "react";
import { motion } from "framer-motion";
import {
  UserPlus,
  Send,
  Calendar,
  XCircle,
  TrendingUp,
  Briefcase,
  GraduationCap,
  Handshake,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type {
  BoardyMatch,
  BoardyMatchStatus,
  BoardyMatchType,
} from "@/lib/boardy/types";

// ============================================================================
// Props
// ============================================================================

interface MatchListProps {
  matches: BoardyMatch[];
  onStatusUpdate: (matchId: string, status: BoardyMatchStatus) => void;
}

// ============================================================================
// Config
// ============================================================================

const TYPE_CONFIG: Record<
  BoardyMatchType,
  { label: string; className: string; icon: typeof Briefcase }
> = {
  investor: {
    label: "Investor",
    className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    icon: TrendingUp,
  },
  advisor: {
    label: "Advisor",
    className: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
    icon: Briefcase,
  },
  mentor: {
    label: "Mentor",
    className: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    icon: GraduationCap,
  },
  partner: {
    label: "Partner",
    className: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
    icon: Handshake,
  },
};

const STATUS_LABELS: Record<BoardyMatchStatus, string> = {
  suggested: "Suggested",
  connected: "Connected",
  intro_sent: "Intro Sent",
  meeting_scheduled: "Meeting Scheduled",
  declined: "Declined",
};

// ============================================================================
// Component
// ============================================================================

export function MatchList({ matches, onStatusUpdate }: MatchListProps) {
  if (matches.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 dark:text-gray-400">
          No matches found. Try refreshing to generate new suggestions.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {matches.map((match, index) => (
        <MatchCard
          key={match.id}
          match={match}
          index={index}
          onStatusUpdate={onStatusUpdate}
        />
      ))}
    </div>
  );
}

// ============================================================================
// Match Card
// ============================================================================

function MatchCard({
  match,
  index,
  onStatusUpdate,
}: {
  match: BoardyMatch;
  index: number;
  onStatusUpdate: (matchId: string, status: BoardyMatchStatus) => void;
}) {
  const [isUpdating, setIsUpdating] = useState(false);
  const typeConfig = TYPE_CONFIG[match.matchType];
  const TypeIcon = typeConfig.icon;
  const scorePercent = Math.round(match.matchScore * 100);

  const handleStatusUpdate = async (newStatus: BoardyMatchStatus) => {
    setIsUpdating(true);
    try {
      onStatusUpdate(match.id, newStatus);
    } finally {
      // Let parent handle the actual loading state
      setTimeout(() => setIsUpdating(false), 500);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
    >
      <Card className="h-full hover:shadow-md transition-shadow dark:border-gray-800">
        <CardContent className="p-5">
          {/* Header: Type badge + Score */}
          <div className="flex items-center justify-between mb-3">
            <Badge
              variant="secondary"
              className={typeConfig.className}
            >
              <TypeIcon className="w-3 h-3 mr-1" />
              {typeConfig.label}
            </Badge>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {STATUS_LABELS[match.status]}
            </span>
          </div>

          {/* Name */}
          <h3 className="font-semibold text-gray-900 dark:text-white mb-2 line-clamp-1">
            {match.matchName}
          </h3>

          {/* Description */}
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-3">
            {match.matchDescription}
          </p>

          {/* Match Score Bar */}
          <div className="mb-4">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-gray-500 dark:text-gray-400">Match Score</span>
              <span className="font-medium text-gray-700 dark:text-gray-300">
                {scorePercent}%
              </span>
            </div>
            <div className="w-full h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${getScoreColor(match.matchScore)}`}
                style={{ width: `${scorePercent}%` }}
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-2">
            {match.status !== "declined" && (
              <>
                {/* Primary action based on current status */}
                {match.status === "suggested" && (
                  <Button
                    size="sm"
                    className="w-full bg-[#ff6a1a] hover:bg-[#ea580c] text-white"
                    onClick={() => handleStatusUpdate("connected")}
                    disabled={isUpdating}
                  >
                    <UserPlus className="w-3.5 h-3.5 mr-1.5" />
                    Connect
                  </Button>
                )}
                {match.status === "connected" && (
                  <Button
                    size="sm"
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                    onClick={() => handleStatusUpdate("intro_sent")}
                    disabled={isUpdating}
                  >
                    <Send className="w-3.5 h-3.5 mr-1.5" />
                    Request Intro
                  </Button>
                )}
                {match.status === "intro_sent" && (
                  <Button
                    size="sm"
                    className="w-full bg-green-600 hover:bg-green-700 text-white"
                    onClick={() => handleStatusUpdate("meeting_scheduled")}
                    disabled={isUpdating}
                  >
                    <Calendar className="w-3.5 h-3.5 mr-1.5" />
                    Schedule Meeting
                  </Button>
                )}
                {match.status === "meeting_scheduled" && (
                  <div className="text-center py-1">
                    <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                      <Calendar className="w-3 h-3 mr-1" />
                      Meeting Scheduled
                    </Badge>
                  </div>
                )}

                {/* Decline button */}
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                  onClick={() => handleStatusUpdate("declined")}
                  disabled={isUpdating}
                >
                  <XCircle className="w-3.5 h-3.5 mr-1.5" />
                  Decline
                </Button>
              </>
            )}

            {match.status === "declined" && (
              <div className="text-center py-1">
                <Badge
                  variant="secondary"
                  className="bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-500"
                >
                  <XCircle className="w-3 h-3 mr-1" />
                  Declined
                </Badge>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ============================================================================
// Helpers
// ============================================================================

function getScoreColor(score: number): string {
  if (score >= 0.8) return "bg-green-500";
  if (score >= 0.5) return "bg-yellow-500";
  return "bg-orange-500";
}
