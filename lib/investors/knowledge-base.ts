/**
 * Investor Firm Knowledge Base
 *
 * Curated data on top investor firms — what they fund, how they evaluate,
 * and what makes them say "yes" at each round. This is Fred's institutional
 * knowledge about the investor landscape, used for matching and coaching.
 *
 * Data sources: public firm websites, Crunchbase, PitchBook profiles, and
 * Fred Cary's 30+ years of deal experience.
 *
 * Linear: AI-1285
 */

// ============================================================================
// Types
// ============================================================================

export type InvestorType = "accelerator" | "venture" | "angel-group" | "corporate-vc" | "growth-equity";

export type RoundFocus = "pre-seed" | "seed" | "series-a" | "series-b" | "series-c" | "growth";

export interface InvestorFirm {
  /** Unique slug identifier */
  id: string;
  /** Display name */
  name: string;
  /** Type of investor */
  type: InvestorType;
  /** Headquarters location */
  location: string;
  /** Year founded */
  founded: number;
  /** Website URL */
  website: string;
  /** Rounds they actively invest in */
  roundFocus: RoundFocus[];
  /** Typical check size range in USD */
  checkSize: { min: number; max: number };
  /** Core investment thesis — what they believe */
  thesis: string;
  /** What specifically makes them say "yes" */
  whatTheyLookFor: string[];
  /** Sectors they focus on (empty = generalist) */
  sectorFocus: string[];
  /** Notable portfolio companies */
  portfolioExamples: string[];
  /** Special programs or value-add */
  specialPrograms?: string[];
  /** Application or intro requirements */
  accessPath: string;
  /** Fred's practical coaching note about this firm */
  fredNote: string;
}

// ============================================================================
// Knowledge Base
// ============================================================================

