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
