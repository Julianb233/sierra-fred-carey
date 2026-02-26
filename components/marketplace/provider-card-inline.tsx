"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Star, BadgeCheck } from "lucide-react";
import { cn } from "@/lib/utils";

// ============================================================================
// Types
// ============================================================================

export interface ProviderCardInlineProps {
  id: string;
  name: string;
  slug: string;
  tagline: string;
  category: string;
  rating: number;
  review_count: number;
  is_verified?: boolean;
}

// ============================================================================
// Component
// ============================================================================

/**
 * Compact provider card for display inside FRED chat messages.
 * Renders as a clickable link to the provider detail page.
 * Designed to be visually subtle within the chat message bubble.
 */
export function ProviderCardInline({
  name,
  slug,
  tagline,
  category,
  rating,
  review_count,
  is_verified,
}: ProviderCardInlineProps) {
  const categoryLabel =
    {
      legal: "Legal",
      finance: "Finance",
      marketing: "Marketing",
      growth: "Growth",
      tech: "Tech",
      hr: "HR",
      operations: "Operations",
      other: "Other",
    }[category] ?? category;

  return (
    <Link
      href={`/dashboard/marketplace/${slug}`}
      className={cn(
        "flex items-start gap-3 p-3 rounded-lg border",
        "bg-white/5 border-white/10 hover:bg-white/10",
        "dark:bg-gray-800/50 dark:border-gray-700 dark:hover:bg-gray-700/60",
        "transition-colors duration-150 no-underline block mt-2"
      )}
    >
      {/* Avatar */}
      <div className="shrink-0 h-8 w-8 rounded-full bg-orange-500/20 flex items-center justify-center mt-0.5">
        <span className="text-sm font-bold text-orange-400">
          {name.charAt(0).toUpperCase()}
        </span>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
          <span className="font-medium text-sm text-foreground">{name}</span>
          {is_verified && (
            <BadgeCheck className="h-3.5 w-3.5 text-blue-400 shrink-0" />
          )}
          <Badge variant="secondary" className="text-xs capitalize px-1.5 py-0">
            {categoryLabel}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground line-clamp-1 mb-1">{tagline}</p>
        {/* Rating */}
        <div className="flex items-center gap-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star
              key={i}
              className={cn(
                "h-3 w-3",
                i < Math.round(rating)
                  ? "fill-amber-400 text-amber-400"
                  : "fill-none text-gray-400"
              )}
            />
          ))}
          <span className="text-xs text-muted-foreground ml-0.5">
            {review_count > 0 ? `${rating.toFixed(1)} (${review_count})` : "New"}
          </span>
        </div>
      </div>
    </Link>
  );
}
