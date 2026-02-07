import {
  FRED_BIO,
  FRED_COMPANIES,
  FRED_PHILOSOPHY,
  FRED_MEDIA,
  FRED_TESTIMONIALS,
} from "@/lib/fred-brain";

export default function IdentityPage() {
  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Identity &amp; Background
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Fred Cary&apos;s biography, companies, philosophy, and media presence.
          All data sourced from{" "}
          <code className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-xs">
            lib/fred-brain.ts
          </code>
          .
        </p>
      </div>

      {/* Biography */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-800 pb-2">
          Biography
        </h2>
        <div className="p-5 rounded-lg border border-[#ff6a1a]/30 bg-orange-50 dark:bg-orange-950/20">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-[#ff6a1a]">
                {FRED_BIO.yearsExperience}+
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">
                Years Experience
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-[#ff6a1a]">
                {FRED_BIO.companiesFounded}+
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">
                Companies Founded
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-[#ff6a1a]">
                {FRED_BIO.ipos}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">
                IPOs
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-[#ff6a1a]">
                {FRED_BIO.acquisitions}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">
                Acquisitions
              </div>
            </div>
          </div>
          <div className="text-sm text-gray-700 dark:text-gray-300 space-y-2">
            <p>
              Started at age {FRED_BIO.startedAge}. First job:{" "}
              {FRED_BIO.originStory.firstJob}. First business:{" "}
              {FRED_BIO.originStory.firstBusiness}.
            </p>
            <p>
              Education: JD from {FRED_BIO.education.jd.school} (
              {FRED_BIO.education.jd.year}). MBA with{" "}
              {FRED_BIO.education.mba.honors}. California Bar admitted{" "}
              {FRED_BIO.education.barAdmission.year} --{" "}
              {FRED_BIO.education.barAdmission.recognition}.
            </p>
          </div>
        </div>
      </section>

      {/* Companies -- Current */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-800 pb-2">
          Current Companies
        </h2>
        <div className="grid grid-cols-1 gap-4">
          {FRED_COMPANIES.current.map((company) => (
            <div
              key={company.name}
              className="p-4 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                    {company.name}
                  </h3>
                  <span className="text-xs text-[#ff6a1a]">{company.role}</span>
                </div>
                {"website" in company && company.website && (
                  <span className="text-xs text-gray-400">{company.website}</span>
                )}
              </div>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                {company.description}
              </p>
              {"metrics" in company && company.metrics && (
                <div className="mt-2 flex flex-wrap gap-3 text-xs text-gray-500 dark:text-gray-400">
                  {"companiesLaunched" in company.metrics && (
                    <span>
                      {company.metrics.companiesLaunched} companies launched
                    </span>
                  )}
                  {"revenue" in company.metrics && (
                    <span>{company.metrics.revenue} revenue</span>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Companies -- Exits */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-800 pb-2">
          Notable Exits
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {FRED_COMPANIES.exits.map((company) => (
            <div
              key={company.name}
              className="p-4 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950"
            >
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                {company.name}
              </h3>
              <span className="text-xs text-[#ff6a1a]">{company.role}</span>
              {"exit" in company && (
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Exit: {company.exit}
                  {"value" in company && ` (${company.value})`}
                </p>
              )}
              {"description" in company && (
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                  {company.description}
                </p>
              )}
              {"innovation" in company && (
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                  {company.innovation}
                </p>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Philosophy */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-800 pb-2">
          Philosophy &amp; Principles
        </h2>
        <div className="space-y-4">
          {FRED_PHILOSOPHY.corePrinciples.map((principle, i) => (
            <div
              key={principle.name}
              className="p-4 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950"
            >
              <div className="flex items-start gap-3">
                <span className="flex items-center justify-center w-7 h-7 rounded-full bg-[#ff6a1a] text-white text-xs font-bold shrink-0">
                  {i + 1}
                </span>
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                    {principle.name}
                  </h3>
                  {"quote" in principle && principle.quote && (
                    <p className="mt-1 text-sm italic text-gray-500 dark:text-gray-400">
                      &ldquo;{principle.quote}&rdquo;
                    </p>
                  )}
                  <ul className="mt-2 space-y-1">
                    {principle.teachings.map((teaching, j) => (
                      <li
                        key={j}
                        className="flex items-start gap-2 text-xs text-gray-600 dark:text-gray-400"
                      >
                        <span className="mt-1 w-1 h-1 rounded-full bg-gray-400 shrink-0" />
                        {teaching}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Key Quotes */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-800 pb-2">
          Key Quotes
        </h2>
        <div className="space-y-3">
          {FRED_PHILOSOPHY.keyQuotes.map((quote, i) => (
            <blockquote
              key={i}
              className="pl-4 border-l-2 border-[#ff6a1a] text-sm text-gray-700 dark:text-gray-300 italic"
            >
              &ldquo;{quote}&rdquo;
            </blockquote>
          ))}
        </div>
      </section>

      {/* Media & Testimonials */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-800 pb-2">
          Media Presence
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Object.entries(FRED_MEDIA.socialMetrics).map(([platform, data]) => (
            <div
              key={platform}
              className="p-3 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 text-center"
            >
              <div className="text-sm font-semibold text-[#ff6a1a]">
                {"followers" in data
                  ? data.followers
                  : "views" in data
                    ? data.views
                    : ""}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                {platform}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-3">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
            Featured In ({FRED_MEDIA.publications.length} publications)
          </h3>
          <div className="flex flex-wrap gap-2">
            {FRED_MEDIA.publications.map((pub) => (
              <span
                key={pub}
                className="px-2 py-1 text-xs rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
              >
                {pub}
              </span>
            ))}
          </div>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          <strong>{FRED_MEDIA.podcastAppearances}</strong> documented podcast
          appearances.
        </p>
      </section>

      {/* Testimonials */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-800 pb-2">
          Testimonials
        </h2>
        <div className="space-y-4">
          {FRED_TESTIMONIALS.map((testimonial, i) => (
            <div
              key={i}
              className="p-4 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950"
            >
              <blockquote className="text-sm text-gray-700 dark:text-gray-300 italic">
                &ldquo;{testimonial.quote}&rdquo;
              </blockquote>
              <div className="mt-2 text-xs">
                <span className="font-semibold text-gray-900 dark:text-white">
                  {testimonial.name}
                </span>
                <span className="text-gray-500 dark:text-gray-400">
                  {" "}
                  -- {testimonial.role}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
