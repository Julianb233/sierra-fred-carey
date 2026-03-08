"use client"

/**
 * Intro Preparation Card
 * Phase 89: Boardy Polish
 *
 * Expandable card section for each connected/intro_sent match.
 * Shows call script and email template tabs with copy-to-clipboard.
 */

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ChevronDown, Phone, Mail, Copy, Check } from "lucide-react"
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

// ============================================================================
// Component
// ============================================================================

export function IntroPrepCard({ match }: IntroPrepCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [activeTab, setActiveTab] = useState<PrepTab>("call")
  const [copied, setCopied] = useState(false)

  // Only show for connected or intro_sent matches
  if (match.status !== "connected" && match.status !== "intro_sent") {
    return null
  }

  const matchInfo = {
    name: match.matchName,
    type: match.matchType,
    focus: (match.metadata?.focus as string) || undefined,
  }

  const content =
    activeTab === "call"
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

  return (
    <div className="mt-2 rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden">
      {/* Toggle header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
      >
        <span>Prepare for This Intro</span>
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
              {/* Tabs */}
              <div className="flex gap-1 mb-3 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg">
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
