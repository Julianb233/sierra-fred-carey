import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL || "https://joinsahara.com";
  const now = new Date();

  return [
    // Core pages
    { url: baseUrl, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${baseUrl}/about`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${baseUrl}/pricing`, lastModified: now, changeFrequency: "monthly", priority: 0.9 },
    { url: `${baseUrl}/features`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${baseUrl}/product`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${baseUrl}/interactive`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },

    // Content & engagement
    { url: `${baseUrl}/blog`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { url: `${baseUrl}/contact`, lastModified: now, changeFrequency: "yearly", priority: 0.5 },
    { url: `${baseUrl}/support`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: `${baseUrl}/waitlist`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${baseUrl}/links`, lastModified: now, changeFrequency: "monthly", priority: 0.4 },
    { url: `${baseUrl}/video`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },

    // Auth pages (public entry points)
    { url: `${baseUrl}/login`, lastModified: now, changeFrequency: "yearly", priority: 0.4 },
    { url: `${baseUrl}/signup`, lastModified: now, changeFrequency: "yearly", priority: 0.5 },
    { url: `${baseUrl}/get-started`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },

    // Legal
    { url: `${baseUrl}/privacy`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${baseUrl}/terms`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },

    // Demo pages
    { url: `${baseUrl}/demo/reality-lens`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${baseUrl}/demo/investor-lens`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${baseUrl}/demo/virtual-team`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${baseUrl}/demo/pitch-deck`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${baseUrl}/demo/boardy`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },

    // Tools
    { url: `${baseUrl}/tools/investor-readiness`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
  ];
}
