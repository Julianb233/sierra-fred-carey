export interface Document {
  id: string;
  title: string;
  type: DocumentType;
  content: string;
  status: "draft" | "completed" | "in-progress";
  createdAt: Date;
  updatedAt: Date;
  businessContext?: {
    companyName?: string;
    industry?: string;
    stage?: string;
    goals?: string[];
    challenges?: string[];
  };
}

export type DocumentType =
  | "executive-summary"
  | "30-60-90-plan"
  | "diagnosis"
  | "options-tradeoffs";

export interface DocumentTypeConfig {
  id: DocumentType;
  title: string;
  description: string;
  icon: string;
  color: string;
  gradientFrom: string;
  gradientTo: string;
  inputs: DocumentInput[];
  template: string;
}

export interface DocumentInput {
  id: string;
  label: string;
  type: "text" | "textarea" | "multiselect" | "tags";
  placeholder: string;
  required: boolean;
}

export const documentTypes: DocumentTypeConfig[] = [
  {
    id: "executive-summary",
    title: "Executive Summary",
    description: "Comprehensive company overview for investors and stakeholders",
    icon: "📊",
    color: "blue",
    gradientFrom: "from-blue-500",
    gradientTo: "to-cyan-500",
    inputs: [
      {
        id: "companyName",
        label: "Company Name",
        type: "text",
        placeholder: "Acme Inc.",
        required: true,
      },
      {
        id: "industry",
        label: "Industry",
        type: "text",
        placeholder: "SaaS, E-commerce, Healthcare, etc.",
        required: true,
      },
      {
        id: "stage",
        label: "Company Stage",
        type: "text",
        placeholder: "Pre-seed, Seed, Series A, etc.",
        required: true,
      },
      {
        id: "overview",
        label: "Company Overview",
        type: "textarea",
        placeholder: "Brief description of your company, mission, and vision...",
        required: true,
      },
      {
        id: "market",
        label: "Market Opportunity",
        type: "textarea",
        placeholder: "Describe your target market, size, and growth potential...",
        required: true,
      },
      {
        id: "traction",
        label: "Key Traction Metrics",
        type: "textarea",
        placeholder: "Revenue, users, growth rate, key milestones...",
        required: false,
      },
    ],
    template: "executive-summary",
  },
  {
    id: "30-60-90-plan",
    title: "30-60-90 Day Plan",
    description: "Strategic action plan with prioritized milestones and metrics",
    icon: "🎯",
    color: "purple",
    gradientFrom: "from-purple-500",
    gradientTo: "to-pink-500",
    inputs: [
      {
        id: "role",
        label: "Role/Position",
        type: "text",
        placeholder: "CEO, Head of Product, etc.",
        required: true,
      },
      {
        id: "context",
        label: "Current Situation",
        type: "textarea",
        placeholder: "Describe the current state of the business...",
        required: true,
      },
      {
        id: "goals",
        label: "Primary Goals",
        type: "tags",
        placeholder: "Add goals (press Enter after each)",
        required: true,
      },
      {
        id: "challenges",
        label: "Key Challenges",
        type: "tags",
        placeholder: "Add challenges (press Enter after each)",
        required: false,
      },
      {
        id: "resources",
        label: "Available Resources",
        type: "textarea",
        placeholder: "Team size, budget, tools, partnerships...",
        required: false,
      },
    ],
    template: "30-60-90-plan",
  },
  {
    id: "diagnosis",
    title: "Business Diagnosis",
    description: "Deep dive into current state, problems, and opportunities",
    icon: "🔍",
    color: "green",
    gradientFrom: "from-green-500",
    gradientTo: "to-emerald-500",
    inputs: [
      {
        id: "businessArea",
        label: "Business Area to Diagnose",
        type: "text",
        placeholder: "Product, Marketing, Operations, etc.",
        required: true,
      },
      {
        id: "currentState",
        label: "Current State",
        type: "textarea",
        placeholder: "Describe what's happening now...",
        required: true,
      },
      {
        id: "problems",
        label: "Known Problems",
        type: "tags",
        placeholder: "Add problems (press Enter after each)",
        required: true,
      },
      {
        id: "metrics",
        label: "Key Metrics",
        type: "textarea",
        placeholder: "Current performance indicators and data points...",
        required: false,
      },
      {
        id: "constraints",
        label: "Constraints",
        type: "tags",
        placeholder: "Budget, time, resources, etc.",
        required: false,
      },
    ],
    template: "diagnosis",
  },
  {
    id: "options-tradeoffs",
    title: "Options & Tradeoffs",
    description: "Strategic options analysis with comprehensive pros and cons",
    icon: "⚖️",
    color: "orange",
    gradientFrom: "from-orange-500",
    gradientTo: "to-red-500",
    inputs: [
      {
        id: "decision",
        label: "Decision to Make",
        type: "text",
        placeholder: "What decision are you trying to make?",
        required: true,
      },
      {
        id: "context",
        label: "Context",
        type: "textarea",
        placeholder: "Background and current situation...",
        required: true,
      },
      {
        id: "options",
        label: "Known Options",
        type: "tags",
        placeholder: "Add options you're considering (press Enter after each)",
        required: false,
      },
      {
        id: "criteria",
        label: "Decision Criteria",
        type: "tags",
        placeholder: "What factors matter most? (cost, time, impact, etc.)",
        required: false,
      },
      {
        id: "timeline",
        label: "Decision Timeline",
        type: "text",
        placeholder: "When does this decision need to be made?",
        required: false,
      },
    ],
    template: "options-tradeoffs",
  },
];

