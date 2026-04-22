// Types for the First Sale Experience (Phase 166)

export type QuoteStatus = "draft" | "sent" | "accepted" | "expired"

export interface Quote {
  id: string
  title: string
  clientName: string
  clientEmail: string
  amount: number
  status: QuoteStatus
  createdAt: string
  sentAt?: string
  acceptedAt?: string
  expiresAt?: string
  items: QuoteLineItem[]
  notes?: string
}

export interface QuoteLineItem {
  id: string
  description: string
  quantity: number
  unitPrice: number
}

export interface CommissionBreakdown {
  quoteAmount: number
  platformFeePercent: number
  platformFee: number
  partnerSharePercent: number
  partnerShare: number
}

export interface SalesMilestone {
  id: string
  type: "first_quote" | "first_sent" | "first_sale" | "revenue_milestone"
  title: string
  description: string
  achievedAt?: string
  threshold?: number
}

export interface SalesDashboardStats {
  totalQuotes: number
  activeQuotes: number
  acceptedQuotes: number
  totalRevenue: number
  totalCommission: number
  conversionRate: number
}

export interface GuidedTourStep {
  id: string
  target: string
  title: string
  description: string
  placement: "top" | "bottom" | "left" | "right"
}
