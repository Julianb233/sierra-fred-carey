"use client"

/**
 * Intro Preparation Card
 * Phase 89: Boardy Polish
 *
 * Expandable card section for each connected/intro_sent match.
 * Shows call script and email template tabs with copy-to-clipboard.
 * Supports AI personalization via /api/boardy/intro-prep endpoint.
 */

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ChevronDown, Phone, Mail, Copy, Check, Sparkles, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { generateCallScript, generateEmailTemplate } from "@/lib/boardy/intro-templates"
import type { BoardyMatch } from "@/lib/boardy/types"
import { toast } from "sonner"

// ============================================================================
// Types
// ============================================================================

interface IntroPrepCardProps {
  match: BoardyMatch
}

type PrepTab = "call" | "email"

interface AiPrepContent {
  callScript: string
  emailTemplate: string
  talkingPoints: string[]
}

// ============================================================================
// Component
// ============================================================================

export function IntroPrepCard({ match }: IntroPrepCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [activeTab, setActiveTab] = useState<PrepTab>("call")
  const [copied, setCopied] = useState(false)
  const [aiContent, setAiContent] = useState<AiPrepContent | null>(null)
  const [isPersonalizing, setIsPersonalizing] = useState(false)

  // Only show for connected or intro_sent matches
  if (match.status !== "connected" && match.status !== "intro_sent") {
    return null
  }

  const matchInfo = {
    name: match.matchName,
    type: match.matchType,
    focus: (match.metadata?.focus as string) || undefined,
  }

  // Use AI content if available, otherwise template content
  const content = aiContent
    ? activeTab === "call"
      ? aiContent.callScript
      : aiContent.emailTemplate
    : activeTab === "call"
      ? generateCallScript(matchInfo)
      : generateEmailTemplate(matchInfo)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content)
      setCopied(true)
      toast.success("Copied to clipboard!")
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error("Failed to copy. Please select and copy manually.")
    }
  }

  const handlePersonalize = async () => {
    setIsPersonalizing(true)
    try {
      const res = await fetch(`/api/boardy/intro-prep?matchId=${match.id}`)
      if (!res.ok) {
        throw new Error("Failed to personalize")
      }
      const data = await res.json()
      if (data.success && data.prep) {
        setAiContent(data.prep)
        toast.success("Content personalized for this match!")
      } else {
        throw new Error(data.error || "Failed to personalize")
      }
    } catch {
      toast.error("Could not personalize. Using template content.")
    } finally {
      setIsPersonalizing(false)
    }
  }

  return (
    <div className="mt-2 rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden">
      {/* Toggle header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
      >
        <span className="flex items-center gap-2">
          Prepare for This Intro
          {aiContent && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-[#ff6a1a]/10 text-[#ff6a1a]">
              <Sparkles className="w-2.5 h-2.5" />
              AI Personalized
            </span>
          )}
        </span>
        <ChevronDown
          className={cn(
            "w-4 h-4 transition-transform duration-200",
            isExpanded && "rotate-180"
          )}
        />
      </button>

      {/* Expandable content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4">
              {/* Tabs + Personalize button */}
              <div className="flex items-center gap-2 mb-3">
                <div className="flex gap-1 flex-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg">
                  <button
                    onClick={() => setActiveTab("call")}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
                      activeTab === "call"
                        ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
                        : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                    )}
                  >
                    <Phone className="w-3 h-3" />
                    Call Script
                  </button>
                  <button
                    onClick={() => setActiveTab("email")}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
                      activeTab === "email"
                        ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
                        : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                    )}
                  >
                    <Mail className="w-3 h-3" />
                    Email Template
                  </button>
                </div>

                {!aiContent && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handlePersonalize}
                    disabled={isPersonalizing}
                    className="shrink-0 h-8 text-xs border-[#ff6a1a]/30 text-[#ff6a1a] hover:bg-[#ff6a1a]/5"
                  >
                    {isPersonalizing ? (
                      <>
                        <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                        Personalizing...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3 h-3 mr-1" />
                        Personalize with AI
                      </>
                    )}
                  </Button>
                )}
              </div>

              {/* Talking points (shown when AI content available) */}
              {aiContent && aiContent.talkingPoints.length > 0 && (
                <div className="mb-3 p-2.5 bg-[#ff6a1a]/5 rounded-lg">
                  <p className="text-[10px] font-medium text-[#ff6a1a] uppercase tracking-wider mb-1.5">
                    Key Talking Points
                  </p>
                  <ul className="space-y-1">
                    {aiContent.talkingPoints.map((point, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-1.5 text-xs text-gray-600 dark:text-gray-400"
                      >
                        <div className="w-1 h-1 rounded-full bg-[#ff6a1a] mt-1.5 shrink-0" />
                        {point}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Content */}
              <div className="relative">
                <pre className="text-xs text-gray-600 dark:text-gray-400 whitespace-pre-wrap font-sans leading-relaxed p-3 bg-gray-50 dark:bg-gray-900 rounded-lg max-h-64 overflow-y-auto">
                  {content}
                </pre>

                {/* Copy button */}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleCopy}
                  className="absolute top-2 right-2 h-7 px-2 text-xs"
                >
                  {copied ? (
                    <>
                      <Check className="w-3 h-3 mr-1 text-green-500" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3 mr-1" />
                      Copy
                    </>
                  )}
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
