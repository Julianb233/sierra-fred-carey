"use client"

import { useState, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Sparkles, PartyPopper, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"

// ============================================================================
// Constants
// ============================================================================

const CELEBRATION_SEEN_KEY = "sahara_celebration_100_seen"
const AUTO_DISMISS_MS = 10_000

// ============================================================================
// CSS Confetti (no extra dependency)
// ============================================================================

function ConfettiPiece({ index }: { index: number }) {
  const colors = ["#ff6a1a", "#f59e0b", "#10b981", "#6366f1", "#ec4899", "#14b8a6"]
  const color = colors[index % colors.length]
  const left = Math.random() * 100
  const delay = Math.random() * 2
  const duration = 2 + Math.random() * 2
  const size = 6 + Math.random() * 8

  return (
    <motion.div
      initial={{ y: -20, x: 0, opacity: 1, rotate: 0 }}
      animate={{
        y: [0, 600],
        x: [0, (Math.random() - 0.5) * 200],
        opacity: [1, 1, 0],
        rotate: [0, 360 + Math.random() * 360],
      }}
      transition={{
        duration,
        delay,
        ease: "easeIn",
      }}
      className="absolute pointer-events-none"
      style={{
        left: `${left}%`,
        top: -10,
        width: size,
        height: size * 1.5,
        backgroundColor: color,
        borderRadius: Math.random() > 0.5 ? "50%" : "2px",
      }}
    />
  )
}

// ============================================================================
// Component
// ============================================================================

export function CelebrationMilestone() {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    // Only show if not previously seen
    const seen = localStorage.getItem(CELEBRATION_SEEN_KEY)
    if (seen) return

    setIsVisible(true)

    // Auto-dismiss after timeout
    const timer = setTimeout(() => {
      dismiss()
    }, AUTO_DISMISS_MS)

    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const dismiss = useCallback(() => {
    setIsVisible(false)
    localStorage.setItem(CELEBRATION_SEEN_KEY, "true")
  }, [])

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
          onClick={dismiss}
        >
          {/* Confetti */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {Array.from({ length: 50 }).map((_, i) => (
              <ConfettiPiece key={i} index={i} />
            ))}
          </div>

          {/* Celebration Card */}
          <motion.div
            initial={{ scale: 0.8, y: 40 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20, opacity: 0 }}
            transition={{ type: "spring", damping: 20, stiffness: 300 }}
            className="relative z-10 max-w-lg w-full mx-4 p-8 rounded-2xl bg-gradient-to-br from-gray-900 to-gray-950 border border-[#ff6a1a]/30 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Glow effect */}
            <div className="absolute -inset-px rounded-2xl bg-gradient-to-br from-[#ff6a1a]/20 via-amber-500/10 to-transparent pointer-events-none" />

            <div className="relative text-center">
              {/* Icon */}
              <motion.div
                initial={{ scale: 0, rotate: -20 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", delay: 0.2, damping: 10 }}
                className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-[#ff6a1a] to-amber-500 flex items-center justify-center shadow-lg shadow-[#ff6a1a]/30"
              >
                <PartyPopper className="h-10 w-10 text-white" />
              </motion.div>

              {/* Heading */}
              <motion.h2
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-2xl md:text-3xl font-bold text-white mb-3"
              >
                Congratulations!
              </motion.h2>

              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="text-lg text-amber-200 mb-4"
              >
                You&apos;ve completed the Venture Journey
              </motion.p>

              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="text-sm text-gray-400 mb-6"
              >
                You&apos;re now ready to connect with investors and advisors
              </motion.p>

              {/* FRED quote */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="flex items-start gap-3 p-4 rounded-xl bg-white/5 border border-white/10 mb-8 text-left"
              >
                <Sparkles className="w-5 h-5 text-[#ff6a1a] shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-300 italic">
                    &ldquo;I knew you had it in you. Now let&apos;s get you funded.&rdquo;
                  </p>
                  <p className="text-xs text-gray-500 mt-1">-- FRED, your AI mentor</p>
                </div>
              </motion.div>

              {/* CTA */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
              >
                <Button
                  onClick={dismiss}
                  className="bg-[#ff6a1a] hover:bg-[#ea580c] text-white px-6 py-2.5 text-base font-semibold"
                  size="lg"
                >
                  Meet Your Matches
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </motion.div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