export const mockDocuments: Document[] = [
  {
    id: "doc-1",
    title: "Q1 2024 Executive Summary",
    type: "executive-summary",
    content: `# Executive Summary - Acme Inc.\n\n## Company Overview\nAcme Inc. is a B2B SaaS platform revolutionizing how mid-market companies manage their customer operations...\n\n## Market Opportunity\nThe customer operations software market is projected to reach $28B by 2026, growing at 18% CAGR...\n\n## Key Traction\n- $2.4M ARR (150% YoY growth)\n- 47 enterprise customers\n- 94% net revenue retention\n- Recent partnerships with Salesforce and HubSpot`,
    status: "completed",
    createdAt: new Date("2024-01-15"),
    updatedAt: new Date("2024-01-20"),
    businessContext: {
      companyName: "Acme Inc.",
      industry: "SaaS",
      stage: "Series A",
    },
  },
  {
    id: "doc-2",
    title: "New Product Launch Plan",
    type: "30-60-90-plan",
    content: `# 30-60-90 Day Product Launch Plan\n\n## Days 1-30: Foundation\n**Goal: Establish launch framework and begin marketing**\n- Week 1-2: Finalize product positioning and messaging\n- Week 3: Launch landing page and early access program\n- Week 4: Begin content marketing and PR outreach\n\n## Days 31-60: Build Momentum\n**Goal: Generate pipeline and refine product**\n- Onboard first 20 beta customers\n- Gather and implement feedback\n- Launch paid advertising campaigns\n\n## Days 61-90: Scale\n**Goal: Official launch and revenue generation**\n- Public product launch event\n- Target: 100+ customers, $50K MRR\n- Establish customer success processes`,
    status: "in-progress",
    createdAt: new Date("2024-02-01"),
    updatedAt: new Date("2024-02-05"),
    businessContext: {
      goals: ["Product-market fit", "Revenue generation", "Brand awareness"],
    },
  },
  {
    id: "doc-3",
    title: "Sales Process Diagnosis",
    type: "diagnosis",
    content: `# Sales Process Diagnosis\n\n## Current State\nOur sales cycle has increased from 30 to 75 days over the past 6 months, while close rates have dropped from 28% to 19%.\n\n## Root Causes Identified\n1. **Qualification Issues**: Too many unqualified leads entering pipeline\n2. **Pricing Confusion**: Multiple pricing tiers causing decision paralysis\n3. **Long Demo Cycles**: Average 3.2 demos per deal vs. industry standard of 1.8\n4. **Lack of Urgency**: No compelling event driving purchase decisions\n\n## Key Metrics\n- Sales cycle: 75 days (↑ 150%)\n- Close rate: 19% (↓ 32%)\n- Pipeline value: $1.2M (same)\n- ACV: $28K (↓ 12%)\n\n## Opportunities\n- Implement BANT qualification framework\n- Simplify pricing to 2 tiers\n- Create product-led growth motion for SMB segment`,
    status: "completed",
    createdAt: new Date("2024-01-28"),
    updatedAt: new Date("2024-02-03"),
    businessContext: {
      challenges: ["Long sales cycles", "Low close rates", "Pipeline stagnation"],
    },
  },
  {
    id: "doc-4",
    title: "Market Expansion Strategy Options",
    type: "options-tradeoffs",
    content: `# Market Expansion Strategy: Options & Tradeoffs\n\n## Decision\nShould we expand to Europe or focus on US enterprise market?\n\n## Option A: European Expansion\n**Pros:**\n- Less competitive market\n- Higher average deal sizes (€45K vs $28K)\n- GDPR compliance already complete\n- 3 inbound enterprise leads from EU\n\n**Cons:**\n- Requires local sales team (+$400K/year)\n- Currency/payment complexity\n- Different buying cycles and decision processes\n- 8-hour time zone challenge for support\n\n**Timeline:** 6-9 months to first revenue\n**Investment:** $600K first year\n\n## Option B: US Enterprise Focus\n**Pros:**\n- Leverage existing team and infrastructure\n- Current customers can provide references\n- Larger addressable market ($12B vs €4B)\n- No operational complexity\n\n**Cons:**\n- More competitive (14 direct competitors)\n- Longer sales cycles (6+ months)\n- Need enterprise features (SSO, SLA, etc.)\n- Existing product built for mid-market\n\n**Timeline:** 3-4 months to first enterprise deal\n**Investment:** $200K (product development)\n\n## Recommendation\nStart with Option B (US Enterprise) while building EU pipeline for 2025 expansion.`,
    status: "draft",
    createdAt: new Date("2024-02-10"),
    updatedAt: new Date("2024-02-10"),
  },
];
