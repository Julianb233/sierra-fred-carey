"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import {
  Plus,
  FileText,
  Send,
  CheckCircle2,
  TrendingUp,
  DollarSign,
  BarChart3,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { QuoteCard } from "@/components/sales/quote-card"
import { CommissionPanel } from "@/components/sales/commission-panel"
import { CreateQuoteModal } from "@/components/sales/create-quote-modal"
import { FirstSaleCelebration } from "@/components/sales/first-sale-celebration"
import { SalesGuidedTour } from "@/components/sales/guided-tour"
import { QuoteStatusBadge } from "@/components/sales/quote-status-badge"
import {
  DEMO_QUOTES,
  DEMO_STATS,
  MILESTONES,
  calculateCommission,
  PARTNER_SHARE_PERCENT,
} from "@/lib/sales/demo-data"
import type { QuoteStatus } from "@/types/sales"

type FilterStatus = "all" | QuoteStatus

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
  }).format(amount)
}

export default function SalesDashboardPage() {
  const [filter, setFilter] = useState<FilterStatus>("all")
  const [isCreateOpen, setIsCreateOpen] = useState(false)

  const filteredQuotes =
    filter === "all"
      ? DEMO_QUOTES
      : DEMO_QUOTES.filter((q) => q.status === filter)

  const firstSale = DEMO_QUOTES.find((q) => q.status === "accepted")
  const firstSaleCommission = firstSale
    ? calculateCommission(firstSale.amount)
    : null

  const statCards = [
    {
      label: "Total Quotes",
      value: DEMO_STATS.totalQuotes,
      icon: FileText,
      color: "text-white",
    },
    {
      label: "Active",
      value: DEMO_STATS.activeQuotes,
      icon: Send,
      color: "text-blue-400",
    },
    {
      label: "Accepted",
      value: DEMO_STATS.acceptedQuotes,
      icon: CheckCircle2,
      color: "text-emerald-400",
    },
    {
      label: "Conversion",
      value: `${DEMO_STATS.conversionRate}%`,
      icon: BarChart3,
      color: "text-amber-400",
    },
  ]

  const filterOptions: { label: string; value: FilterStatus }[] = [
    { label: "All", value: "all" },
    { label: "Draft", value: "draft" },
    { label: "Sent", value: "sent" },
    { label: "Accepted", value: "accepted" },
    { label: "Expired", value: "expired" },
  ]

  return (
    <>
      {/* Guided Tour (shows on first visit) */}
      <SalesGuidedTour />

      {/* First Sale Celebration (shows once when first sale exists) */}
      {firstSale && firstSaleCommission && (
        <FirstSaleCelebration
          clientName={firstSale.clientName}
          amount={firstSale.amount}
          commission={firstSaleCommission.partnerShare}
        />
      )}

      <div className="min-h-screen p-4 md:p-6 lg:p-8 space-y-6">
        {/* Page header */}
        <div id="sales-overview" className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Sales</h1>
            <p className="text-sm text-gray-400 mt-1">
              Create quotes, track deals, and watch your earnings grow.
            </p>
          </div>
          <Button
            id="create-quote-btn"
            onClick={() => setIsCreateOpen(true)}
            className="bg-[#ff6a1a] hover:bg-[#ea580c] text-white gap-2"
          >
            <Plus className="w-4 h-4" />
            New Quote
          </Button>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {statCards.map((stat, i) => {
            const Icon = stat.icon
            return (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="rounded-xl border border-white/10 bg-white/5 p-4"
              >
                <div className="flex items-center gap-2 mb-1">
                  <Icon className={`w-4 h-4 ${stat.color}`} />
                  <span className="text-xs text-gray-400 uppercase tracking-wide">
                    {stat.label}
                  </span>
                </div>
                <p className={`text-2xl font-bold ${stat.color}`}>
                  {stat.value}
                </p>
              </motion.div>
            )
          })}
        </div>

        {/* Commission panel */}
        <CommissionPanel quotes={DEMO_QUOTES} />

        {/* Milestones */}
        <div className="rounded-xl border border-white/10 bg-white/5 p-5">
          <h3 className="text-sm font-medium text-gray-300 mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-[#ff6a1a]" />
            Milestones
          </h3>
          <div className="flex items-center gap-4 overflow-x-auto pb-2">
            {MILESTONES.map((milestone) => {
              const achieved = !!milestone.achievedAt
              return (
                <div
                  key={milestone.id}
                  className={`flex-shrink-0 flex items-center gap-3 px-4 py-3 rounded-lg border ${
                    achieved
                      ? "border-emerald-500/20 bg-emerald-500/5"
                      : "border-white/10 bg-white/5 opacity-50"
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      achieved
                        ? "bg-emerald-500/20 text-emerald-400"
                        : "bg-gray-800 text-gray-500"
                    }`}
                  >
                    {achieved ? (
                      <CheckCircle2 className="w-4 h-4" />
                    ) : (
                      <DollarSign className="w-4 h-4" />
                    )}
                  </div>
                  <div>
                    <p
                      className={`text-sm font-medium ${
                        achieved ? "text-white" : "text-gray-500"
                      }`}
                    >
                      {milestone.title}
                    </p>
                    <p className="text-xs text-gray-500">
                      {milestone.description}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Quotes section */}
        <div id="quote-list">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-300">Your Quotes</h3>
            <div className="flex items-center gap-1.5">
              {filterOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setFilter(opt.value)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    filter === opt.value
                      ? "bg-[#ff6a1a]/20 text-[#ff6a1a]"
                      : "text-gray-500 hover:text-gray-300"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {filteredQuotes.length === 0 ? (
            <div className="rounded-xl border border-white/10 bg-white/5 p-12 text-center">
              <FileText className="w-8 h-8 text-gray-600 mx-auto mb-3" />
              <p className="text-sm text-gray-400">
                No {filter === "all" ? "" : filter} quotes yet
              </p>
              <Button
                onClick={() => setIsCreateOpen(true)}
                variant="outline"
                size="sm"
                className="mt-3 border-white/20 text-gray-300"
              >
                <Plus className="w-3 h-3 mr-1" />
                Create your first quote
              </Button>
            </div>
          ) : (
            <div className="grid gap-3">
              {filteredQuotes.map((quote, i) => (
                <QuoteCard key={quote.id} quote={quote} index={i} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Create Quote Modal */}
      <CreateQuoteModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
      />
    </>
  )
}
