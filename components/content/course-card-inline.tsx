"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Lock } from "lucide-react";
import { cn } from "@/lib/utils";

// ============================================================================
// Types
// ============================================================================

export interface CourseCardInlineProps {
  id: string;
  title: string;
  description: string;
  slug: string;
  tier_required: string;
  stage?: string;
}

// ============================================================================
// Component
// ============================================================================

/**
 * Compact course card for display inside FRED chat messages.
 * Renders as a clickable link to the course detail page.
 * Designed to be visually subtle within the chat message bubble.
 */
export function CourseCardInline({
  id,
  title,
  description,
  tier_required,
  stage,
}: CourseCardInlineProps) {
  const isGated = tier_required === "pro" || tier_required === "studio";
  const tierLabel = tier_required === "studio" ? "Studio" : "Pro";

  return (
    <Link
      href={`/dashboard/content/${id}`}
      className={cn(
        "flex items-start gap-3 p-3 rounded-lg border",
        "bg-white/5 border-white/10 hover:bg-white/10",
        "dark:bg-gray-800/50 dark:border-gray-700 dark:hover:bg-gray-700/60",
        "transition-colors duration-150 no-underline block mt-2"
      )}
    >
      {/* Icon */}
      <div className="shrink-0 h-8 w-8 rounded-md bg-orange-500/20 flex items-center justify-center mt-0.5">
        <BookOpen className="h-4 w-4 text-orange-400" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-0.5">
          <span className="font-medium text-sm text-foreground">{title}</span>
          {isGated && (
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <Lock className="h-3 w-3" />
              {tierLabel}
            </span>
          )}
          {stage && (
            <Badge variant="secondary" className="text-xs capitalize">
              {stage}
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground line-clamp-2">{description}</p>
      </div>
    </Link>
  );
}
