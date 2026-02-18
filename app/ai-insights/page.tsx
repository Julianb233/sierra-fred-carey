import { redirect } from "next/navigation";

/**
 * Redirect bare /ai-insights -> /dashboard/insights
 */
export default function AIInsightsRedirect() {
  redirect("/dashboard/insights");
}
