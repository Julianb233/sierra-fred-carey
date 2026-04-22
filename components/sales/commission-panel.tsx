"use client"

import { motion } from "framer-motion"
import { DollarSign, TrendingUp, PieChart } from "lucide-react"
import { calculateCommission, PARTNER_SHARE_PERCENT, PLATFORM_FEE_PERCENT } from "@/lib/sales/demo-data"
import type { Quote } from "@/types/sales"

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function CommissionPanel({ quotes }: { quotes: Quote[] }) {
  const acceptedQuotes = quotes.filter((q) => q.status === "accepted")
  const totalRevenue = acceptedQuotes.reduce((sum, q) => sum + q.amount, 0)
  const totalCommission = totalRevenue * (PARTNER_SHARE_PERCENT / 100)
  const pendingQuotes = quotes.filter((q) => q.status === "sent")
  const pendingRevenue = pendingQuotes.reduce((sum, q) => sum + q.amount, 0)
  const pendingCommission = pendingRevenue * (PARTNER_SHARE_PERCENT / 100)

  return (
    <div id="commission-panel" className="space-y-4">
      {/* Earnings summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4"
        >
          <div className="flex items-center gap-2 text-emerald-400 mb-1">
            <DollarSign className="w-4 h-4" />
            <span className="text-xs font-medium uppercase tracking-wide">
              Your Earnings
            </span>
          </div>
          <p className="text-2xl font-bold text-white">
            {formatCurrency(totalCommission)}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            from {acceptedQuotes.length} accepted{" "}
            {acceptedQuotes.length === 1 ? "quote" : "quotes"}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4"
        >
          <div className="flex items-center gap-2 text-blue-400 mb-1">
            <TrendingUp className="w-4 h-4" />
            <span className="text-xs font-medium uppercase tracking-wide">
              Pending
            </span>
          </div>
          <p className="text-2xl font-bold text-white">
            {formatCurrency(pendingCommission)}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            from {pendingQuotes.length} sent{" "}
            {pendingQuotes.length === 1 ? "quote" : "quotes"}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-xl border border-white/10 bg-white/5 p-4"
        >
          <div className="flex items-center gap-2 text-gray-400 mb-1">
            <PieChart className="w-4 h-4" />
            <span className="text-xs font-medium uppercase tracking-wide">
              Your Split
            </span>
          </div>
          <p className="text-2xl font-bold text-white">{PARTNER_SHARE_PERCENT}%</p>
          <p className="text-xs text-gray-400 mt-1">
            platform fee: {PLATFORM_FEE_PERCENT}%
          </p>
        </motion.div>
      </div>

      {/* Per-quote commission breakdown */}
      {acceptedQuotes.length > 0 && (
        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
          <h4 className="text-sm font-medium text-gray-300 mb-3">
            Commission Breakdown
          </h4>
          <div className="space-y-2">
            {acceptedQuotes.map((quote) => {
              const comm = calculateCommission(quote.amount)
              return (
                <div
                  key={quote.id}
                  className="flex items-center justify-between py-2 border-b border-white/5 last:border-0"
                >
                  <div>
                    <p className="text-sm text-white">{quote.title}</p>
                    <p className="text-xs text-gray-500">{quote.clientName}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-emerald-400">
                      {formatCurrency(comm.partnerShare)}
                    </p>
                    <p className="text-xs text-gray-500">
                      of {formatCurrency(comm.quoteAmount)}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
