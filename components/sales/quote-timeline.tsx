"use client"

import { motion } from "framer-motion"
import { FileText, Send, CheckCircle2, Clock } from "lucide-react"
import type { Quote } from "@/types/sales"

function formatDate(dateStr?: string) {
  if (!dateStr) return null
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

const steps = [
  { key: "created", label: "Created", icon: FileText, field: "createdAt" as const },
  { key: "sent", label: "Sent", icon: Send, field: "sentAt" as const },
  { key: "accepted", label: "Accepted", icon: CheckCircle2, field: "acceptedAt" as const },
] as const

export function QuoteTimeline({ quote }: { quote: Quote }) {
  const isExpired = quote.status === "expired"

  return (
    <div className="flex items-center gap-2">
      {steps.map((step, i) => {
        const date = quote[step.field]
        const isActive = !!date
        const Icon = step.icon

        return (
          <div key={step.key} className="flex items-center gap-2">
            {i > 0 && (
              <div
                className={`h-px w-6 ${
                  isActive ? "bg-emerald-500/50" : "bg-gray-700"
                }`}
              />
            )}
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: i * 0.1 }}
              className="flex items-center gap-1.5"
            >
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center ${
                  isActive
                    ? "bg-emerald-500/20 text-emerald-400"
                    : "bg-gray-800 text-gray-500"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
              </div>
              <div className="text-xs">
                <div
                  className={
                    isActive ? "text-gray-200 font-medium" : "text-gray-500"
                  }
                >
                  {step.label}
                </div>
                {date && (
                  <div className="text-gray-500 text-[10px]">
                    {formatDate(date)}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )
      })}

      {/* Expiry indicator */}
      {isExpired && (
        <div className="flex items-center gap-2">
          <div className="h-px w-6 bg-red-500/30" />
          <div className="flex items-center gap-1.5">
            <div className="w-6 h-6 rounded-full flex items-center justify-center bg-red-500/20 text-red-400">
              <Clock className="w-3.5 h-3.5" />
            </div>
            <div className="text-xs">
              <div className="text-red-400 font-medium">Expired</div>
              <div className="text-gray-500 text-[10px]">
                {formatDate(quote.expiresAt)}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
