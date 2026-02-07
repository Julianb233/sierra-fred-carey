import {
  FRED_COMMUNICATION_STYLE,
} from "@/lib/fred-brain";

const beforeAfterExamples = [
  {
    generic: "Based on the analysis, I recommend...",
    fred: "Here's my take, based on what I've seen...",
  },
  {
    generic:
      "This is a balanced decision that requires further evaluation",
    fred: "This one's a toss-up. I've seen similar decisions go both ways.",
  },
  {
    generic: "I'd advise caution here",
    fred: "I'm going to be honest with you -- I have concerns here.",
  },
];

export default function CommunicationPage() {
  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Communication Style
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          How FRED communicates -- tone, language, and behavioral guidelines
          sourced from{" "}
          <code className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-xs">
            lib/fred-brain.ts
          </code>
          .
        </p>
      </div>

      {/* Voice & Tone */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-800 pb-2">
          Voice &amp; Tone
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Primary
            </span>
            <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-white">
              {FRED_COMMUNICATION_STYLE.voice.primary}
            </p>
          </div>
          <div className="p-4 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Secondary
            </span>
            <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-white">
              {FRED_COMMUNICATION_STYLE.voice.secondary}
            </p>
          </div>
          <div className="p-4 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Tone
            </span>
            <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-white">
              {FRED_COMMUNICATION_STYLE.voice.tone}
            </p>
          </div>
        </div>
      </section>

      {/* Characteristics */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-800 pb-2">
          Characteristics
        </h2>
        <ul className="space-y-2">
          {FRED_COMMUNICATION_STYLE.characteristics.map((trait, i) => (
            <li
              key={i}
              className="flex items-start gap-3 text-sm text-gray-700 dark:text-gray-300"
            >
              <span className="mt-1 w-1.5 h-1.5 rounded-full bg-[#ff6a1a] shrink-0" />
              {trait}
            </li>
          ))}
        </ul>
      </section>

      {/* What Fred Never Does */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-800 pb-2">
          What Fred Never Does
        </h2>
        <div className="p-4 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40">
          <ul className="space-y-2">
            {FRED_COMMUNICATION_STYLE.doNot.map((rule, i) => (
              <li
                key={i}
                className="flex items-start gap-3 text-sm text-red-800 dark:text-red-300"
              >
                <span className="mt-0.5 shrink-0">&#x2717;</span>
                {rule}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Before / After Examples */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-800 pb-2">
          Examples: Generic vs. Fred
        </h2>
        <div className="space-y-4">
          {beforeAfterExamples.map((ex, i) => (
            <div
              key={i}
              className="grid grid-cols-1 sm:grid-cols-2 gap-3"
            >
              <div className="p-3 rounded-lg bg-gray-100 dark:bg-gray-800/50 text-sm">
                <span className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                  Generic
                </span>
                <p className="text-gray-600 dark:text-gray-400 italic">
                  &ldquo;{ex.generic}&rdquo;
                </p>
              </div>
              <div className="p-3 rounded-lg bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-900/40 text-sm">
                <span className="block text-xs font-medium text-[#ff6a1a] mb-1">
                  Fred
                </span>
                <p className="text-gray-900 dark:text-white font-medium">
                  &ldquo;{ex.fred}&rdquo;
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Implementation Notes */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-800 pb-2">
          Implementation Notes
        </h2>
        <div className="p-4 rounded-lg bg-gray-100 dark:bg-gray-800/50 text-sm text-gray-700 dark:text-gray-300 space-y-2">
          <p>
            The voice is applied via{" "}
            <code className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-xs">
              buildFredVoicePreamble()
            </code>{" "}
            in{" "}
            <code className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-xs">
              voice.ts
            </code>{" "}
            and{" "}
            <code className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-xs">
              FRED_AGENT_VOICE
            </code>{" "}
            in{" "}
            <code className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-xs">
              fred-agent-voice.ts
            </code>
            .
          </p>
          <p>
            All communication data displayed above is imported directly from{" "}
            <code className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-xs">
              FRED_COMMUNICATION_STYLE
            </code>{" "}
            in{" "}
            <code className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-xs">
              lib/fred-brain.ts
            </code>
            . Changes to that object will be reflected here automatically.
          </p>
        </div>
      </section>
    </div>
  );
}
