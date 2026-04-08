"use client"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { MessageSquare, BarChart3, ListChecks, GraduationCap } from "lucide-react"
import { openFredChat } from "@/components/chat/floating-chat-widget"

/**
 * Loom video ID — set via NEXT_PUBLIC_LOOM_WALKTHROUGH_ID env var.
 * Falls back to "placeholder" which shows the quick-start guide instead.
 */
const LOOM_VIDEO_ID = process.env.NEXT_PUBLIC_LOOM_WALKTHROUGH_ID || "placeholder"
const LOOM_EMBED_URL = `https://www.loom.com/embed/${LOOM_VIDEO_ID}`

const quickStartSteps = [
  {
    icon: MessageSquare,
    title: "Chat with your AI Mentor",
    description: "Ask Fred anything about your startup — strategy, fundraising, or next steps.",
  },
  {
    icon: BarChart3,
    title: "Check your Readiness Score",
    description: "See how investor-ready your startup is and what to improve.",
  },
  {
    icon: ListChecks,
    title: "Follow your Next Steps",
    description: "Personalized action items based on your stage and goals.",
  },
  {
    icon: GraduationCap,
    title: "Explore Coaching",
    description: "Deep-dive sessions on pitching, fundraising, and growth.",
  },
]

interface HowToUseSaharaModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function HowToUseSaharaModal({
  open,
  onOpenChange,
}: HowToUseSaharaModalProps) {
  const isPlaceholder = LOOM_VIDEO_ID === "placeholder"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle>How To Use Sahara</DialogTitle>
          <DialogDescription>
            {isPlaceholder
              ? "Get started with these key features to make the most of Sahara."
              : "Watch this walkthrough to learn how to get the most out of Sahara."}
          </DialogDescription>
        </DialogHeader>
        <div className="px-6 pb-6">
          {isPlaceholder ? (
            <div className="space-y-3">
              {quickStartSteps.map((step) => (
                <div
                  key={step.title}
                  className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50"
                >
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#ff6a1a]/10 flex items-center justify-center">
                    <step.icon className="h-4 w-4 text-[#ff6a1a]" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {step.title}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {step.description}
                    </p>
                  </div>
                </div>
              ))}
              <button
                onClick={() => {
                  onOpenChange(false)
                  openFredChat("Give me a tour of the platform and explain what each section does so I know where to go for what.")
                }}
                className="w-full mt-2 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#ff6a1a] hover:bg-[#ea580c] text-white font-medium transition-colors text-sm"
              >
                <MessageSquare className="h-4 w-4" />
                Start a Guided Tour with Fred
              </button>
            </div>
          ) : (
            <div className="aspect-video rounded-lg overflow-hidden">
              <iframe
                src={LOOM_EMBED_URL}
                title="How To Use Sahara — Walkthrough"
                frameBorder="0"
                allowFullScreen
                allow="autoplay; fullscreen; picture-in-picture"
                className="w-full h-full"
              />
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
