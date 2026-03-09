"use client"

/**
 * Journey Celebration Banner
 * Phase 89: Boardy Polish
 *
 * Full-width celebration banner displayed at the top of the Boardy page
 * when the founder reaches 100% journey completion. Dismissible and stored
 * in localStorage so it only shows once. Includes confetti particle animation.
 */

import { useState, useEffect, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { PartyPopper, X } from "lucide-react"

// ============================================================================
// Constants
// ============================================================================

const STORAGE_KEY = "sahara_journey_celebration_dismissed"
const PARTICLE_COUNT = 14
const PARTICLE_COLORS = [
  "rgba(255,255,255,0.9)",
  "rgba(255,215,0,0.85)",
  "rgba(255,165,0,0.8)",
  "rgba(255,255,255,0.7)",
  "rgba(255,215,0,0.65)",
  "rgba(255,200,100,0.75)",
]

// ============================================================================
// Component
// ============================================================================

interface JourneyCelebrationProps {
  onDismiss: () => void
}

export function JourneyCelebration({ onDismiss }: JourneyCelebrationProps) {
  const [visible, setVisible] = useState(false)

  // Generate stable random positions for confetti particles
  const particles = useMemo(
    () =>
      Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
        id: i,
        left: `${5 + (i * 90) / PARTICLE_COUNT + Math.sin(i * 2.3) * 4}%`,
        size: 4 + (i % 3) * 2,
        color: PARTICLE_COLORS[i % PARTICLE_COLORS.length],
        delay: (i * 0.3) % 2.5,
        duration: 2 + (i % 4) * 0.5,
      })),
    []
  )

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
          {/* Confetti particles */}
          {particles.map((p) => (
            <motion.div
              key={p.id}
              className="absolute rounded-full pointer-events-none"
              style={{
                left: p.left,
                top: -8,
                width: p.size,
                height: p.size,
                backgroundColor: p.color,
              }}
              initial={{ y: -10, opacity: 0 }}
              animate={{
                y: [0, 120, 200],
                opacity: [0, 1, 0],
                x: [0, (p.id % 2 === 0 ? 1 : -1) * 15, (p.id % 2 === 0 ? -1 : 1) * 10],
              }}
              transition={{
                duration: p.duration,
                delay: p.delay,
                repeat: Infinity,
                ease: "easeIn",
              }}
            />
          ))}

          {/* Dismiss button */}
          <button
            onClick={handleDismiss}
            className="absolute top-3 right-3 p-1 rounded-full hover:bg-white/20 transition-colors z-10"
            aria-label="Dismiss celebration"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-4 relative z-10">
            <div className="shrink-0 w-14 h-14 rounded-full bg-white/20 flex items-center justify-center">
              <PartyPopper className="w-7 h-7" />
            </div>

            <div>
              <h2 className="text-xl font-bold mb-1">
                Congratulations! You&apos;ve completed the Venture Journey
              </h2>
              <p className="text-white/90 text-sm">
                You&apos;re investor-ready. FRED can help you prepare for each introduction below.
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
