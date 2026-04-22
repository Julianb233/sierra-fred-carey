import type {
  Quote,
  SalesDashboardStats,
  SalesMilestone,
  CommissionBreakdown,
  GuidedTourStep,
} from "@/types/sales"

// Platform commission structure
export const PLATFORM_FEE_PERCENT = 15
export const PARTNER_SHARE_PERCENT = 85

export function calculateCommission(amount: number): CommissionBreakdown {
  const platformFee = amount * (PLATFORM_FEE_PERCENT / 100)
  const partnerShare = amount * (PARTNER_SHARE_PERCENT / 100)
  return {
    quoteAmount: amount,
    platformFeePercent: PLATFORM_FEE_PERCENT,
    platformFee,
    partnerSharePercent: PARTNER_SHARE_PERCENT,
    partnerShare,
  }
}

export const DEMO_QUOTES: Quote[] = [
  {
    id: "q-001",
    title: "AI Strategy Consultation",
    clientName: "Marcus Chen",
    clientEmail: "marcus@techventures.io",
    amount: 4500,
    status: "accepted",
    createdAt: "2026-03-28T10:00:00Z",
    sentAt: "2026-03-28T14:30:00Z",
    acceptedAt: "2026-03-30T09:15:00Z",
    expiresAt: "2026-04-28T10:00:00Z",
    items: [
      { id: "li-1", description: "AI Readiness Assessment", quantity: 1, unitPrice: 2000 },
      { id: "li-2", description: "Strategy Workshop (2 sessions)", quantity: 2, unitPrice: 1250 },
    ],
  },
  {
    id: "q-002",
    title: "Pitch Deck Review Package",
    clientName: "Sarah Miller",
    clientEmail: "sarah@bloom.co",
    amount: 2000,
    status: "sent",
    createdAt: "2026-04-05T08:00:00Z",
    sentAt: "2026-04-05T11:00:00Z",
    expiresAt: "2026-05-05T08:00:00Z",
    items: [
      { id: "li-3", description: "Comprehensive Deck Review", quantity: 1, unitPrice: 1500 },
      { id: "li-4", description: "Follow-up Coaching Call", quantity: 1, unitPrice: 500 },
    ],
  },
  {
    id: "q-003",
    title: "Fundraising Bootcamp",
    clientName: "James Park",
    clientEmail: "james@parkstudios.com",
    amount: 6000,
    status: "draft",
    createdAt: "2026-04-07T16:00:00Z",
    expiresAt: "2026-05-07T16:00:00Z",
    items: [
      { id: "li-5", description: "4-Week Fundraising Program", quantity: 1, unitPrice: 5000 },
      { id: "li-6", description: "Investor Intro Package", quantity: 1, unitPrice: 1000 },
    ],
  },
  {
    id: "q-004",
    title: "Market Validation Sprint",
    clientName: "Elena Vasquez",
    clientEmail: "elena@newleaf.io",
    amount: 3500,
    status: "expired",
    createdAt: "2026-02-15T09:00:00Z",
    sentAt: "2026-02-15T12:00:00Z",
    expiresAt: "2026-03-15T09:00:00Z",
    items: [
      { id: "li-7", description: "Market Analysis Report", quantity: 1, unitPrice: 2000 },
      { id: "li-8", description: "Customer Discovery Coaching", quantity: 3, unitPrice: 500 },
    ],
  },
]

export const DEMO_STATS: SalesDashboardStats = {
  totalQuotes: 4,
  activeQuotes: 2,
  acceptedQuotes: 1,
  totalRevenue: 4500,
  totalCommission: 4500 * (PARTNER_SHARE_PERCENT / 100),
  conversionRate: 25,
}

export const MILESTONES: SalesMilestone[] = [
  {
    id: "ms-1",
    type: "first_quote",
    title: "First Quote Created",
    description: "You created your first quote — the journey begins!",
    achievedAt: "2026-02-15T09:00:00Z",
  },
  {
    id: "ms-2",
    type: "first_sent",
    title: "First Quote Sent",
    description: "You sent your first quote to a potential client.",
    achievedAt: "2026-02-15T12:00:00Z",
  },
  {
    id: "ms-3",
    type: "first_sale",
    title: "First Sale Closed!",
    description: "Congratulations! You closed your first deal.",
    achievedAt: "2026-03-30T09:15:00Z",
  },
  {
    id: "ms-4",
    type: "revenue_milestone",
    title: "$10,000 Revenue",
    description: "Hit your first $10K revenue milestone.",
    threshold: 10000,
  },
]

export const GUIDED_TOUR_STEPS: GuidedTourStep[] = [
  {
    id: "tour-1",
    target: "sales-overview",
    title: "Your Sales Dashboard",
    description: "This is your command center. Track all your quotes, revenue, and commissions at a glance.",
    placement: "bottom",
  },
  {
    id: "tour-2",
    target: "create-quote-btn",
    title: "Create a Quote",
    description: "Start by creating a quote for a potential client. Add line items, set pricing, and send it with one click.",
    placement: "bottom",
  },
  {
    id: "tour-3",
    target: "quote-list",
    title: "Track Your Quotes",
    description: "Every quote shows its status — draft, sent, accepted, or expired. You always know where things stand.",
    placement: "top",
  },
  {
    id: "tour-4",
    target: "commission-panel",
    title: "Your Earnings",
    description: "See your commission on every deal. You keep 85% of each sale — the platform takes just 15%.",
    placement: "left",
  },
]
