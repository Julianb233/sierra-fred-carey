"use client"

import { cn } from "@/lib/utils"
import type { QuoteStatus } from "@/types/sales"

const statusConfig: Record<
  QuoteStatus,
  { label: string; className: string; dot: string }
> = {
  draft: {
    label: "Draft",
    className: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
    dot: "bg-gray-400",
  },
  sent: {
    label: "Sent",
    className: "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    dot: "bg-blue-500",
  },
  accepted: {
    label: "Accepted",
    className: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
    dot: "bg-emerald-500",
  },
  expired: {
    label: "Expired",
    className: "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    dot: "bg-red-400",
  },
}

export function QuoteStatusBadge({ status }: { status: QuoteStatus }) {
  const config = statusConfig[status]
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium",
        config.className
      )}
    >
      <span className={cn("w-1.5 h-1.5 rounded-full", config.dot)} />
      {config.label}
    </span>
  )
}
