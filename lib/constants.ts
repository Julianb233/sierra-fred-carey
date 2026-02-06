/**
 * App-wide constants for the Fred Carey / Sahara platform
 * Single source of truth for colors, tiers, and features
 */

// ============================================
// BRAND COLORS
// ============================================
export const COLORS = {
  // Primary orange palette
  primary: "#ff6a1a",
  primaryHover: "#ea580c",
  primaryLight: "#fb923c",
  primaryDark: "#c2410c",

  // Semantic colors
  success: "#22c55e",
  warning: "#f59e0b",
  error: "#ef4444",
  info: "#3b82f6",
} as const;

// Tailwind class helpers
export const TW_COLORS = {
  primaryBg: "bg-[#ff6a1a]",
  primaryHoverBg: "hover:bg-[#ea580c]",
  primaryText: "text-[#ff6a1a]",
  primaryBorder: "border-[#ff6a1a]",
  primaryShadow: "shadow-[#ff6a1a]/25",
  primaryShadowHover: "hover:shadow-[#ff6a1a]/40",
  primaryGradient: "from-[#ff6a1a] to-orange-400",
} as const;

// ============================================
// USER TIERS
// ============================================
export enum UserTier {
  FREE = 0,
  PRO = 1,
  STUDIO = 2,
}

export const TIER_NAMES: Record<UserTier, string> = {
  [UserTier.FREE]: "Free",
  [UserTier.PRO]: "Pro",
  [UserTier.STUDIO]: "Studio",
};

export const TIER_BADGES: Record<UserTier, { label: string; className: string }> = {
  [UserTier.FREE]: {
    label: "Free",
    className: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  },
  [UserTier.PRO]: {
    label: "Pro",
    className: "bg-[#ff6a1a]/10 text-[#ff6a1a] border border-[#ff6a1a]/20",
  },
  [UserTier.STUDIO]: {
    label: "Studio",
    className: "bg-gradient-to-r from-[#ff6a1a] to-orange-400 text-white",
  },
};

// ============================================
// FEATURE ACCESS BY TIER
// ============================================
export const TIER_FEATURES = {
  [UserTier.FREE]: [
    "Core Sahara Decision Engine",
    "Strategy & execution reframing",
    "Startup Reality Lens",
    "Red Flag Detection",
    "Founder wellbeing support",
    "Founder Intake Snapshot",
  ],
  [UserTier.PRO]: [
    "Everything in Free tier",
    "Full Investor Lens (Pre-Seed / Seed / Series A)",
    "Investor Readiness Score",
    "Pitch Deck Review & Scorecard",
    "Strategy Documents",
    "Automated Weekly SMS Check-Ins",
    "Persistent founder memory",
  ],
  [UserTier.STUDIO]: [
    "Everything in Pro tier",
    "Virtual Team: Founder Ops Agent",
    "Virtual Team: Fundraising Agent",
    "Virtual Team: Growth Agent",
    "Weekly SMS Accountability Check-ins",
    "Boardy Investor/Advisor Matching",
    "Priority compute & deeper memory",
  ],
} as const;

// ============================================
// ONBOARDING OPTIONS
// ============================================
export const FOUNDER_CHALLENGES = [
  { id: "product-market-fit", label: "Product-Market Fit", icon: "Target" },
  { id: "fundraising", label: "Fundraising", icon: "DollarSign" },
  { id: "team-building", label: "Team Building", icon: "Users" },
  { id: "growth-scaling", label: "Growth & Scaling", icon: "TrendingUp" },
  { id: "unit-economics", label: "Unit Economics", icon: "BarChart3" },
  { id: "strategic-planning", label: "Strategy", icon: "Brain" },
] as const;

export const STARTUP_STAGES = [
  { id: "idea", label: "Idea Stage", description: "Validating the concept" },
  { id: "mvp", label: "MVP", description: "Building first version" },
  { id: "pre-seed", label: "Pre-Seed", description: "Early traction" },
  { id: "seed", label: "Seed", description: "Product-market fit" },
  { id: "series-a", label: "Series A", description: "Scaling growth" },
] as const;

// ============================================
// UI CONSTANTS
// ============================================
export const ANIMATION_DURATION = {
  fast: 150,
  normal: 300,
  slow: 500,
} as const;

export const BREAKPOINTS = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  "2xl": 1536,
} as const;

// ============================================
// DASHBOARD NAVIGATION
// ============================================
export const DASHBOARD_NAV = [
  { id: "overview", label: "Overview", icon: "LayoutDashboard", href: "/dashboard", tier: UserTier.FREE },
  { id: "chat", label: "Talk to Fred", icon: "MessageCircle", href: "/chat", tier: UserTier.FREE },
  { id: "check-ins", label: "Check-ins", icon: "CalendarCheck", href: "/check-ins", tier: UserTier.FREE },
  { id: "agents", label: "AI Agents", icon: "Bot", href: "/dashboard/agents", tier: UserTier.STUDIO },
  { id: "documents", label: "Documents", icon: "FileText", href: "/dashboard/documents", tier: UserTier.PRO },
  { id: "sms-checkins", label: "SMS Check-ins", icon: "MessageSquare", href: "/dashboard/sms", tier: UserTier.STUDIO },
  { id: "boardy", label: "Boardy", icon: "Network", href: "/dashboard/boardy", tier: UserTier.STUDIO },
] as const;

// ============================================
// HELPER FUNCTIONS
// ============================================
export function canAccessFeature(userTier: UserTier, requiredTier: UserTier): boolean {
  return userTier >= requiredTier;
}

export function getUpgradeTier(currentTier: UserTier): UserTier | null {
  if (currentTier === UserTier.FREE) return UserTier.PRO;
  if (currentTier === UserTier.PRO) return UserTier.STUDIO;
  return null;
}

export function getTierFromString(tier: string): UserTier {
  const normalized = tier.toLowerCase();
  if (normalized === "pro" || normalized === "fundraising") return UserTier.PRO;
  if (normalized === "studio" || normalized === "venture_studio") return UserTier.STUDIO;
  return UserTier.FREE;
}
