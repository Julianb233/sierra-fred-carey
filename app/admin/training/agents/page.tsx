import { FRED_BIO } from "@/lib/fred-brain";

const agents = [
  {
    name: "Founder Ops",
    purpose: "Operational execution for startup founders",
    tools: [
      { name: "draftEmail", description: "Professional emails tailored to recipient and context" },
      { name: "createTask", description: "Prioritized tasks with deadlines and clear ownership" },
      { name: "scheduleMeeting", description: "Meeting agendas, key questions, expected outcomes" },
      { name: "weeklyPriorities", description: "Top 3-5 priorities based on founder's stage and goals" },
    ],
    principles: [
      "Be actionable and specific. No vague advice.",
      "Every output should be immediately usable.",
      "Prioritize ruthlessly -- founders have limited bandwidth.",
      "Frame operational work in terms of business outcomes.",
      "Keep outputs concise. Founders don't read essays.",
    ],
    examplePrompt: "Draft an email to my lead investor updating them on Q1 progress.",
    exampleResponse:
      "Subject: Q1 Update -- [Company] hitting key milestones\n\nHi [Investor],\n\nQuick update on Q1. Three things you should know:\n1. Revenue up 40% QoQ\n2. Closed 3 enterprise pilots\n3. Hired VP Engineering from [Notable Company]\n\nBiggest challenge: Sales cycle length. Working on it with a new demo flow.\n\nHappy to jump on a call if you want details.\n\nBest,\n[Founder]",
  },
  {
    name: "Fundraising",
    purpose: "Fundraising strategy and execution",
    tools: [
      { name: "investorResearch", description: "Identify investors by stage, sector, check size, and thesis fit" },
      { name: "outreachDraft", description: "Cold and warm outreach emails that get responses" },
      { name: "pipelineAnalysis", description: "Track and prioritize investor conversations" },
      { name: "meetingPrep", description: "Talking points, anticipated questions, key metrics" },
    ],
    principles: [
      "Fundraising is a sales process. Treat it like one.",
      "Warm intros beat cold outreach 10:1. Always suggest intro paths first.",
      "Every outreach should demonstrate founder-market fit in the first 2 sentences.",
      "Investors pattern-match. Help founders fit the right pattern while staying authentic.",
      "Know your numbers cold: ARR, MRR growth, burn rate, runway, CAC, LTV.",
      "Time kills deals. Create urgency without desperation.",
    ],
    examplePrompt: "Help me prepare for a meeting with a Series A investor.",
    exampleResponse:
      "Here's your prep checklist:\n\n1. Lead with traction: $X MRR, Y% month-over-month growth, Z customers\n2. Know their portfolio -- they invested in [Company A] and [Company B], so connect your narrative to that thesis\n3. Anticipate the hard questions: Why now? Why you? What happens if [competitor] copies this?\n4. Have your ask ready: $X at $Y valuation, 18-month runway to [milestone]\n5. Close with timeline: 'We're targeting close in 4 weeks with $X committed'\n\nDon't be defensive. If they poke holes, agree where they're right and show how you're addressing it.",
  },
  {
    name: "Growth",
    purpose: "Growth strategy, experimentation, and user acquisition",
    tools: [
      { name: "channelAnalysis", description: "Evaluate acquisition channels by ROI" },
      { name: "experimentDesign", description: "Testable hypotheses with clear success metrics" },
      { name: "funnelAnalysis", description: "Identify conversion bottlenecks and optimization opportunities" },
      { name: "contentStrategy", description: "Growth-oriented content planning tied to acquisition" },
    ],
    principles: [
      "Growth without measurement is just spending money. Every experiment needs a metric.",
      "Start with the channel that requires the least capital and most learning.",
      "Retention beats acquisition. Fix your bucket before filling it.",
      "First 100 customers should come from unscalable channels. Scale channels come later.",
      "A/B tests need statistical significance. Don't call winners early.",
      "The best growth strategy is a product people tell friends about.",
    ],
    examplePrompt: "We're getting sign-ups but activation is low. What should we do?",
    exampleResponse:
      "Low activation with decent sign-ups means your promise is right but your delivery isn't matching. Here's what I'd do:\n\n1. Map the activation funnel: Sign-up -> First value moment. Where's the biggest drop?\n2. Talk to churned users (yes, actually call them). Ask what they expected vs. what they got.\n3. Reduce time-to-value. If your 'aha moment' takes 10 steps, cut it to 3.\n4. Set up a 7-day email sequence that guides new users to the core action.\n5. Instrument everything -- you can't fix what you don't measure.\n\nRetention beats acquisition. Fix this before spending another dollar on ads.",
  },
];

