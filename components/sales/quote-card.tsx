"use client"

import { motion } from "framer-motion"
import { User, Mail, DollarSign, Clock } from "lucide-react"
import { QuoteStatusBadge } from "./quote-status-badge"
import { QuoteTimeline } from "./quote-timeline"
import { calculateCommission } from "@/lib/sales/demo-data"
import type { Quote } from "@/types/sales"

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
  }).format(amount)
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

export function QuoteCard({
  quote,
  index = 0,
}: {
  quote: Quote
  index?: number
}) {
  const commission = calculateCommission(quote.amount)

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="rounded-xl border border-white/10 bg-white/5 p-5 hover:border-white/20 transition-colors"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-semibold text-white truncate">
            {quote.title}
          </h3>
          <div className="flex items-center gap-3 mt-1">
            <span className="flex items-center gap-1 text-xs text-gray-400">
              <User className="w-3 h-3" />
              {quote.clientName}
            </span>
            <span className="flex items-center gap-1 text-xs text-gray-500">
              <Mail className="w-3 h-3" />
              {quote.clientEmail}
            </span>
          </div>
        </div>
        <QuoteStatusBadge status={quote.status} />
      </div>

      {/* Amount + Commission */}
      <div className="flex items-center gap-4 mb-4">
        <div className="flex items-center gap-1.5">
          <DollarSign className="w-4 h-4 text-white/50" />
          <span className="text-lg font-bold text-white">
            {formatCurrency(quote.amount)}
          </span>
        </div>
        <div className="text-xs text-gray-500">|</div>
        <div className="text-sm">
          <span className="text-emerald-400 font-medium">
            {formatCurrency(commission.partnerShare)}
          </span>
          <span className="text-gray-500 ml-1">commission</span>
        </div>
      </div>

      {/* Line items */}
      <div className="mb-4 space-y-1">
        {quote.items.map((item) => (
          <div
            key={item.id}
            className="flex items-center justify-between text-xs"
          >
            <span className="text-gray-400">{item.description}</span>
            <span className="text-gray-300">
              {item.quantity} x {formatCurrency(item.unitPrice)}
            </span>
          </div>
        ))}
      </div>

      {/* Timeline */}
      <div className="pt-3 border-t border-white/5">
        <QuoteTimeline quote={quote} />
      </div>

      {/* Expiry notice for sent quotes */}
      {quote.status === "sent" && quote.expiresAt && (
        <div className="mt-3 flex items-center gap-1.5 text-xs text-amber-400/70">
          <Clock className="w-3 h-3" />
          Expires {formatDate(quote.expiresAt)}
        </div>
      )}
    </motion.div>
  )
}
