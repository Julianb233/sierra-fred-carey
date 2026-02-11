"use client";

import { Skeleton } from "@/components/ui/skeleton";

/** Matches CommunityCard dimensions at each breakpoint */
export function CommunityCardSkeleton() {
  return (
    <div className="rounded-xl border border-orange-100/20 dark:border-white/5 bg-white/50 dark:bg-black/20 p-5 space-y-3">
      {/* Icon + title row */}
      <div className="flex items-start gap-3">
        <Skeleton className="h-11 w-11 rounded-xl shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-16 rounded-full" />
        </div>
      </div>
      {/* Description */}
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-2/3" />
      {/* Footer */}
      <div className="flex items-center justify-between pt-1">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-10 w-16 rounded-md" />
      </div>
    </div>
  );
}

/** Matches PostCard layout */
export function PostCardSkeleton() {
  return (
    <div className="rounded-xl border border-orange-100/20 dark:border-white/5 bg-white/50 dark:bg-black/20 p-4 md:p-5 space-y-3">
      {/* Author row */}
      <div className="flex items-center gap-3">
        <Skeleton className="h-9 w-9 rounded-full shrink-0" />
        <div className="flex-1 space-y-1.5">
          <Skeleton className="h-3.5 w-28" />
          <Skeleton className="h-3 w-16" />
        </div>
      </div>
      {/* Content */}
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-5/6" />
      <Skeleton className="h-4 w-3/4" />
      {/* Reaction bar */}
      <div className="flex gap-3 pt-2">
        <Skeleton className="h-8 w-14 rounded-md" />
        <Skeleton className="h-8 w-14 rounded-md" />
      </div>
    </div>
  );
}

/** Matches member list row */
export function MemberRowSkeleton() {
  return (
    <div className="flex items-center gap-3 p-4 rounded-xl bg-white/50 dark:bg-black/20 border border-orange-100/20 dark:border-white/5">
      <Skeleton className="h-11 w-11 rounded-full shrink-0" />
      <div className="flex-1 space-y-1.5">
        <Skeleton className="h-3.5 w-32" />
        <Skeleton className="h-3 w-16 rounded-full" />
      </div>
    </div>
  );
}
