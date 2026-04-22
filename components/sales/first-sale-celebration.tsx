"use client"

import { useState, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Trophy, PartyPopper, Share2, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"

const FIRST_SALE_SEEN_KEY = "sahara_first_sale_celebrated"
const AUTO_DISMISS_MS = 15_000

function seededRandom(seed: number) {
  const x = Math.sin(seed + 1) * 10000
  return x - Math.floor(x)
}

function ConfettiPiece({ index }: { index: number }) {
  const colors = ["#ff6a1a", "#f59e0b", "#10b981", "#6366f1", "#ec4899", "#14b8a6"]
  const color = colors[index % colors.length]
  const left = seededRandom(index * 7) * 100
  const delay = seededRandom(index * 13) * 2
  const duration = 2 + seededRandom(index * 17) * 2
  const size = 6 + seededRandom(index * 23) * 8
  const xDrift = (seededRandom(index * 31) - 0.5) * 200
  const rotateTo = 360 + seededRandom(index * 37) * 360
  const isRound = seededRandom(index * 41) > 0.5

  return (
    <motion.div
      initial={{ y: -20, x: 0, opacity: 1, rotate: 0 }}
      animate={{
        y: [0, 600],
        x: [0, xDrift],
        opacity: [1, 1, 0],
        rotate: [0, rotateTo],
      }}
      transition={{ duration, delay, ease: "easeIn" }}
      className="absolute pointer-events-none"
      style={{
        left: `${left}%`,
        top: -10,
        width: size,
        height: size * 1.5,
        backgroundColor: color,
        borderRadius: isRound ? "50%" : "2px",
      }}
    />
  )
}

interface FirstSaleCelebrationProps {
  clientName: string
  amount: number
  commission: number
  onDismiss?: () => void
}

export function FirstSaleCelebration({
  clientName,
  amount,
  commission,
  onDismiss,
}: FirstSaleCelebrationProps) {
  const [isVisible, setIsVisible] = useState(false)

  const dismiss = useCallback(() => {
    setIsVisible(false)
    localStorage.setItem(FIRST_SALE_SEEN_KEY, "true")
    onDismiss?.()
  }, [onDismiss])

  useEffect(() => {
    const seen = localStorage.getItem(FIRST_SALE_SEEN_KEY)
    if (seen) return
    setIsVisible(true)

    const timer = setTimeout(dismiss, AUTO_DISMISS_MS)
    return () => clearTimeout(timer)
  }, [dismiss])

  const formatCurrency = (n: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
    }).format(n)

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
            {Array.from({ length: 60 }).map((_, i) => (
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
            {/* Glow */}
            <div className="absolute -inset-px rounded-2xl bg-gradient-to-br from-[#ff6a1a]/20 via-amber-500/10 to-transparent pointer-events-none" />

            <div className="relative text-center">
              {/* Trophy icon */}
              <motion.div
                initial={{ scale: 0, rotate: -20 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", delay: 0.2, damping: 10 }}
                className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-[#ff6a1a] to-amber-500 flex items-center justify-center shadow-lg shadow-[#ff6a1a]/30"
              >
                <Trophy className="h-10 w-10 text-white" />
              </motion.div>

              {/* Heading */}
              <motion.h2
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-3xl font-bold text-white mb-2"
              >
                First Sale!
              </motion.h2>

              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="text-lg text-amber-200 mb-1"
              >
                {clientName} accepted your quote
              </motion.p>

              {/* Revenue + Commission */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="flex items-center justify-center gap-6 my-6"
              >
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide">
                    Deal Value
                  </p>
                  <p className="text-2xl font-bold text-white">
                    {formatCurrency(amount)}
                  </p>
                </div>
                <div className="w-px h-10 bg-white/10" />
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide">
                    Your Commission
                  </p>
                  <p className="text-2xl font-bold text-emerald-400">
                    {formatCurrency(commission)}
                  </p>
                </div>
              </motion.div>

              {/* FRED quote */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="flex items-start gap-3 p-4 rounded-xl bg-white/5 border border-white/10 mb-6 text-left"
              >
                <PartyPopper className="w-5 h-5 text-[#ff6a1a] shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-300 italic">
                    &ldquo;Your first sale is a milestone most never reach.
                    This is where real momentum starts.&rdquo;
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    -- FRED, your AI mentor
                  </p>
                </div>
              </motion.div>

              {/* CTAs */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
                className="flex items-center justify-center gap-3"
              >
                <Button
                  variant="outline"
                  onClick={dismiss}
                  className="border-white/20 text-gray-300 hover:text-white"
                >
                  <Share2 className="w-4 h-4 mr-2" />
                  Share Milestone
                </Button>
                <Button
                  onClick={dismiss}
                  className="bg-[#ff6a1a] hover:bg-[#ea580c] text-white"
                >
                  Keep Going
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
