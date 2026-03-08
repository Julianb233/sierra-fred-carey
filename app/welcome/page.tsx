"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { AnimatePresence } from "framer-motion"
import { JourneyWelcome } from "@/components/welcome/journey-welcome"
import { IntakeForm } from "@/components/welcome/intake-form"
import { Loader2 } from "lucide-react"
import type { IntakeStep } from "@/lib/welcome/types"

export default function WelcomePage() {
  const router = useRouter()
  const [step, setStep] = useState<IntakeStep>("welcome")
  const [authChecked, setAuthChecked] = useState(false)

  // Auth gate: redirect to /get-started if not logged in
  // Also check if user has already been welcomed (show-once logic)
  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.replace("/get-started")
        return
      }

      // Check if already welcomed
      const { data: profile } = await supabase
        .from("profiles")
        .select("journey_welcomed")
        .eq("id", user.id)
        .single()

      if (profile?.journey_welcomed) {
        // Already completed welcome -- send to dashboard
        router.replace("/dashboard")
        return
      }

      setAuthChecked(true)
    }
    checkAuth()
  }, [router])

  const handleWelcomeComplete = () => {
    setStep("intake")
  }

  const handleIntakeComplete = () => {
    // After FRED processes answers, redirect to Reality Lens
    router.push("/dashboard/reality-lens?first=true")
  }

  if (!authChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-amber-50/40 to-white dark:from-gray-950 dark:to-gray-900">
        <Loader2 className="h-8 w-8 animate-spin text-[#ff6a1a]" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50/40 via-orange-50/20 to-white dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 overflow-hidden">
      {/* Desert-themed background effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[800px] h-[400px] bg-gradient-to-b from-[#ff6a1a]/8 to-transparent rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 w-[600px] h-[300px] bg-amber-400/6 rounded-full blur-[100px]" />
        {/* Subtle sand dune shapes */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-amber-100/10 to-transparent dark:from-amber-900/5" />
      </div>

      <main className="relative z-10 min-h-screen flex items-center justify-center px-4 py-12">
        <AnimatePresence mode="wait">
          {step === "welcome" && (
            <JourneyWelcome key="welcome" onContinue={handleWelcomeComplete} />
          )}
          {(step === "intake" || step === "processing" || step === "complete") && (
            <IntakeForm
              key="intake"
              onComplete={handleIntakeComplete}
            />
          )}
        </AnimatePresence>
      </main>
    </div>
  )
}
