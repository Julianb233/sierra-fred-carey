"use client"

/**
 * Journey Celebration Banner
 * Phase 89: Boardy Polish
 *
 * Full-width celebration banner displayed at the top of the Boardy page
 * when the founder reaches 100% journey completion. Dismissible and stored
 * in localStorage so it only shows once.
 */

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { PartyPopper, X } from "lucide-react"

// ============================================================================
// Constants
// ============================================================================

const STORAGE_KEY = "sahara_journey_celebration_dismissed"

// ============================================================================
// Component
// ============================================================================

interface JourneyCelebrationProps {
  onDismiss: () => void
}

export function JourneyCelebration({ onDismiss }: JourneyCelebrationProps) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const dismissed = localStorage.getItem(STORAGE_KEY)
    if (!dismissed) {
      setVisible(true) // eslint-disable-line react-hooks/set-state-in-effect -- initial load check
    }
  }, [])

  const handleDismiss = () => {
    setVisible(false)
    localStorage.setItem(STORAGE_KEY, "true")
    onDismiss()
  }

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="relative overflow-hidden rounded-xl bg-gradient-to-r from-[#ff6a1a] to-[#ff8c42] p-6 text-white shadow-lg"
        >
          {/* Dismiss button */}
          <button
            onClick={handleDismiss}
            className="absolute top-3 right-3 p-1 rounded-full hover:bg-white/20 transition-colors"
            aria-label="Dismiss celebration"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-4">
            <div className="shrink-0 w-14 h-14 rounded-full bg-white/20 flex items-center justify-center">
              <PartyPopper className="w-7 h-7" />
            </div>

            <div>
              <h2 className="text-xl font-bold mb-1">
                Congratulations! You&apos;ve completed the Venture Journey
              </h2>
              <p className="text-white/90 text-sm">
                You&apos;re investor-ready. Here are your matched connections.
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
