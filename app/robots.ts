import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL || "https://joinsahara.com";

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/dashboard/",
          "/api/",
          "/admin/",
          "/settings/",
          "/agents/",
          "/chat/",
          "/onboarding/",
          "/check-ins/",
          "/documents/",
          "/profile/",
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
