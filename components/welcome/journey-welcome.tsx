"use client"

import { motion } from "framer-motion"
import { Compass, Target, Wrench, Rocket, TrendingUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import Image from "next/image"

const OASES_STAGES = [
  {
    name: "Clarity",
    icon: Compass,
    description: "Know yourself and your market",
  },
  {
    name: "Validation",
    icon: Target,
    description: "Prove your idea has legs",
  },
  {
    name: "Build",
    icon: Wrench,
    description: "Create what matters",
  },
  {
    name: "Launch",
    icon: Rocket,
    description: "Go to market",
  },
  {
    name: "Grow",
    icon: TrendingUp,
    description: "Scale with confidence",
  },
]

interface JourneyWelcomeProps {
  onContinue: () => void
}

export function JourneyWelcome({ onContinue }: JourneyWelcomeProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.5 }}
      className="w-full max-w-3xl mx-auto text-center"
    >
      {/* Logo */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1, duration: 0.4 }}
        className="mb-8"
      >
        <Image
          src="/sahara-logo.svg"
          alt="Sahara"
          width={120}
          height={30}
          className="h-8 w-auto mx-auto opacity-80"
        />
      </motion.div>

      {/* Hero heading */}
      <motion.h1
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.5 }}
        className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-gray-900 dark:text-white mb-4"
      >
        Welcome to Your{" "}
        <span className="text-[#ff6a1a]">Venture Journey</span>
      </motion.h1>

      {/* Subheading */}
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.5 }}
        className="text-lg sm:text-xl text-gray-600 dark:text-gray-300 mb-12 max-w-xl mx-auto"
      >
        This isn&apos;t a product demo. It&apos;s a guided path from idea to funded startup.
      </motion.p>

      {/* 5 Oases stages timeline */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4, duration: 0.5 }}
        className="mb-12"
      >
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-4 sm:gap-2 relative">
          {/* Connecting line (desktop only) */}
          <div className="hidden sm:block absolute top-6 left-[10%] right-[10%] h-px bg-gradient-to-r from-[#ff6a1a]/20 via-[#ff6a1a]/40 to-[#ff6a1a]/20" />

          {OASES_STAGES.map((stage, index) => (
            <motion.div
              key={stage.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 + index * 0.1, duration: 0.4 }}
              className="flex flex-col items-center relative"
            >
              <div
                className={cn(
                  "w-12 h-12 rounded-full flex items-center justify-center mb-2",
                  "bg-[#ff6a1a]/10 text-[#ff6a1a] border border-[#ff6a1a]/20",
                  "relative z-10"
                )}
              >
                <stage.icon className="w-5 h-5" />
              </div>
              <span className="text-sm font-semibold text-gray-900 dark:text-white">
                {stage.name}
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {stage.description}
              </span>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Warm paragraph */}
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.0, duration: 0.5 }}
        className="text-base text-gray-600 dark:text-gray-400 mb-10 max-w-lg mx-auto leading-relaxed"
      >
        Your mentor Fred has guided thousands of entrepreneurs. He&apos;ll learn
        about you, remember everything, and meet you exactly where you are. No
        generic advice. No cookie-cutter plans.
      </motion.p>

      {/* CTA button */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.2, duration: 0.5 }}
      >
        <Button
          variant="orange"
          size="lg"
          onClick={onContinue}
          className="text-base px-8 py-3 h-auto"
        >
          Begin My Journey
        </Button>
      </motion.div>
    </motion.div>
  )
}