export const INVESTOR_FIRMS: InvestorFirm[] = [
  // ---------- Accelerators ----------
  {
    id: "y-combinator",
    name: "Y Combinator",
    type: "accelerator",
    location: "San Francisco, CA",
    founded: 2005,
    website: "https://www.ycombinator.com",
    roundFocus: ["pre-seed", "seed"],
    checkSize: { min: 500_000, max: 500_000 },
    thesis: "Fund technical founders building something people want. Batch-based model with demo day access to top VCs.",
    whatTheyLookFor: [
      "Strong technical founders who can build fast",
      "Clear problem-solution fit with early traction or deep domain insight",
      "Large addressable market (ideally $1B+)",
      "Founders who ship quickly and iterate",
      "Willingness to relocate to SF Bay Area for batch",
    ],
    sectorFocus: [],
    portfolioExamples: ["Airbnb", "Stripe", "Dropbox", "Coinbase", "DoorDash", "Reddit"],
    specialPrograms: ["3-month batch program", "Demo Day", "YC Series A Program", "Bookface alumni network"],
    accessPath: "Apply online at ycombinator.com/apply. Two application cycles per year. No warm intro needed but they help.",
    fredNote: "YC is the gold standard for early-stage. If you get in, the network alone is worth it. But you need to be building, not just pitching. They want to see velocity — what did you ship this week?",
  },
  {
    id: "techstars",
    name: "Techstars",
    type: "accelerator",
    location: "Boulder, CO (global programs)",
    founded: 2006,
    website: "https://www.techstars.com",
    roundFocus: ["pre-seed", "seed"],
    checkSize: { min: 120_000, max: 120_000 },
    thesis: "Mentor-driven accelerator with industry-specific programs worldwide. Invest in founders first, ideas second.",
    whatTheyLookFor: [
      "Coachable founders open to mentorship",
      "Team chemistry and complementary skills",
      "Early customer validation or strong hypothesis",
      "Willingness to commit 3 months full-time",
      "Fit with specific program theme (fintech, health, etc.)",
    ],
    sectorFocus: [],
    portfolioExamples: ["Sendgrid", "DigitalOcean", "Sphero", "ClassPass", "Zipline"],
    specialPrograms: ["Industry-specific programs (fintech, health, space, etc.)", "Techstars Anywhere (remote)", "Corporate partner programs"],
    accessPath: "Apply to specific programs at techstars.com. Multiple program-specific deadlines throughout the year.",
    fredNote: "Techstars is more mentor-heavy than YC. Great if you need hands-on guidance and industry connections. The corporate-partnered programs open doors that are otherwise very hard to access.",
  },
  {
    id: "500-global",
    name: "500 Global",
    type: "accelerator",
    location: "San Francisco, CA (global)",
    founded: 2010,
    website: "https://500.co",
    roundFocus: ["pre-seed", "seed"],
    checkSize: { min: 150_000, max: 500_000 },
    thesis: "Democratize access to capital globally. Invest in diverse founders across geographies with a data-driven approach.",
    whatTheyLookFor: [
      "Founders from underserved markets or backgrounds",
      "Scalable business model with clear unit economics path",
      "Product in market with initial traction",
      "Global market potential",
      "Capital-efficient growth mindset",
    ],
    sectorFocus: [],
    portfolioExamples: ["Canva", "Grab", "Talkdesk", "Credit Karma", "Udemy"],
    specialPrograms: ["Seed Program", "Series A Program", "Global Launch"],
    accessPath: "Apply at 500.co. Rolling admissions for various geographic programs.",
    fredNote: "500 Global is strong for founders outside the typical Silicon Valley pipeline. They have genuine reach in Southeast Asia, Latin America, and MENA. If you're building for global markets from a non-traditional hub, look here.",
  },
  {
    id: "angelpad",
    name: "AngelPad",
    type: "accelerator",
    location: "San Francisco, CA / New York, NY",
    founded: 2010,
    website: "https://angelpad.com",
    roundFocus: ["pre-seed", "seed"],
    checkSize: { min: 120_000, max: 180_000 },
    thesis: "Small, curated batches of enterprise and B2B founders. Quality over quantity with deep partner attention.",
    whatTheyLookFor: [
      "B2B and enterprise-focused startups",
      "Technical founders with domain expertise",
      "Clear revenue model from day one",
      "Small team that can execute",
      "Willingness to be in an intimate cohort (12-15 companies)",
    ],
    sectorFocus: ["enterprise", "B2B", "SaaS", "developer tools"],
    portfolioExamples: ["Postmates", "Mattermark", "Vungle", "Periscope Data"],
    accessPath: "Apply at angelpad.com. Highly selective — typically 1-2% acceptance rate.",
    fredNote: "AngelPad runs tiny batches, which means more hands-on attention. Great for B2B founders who want real mentorship, not just a logo on their deck. Thomas Korte (founder) personally works with each company.",
  },

  // ---------- Seed / Early-Stage Venture ----------
  {
    id: "first-round-capital",
    name: "First Round Capital",
    type: "venture",
    location: "San Francisco, CA / New York, NY",
    founded: 2004,
    website: "https://firstround.com",
    roundFocus: ["seed", "pre-seed"],
    checkSize: { min: 500_000, max: 3_000_000 },
    thesis: "Seed-stage company building. Invest at the earliest stages and provide operational support through the First Round community.",
    whatTheyLookFor: [
      "Exceptional founders with unfair insight into a problem",
      "Large market with potential for category creation",
      "Technical differentiation or unique go-to-market",
      "Founders who attract talent",
      "Repeat founders or deep domain experts",
    ],
    sectorFocus: ["enterprise", "fintech", "marketplace", "healthcare", "AI"],
    portfolioExamples: ["Uber", "Square", "Notion", "Roblox", "Warby Parker"],
    specialPrograms: ["First Round Review (knowledge platform)", "CTO Summits", "Founders community"],
    accessPath: "Warm intro strongly preferred. Apply via website for First Round Fast Track program.",
    fredNote: "First Round is the best seed fund in the country for a reason. They invest in people first — they want to see obsession with the problem. If you can get an intro, prioritize it. Their community of founders is genuinely valuable.",
  },
  {
    id: "floodgate",
    name: "Floodgate",
    type: "venture",
    location: "Menlo Park, CA",
    founded: 2006,
    website: "https://floodgate.com",
    roundFocus: ["pre-seed", "seed"],
    checkSize: { min: 250_000, max: 3_000_000 },
    thesis: "Thunder lizards — companies that create entirely new categories. Fund contrarian founders with breakthrough potential.",
    whatTheyLookFor: [
      "Contrarian thesis that could create a new category",
      "Founder-market fit: deep personal connection to the problem",
      "Potential for 100x+ returns (power law mindset)",
      "Strong technical or creative talent",
      "Willingness to be misunderstood initially",
    ],
    sectorFocus: ["consumer", "enterprise", "frontier tech", "AI"],
    portfolioExamples: ["Twitter", "Lyft", "Twitch", "Okta", "Demandbase"],
    accessPath: "Warm intro preferred. Small fund, very selective.",
    fredNote: "Floodgate is for founders who are building something genuinely new — not a better version of what exists. Ann Miura-Ko and Mike Maples think in terms of 'thunder lizards' that can dominate. If your pitch is 'like X but better,' they're probably not your match.",
  },
  {
    id: "initialized-capital",
    name: "Initialized Capital",
    type: "venture",
    location: "San Francisco, CA",
    founded: 2012,
    website: "https://initialized.com",
    roundFocus: ["pre-seed", "seed"],
    checkSize: { min: 500_000, max: 3_000_000 },
    thesis: "Back founders at the earliest stages with conviction. Focus on product-market fit potential over metrics.",
    whatTheyLookFor: [
      "Strong founder-market fit",
      "Original insight that others are missing",
      "Hustle and execution speed",
      "Potential for large outcome",
      "Technical ability to build v1 without a big team",
    ],
    sectorFocus: [],
    portfolioExamples: ["Coinbase", "Instacart", "Cruise", "Flexport"],
    accessPath: "Warm intro or YC Demo Day. Garry Tan (co-founder, now YC CEO) built strong network.",
    fredNote: "Initialized is one of the best early-stage funds. They were early believers in companies that everyone else passed on. If you're pre-revenue but have a compelling vision and can build, they listen.",
  },

  // ---------- Series A Venture ----------
  {
    id: "a16z",
    name: "Andreessen Horowitz (a16z)",
    type: "venture",
    location: "Menlo Park, CA",
    founded: 2009,
    website: "https://a16z.com",
    roundFocus: ["seed", "series-a", "series-b", "growth"],
    checkSize: { min: 1_000_000, max: 100_000_000 },
    thesis: "Software is eating the world. Back bold technical founders building category-defining companies with a full-stack platform approach to VC.",
    whatTheyLookFor: [
      "Technical founders with a bold vision",
      "Product-led growth or strong distribution insight",
      "Large market opportunity ($10B+)",
      "Network effects or strong moats",
      "Potential to be a generational company",
    ],
    sectorFocus: ["AI", "crypto/web3", "fintech", "enterprise", "bio/health", "games", "infrastructure"],
    portfolioExamples: ["Facebook", "GitHub", "Airbnb", "Coinbase", "Figma", "Databricks"],
    specialPrograms: ["a16z crypto", "a16z bio", "a16z games", "Portfolio talent network", "Marketing and comms support"],
    accessPath: "Warm intro from portfolio founder or through a16z partner network. They also respond to cold pitches that demonstrate deep expertise.",
    fredNote: "a16z is a platform, not just a check. They provide recruiting, marketing, regulatory help. But they move fast and expect you to as well. When they're interested, the process is weeks not months. Come prepared with clear metrics and a bold thesis.",
  },
  {
    id: "sequoia",
    name: "Sequoia Capital",
    type: "venture",
    location: "Menlo Park, CA",
    founded: 1972,
    website: "https://www.sequoiacap.com",
    roundFocus: ["seed", "series-a", "series-b", "growth"],
    checkSize: { min: 500_000, max: 200_000_000 },
    thesis: "Back daring founders who think beyond the conventional. Multi-stage fund from seed to growth. Invest in companies that matter.",
    whatTheyLookFor: [
      "Founders with clarity of purpose and deep conviction",
      "Non-obvious market insights",
      "Evidence of product-market fit or rapid iteration",
      "Capital-efficient growth trajectory",
      "Leaders who attract exceptional talent",
    ],
    sectorFocus: ["enterprise", "consumer", "fintech", "healthcare", "AI", "infrastructure"],
    portfolioExamples: ["Apple", "Google", "WhatsApp", "Stripe", "Unity", "Zoom", "Nubank"],
    specialPrograms: ["Sequoia Arc (pre-seed)", "Sequoia Scout program"],
    accessPath: "Warm intro strongly preferred. Sequoia Arc is their earliest-stage program with a more accessible application.",
    fredNote: "Sequoia is the most storied name in venture capital. They think in decades. If you're pitching them, have a clear answer to 'why now' and 'why will this be worth $10B+.' They're not looking for lifestyle businesses.",
  },
  {
    id: "benchmark",
    name: "Benchmark",
    type: "venture",
    location: "San Francisco, CA",
    founded: 1995,
    website: "https://www.benchmark.com",
    roundFocus: ["seed", "series-a"],
    checkSize: { min: 5_000_000, max: 15_000_000 },
    thesis: "Equal partnership fund — every partner leads deals. Focus on early-stage, one board seat per company, high conviction bets.",
    whatTheyLookFor: [
      "Exceptional founder with missionary zeal",
      "Product-led company with organic pull",
      "Network effects or platform dynamics",
      "Capital efficiency in early stages",
      "Potential to define or redefine a category",
    ],
    sectorFocus: ["marketplace", "enterprise", "consumer", "social"],
    portfolioExamples: ["eBay", "Twitter", "Uber", "Snapchat", "Discord", "Zillow"],
    accessPath: "Warm intro only. Very small team, very selective. They do ~5-7 deals per year.",
    fredNote: "Benchmark does fewer deals than almost anyone at their scale. If they invest, you get a true partner who will be in the trenches with you. But getting their attention requires a warm intro and a product that already has pull. Don't pitch Benchmark with a slide deck — show them a product people love.",
  },
  {
    id: "accel",
    name: "Accel",
    type: "venture",
    location: "Palo Alto, CA / London",
    founded: 1983,
    website: "https://www.accel.com",
    roundFocus: ["seed", "series-a", "series-b"],
    checkSize: { min: 500_000, max: 50_000_000 },
    thesis: "Pattern recognition from decades of investing. Focus on prepared-mind sectors where they have deep conviction before founders even pitch.",
    whatTheyLookFor: [
      "Founders building in sectors Accel already has conviction in",
      "Strong product traction and user engagement",
      "Clear path to dominant market position",
      "Data-driven approach to growth",
      "International expansion potential",
    ],
    sectorFocus: ["enterprise SaaS", "fintech", "security", "infrastructure", "consumer"],
    portfolioExamples: ["Facebook", "Spotify", "Slack", "Dropbox", "CrowdStrike", "UiPath"],
    accessPath: "Warm intro preferred. Active on social media and at conferences.",
    fredNote: "Accel does their homework before you even pitch. They have prepared-mind sectors — areas they've already decided to invest in. If you're in one of those sectors, you'll find them very receptive. If you're not, it's a harder sell.",
  },
  {
    id: "greylock",
    name: "Greylock Partners",
    type: "venture",
    location: "Menlo Park, CA",
    founded: 1965,
    website: "https://greylock.com",
    roundFocus: ["seed", "series-a", "series-b"],
    checkSize: { min: 1_000_000, max: 50_000_000 },
    thesis: "Product-first investors. Back founders building defining enterprise and consumer products with network effects.",
    whatTheyLookFor: [
      "Exceptional product sense in the founding team",
      "Network effects or systems of intelligence",
      "Enterprise or consumer products with viral/organic growth",
      "Founders who are product visionaries",
      "Markets where software creates step-function improvement",
    ],
    sectorFocus: ["enterprise", "consumer", "AI", "developer tools", "fintech"],
    portfolioExamples: ["LinkedIn", "Airbnb", "Facebook", "Discord", "Figma", "Roblox"],
    specialPrograms: ["Greylock-in-Residence (for founders exploring ideas)"],
    accessPath: "Warm intro preferred. Partners are active bloggers and speakers — engage with their content.",
    fredNote: "Greylock partners are some of the best product thinkers in venture. Reid Hoffman, Sarah Guo — they go deep on product and network dynamics. If you're a product-led founder, this is a natural fit. Come with a product story, not just a market story.",
  },
  {
    id: "nea",
    name: "New Enterprise Associates (NEA)",
    type: "venture",
    location: "Menlo Park, CA / Washington, DC",
    founded: 1977,
    website: "https://www.nea.com",
    roundFocus: ["seed", "series-a", "series-b", "growth"],
    checkSize: { min: 500_000, max: 200_000_000 },
    thesis: "Multi-stage, multi-sector fund investing across the full lifecycle. One of the largest and most active VC firms globally.",
    whatTheyLookFor: [
      "Strong teams in large markets",
      "Technology-driven businesses with scalable models",
      "Both healthcare and technology sectors",
      "Companies at any stage with clear path to scale",
      "Founders with domain expertise and execution ability",
    ],
    sectorFocus: ["enterprise", "healthcare", "consumer", "fintech", "infrastructure"],
    portfolioExamples: ["Cloudflare", "Robinhood", "Plaid", "Databricks", "Groupon"],
    accessPath: "Warm intro or cold outreach to sector-specific partners.",
    fredNote: "NEA is massive — one of the biggest funds in the world. That means they have capacity to write checks at every stage. Good if you need a partner who can follow on through Series C and beyond. Each partner runs their own deals, so find the right one for your sector.",
  },
  {
    id: "kleiner-perkins",
    name: "Kleiner Perkins",
    type: "venture",
    location: "Menlo Park, CA",
    founded: 1972,
    website: "https://www.kleinerperkins.com",
    roundFocus: ["seed", "series-a", "series-b"],
    checkSize: { min: 1_000_000, max: 25_000_000 },
    thesis: "Back founders solving real problems with technology. Renewed focus on early-stage after restructuring. Strong in climate, enterprise, and consumer.",
    whatTheyLookFor: [
      "Founders with technical depth and market insight",
      "Climate tech and sustainability solutions",
      "Enterprise software with clear ROI for customers",
      "Consumer products with organic growth",
      "Deep tech or hard tech with defensible moats",
    ],
    sectorFocus: ["climate", "enterprise", "consumer", "health", "fintech", "AI"],
    portfolioExamples: ["Amazon", "Google", "Twitter", "Figma", "Impossible Foods", "Rippling"],
    specialPrograms: ["KP Fellows (for students)"],
    accessPath: "Warm intro preferred. KP Fellows program for students building companies.",
    fredNote: "Kleiner Perkins has had a renaissance. They're back to their roots of early-stage, high-conviction investing. If you're in climate tech or sustainability, they're one of the most committed funds in the space.",
  },
  {
    id: "lightspeed",
    name: "Lightspeed Venture Partners",
    type: "venture",
    location: "Menlo Park, CA",
    founded: 2000,
    website: "https://lsvp.com",
    roundFocus: ["seed", "series-a", "series-b", "growth"],
    checkSize: { min: 500_000, max: 100_000_000 },
    thesis: "Multi-stage fund with global presence. Invest in enterprise, consumer, and health sectors with a data-driven approach.",
    whatTheyLookFor: [
      "Founders with differentiated market insight",
      "Products with strong product-market fit signals",
      "Enterprise SaaS with clear expansion revenue path",
      "Consumer apps with strong retention metrics",
      "Global scale potential",
    ],
    sectorFocus: ["enterprise", "consumer", "health", "fintech", "crypto"],
    portfolioExamples: ["Snap", "Affirm", "Mulesoft", "AppDynamics", "Navan"],
    accessPath: "Warm intro preferred. Active globally — India, Israel, Southeast Asia offices.",
    fredNote: "Lightspeed is one of the most active multi-stage firms globally. They can lead your seed round and your Series C. If you're thinking international expansion early, their global presence is genuinely useful.",
  },
  {
    id: "founders-fund",
    name: "Founders Fund",
    type: "venture",
    location: "San Francisco, CA",
    founded: 2005,
    website: "https://foundersfund.com",
    roundFocus: ["seed", "series-a", "series-b", "growth"],
    checkSize: { min: 500_000, max: 100_000_000 },
    thesis: "We wanted flying cars, instead we got 140 characters. Fund companies that create breakthrough technology, not incremental improvements.",
    whatTheyLookFor: [
      "Founders building transformative technology",
      "Deep tech with defensible IP",
      "Contrarian theses others dismiss",
      "Potential for 10x+ improvement over status quo",
      "Technical founders who can articulate the 'why now'",
    ],
    sectorFocus: ["AI", "aerospace", "defense", "biotech", "frontier tech", "fintech"],
    portfolioExamples: ["SpaceX", "Palantir", "Stripe", "Anduril", "Figma", "Spotify"],
    accessPath: "Warm intro from portfolio founder. They invest based on conviction, not consensus.",
    fredNote: "Founders Fund wants to fund the future, not a better version of the present. If you're building something that sounds crazy but could be transformative, they'll listen. If you're building 'Uber for X,' probably not your fund.",
  },
  {
    id: "general-catalyst",
    name: "General Catalyst",
    type: "venture",
    location: "Cambridge, MA / San Francisco, CA",
    founded: 2000,
    website: "https://www.generalcatalyst.com",
    roundFocus: ["seed", "series-a", "series-b", "growth"],
    checkSize: { min: 500_000, max: 100_000_000 },
    thesis: "Responsible innovation — build enduring companies that create value for stakeholders. Multi-stage fund focused on transformative ventures.",
    whatTheyLookFor: [
      "Mission-driven founders with enduring company vision",
      "Strong product-market fit or rapid path to it",
      "Companies building responsible technology",
      "Clear unit economics or a credible path",
      "Potential to transform industries",
    ],
    sectorFocus: ["enterprise", "health", "fintech", "climate", "AI", "consumer"],
    portfolioExamples: ["Stripe", "Airbnb", "Snap", "HubSpot", "Livongo", "Anduril"],
    accessPath: "Warm intro preferred. Active at industry events and through portfolio network.",
    fredNote: "General Catalyst is one of the most thoughtful multi-stage firms. They think about 'responsible innovation' — which means they care about long-term sustainability of the business, not just growth at all costs. Good fit if your business model aligns incentives.",
  },
  {
    id: "index-ventures",
    name: "Index Ventures",
    type: "venture",
    location: "San Francisco, CA / London",
    founded: 1996,
    website: "https://www.indexventures.com",
    roundFocus: ["seed", "series-a", "series-b", "growth"],
    checkSize: { min: 1_000_000, max: 100_000_000 },
    thesis: "Back bold entrepreneurs building transformative companies. Strong European and US presence with deep marketplace and fintech expertise.",
    whatTheyLookFor: [
      "Product visionaries with global ambition",
      "Marketplace dynamics and network effects",
      "Fintech and financial infrastructure",
      "Developer tools and enterprise software",
      "Both European and US market founders",
    ],
    sectorFocus: ["marketplace", "fintech", "enterprise", "gaming", "security"],
    portfolioExamples: ["Figma", "Discord", "Plaid", "Revolut", "Roblox", "Datadog"],
    accessPath: "Warm intro or apply through their website. Strong European network.",
    fredNote: "Index is the bridge between Silicon Valley and Europe. If you're a European founder looking to scale to the US, or vice versa, they have genuine expertise in cross-Atlantic company building.",
  },

  // ---------- Angel Groups / Syndicates ----------
  {
    id: "sv-angel",
    name: "SV Angel",
    type: "angel-group",
    location: "San Francisco, CA",
    founded: 2009,
    website: "https://svangel.com",
    roundFocus: ["pre-seed", "seed"],
    checkSize: { min: 100_000, max: 500_000 },
    thesis: "Invest in the best founders at the earliest stages. High volume, founder-friendly terms, strong network effects from portfolio.",
    whatTheyLookFor: [
      "Exceptional founders with technical talent",
      "Early stage — often pre-product",
      "Strong referrals from existing portfolio",
      "Founder-market fit and obsession",
      "Potential to attract follow-on from top firms",
    ],
    sectorFocus: [],
    portfolioExamples: ["Airbnb", "Pinterest", "Stripe", "Square", "Snap"],
    accessPath: "Warm intro from portfolio founder. Very referral-driven.",
    fredNote: "SV Angel is one of the most prolific early-stage investors in Silicon Valley. They're great as an anchor angel — having them on your cap table signals quality to later investors. But it's heavily referral-based.",
  },
  {
    id: "angel-list",
    name: "AngelList",
    type: "angel-group",
    location: "San Francisco, CA (online)",
    founded: 2010,
    website: "https://www.angellist.com",
    roundFocus: ["pre-seed", "seed", "series-a"],
    checkSize: { min: 25_000, max: 5_000_000 },
    thesis: "Platform for syndicates and rolling funds. Democratize access to startup investing. Founders raise from multiple angels efficiently.",
    whatTheyLookFor: [
      "Strong pitch and clear traction metrics",
      "Founders who can rally individual angel support",
      "Companies that resonate with specific syndicate leads",
      "Clear terms and structure",
      "Any sector — depends on syndicate lead interests",
    ],
    sectorFocus: [],
    portfolioExamples: ["Uber", "AngelList (itself)", "Various via syndicates"],
    specialPrograms: ["Rolling Funds", "Syndicates", "AngelList Stack (for startups)"],
    accessPath: "Create a raise on angellist.com. Connect with syndicate leads who match your sector.",
    fredNote: "AngelList isn't one investor — it's a platform. The key is finding the right syndicate leads who have credibility in your space. A well-known syndicate lead backing you can bring 50+ angels in a single round. Great for filling out a round alongside institutional capital.",
  },

  // ---------- Corporate VC ----------
  {
    id: "google-ventures",
    name: "GV (Google Ventures)",
    type: "corporate-vc",
    location: "Mountain View, CA",
    founded: 2009,
    website: "https://www.gv.com",
    roundFocus: ["seed", "series-a", "series-b", "growth"],
    checkSize: { min: 500_000, max: 50_000_000 },
    thesis: "Invest across the full lifecycle in companies that push the boundaries of technology. Independent decision-making backed by Google's resources.",
    whatTheyLookFor: [
      "Technical excellence and innovation",
      "Companies leveraging AI/ML in novel ways",
      "Healthcare and life sciences breakthroughs",
      "Enterprise software with clear differentiation",
      "Founders who can attract world-class engineering talent",
    ],
    sectorFocus: ["AI", "healthcare", "enterprise", "consumer", "robotics", "cybersecurity"],
    portfolioExamples: ["Uber", "Slack", "Stripe", "Medium", "GitLab", "Flatiron Health"],
    accessPath: "Warm intro or website submission. Independent from Google Alphabet — separate decision-making.",
    fredNote: "GV operates independently from Google, but the halo effect is real. Having GV on your cap table tells the market you're technically credible. They also run design sprints for portfolio companies — genuinely useful for product development.",
  },
  {
    id: "microsoft-m12",
    name: "M12 (Microsoft Ventures)",
    type: "corporate-vc",
    location: "San Francisco, CA / Seattle, WA",
    founded: 2016,
    website: "https://m12.vc",
    roundFocus: ["series-a", "series-b"],
    checkSize: { min: 2_000_000, max: 20_000_000 },
    thesis: "Invest in enterprise software companies that complement the Microsoft ecosystem. Strategic value creation through Microsoft partnership.",
    whatTheyLookFor: [
      "Enterprise SaaS that integrates with or complements Microsoft products",
      "AI and cloud-native applications",
      "B2B companies with clear enterprise go-to-market",
      "Products that Microsoft customers would adopt",
      "Strong technical architecture and security posture",
    ],
    sectorFocus: ["enterprise SaaS", "AI", "cloud infrastructure", "security", "developer tools"],
    portfolioExamples: ["Cohere", "Fungible", "Humio", "Grab"],
    specialPrograms: ["Microsoft for Startups program access", "Azure credits", "Go-to-market support via Microsoft sales"],
    accessPath: "Apply via m12.vc. Microsoft for Startups can be an on-ramp.",
    fredNote: "M12 is strategic — they invest where Microsoft sees ecosystem value. If your product naturally integrates with Teams, Azure, or Office, this is a strong strategic partner. But understand that taking corporate VC money signals alignment with that ecosystem.",
  },

  // ---------- Growth Equity ----------
  {
    id: "insight-partners",
    name: "Insight Partners",
    type: "growth-equity",
    location: "New York, NY",
    founded: 1995,
    website: "https://www.insightpartners.com",
    roundFocus: ["series-b", "series-c", "growth"],
    checkSize: { min: 10_000_000, max: 200_000_000 },
    thesis: "ScaleUp investing — help software companies scale from $10M to $100M+ ARR with operational expertise.",
    whatTheyLookFor: [
      "Software companies with $5M+ ARR",
      "Proven product-market fit with strong retention",
      "Clear path to $100M+ ARR",
      "Efficient growth metrics (magic number, NDR, payback)",
      "Market leadership position or clear path to it",
    ],
    sectorFocus: ["enterprise SaaS", "infrastructure", "data", "security", "fintech"],
    portfolioExamples: ["Shopify", "Twitter", "DocuSign", "Monday.com", "Wiz", "Qualtrics"],
    specialPrograms: ["Insight Onsite team for operational support", "ScaleUp playbooks"],
    accessPath: "Warm intro or outbound from Insight team. They actively source deals.",
    fredNote: "Insight is the fund you want when you've found product-market fit and need to scale. Their Onsite team has playbooks for everything from pricing to international expansion. But they invest at $5M+ ARR — you need real traction, not a story.",
  },
  {
    id: "tiger-global",
    name: "Tiger Global Management",
    type: "growth-equity",
    location: "New York, NY",
    founded: 2001,
    website: "https://www.tigerglobal.com",
    roundFocus: ["series-a", "series-b", "series-c", "growth"],
    checkSize: { min: 5_000_000, max: 500_000_000 },
    thesis: "High-velocity investing in global internet and technology companies. Move fast, write big checks, and stay hands-off.",
    whatTheyLookFor: [
      "High-growth software companies with strong metrics",
      "Companies growing 3x+ year-over-year",
      "Global market opportunities",
      "Strong unit economics or clear path",
      "Companies that need capital to accelerate, not to survive",
    ],
    sectorFocus: ["enterprise SaaS", "fintech", "consumer internet", "edtech", "e-commerce"],
    portfolioExamples: ["Stripe", "Databricks", "Toast", "Brex", "Checkout.com"],
    accessPath: "They often reach out proactively. Data-driven sourcing.",
    fredNote: "Tiger moves faster than any other growth fund. They can go from first meeting to term sheet in a week. The tradeoff: they're hands-off. You get capital and a brand name, but not the operational support you'd get from Insight or a16z.",
  },

  // ---------- Sector-Specific ----------
  {
    id: "union-square-ventures",
    name: "Union Square Ventures",
    type: "venture",
    location: "New York, NY",
    founded: 2003,
    website: "https://www.usv.com",
    roundFocus: ["seed", "series-a"],
    checkSize: { min: 1_000_000, max: 25_000_000 },
    thesis: "Invest in networks, platforms, and protocols that broaden access to knowledge, capital, and well-being.",
    whatTheyLookFor: [
      "Network effects and platform dynamics",
      "Companies that broaden access (education, health, finance)",
      "Protocol-level innovation (crypto, open source)",
      "Strong community-driven growth",
      "Founders who think about societal impact",
    ],
    sectorFocus: ["marketplace", "crypto", "education", "health", "climate"],
    portfolioExamples: ["Twitter", "Tumblr", "Etsy", "Coinbase", "Duolingo", "MongoDB"],
    accessPath: "Blog and newsletter are the front door. Warm intros through portfolio network.",
    fredNote: "USV thinks about networks and access. Fred Wilson (co-founder) blogs daily and is one of the most transparent VCs in the industry. If your company creates network effects that broaden access to something important, USV is a natural fit.",
  },
  {
    id: "khosla-ventures",
    name: "Khosla Ventures",
    type: "venture",
    location: "Menlo Park, CA",
    founded: 2004,
    website: "https://www.khoslaventures.com",
    roundFocus: ["seed", "series-a", "series-b"],
    checkSize: { min: 500_000, max: 50_000_000 },
    thesis: "Invest in impactful technology — especially climate, health, and AI. Willing to fund moonshots with long time horizons.",
    whatTheyLookFor: [
      "Deep technology with potential for massive impact",
      "Climate tech and clean energy solutions",
      "AI/ML applied to real-world problems",
      "Healthcare innovation (diagnostics, therapeutics, delivery)",
      "Technical founders with PhD-level depth",
    ],
    sectorFocus: ["climate", "AI", "health", "food", "robotics", "frontier tech"],
    portfolioExamples: ["OpenAI", "DoorDash", "Impossible Foods", "Square", "Affirm"],
    specialPrograms: ["Khosla Seed fund for earliest stages"],
    accessPath: "Apply via website. Khosla is accessible to first-time founders with bold ideas.",
    fredNote: "Vinod Khosla is one of the original Sun Microsystems founders and thinks bigger than most VCs. If you're building climate tech, hard tech, or AI with real-world impact, Khosla is one of the few funds willing to take true moonshot bets. They're comfortable with long time horizons.",
  },
  {
    id: "bessemer",
    name: "Bessemer Venture Partners",
    type: "venture",
    location: "San Francisco, CA / New York, NY",
    founded: 1911,
    website: "https://www.bvp.com",
    roundFocus: ["seed", "series-a", "series-b", "growth"],
    checkSize: { min: 500_000, max: 100_000_000 },
    thesis: "The oldest VC firm in the US with a modern cloud and SaaS focus. Known for the Bessemer Cloud Index and deep enterprise expertise.",
    whatTheyLookFor: [
      "Cloud-native SaaS companies with strong ARR growth",
      "Companies with net dollar retention above 120%",
      "Healthcare IT and vertical SaaS",
      "Developer-led and product-led growth motions",
      "Founders with clear metrics and efficient go-to-market",
    ],
    sectorFocus: ["cloud/SaaS", "healthcare IT", "developer tools", "security", "vertical SaaS"],
    portfolioExamples: ["Shopify", "Twilio", "Pinterest", "LinkedIn", "Wix", "Toast"],
    specialPrograms: ["Bessemer Cloud Index", "BVP Anti-Portfolio (famous public list of passes)"],
    accessPath: "Warm intro preferred. BVP roadmaps (public research) show where they're investing — reference these in your pitch.",
    fredNote: "Bessemer literally publishes their investment thesis as roadmaps. Read the BVP Cloud Atlas and their sector roadmaps before you pitch. If your company fits one of their active roadmaps, you're already aligned. They respect founders who've done their homework.",
  },
];

// ============================================================================
// Lookup Helpers
// ============================================================================

/** Get a firm by its slug ID */
export function getFirmById(id: string): InvestorFirm | undefined {
  return INVESTOR_FIRMS.find((f) => f.id === id);
}

/** Get all firms that invest at a given round */
export function getFirmsByRound(round: RoundFocus): InvestorFirm[] {
  return INVESTOR_FIRMS.filter((f) => f.roundFocus.includes(round));
}

/** Get all firms of a specific type */
export function getFirmsByType(type: InvestorType): InvestorFirm[] {
  return INVESTOR_FIRMS.filter((f) => f.type === type);
}

/** Get all firms that focus on a given sector (fuzzy match) */
export function getFirmsBySector(sector: string): InvestorFirm[] {
  const lower = sector.toLowerCase();
  return INVESTOR_FIRMS.filter((f) => {
    if (f.sectorFocus.length === 0) return true; // Generalist firms match all sectors
    return f.sectorFocus.some((s) =>
      s.toLowerCase().includes(lower) || lower.includes(s.toLowerCase())
    );
  });
}
