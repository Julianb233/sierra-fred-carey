"use client"

/**
 * Event Landing Page Component
 * Phase 88: Event Launch Kit
 *
 * Mobile-first landing page for QR code driven event signups.
 * Designed for iPhone 12-15 viewports (375-430px).
 */

import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import {
  Zap,
  MessageSquare,
  FileText,
  Users,
} from "lucide-react"
import type { EventConfig } from "@/lib/event/config"
import { EventSignupForm } from "./event-signup-form"

interface EventLandingProps {
  config: EventConfig
}

const VALUE_PROPS = [
  {
    icon: Zap,
    title: "Reality Lens Scoring",
    description: "Instant AI-powered assessment of your startup idea",
  },
  {
    icon: MessageSquare,
    title: "FRED AI Coaching",
    description: "24/7 mentor with decades of founder experience",
  },
  {
    icon: FileText,
    title: "Pitch Deck Review",
    description: "Get expert feedback on your investor pitch",
  },
  {
    icon: Users,
    title: "Investor Matching",
    description: "Connect with aligned investors in our network",
  },
]

export function EventLanding({ config }: EventLandingProps) {
  const router = useRouter()

  const handleSignupSuccess = (redirectTo: string) => {
    router.push(redirectTo)
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header / Logo */}
      <motion.header
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="pt-8 pb-4 text-center"
      >
        <div className="inline-flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[#ff6a1a] flex items-center justify-center">
            <span className="text-white font-bold text-sm">S</span>
          </div>
          <span className="text-lg font-semibold text-white">Sahara</span>
        </div>
      </motion.header>

      {/* Main content */}
      <main className="flex-1 px-6 pb-12 max-w-lg mx-auto w-full">
        {/* Hero */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-center mb-10"
        >
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-3 leading-tight">
            {config.headline}
          </h1>
          <p className="text-lg text-gray-300 mb-2">
            {config.tagline}
          </p>
          <p className="text-sm text-gray-500">
            {config.location} &middot; {config.date}
          </p>
        </motion.section>

        {/* Value Props */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mb-10"
        >
          <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-4 text-center">
            What you get
          </h2>
          <div className="space-y-3">
            {VALUE_PROPS.map((prop, i) => (
              <motion.div
                key={prop.title}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: 0.3 + i * 0.1 }}
                className="flex items-start gap-3 p-3 rounded-xl bg-white/5 border border-white/10"
              >
                <div className="w-10 h-10 rounded-lg bg-[#ff6a1a]/10 flex items-center justify-center flex-shrink-0">
                  <prop.icon className="w-5 h-5 text-[#ff6a1a]" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">
                    {prop.title}
                  </p>
                  <p className="text-xs text-gray-400">
                    {prop.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* Signup Form */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="mb-12"
        >
          <EventSignupForm
            eventSlug={config.slug}
            onSuccess={handleSignupSuccess}
          />
        </motion.section>

        {/* Fred Cary Quote */}
        <motion.section
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.7 }}
          className="text-center mb-10"
        >
          <div className="inline-block p-4 rounded-2xl bg-white/5 border border-white/10 max-w-sm">
            <div className="w-12 h-12 rounded-full bg-[#ff6a1a]/20 mx-auto mb-3 flex items-center justify-center">
              <span className="text-lg">FC</span>
            </div>
            <blockquote className="text-sm text-gray-300 italic mb-2">
              &ldquo;Every founder deserves a mentor who&apos;s been there. That&apos;s what FRED is -- your AI co-pilot built from decades of real startup experience.&rdquo;
            </blockquote>
            <p className="text-xs text-gray-500 font-medium">
              Fred Cary, Serial Entrepreneur
            </p>
          </div>
        </motion.section>
      </main>

      {/* Footer */}
      <footer className="py-6 text-center border-t border-white/10">
        <p className="text-xs text-gray-500">
          Sahara -- Your AI Founder Operating System
        </p>
      </footer>
    </div>
  )
}
