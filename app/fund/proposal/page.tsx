"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

import Footer from "@/components/footer";
import {
  Building2,
  Search,
  Users,
  Phone,
  BarChart3,
  FileText,
  Shield,
  DollarSign,
  Target,
  ArrowRight,
  CheckCircle2,
  TrendingUp,
  MapPin,
  Mail,
  MessageSquare,
  Database,
  Settings,
  Globe,
  Briefcase,
  Home,
  Key,
  ClipboardCheck,
  Layers,
  LineChart,
  PieChart,
  Wallet,
  HandshakeIcon,
  Eye,
  Truck,
  Package,
  Wrench,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

/* ───────────────────────────────────── Data ────────────────────────────────── */

const acquisitionPipeline = [
  {
    step: 1,
    title: "Source Properties",
    icon: Search,
    color: "from-orange-500 to-amber-500",
    description: "Find small-to-medium warehouses (1,000–5,000 sqft) through multiple channels",
    details: [
      "Search LoopNet, Crexi, and CoStar for listed properties",
      "Pull off-market leads from county tax records and absentee owner lists",
      "Use PropStream or Reonomy for data filtering by zoning, sqft, and owner type",
      "Drive industrial corridors to identify underutilized or distressed properties",
      "Build broker relationships for pocket listings and early deal flow",
    ],
  },
  {
    step: 2,
    title: "Identify Owners",
    icon: Users,
    color: "from-blue-500 to-cyan-500",
    description: "Find the actual owner behind the property and get their contact information",
    details: [
      "County assessor records for ownership and mailing addresses",
      "Skip tracing services (BatchSkipTracing, REISkip) to find phone/email",
      "Secretary of State filings to trace LLC ownership to individuals",
      "Title search to uncover liens, mortgages, and ownership history",
      "Build a structured owner database with all contact details",
    ],
  },
  {
    step: 3,
    title: "Outreach & Nurture",
    icon: Phone,
    color: "from-green-500 to-emerald-500",
    description: "Contact warehouse owners with a compelling offer and build relationships",
    details: [
      "Professional direct mail campaigns (letters, not yellow letters)",
      "Cold calling with commercial-focused scripts",
      "Email drip campaigns for warm follow-up",
      "Position as a fund buyer: cash offers, quick close, certainty",
      "Nurture owners not ready to sell over 6–18 months with regular touchpoints",
    ],
  },
  {
    step: 4,
    title: "Analyze & Underwrite",
    icon: BarChart3,
    color: "from-purple-500 to-violet-500",
    description: "Evaluate each property for acquisition viability and return potential",
    details: [
      "Cap rate analysis (NOI / Purchase Price) — target 7–10% for small industrial",
      "Cash-on-cash return calculation and rental rate comps ($/sqft)",
      "Physical inspection: roof, loading docks, ceiling height, power, zoning",
      "Phase I Environmental Site Assessment ($2K–$4K, mandatory for warehouses)",
      "Tenant creditworthiness and lease structure evaluation (NNN preferred)",
    ],
  },
  {
    step: 5,
    title: "Negotiate & Acquire",
    icon: FileText,
    color: "from-red-500 to-rose-500",
    description: "Submit LOIs, negotiate terms, and close acquisitions",
    details: [
      "Submit Letter of Intent (LOI) with key terms and contingencies",
      "Negotiate purchase price, due diligence period, and closing timeline",
      "Execute purchase agreement with standard commercial contingencies",
      "Complete due diligence: title, survey, environmental, inspections",
      "Close with fund capital — cash transactions for speed advantage",
    ],
  },
  {
    step: 6,
    title: "Manage & Earn",
    icon: Key,
    color: "from-amber-500 to-yellow-500",
    description: "Manage properties, place tenants, and distribute income to investors",
    details: [
      "Onboard to property management system (Yardi Breeze or AppFolio)",
      "Lease to contractors, e-commerce businesses, storage operators, service companies",
      "NNN lease structure: tenants cover taxes, insurance, and maintenance",
      "Monthly rental income distributed to fund investors",
      "Long-term appreciation and equity building across the portfolio",
    ],
  },
];

const softwareStack = [
  {
    category: "Property Data & Sourcing",
    icon: Search,
    tools: [
      { name: "PropStream", price: "$99/mo", desc: "Property data, owner lists, skip tracing, zoning filters" },
      { name: "Crexi", price: "$300/mo", desc: "Commercial listings, comps, analytics, lease data" },
      { name: "Reonomy", price: "$49–$249/mo", desc: "LLC ownership tracing, building permits, sales history" },
    ],
  },
  {
    category: "CRM & Deal Pipeline",
    icon: Database,
    tools: [
      { name: "Apto (Buildout)", price: "$89/mo", desc: "Commercial RE CRM with deal tracking and contact management" },
      { name: "HubSpot CRM", price: "Free–$45/mo", desc: "Pipeline management, email tracking, reporting" },
      { name: "ClientLook", price: "$69/mo", desc: "Commercial RE-specific CRM with mobile app" },
    ],
  },
  {
    category: "Outreach & Marketing",
    icon: MessageSquare,
    tools: [
      { name: "Ballpoint Marketing", price: "$2–$3.50/piece", desc: "Robotic handwritten letters, professional appearance" },
      { name: "BatchDialer", price: "$99–$199/mo", desc: "Triple-line power dialer, integrates with BatchLeads" },
      { name: "ActiveCampaign", price: "$29/mo", desc: "Email automation, drip sequences, CRM integration" },
    ],
  },
  {
    category: "Property Management",
    icon: Building2,
    tools: [
      { name: "Yardi Breeze", price: "$2/unit/mo", desc: "Commercial property management, tenant tracking, accounting" },
      { name: "AppFolio", price: "Custom", desc: "AI leasing tools, maintenance requests, tenant portal" },
      { name: "Buildium", price: "$55–$375/mo", desc: "Lease management, analytics, automated communications" },
    ],
  },
  {
    category: "Fund Administration",
    icon: Wallet,
    tools: [
      { name: "Juniper Square", price: "Custom", desc: "Investor portal, capital calls, distributions, reporting" },
      { name: "InvestNext", price: "Custom", desc: "Fund management, waterfall distributions, investor CRM" },
      { name: "QuickBooks Online", price: "$30–$90/mo", desc: "Bookkeeping, P&L, cash flow, tax preparation" },
    ],
  },
  {
    category: "Legal & Documents",
    icon: FileText,
    tools: [
      { name: "DocuSign", price: "$10–$25/mo", desc: "Electronic signatures for LOIs, contracts, subscriptions" },
      { name: "Dropbox Business", price: "$15/user/mo", desc: "Document storage, sharing, version control" },
      { name: "Securities Attorney", price: "$15K–$35K", desc: "PPM, operating agreement, Reg D filing (required)" },
    ],
  },
];

const tenantTypes = [
  { name: "Contractors", icon: Wrench, desc: "Tools, materials, equipment storage" },
  { name: "E-Commerce", icon: Package, desc: "Inventory and fulfillment operations" },
  { name: "Storage Operators", icon: Building2, desc: "Residential and commercial storage" },
  { name: "Distributors", icon: Truck, desc: "Local distribution and logistics hubs" },
  { name: "Service Companies", icon: Settings, desc: "HVAC, plumbing, electrical shops" },
  { name: "Small Manufacturers", icon: Layers, desc: "Light assembly and fabrication" },
];

const fundStructure = [
  { label: "Entity Type", value: "LLC (Manager-Managed)" },
  { label: "GP / Manager", value: "Tory R Zweigle" },
  { label: "LP / Investors", value: "28 committed, $200K avg" },
  { label: "Initial Capital Pool", value: "$5.4 million" },
  { label: "SEC Compliance", value: "Reg D 506(b) or 506(c)" },
  { label: "Preferred Return", value: "8% annual to LPs" },
  { label: "Promote / Carry", value: "20% above preferred" },
  { label: "Management Fee", value: "1.5% of AUM" },
];

/* ──────────────────────────── Collapsible Section ──────────────────────────── */

function CollapsibleSection({
  title,
  children,
  defaultOpen = false,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-5 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer"
      >
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white text-left">
          {title}
        </h3>
        {open ? (
          <ChevronUp className="h-5 w-5 text-gray-400" />
        ) : (
          <ChevronDown className="h-5 w-5 text-gray-400" />
        )}
      </button>
      {open && <div className="p-5 pt-0 bg-white dark:bg-gray-900">{children}</div>}
    </div>
  );
}

/* ─────────────────────────────── Main Page ─────────────────────────────────── */

export default function FundProposalPage() {
  return (
    <main className="flex flex-col min-h-dvh bg-white dark:bg-gray-950 relative overflow-hidden">
      {/* Background blobs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none opacity-30">
        <div className="absolute top-20 left-[10%] w-72 h-72 bg-[#ff6a1a]/20 rounded-full blur-[100px]" />
        <div className="absolute bottom-20 right-[15%] w-80 h-80 bg-orange-400/15 rounded-full blur-[120px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-amber-400/10 rounded-full blur-[150px]" />
      </div>

      {/* ─── Hero ─── */}
      <section className="relative z-10 max-w-6xl mx-auto px-4 pt-24 pb-16 md:px-8">
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-4xl mx-auto"
        >
          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#ff6a1a]/10 border border-[#ff6a1a]/20 text-sm font-medium text-[#ff6a1a] mb-6">
            <Building2 className="h-4 w-4" />
            FUND OPERATIONS PROPOSAL
          </span>

          {/* Tory's avatar */}
          <div className="flex justify-center mb-8">
            <div className="relative">
              <div className="w-32 h-32 rounded-full bg-gradient-to-br from-[#ff6a1a] to-amber-500 p-1 shadow-xl shadow-[#ff6a1a]/20">
                <div className="rounded-full w-full h-full bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
                  <span className="text-4xl font-bold text-white">TZ</span>
                </div>
              </div>
              <div className="absolute -bottom-2 -right-2 w-10 h-10 rounded-full bg-[#ff6a1a] flex items-center justify-center shadow-lg">
                <Building2 className="h-5 w-5 text-white" />
              </div>
            </div>
          </div>

          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl mt-4 mb-4 text-gray-900 dark:text-white">
            Warehouse Acquisition{" "}
            <span className="text-[#ff6a1a]">Fund Proposal</span>
          </h1>
          <p className="text-xl text-gray-700 dark:text-gray-300 mb-2 font-medium">
            A Start Up Biz &mdash; Real Estate Investment Fund
          </p>
          <p className="text-lg text-gray-600 dark:text-gray-400 mb-8 max-w-2xl mx-auto">
            How we find, identify, analyze, and acquire small-to-medium commercial
            warehouses to generate consistent income for fund investors.
          </p>

          <div className="flex gap-4 justify-center flex-wrap">
            <Button
              asChild
              size="lg"
              className="bg-[#ff6a1a] hover:bg-[#ea580c] text-white shadow-lg shadow-[#ff6a1a]/25"
            >
              <Link href="/fund">
                View Fund Page <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="hover:border-[#ff6a1a]/30 hover:text-[#ff6a1a]"
            >
              <Link href="/fund/presentation">View Investor Deck</Link>
            </Button>
          </div>
        </motion.div>
      </section>

      {/* ─── The Opportunity ─── */}
      <section className="relative z-10 bg-gray-50 dark:bg-gray-900/50 py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#ff6a1a]/10 border border-[#ff6a1a]/20 text-sm font-medium text-[#ff6a1a] mb-4">
              THE OPPORTUNITY
            </span>
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
              Why Small Commercial <span className="text-[#ff6a1a]">Warehouses</span>?
            </h2>
            <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              Small warehouses (1,000–5,000 sqft) are one of the most underserved
              segments of commercial real estate — high demand, fragmented
              ownership, and limited institutional competition.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: TrendingUp,
                title: "E-Commerce Boom",
                desc: "Last-mile delivery and fulfillment centers are driving massive demand for small warehouse spaces nationwide.",
              },
              {
                icon: Users,
                title: "Fragmented Ownership",
                desc: "Most small warehouses are owned by individuals or small LLCs — they're more motivated to sell than institutional owners.",
              },
              {
                icon: DollarSign,
                title: "Strong Cash Flow",
                desc: "Commercial NNN leases mean tenants pay taxes, insurance, and maintenance. Clean, predictable income for investors.",
              },
              {
                icon: Shield,
                title: "Lower Competition",
                desc: "Institutional investors focus on large industrial. Small warehouses are below their radar — less competition, better pricing.",
              },
              {
                icon: LineChart,
                title: "7–10% Cap Rates",
                desc: "Small industrial properties in secondary markets trade at 7–10% cap rates — significantly higher returns than multifamily.",
              },
              {
                icon: MapPin,
                title: "Essential Tenants",
                desc: "Contractors, storage companies, distributors, and service businesses always need space. Recession-resistant demand.",
              },
            ].map((item, i) => (
              <motion.div
                key={item.title}
                initial={{ y: 20, opacity: 0 }}
                whileInView={{ y: 0, opacity: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
              >
                <Card className="h-full bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 hover:border-[#ff6a1a]/30 hover:shadow-lg transition-all">
                  <CardHeader>
                    <div className="w-12 h-12 rounded-xl bg-[#ff6a1a]/10 flex items-center justify-center mb-3">
                      <item.icon className="h-6 w-6 text-[#ff6a1a]" />
                    </div>
                    <CardTitle className="text-gray-900 dark:text-white">
                      {item.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {item.desc}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Tenant Types ─── */}
      <section className="relative z-10 py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
              Target <span className="text-[#ff6a1a]">Tenants</span>
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              The backbone of the local economy — businesses that always need
              physical space.
            </p>
          </motion.div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {tenantTypes.map((t, i) => (
              <motion.div
                key={t.name}
                initial={{ y: 20, opacity: 0 }}
                whileInView={{ y: 0, opacity: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.05 }}
                className="text-center p-5 rounded-2xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 hover:border-[#ff6a1a]/30 transition-all"
              >
                <div className="w-12 h-12 rounded-full bg-[#ff6a1a]/10 flex items-center justify-center mx-auto mb-3">
                  <t.icon className="h-5 w-5 text-[#ff6a1a]" />
                </div>
                <p className="font-semibold text-sm text-gray-900 dark:text-white">
                  {t.name}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {t.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Acquisition Pipeline ─── */}
      <section className="relative z-10 bg-gray-50 dark:bg-gray-900/50 py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#ff6a1a]/10 border border-[#ff6a1a]/20 text-sm font-medium text-[#ff6a1a] mb-4">
              THE PROCESS
            </span>
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
              Property Acquisition{" "}
              <span className="text-[#ff6a1a]">Pipeline</span>
            </h2>
            <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              A systematic, repeatable process for finding, evaluating, and
              acquiring warehouse properties for the fund.
            </p>
          </motion.div>

          <div className="space-y-6">
            {acquisitionPipeline.map((stage, i) => (
              <motion.div
                key={stage.step}
                initial={{ x: -20, opacity: 0 }}
                whileInView={{ x: 0, opacity: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
              >
                <Card className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 hover:border-[#ff6a1a]/30 hover:shadow-lg transition-all overflow-hidden">
                  <div className="flex flex-col md:flex-row">
                    {/* Step number */}
                    <div
                      className={`flex-shrink-0 w-full md:w-20 bg-gradient-to-br ${stage.color} flex items-center justify-center p-4 md:p-0`}
                    >
                      <span className="text-3xl font-bold text-white">
                        {stage.step}
                      </span>
                    </div>

                    <div className="flex-1 p-6">
                      <div className="flex items-center gap-3 mb-2">
                        <stage.icon className="h-5 w-5 text-[#ff6a1a]" />
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                          {stage.title}
                        </h3>
                      </div>
                      <p className="text-gray-600 dark:text-gray-400 mb-4">
                        {stage.description}
                      </p>
                      <ul className="space-y-2">
                        {stage.details.map((detail, di) => (
                          <li
                            key={di}
                            className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400"
                          >
                            <CheckCircle2 className="h-4 w-4 text-[#ff6a1a] mt-0.5 flex-shrink-0" />
                            {detail}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Software Stack ─── */}
      <section className="relative z-10 py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#ff6a1a]/10 border border-[#ff6a1a]/20 text-sm font-medium text-[#ff6a1a] mb-4">
              TECHNOLOGY
            </span>
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
              Recommended{" "}
              <span className="text-[#ff6a1a]">Software Stack</span>
            </h2>
            <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              The tools needed to run every stage of the fund — from sourcing
              properties to managing investors.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {softwareStack.map((cat, i) => (
              <motion.div
                key={cat.category}
                initial={{ y: 20, opacity: 0 }}
                whileInView={{ y: 0, opacity: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.08 }}
              >
                <Card className="h-full bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 hover:border-[#ff6a1a]/30 hover:shadow-lg transition-all">
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-[#ff6a1a]/10 flex items-center justify-center">
                        <cat.icon className="h-5 w-5 text-[#ff6a1a]" />
                      </div>
                      <CardTitle className="text-base text-gray-900 dark:text-white">
                        {cat.category}
                      </CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {cat.tools.map((tool) => (
                      <div
                        key={tool.name}
                        className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-semibold text-gray-900 dark:text-white">
                            {tool.name}
                          </span>
                          <span className="text-xs font-medium text-[#ff6a1a] bg-[#ff6a1a]/10 px-2 py-0.5 rounded-full">
                            {tool.price}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {tool.desc}
                        </p>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          {/* Monthly cost estimate */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="mt-8"
          >
            <Card className="bg-gradient-to-br from-[#ff6a1a]/5 to-amber-500/5 border-[#ff6a1a]/20">
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
                      Estimated Monthly Software Budget
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Core stack to run the fund operations (excludes legal setup costs)
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-bold text-[#ff6a1a]">
                      $800–$1,500
                    </p>
                    <p className="text-xs text-gray-500">per month</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </section>

      {/* ─── Fund Structure ─── */}
      <section className="relative z-10 bg-gray-50 dark:bg-gray-900/50 py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#ff6a1a]/10 border border-[#ff6a1a]/20 text-sm font-medium text-[#ff6a1a] mb-4">
              FUND STRUCTURE
            </span>
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
              Legal &{" "}
              <span className="text-[#ff6a1a]">Financial Structure</span>
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Fund terms */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              whileInView={{ y: 0, opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <Card className="h-full bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800">
                <CardHeader>
                  <CardTitle className="text-gray-900 dark:text-white flex items-center gap-2">
                    <Briefcase className="h-5 w-5 text-[#ff6a1a]" />
                    Fund Terms
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {fundStructure.map((item) => (
                      <div
                        key={item.label}
                        className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800 last:border-0"
                      >
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          {item.label}
                        </span>
                        <span className="text-sm font-semibold text-gray-900 dark:text-white">
                          {item.value}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Distribution waterfall */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              whileInView={{ y: 0, opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              <Card className="h-full bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800">
                <CardHeader>
                  <CardTitle className="text-gray-900 dark:text-white flex items-center gap-2">
                    <PieChart className="h-5 w-5 text-[#ff6a1a]" />
                    Distribution Waterfall
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {[
                    {
                      tier: "Tier 1",
                      label: "Return of Capital",
                      desc: "Investors receive 100% of distributions until original capital is returned",
                      color: "bg-blue-500",
                    },
                    {
                      tier: "Tier 2",
                      label: "Preferred Return (8%)",
                      desc: "Investors receive 100% of distributions until 8% annual return is met",
                      color: "bg-green-500",
                    },
                    {
                      tier: "Tier 3",
                      label: "GP Catch-Up",
                      desc: "GP receives distributions until reaching 20% of total profits",
                      color: "bg-[#ff6a1a]",
                    },
                    {
                      tier: "Tier 4",
                      label: "Profit Split (80/20)",
                      desc: "Remaining profits split 80% to LPs, 20% to GP",
                      color: "bg-purple-500",
                    },
                  ].map((tier) => (
                    <div key={tier.tier} className="flex items-start gap-3">
                      <div
                        className={`w-3 h-3 rounded-full ${tier.color} mt-1.5 flex-shrink-0`}
                      />
                      <div>
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">
                          {tier.tier}: {tier.label}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {tier.desc}
                        </p>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* SEC & Legal Requirements */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="mt-6 space-y-4"
          >
            <CollapsibleSection title="SEC Compliance — Regulation D" defaultOpen>
              <div className="grid md:grid-cols-2 gap-4 mt-4">
                <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                    Rule 506(b)
                  </h4>
                  <ul className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                    <li>Up to 35 non-accredited + unlimited accredited investors</li>
                    <li>No general solicitation or advertising</li>
                    <li>Best for friends-and-family raises</li>
                    <li>File Form D within 15 days of first sale</li>
                  </ul>
                </div>
                <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                    Rule 506(c)
                  </h4>
                  <ul className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                    <li>Accredited investors ONLY</li>
                    <li>General solicitation IS allowed (can advertise)</li>
                    <li>Must verify accredited status (tax returns, bank statements)</li>
                    <li>Better for marketing-driven fund raises</li>
                  </ul>
                </div>
              </div>
              <div className="mt-4 p-4 rounded-xl bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/30">
                <p className="text-sm text-amber-800 dark:text-amber-200">
                  <strong>Required legal documents:</strong> Private Placement
                  Memorandum (PPM), Operating Agreement, Subscription Agreement,
                  and Investor Questionnaire. Estimated legal cost: $15,000–$35,000
                  via a securities attorney.
                </p>
              </div>
            </CollapsibleSection>

            <CollapsibleSection title="Property Due Diligence Checklist">
              <div className="grid md:grid-cols-2 gap-3 mt-4">
                {[
                  "Phase I Environmental Site Assessment ($2K–$4K)",
                  "Title search and survey",
                  "Zoning confirmation (industrial/commercial use)",
                  "Physical inspection: roof, HVAC, loading docks",
                  "Ceiling height assessment (16+ feet preferred)",
                  "Electrical capacity (3-phase power is a plus)",
                  "Fire suppression / sprinkler system condition",
                  "Existing lease review and tenant creditworthiness",
                  "Insurance requirements and cost estimates",
                  "Comparable sales and rental rate analysis",
                ].map((item) => (
                  <div
                    key={item}
                    className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400 p-2"
                  >
                    <ClipboardCheck className="h-4 w-4 text-[#ff6a1a] mt-0.5 flex-shrink-0" />
                    {item}
                  </div>
                ))}
              </div>
            </CollapsibleSection>

            <CollapsibleSection title="Key Performance Indicators (KPIs)">
              <div className="overflow-x-auto mt-4">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <th className="text-left p-3 font-semibold text-gray-900 dark:text-white">
                        Metric
                      </th>
                      <th className="text-left p-3 font-semibold text-gray-900 dark:text-white">
                        Monthly Target
                      </th>
                      <th className="text-left p-3 font-semibold text-gray-900 dark:text-white">
                        Notes
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      ["Properties Identified", "50–100", "From all sourcing channels"],
                      ["Owners Contacted", "30–60", "Calls, mail, and email combined"],
                      ["Response Rate", "5–15%", "Varies by channel (mail lowest, calls highest)"],
                      ["Properties Analyzed", "10–20", "Full underwriting completed"],
                      ["LOIs Submitted", "3–5", "Competitive but realistic offers"],
                      ["Properties Acquired", "1–2", "Fund target during ramp-up"],
                      ["Avg Acquisition Cost", "$150K–$400K", "Depending on market and size"],
                      ["Target Cap Rate", "7–10%", "NOI / purchase price"],
                      ["Occupancy Rate", "90%+", "Across portfolio once stabilized"],
                    ].map(([metric, target, notes]) => (
                      <tr
                        key={metric}
                        className="border-b border-gray-100 dark:border-gray-800 last:border-0"
                      >
                        <td className="p-3 font-medium text-gray-900 dark:text-white">
                          {metric}
                        </td>
                        <td className="p-3 text-[#ff6a1a] font-semibold">
                          {target}
                        </td>
                        <td className="p-3 text-gray-500 dark:text-gray-400">
                          {notes}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CollapsibleSection>
          </motion.div>
        </div>
      </section>

      {/* ─── CTA ─── */}
      <section className="relative z-10 py-20 px-4">
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          whileInView={{ y: 0, opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="max-w-3xl mx-auto text-center"
        >
          <h2 className="text-3xl font-bold mb-4 text-gray-900 dark:text-white">
            Ready to <span className="text-[#ff6a1a]">Get Started</span>?
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-400 mb-8">
            Review the fund details, investor presentation, and email sequence —
            everything you need to launch the warehouse acquisition fund.
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Button
              asChild
              size="lg"
              className="bg-[#ff6a1a] hover:bg-[#ea580c] text-white shadow-lg shadow-[#ff6a1a]/25"
            >
              <Link href="/fund#consultation">
                Sign Up for a Consultation
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="hover:border-[#ff6a1a]/30 hover:text-[#ff6a1a]"
            >
              <Link href="/fund/emails">View Email Sequence</Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="hover:border-[#ff6a1a]/30 hover:text-[#ff6a1a]"
            >
              <a href="/assets/tory/investor-deck.pdf" download>
                Download Investor Deck
              </a>
            </Button>
          </div>
        </motion.div>
      </section>

      <Footer />
    </main>
  );
}
