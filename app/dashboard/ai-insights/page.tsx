import { redirect } from "next/navigation";

/**
 * Redirect /dashboard/ai-insights -> /dashboard/insights
 * The sidebar nav item is labeled "AI Insights" but routes to /dashboard/insights.
 * This redirect catches users who manually type /dashboard/ai-insights.
 */
export default function AIInsightsRedirect() {
  redirect("/dashboard/insights");
}
