"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Sparkles, ArrowRight, X } from "lucide-react"
import { redirectToCheckoutByTier } from "@/lib/stripe/client"
import { trackEvent } from "@/lib/analytics"
import { ANALYTICS_EVENTS } from "@/lib/analytics/events"
import { cn } from "@/lib/utils"
import type { UpsellPrompt as UpsellPromptType } from "@/lib/hooks/use-fred-chat"

interface UpsellPromptProps {
  upsell: UpsellPromptType
}

export function UpsellPromptCard({ upsell }: UpsellPromptProps) {
  const [dismissed, setDismissed] = useState(false)
  const [isRedirecting, setIsRedirecting] = useState(false)

  const handleUpgrade = async () => {
    setIsRedirecting(true)
    trackEvent(ANALYTICS_EVENTS.UPSELL.CTA_CLICKED, {
      trigger: upsell.trigger,
      featureLabel: upsell.featureLabel,
      source: "chat_inline",
    })
    trackEvent(ANALYTICS_EVENTS.SUBSCRIPTION.CHECKOUT_STARTED, {
      fromTier: "free",
      toTier: "pro",
    })

    try {
      await redirectToCheckoutByTier("PRO")
    } catch (error) {
      console.error("[Upsell] Checkout redirect failed:", error)
      setIsRedirecting(false)
    }
  }

  const handleDismiss = () => {
    setDismissed(true)
    trackEvent(ANALYTICS_EVENTS.UPSELL.DISMISSED, {
      trigger: upsell.trigger,
      featureLabel: upsell.featureLabel,
      source: "chat_inline",
    })
  }

  return (
    <AnimatePresence>
      {!dismissed && (
        <motion.div
          initial={{ opacity: 0, y: 8, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -4, scale: 0.97 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="mt-3 not-prose"
        >
          <div
            className={cn(
              "relative rounded-xl overflow-hidden",
              "border border-[#ff6a1a]/30",
              "bg-gradient-to-br from-[#ff6a1a]/5 via-orange-500/5 to-amber-500/5",
              "backdrop-blur-sm"
            )}
          >
            {/* Dismiss button */}
            <button
              onClick={handleDismiss}
              className={cn(
                "absolute top-2.5 right-2.5 z-10",
                "p-1 rounded-full",
                "text-foreground/40 hover:text-foreground/70",
                "hover:bg-white/10",
                "transition-colors duration-200"
              )}
              aria-label="Dismiss upgrade prompt"
            >
              <X className="h-3.5 w-3.5" />
            </button>

            <div className="p-4">
              {/* Header with sparkle icon */}
              <div className="flex items-center gap-2 mb-2">
                <div className="flex items-center justify-center h-6 w-6 rounded-full bg-[#ff6a1a]/15">
                  <Sparkles className="h-3.5 w-3.5 text-[#ff6a1a]" />
                </div>
                <span className="text-xs font-semibold text-[#ff6a1a] uppercase tracking-wider">
                  Unlock Pro
                </span>
              </div>

              {/* Feature label */}
              <p className="text-sm font-medium text-foreground/90 mb-2">
                {upsell.featureLabel}
              </p>

              {/* Pro tier highlights */}
              <div className="grid grid-cols-2 gap-1 mb-3">
                {[
                  "Pitch Deck Review",
                  "Strategy Docs",
                  "Investor Readiness",
                  "30-Day Memory",
                ].map((feature) => (
                  <div
                    key={feature}
                    className="flex items-center gap-1.5 text-xs text-foreground/60"
                  >
                    <div className="h-1 w-1 rounded-full bg-[#ff6a1a]/60 flex-shrink-0" />
                    {feature}
                  </div>
                ))}
              </div>

              {/* CTA Button */}
              <button
                onClick={handleUpgrade}
                disabled={isRedirecting}
                className={cn(
                  "w-full flex items-center justify-center gap-2",
                  "px-4 py-2.5 rounded-lg",
                  "text-sm font-medium text-white",
                  "bg-[#ff6a1a] hover:bg-[#ea580c]",
                  "shadow-lg shadow-[#ff6a1a]/25 hover:shadow-[#ff6a1a]/40",
                  "transition-all duration-200",
                  "disabled:opacity-60 disabled:cursor-not-allowed"
                )}
              >
                {isRedirecting ? (
                  <>
                    <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Redirecting...
                  </>
                ) : (
                  <>
                    Upgrade to Pro — $99/mo
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>

              {/* Subtle reassurance */}
              <p className="text-[10px] text-foreground/40 text-center mt-2">
                Cancel anytime · 14-day trial available
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
