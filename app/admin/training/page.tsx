import Link from "next/link";

const sections = [
  {
    title: "Communication Style",
    description:
      "How Fred speaks -- tone, language rules, do's and don'ts",
    href: "/admin/training/communication",
    icon: "💬",
  },
  {
    title: "Frameworks",
    description:
      "The analytical frameworks FRED applies -- 9-Step Process, Positioning, Investor Lens, Reality Lens",
    href: "/admin/training/frameworks",
    icon: "📐",
  },
  {
    title: "Agent Behavior",
    description:
      "How each virtual agent (Founder Ops, Fundraising, Growth) responds to tasks",
    href: "/admin/training/agents",
    icon: "🤖",
  },
  {
    title: "Identity & Background",
    description:
      "Fred Cary's biography, companies, philosophy, and media presence",
    href: "/admin/training/identity",
    icon: "👤",
  },
];

export default function TrainingOverviewPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          FRED Training Documentation
        </h1>
        <p className="mt-3 text-gray-600 dark:text-gray-400 leading-relaxed">
          This section documents how FRED -- the AI engine powering Sahara --
          communicates, what frameworks it uses, and how it behaves across
          different interaction points. Use this as a reference when reviewing or
          modifying FRED&apos;s behavior.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {sections.map((section) => (
          <Link
            key={section.href}
            href={section.href}
            className="group block p-5 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 hover:border-[#ff6a1a] hover:shadow-md transition-all"
          >
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-xl" role="img" aria-hidden="true">
                    {section.icon}
                  </span>
                  <h3 className="text-base font-semibold text-gray-900 dark:text-white group-hover:text-[#ff6a1a] transition-colors">
                    {section.title}
                  </h3>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {section.description}
                </p>
              </div>
              <span className="text-gray-400 group-hover:text-[#ff6a1a] transition-colors mt-1">
                &rarr;
              </span>
            </div>
          </Link>
        ))}
      </div>

      <div className="p-4 rounded-lg bg-gray-100 dark:bg-gray-800/50 text-sm text-gray-600 dark:text-gray-400">
        <strong className="text-gray-900 dark:text-white">Note:</strong> All
        voice data is sourced from{" "}
        <code className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-xs">
          lib/fred-brain.ts
        </code>
        . Changes to that file will be reflected in FRED&apos;s actual behavior.
      </div>
    </div>
  );
}
