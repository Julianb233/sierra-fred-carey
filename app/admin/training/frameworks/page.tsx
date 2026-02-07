const nineSteps = [
  {
    step: 1,
    name: "Idea Validation",
    description:
      "Test the core idea against real market demand. Does the problem exist? Are people willing to pay for a solution?",
  },
  {
    step: 2,
    name: "Market Research",
    description:
      "Deep-dive into market size, growth trends, competitive landscape, and customer segments. Know your TAM, SAM, and SOM.",
  },
  {
    step: 3,
    name: "Business Model",
    description:
      "Define how the company makes money. Revenue streams, pricing strategy, unit economics, and path to profitability.",
  },
  {
    step: 4,
    name: "MVP / Prototype",
    description:
      "Build the smallest viable version that proves the concept. Ship fast, learn faster. Perfect is the enemy of launched.",
  },
  {
    step: 5,
    name: "Customer Acquisition",
    description:
      "Find and convert your first customers. Start with unscalable channels, validate messaging, and nail the value prop.",
  },
  {
    step: 6,
    name: "Funding Strategy",
    description:
      "Determine if, when, and how to raise capital. Bootstrap vs. fundraise. Investor fit, pitch preparation, and deal structure.",
  },
  {
    step: 7,
    name: "Team Building",
    description:
      "Hire the right people at the right time. Culture, roles, equity allocation, and building a team that can scale.",
  },
  {
    step: 8,
    name: "Growth & Scaling",
    description:
      "Move from traction to scale. Systems, processes, channel optimization, and the transition from founder-led to team-led growth.",
  },
  {
    step: 9,
    name: "Exit Strategy",
    description:
      "Plan the endgame from day one. Acquisition, IPO, or lifestyle business. Maximize value and optionality.",
  },
];

const positioningFactors = [
  {
    name: "Market Position",
    description:
      "Where the startup sits within its competitive landscape -- leader, challenger, niche, or new entrant.",
  },
  {
    name: "Competitive Advantage",
    description:
      "The defensible moat -- technology, network effects, brand, cost structure, or proprietary data.",
  },
  {
    name: "Value Proposition",
    description:
      "The specific promise to the target customer -- what they get and why it matters to them.",
  },
  {
    name: "Target Audience",
    description:
      "The precise customer segment being served -- demographics, psychographics, pain points, buying behavior.",
  },
  {
    name: "Differentiation",
    description:
      "What makes this startup meaningfully different from alternatives -- not just better, but different.",
  },
];

const investorLensCategories = [
  { name: "Team", weight: "25%", description: "Founder expertise, domain knowledge, execution track record, and team completeness." },
  { name: "Market", weight: "20%", description: "Market size, growth rate, timing, and macro tailwinds." },
  { name: "Product", weight: "20%", description: "Product-market fit signals, technology moat, and user experience." },
  { name: "Traction", weight: "15%", description: "Revenue, user growth, engagement metrics, and retention." },
  { name: "Financials", weight: "10%", description: "Unit economics, burn rate, runway, and path to profitability." },
  { name: "Strategy", weight: "10%", description: "Go-to-market plan, competitive positioning, and scaling roadmap." },
];

const realityLensDimensions = [
  {
    name: "Market Reality",
    description:
      "Is the market as large and accessible as the founder believes? Are the assumptions based on data or hope?",
  },
  {
    name: "Competitive Reality",
    description:
      "Who are the real competitors -- including indirect and future ones? How defensible is the position?",
  },
  {
    name: "Execution Reality",
    description:
      "Does the team have the skills and resources to actually build and ship this? What are the blind spots?",
  },
  {
    name: "Financial Reality",
    description:
      "Are the financial projections grounded? What does the honest path to revenue look like?",
  },
  {
    name: "Founder Reality",
    description:
      "Is the founder being honest with themselves about their strengths, weaknesses, and motivations?",
  },
];

export default function FrameworksPage() {
  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Framework Reference
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          The analytical frameworks FRED applies when evaluating startups,
          coaching founders, and scoring opportunities.
        </p>
      </div>

      {/* 9-Step Startup Process */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-800 pb-2">
          9-Step Startup Process
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Fred&apos;s structured coaching methodology. Each step must be
          addressed before progressing, though iteration is expected.
        </p>
        <div className="space-y-3">
          {nineSteps.map((step) => (
            <div
              key={step.step}
              className="flex gap-4 p-4 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950"
            >
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-[#ff6a1a] text-white text-sm font-bold shrink-0">
                {step.step}
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                  {step.name}
                </h3>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Positioning Framework */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-800 pb-2">
          Positioning Framework
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          5-factor analysis used to evaluate and refine a startup&apos;s market
          positioning.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {positioningFactors.map((factor) => (
            <div
              key={factor.name}
              className="p-4 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950"
            >
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                {factor.name}
              </h3>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                {factor.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Investor Lens */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-800 pb-2">
          Investor Lens (Investor Readiness Score)
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          6-category weighted scoring system that evaluates how investor-ready a
          startup is. Total score sums to 100%.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-800">
                <th className="text-left py-2 pr-4 font-semibold text-gray-900 dark:text-white">
                  Category
                </th>
                <th className="text-left py-2 pr-4 font-semibold text-gray-900 dark:text-white">
                  Weight
                </th>
                <th className="text-left py-2 font-semibold text-gray-900 dark:text-white">
                  Evaluates
                </th>
              </tr>
            </thead>
            <tbody>
              {investorLensCategories.map((cat) => (
                <tr
                  key={cat.name}
                  className="border-b border-gray-100 dark:border-gray-800/50"
                >
                  <td className="py-2 pr-4 font-medium text-gray-900 dark:text-white">
                    {cat.name}
                  </td>
                  <td className="py-2 pr-4 text-[#ff6a1a] font-semibold">
                    {cat.weight}
                  </td>
                  <td className="py-2 text-gray-600 dark:text-gray-400">
                    {cat.description}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Reality Lens */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-800 pb-2">
          Reality Lens
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          5-dimension honest assessment framework. Fred&apos;s approach to
          cutting through founder optimism and surfacing the truth.
        </p>
        <div className="space-y-3">
          {realityLensDimensions.map((dim) => (
            <div
              key={dim.name}
              className="p-4 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950"
            >
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                {dim.name}
              </h3>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                {dim.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Scoring Philosophy */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-800 pb-2">
          Scoring Philosophy
        </h2>
        <div className="p-4 rounded-lg bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-900/40 space-y-3 text-sm text-gray-700 dark:text-gray-300">
          <p>
            <strong className="text-gray-900 dark:text-white">
              Calibration:
            </strong>{" "}
            Most ideas should cluster around 40-60. A score of 50 means
            &ldquo;average opportunity with typical startup challenges.&rdquo;
          </p>
          <p>
            <strong className="text-gray-900 dark:text-white">
              High scores:
            </strong>{" "}
            Reserve scores above 80 for truly exceptional factors -- strong
            evidence of product-market fit, proven team with domain expertise, or
            clear defensible moat.
          </p>
          <p>
            <strong className="text-gray-900 dark:text-white">
              Low scores:
            </strong>{" "}
            Scores below 30 indicate fundamental concerns -- no evidence of
            demand, unclear business model, or missing critical capabilities.
          </p>
          <p>
            <strong className="text-gray-900 dark:text-white">
              Honesty over encouragement:
            </strong>{" "}
            Fred&apos;s approach is to tell founders the truth. A generous score
            that doesn&apos;t reflect reality helps no one.
          </p>
        </div>
      </section>
    </div>
  );
}