export default function AgentsPage() {
  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Agent Behavior
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          How each virtual agent operates, what tools they have, and how they
          respond. All agents channel Fred Cary&apos;s{" "}
          {FRED_BIO.yearsExperience}+ years of experience.
        </p>
      </div>

      {/* Comparison Table */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-800 pb-2">
          Agent Overview
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-800">
                <th className="text-left py-2 pr-4 font-semibold text-gray-900 dark:text-white">
                  Agent
                </th>
                <th className="text-left py-2 pr-4 font-semibold text-gray-900 dark:text-white">
                  Purpose
                </th>
                <th className="text-left py-2 pr-4 font-semibold text-gray-900 dark:text-white">
                  Tools
                </th>
                <th className="text-left py-2 font-semibold text-gray-900 dark:text-white">
                  Key Trait
                </th>
              </tr>
            </thead>
            <tbody>
              {agents.map((agent) => (
                <tr
                  key={agent.name}
                  className="border-b border-gray-100 dark:border-gray-800/50"
                >
                  <td className="py-2 pr-4 font-medium text-[#ff6a1a]">
                    {agent.name}
                  </td>
                  <td className="py-2 pr-4 text-gray-600 dark:text-gray-400">
                    {agent.purpose}
                  </td>
                  <td className="py-2 pr-4 text-gray-600 dark:text-gray-400">
                    {agent.tools.length} tools
                  </td>
                  <td className="py-2 text-gray-600 dark:text-gray-400">
                    {agent.principles[0]}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Individual Agent Sections */}
      {agents.map((agent) => (
        <section key={agent.name} className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-800 pb-2">
            {agent.name} Agent
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            <strong>Purpose:</strong> {agent.purpose}
          </p>

          {/* Tools */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
              Tools ({agent.tools.length})
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {agent.tools.map((tool) => (
                <div
                  key={tool.name}
                  className="p-3 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950"
                >
                  <code className="text-xs font-mono text-[#ff6a1a]">
                    {tool.name}
                  </code>
                  <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
                    {tool.description}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Operating Principles */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
              Operating Principles
            </h3>
            <ul className="space-y-1">
              {agent.principles.map((principle, i) => (
                <li
                  key={i}
                  className="flex items-start gap-3 text-sm text-gray-700 dark:text-gray-300"
                >
                  <span className="mt-1 w-1.5 h-1.5 rounded-full bg-[#ff6a1a] shrink-0" />
                  {principle}
                </li>
              ))}
            </ul>
          </div>

          {/* Example Interaction */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
              Example Interaction
            </h3>
            <div className="space-y-2">
              <div className="p-3 rounded-lg bg-gray-100 dark:bg-gray-800/50 text-sm">
                <span className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                  Founder asks:
                </span>
                <p className="text-gray-700 dark:text-gray-300 italic">
                  &ldquo;{agent.examplePrompt}&rdquo;
                </p>
              </div>
              <div className="p-3 rounded-lg bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-900/40 text-sm">
                <span className="block text-xs font-medium text-[#ff6a1a] mb-1">
                  {agent.name} Agent responds:
                </span>
                <pre className="whitespace-pre-wrap text-gray-900 dark:text-white text-xs font-mono leading-relaxed">
                  {agent.exampleResponse}
                </pre>
              </div>
            </div>
          </div>
        </section>
      ))}

      {/* Common Behavior */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-800 pb-2">
          Common Behavior (All Agents)
        </h2>
        <div className="p-4 rounded-lg bg-gray-100 dark:bg-gray-800/50 text-sm text-gray-700 dark:text-gray-300 space-y-2">
          <p>
            All agents use the{" "}
            <code className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-xs">
              FRED_AGENT_VOICE
            </code>{" "}
            preamble to establish Fred&apos;s communication style before their
            domain-specific instructions.
          </p>
          <p>
            Structured output is generated via{" "}
            <code className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-xs">
              generateStructuredReliable()
            </code>{" "}
            which ensures consistent, parseable responses.
          </p>
          <p>
            Domain-specific system prompts are layered on top of Fred&apos;s
            voice, so each agent sounds like Fred but with specialized expertise
            in their area.
          </p>
        </div>
      </section>
    </div>
  );
}
