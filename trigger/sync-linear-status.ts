/**
 * Scheduled task: Sync Linear Issue Status → feedback_insights
 *
 * Runs every 4 hours to:
 * 1. Query feedback_insights where status = "actioned" and linear_issue_id is set
 * 2. Check each Linear issue's current state via GraphQL
 * 3. If completed, update insight status to "resolved"
 * 4. Send WhatsApp resolution notification
 *
 * Replaces the Vercel cron at /api/cron/sync-linear-status with a Trigger.dev
 * scheduled task for better observability, retries, and consistency with the
 * other feedback pipeline jobs (clustering, intelligence).
 *
 * Linear: AI-4112
 */
import { schedules, logger } from "@trigger.dev/sdk/v3";

interface SyncResult {
  synced: number;
  resolved: number;
  errors: string[];
}

const WHATSAPP_GROUP_NAME = "Sahara Founders";

async function fetchLinearIssue(
  apiKey: string,
  issueId: string
): Promise<{ identifier: string; title: string; stateType: string } | null> {
  // Try direct ID lookup first
  const response = await fetch("https://api.linear.app/graphql", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: apiKey,
    },
    body: JSON.stringify({
      query: `query { issue(id: "${issueId}") { id identifier title state { type } } }`,
    }),
  });

  const data = await response.json();
  const issue = data.data?.issue;

  if (issue) {
    return {
      identifier: issue.identifier,
      title: issue.title,
      stateType: issue.state?.type ?? "unknown",
    };
  }

  // Fallback: search by identifier (linear_issue_id might be "AI-123" format)
  const searchRes = await fetch("https://api.linear.app/graphql", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: apiKey,
    },
    body: JSON.stringify({
      query: `query { issueSearch(query: "${issueId}", first: 1) { nodes { id identifier title state { type } } } }`,
    }),
  });

  const searchData = await searchRes.json();
  const found = searchData.data?.issueSearch?.nodes?.[0];

  if (found) {
    return {
      identifier: found.identifier,
      title: found.title,
      stateType: found.state?.type ?? "unknown",
    };
  }

  return null;
}

export const syncLinearStatusJob = schedules.task({
  id: "sync-linear-status",
  cron: "0 */4 * * *", // Every 4 hours
  maxDuration: 120, // 2 minutes
  retry: {
    maxAttempts: 2,
    minTimeoutInMs: 5000,
    maxTimeoutInMs: 30000,
    factor: 2,
  },
  run: async (payload) => {
    logger.log("Linear status sync started", {
      timestamp: payload.timestamp,
    });

    const result: SyncResult = { synced: 0, resolved: 0, errors: [] };

    try {
      const apiKey = process.env.LINEAR_API_KEY;
      if (!apiKey) {
        logger.error("LINEAR_API_KEY not configured");
        result.errors.push("LINEAR_API_KEY not configured");
        return result;
      }

      // Dynamic imports to avoid bundling at module level
      const { createClient } = await import("@supabase/supabase-js");
      const { sendResolutionNotification } = await import(
        "@/lib/feedback/whatsapp-reply"
      );

      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );

      // Fetch actioned insights with Linear issue IDs
      const { data: insights, error } = await supabase
        .from("feedback_insights")
        .select("id, title, linear_issue_id")
        .eq("status", "actioned")
        .not("linear_issue_id", "is", null);

      if (error) {
        logger.error(`Failed to fetch insights: ${error.message}`);
        result.errors.push(error.message);
        return result;
      }

      if (!insights || insights.length === 0) {
        logger.log("No actioned insights to sync");
        return result;
      }

      result.synced = insights.length;
      logger.log(`Checking ${insights.length} actioned insights`);

      for (const insight of insights) {
        try {
          const issue = await fetchLinearIssue(apiKey, insight.linear_issue_id);

          if (!issue) {
            logger.warn(`Linear issue not found: ${insight.linear_issue_id}`);
            continue;
          }

          if (issue.stateType === "completed") {
            const { error: updateError } = await supabase
              .from("feedback_insights")
              .update({
                status: "resolved",
                resolved_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              })
              .eq("id", insight.id);

            if (updateError) {
              result.errors.push(
                `Failed to update insight ${insight.id}: ${updateError.message}`
              );
              continue;
            }

            await sendResolutionNotification(
              WHATSAPP_GROUP_NAME,
              insight.title || issue.title,
              issue.identifier
            );

            result.resolved++;
            logger.log(`Resolved: ${issue.identifier} — ${insight.title}`);
          }
        } catch (err) {
          const msg = `Failed to sync ${insight.linear_issue_id}: ${err}`;
          result.errors.push(msg);
          logger.error(msg);
        }
      }

      logger.log("Linear status sync complete", result as unknown as Record<string, unknown>);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error(`Linear status sync failed: ${msg}`);
      result.errors.push(msg);
    }

    return result;
  },
});
