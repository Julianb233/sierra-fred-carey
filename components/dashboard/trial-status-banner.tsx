"use client"

import { useState } from "react"
import { Clock, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { redirectToCheckoutByTier } from "@/lib/stripe/client"
import { cn } from "@/lib/utils"

interface TrialStatusBannerProps {
  trialEnd: string | null
  subscriptionStatus: string | null
  className?: string
}

function getDaysRemaining(trialEnd: string): number {
  const end = new Date(trialEnd)
  const now = new Date()
  const diff = end.getTime() - now.getTime()
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
}

export function TrialStatusBanner({
  trialEnd,
  subscriptionStatus,
  className,
}: TrialStatusBannerProps) {
  const [upgrading, setUpgrading] = useState(false)

  // Only show for trialing subscriptions with a trial end date
  if (subscriptionStatus !== "trialing" || !trialEnd) return null

  const daysRemaining = getDaysRemaining(trialEnd)
  const isExpiringSoon = daysRemaining <= 3
  const isExpired = daysRemaining === 0

  const handleUpgrade = async () => {
    try {
      setUpgrading(true)
      await redirectToCheckoutByTier("pro")
    } catch {
      // Errors handled by redirect function
    } finally {
      setUpgrading(false)
    }
  }

  if (isExpired) {
    return (
      <div
        className={cn(
          "flex items-center justify-between gap-4 p-4 rounded-xl border",
          "bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-800",
          className
        )}
      >
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-full bg-red-100 dark:bg-red-900/40">
            <Clock className="h-4 w-4 text-red-600 dark:text-red-400" />
          </div>
          <div>
            <p className="font-semibold text-sm text-red-800 dark:text-red-200">
              Your free trial has ended
            </p>
            <p className="text-xs text-red-600 dark:text-red-400">
              Subscribe now to keep access to all features.
            </p>
          </div>
        </div>
        <Button
          size="sm"
          onClick={handleUpgrade}
          disabled={upgrading}
          className="bg-[#ff6a1a] hover:bg-[#ea580c] text-white shrink-0"
        >
          {upgrading ? "Loading..." : "Subscribe Now"}
          {!upgrading && <ArrowRight className="ml-1 h-3 w-3" />}
        </Button>
      </div>
    )
  }

  return (
    <div
      className={cn(
        "flex items-center justify-between gap-4 p-4 rounded-xl border",
        isExpiringSoon
          ? "bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-800"
          : "bg-blue-50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-800",
        className
      )}
    >
      <div className="flex items-center gap-3">
        <div
          className={cn(
            "p-2 rounded-full",
            isExpiringSoon
              ? "bg-amber-100 dark:bg-amber-900/40"
              : "bg-blue-100 dark:bg-blue-900/40"
          )}
        >
          <Clock
            className={cn(
              "h-4 w-4",
              isExpiringSoon
                ? "text-amber-600 dark:text-amber-400"
                : "text-blue-600 dark:text-blue-400"
            )}
          />
        </div>
        <div>
          <p
            className={cn(
              "font-semibold text-sm",
              isExpiringSoon
                ? "text-amber-800 dark:text-amber-200"
                : "text-blue-800 dark:text-blue-200"
            )}
          >
            Trial expires in {daysRemaining} {daysRemaining === 1 ? "day" : "days"}
          </p>
          <p
            className={cn(
              "text-xs",
              isExpiringSoon
                ? "text-amber-600 dark:text-amber-400"
                : "text-blue-600 dark:text-blue-400"
            )}
          >
            {isExpiringSoon
              ? "Your trial is ending soon. Subscribe to keep access."
              : "You have full access during your free trial."}
          </p>
        </div>
      </div>
    </div>
  )
}
