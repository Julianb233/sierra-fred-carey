/**
 * Sentry → Linear Bridge (human-approved bug maintenance)
 *
 * AI-12549: Connect Sahara Sentry to Linear so production errors captured by
 * Sentry automatically open a Linear issue in the "Sahara - AI Founder OS"
 * project for an engineer to pick up.
 *
 * SAFETY GUARDRAIL (Alex LaTorre's explicit ask in the Sahara Founders sync):
 * the automation SUGGESTS a fix for human review — it NEVER auto-executes,
 * auto-merges, or auto-deploys anything. This module only:
 *   1. Creates a Linear issue (default/triage state — a human must action it)
 *   2. Tags it `needs-human-review`
 *   3. Posts a suggested-remediation comment clearly marked as advisory-only
 * No code is changed, no PR is merged, no deploy is triggered from here.
 *
 * Reuses the GraphQL patterns already established in
 * `lib/feedback/linear-auto-triage.ts` and `app/api/bug-report/route.ts`.
 */

import { createHmac, timingSafeEqual } from "crypto"

// ── Constants ───────────────────────────────────────────────────

export const LINEAR_TEAM = "Ai Acrobatics"
export const LINEAR_PROJECT = "Sahara - AI Founder OS"
/** Label that flags an issue as awaiting a human decision before any fix ships. */
export const HUMAN_REVIEW_LABEL = "needs-human-review"
export const SENTRY_SOURCE_LABEL = "sentry"

const LINEAR_GRAPHQL = "https://api.linear.app/graphql"

// ── Types ───────────────────────────────────────────────────────

export interface SentryIssueSummary {
  /** Stable Sentry issue id — used for dedup so repeat alerts don't spam Linear. */
  issueId: string
  /** Human short id, e.g. "SAHARA-12". */
  shortId?: string
  title: string
  culprit?: string
  level: string
  permalink?: string
  /** Occurrence count if provided by the payload. */
  count?: number
  environment?: string
  projectSlug?: string
}

export interface LinearIssueResult {
  success: boolean
  identifier?: string
  url?: string
  /** True when a matching issue already existed (dedup hit) — not an error. */
  duplicate?: boolean
  error?: string
}

// ── Signature verification ──────────────────────────────────────

/**
 * Verify a Sentry webhook signature (HMAC-SHA256 hex of the raw body using
 * the integration client secret). Mirrors the linear-webhook verifier.
 *
 * If SENTRY_WEBHOOK_SECRET is unset we skip verification (with a warning) so
 * local/dev testing works, matching the existing Linear webhook behaviour.
 */
export function verifySentrySignature(
  rawBody: string,
  signature: string | null
): boolean {
  const secret = process.env.SENTRY_WEBHOOK_SECRET
  if (!secret) {
    console.warn(
      "[Sentry→Linear] SENTRY_WEBHOOK_SECRET not set — skipping signature verification"
    )
    return true
  }
  if (!signature) return false

  const expected = createHmac("sha256", secret).update(rawBody, "utf8").digest("hex")

  // Constant-time compare; guard against length mismatch which throws.
  const a = Buffer.from(expected, "utf8")
  const b = Buffer.from(signature, "utf8")
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}

// ── Payload normalization ───────────────────────────────────────

/**
 * Normalize the several shapes a Sentry webhook can arrive in
 * (internal-integration "issue" resource, legacy issue-alert with an
 * `event`, or an `event_alert` wrapper) into a single summary.
 *
 * Returns null when the payload carries no identifiable issue.
 */
export function normalizeSentryPayload(
  payload: unknown
): SentryIssueSummary | null {
  if (!payload || typeof payload !== "object") return null
  const p = payload as Record<string, any>
  const data = (p.data ?? {}) as Record<string, any>

  // Shape 1: internal-integration "issue" resource → data.issue
  // Shape 2: issue-alert → data.event / data.event_alert.event / top-level event
  const issue = data.issue ?? undefined
  const event = data.event ?? data.event_alert?.event ?? p.event ?? undefined
  const src = issue ?? event
  if (!src) return null

  const issueId = String(
    issue?.id ??
      event?.issue_id ??
      event?.groupID ??
      event?.event_id ??
      src?.id ??
      ""
  )
  if (!issueId) return null

  const title = String(
    src.title ?? src.metadata?.title ?? src.metadata?.value ?? "Sentry error"
  )

  const level = String(src.level ?? event?.level ?? "error").toLowerCase()

  return {
    issueId,
    shortId: issue?.shortId ?? issue?.short_id ?? undefined,
    title,
    culprit: src.culprit ?? undefined,
    level,
    permalink: issue?.permalink ?? event?.web_url ?? src.web_url ?? undefined,
    count: typeof issue?.count === "number" ? issue.count : undefined,
    environment: src.environment ?? event?.environment ?? undefined,
    projectSlug: src.project ?? issue?.project?.slug ?? undefined,
  }
}

// ── Priority + remediation heuristics ───────────────────────────

/**
 * Map a Sentry level to a Linear priority.
 * Linear: 1=Urgent, 2=High, 3=Normal, 4=Low
 */
export function sentryLevelToPriority(level: string): 1 | 2 | 3 | 4 {
  switch ((level || "").toLowerCase()) {
    case "fatal":
      return 1
    case "error":
      return 2
    case "warning":
      return 3
    default:
      return 4
  }
}

/**
 * Build an advisory, human-review-only remediation suggestion.
 *
 * This is intentionally a *starting point for an engineer* — a heuristic hint
 * derived from the error text — NOT an executable fix. The banner makes the
 * no-auto-execution contract explicit inside Linear itself.
 */
export function buildSuggestedFix(summary: SentryIssueSummary): string {
  const t = `${summary.title} ${summary.culprit ?? ""}`.toLowerCase()

  let hint =
    "Reproduce the error path, then add a targeted fix + regression test. Confirm the fix locally before opening a PR."
  if (/undefined|null|cannot read prop|is not a function/.test(t)) {
    hint =
      "Likely a null/undefined access. Add a guard or optional chaining at the culprit, and check the upstream data source that can be empty."
  } else if (/timeout|econn|network|fetch failed|socket hang/.test(t)) {
    hint =
      "Network/timeout failure. Add a retry-with-backoff or a graceful fallback, and verify the downstream service is reachable and its timeout budget."
  } else if (/permission|unauthor|forbidden|401|403/.test(t)) {
    hint =
      "Auth/permissions failure. Verify the caller's session/role and the required scopes; return a clean 401/403 instead of throwing."
  } else if (/rate limit|429|too many/.test(t)) {
    hint =
      "Rate-limit hit. Add client-side throttling/backoff and surface a user-friendly retry state."
  } else if (/hydrat|resizeobserver|chunkload/.test(t)) {
    hint =
      "Client render/hydration issue. Check server/client markup mismatch or a dynamic import that should be client-only."
  }

  return [
    "🤖 **Automated suggestion — HUMAN REVIEW REQUIRED**",
    "",
    "> This is an advisory hint generated from the Sentry error. It has **not** been applied.",
    "> Do **NOT** auto-merge or auto-deploy. A human must review, implement, and approve any fix.",
    "",
    `**Suggested starting point:** ${hint}`,
  ].join("\n")
}

/** The exact Linear issue title used for both creation and dedup lookups. */
export function buildIssueTitle(summary: SentryIssueSummary): string {
  return `[Sentry] ${summary.title}`.slice(0, 250)
}

/** The description body written into the created Linear issue. */
export function buildIssueDescription(summary: SentryIssueSummary): string {
  const lines = [
    "## Production error captured by Sentry",
    "",
    `**Level:** ${summary.level}`,
    summary.environment ? `**Environment:** ${summary.environment}` : null,
    summary.count ? `**Occurrences:** ${summary.count}` : null,
    summary.culprit ? `**Culprit:** \`${summary.culprit}\`` : null,
    summary.shortId ? `**Sentry ID:** \`${summary.shortId}\`` : null,
    summary.permalink ? `\n[Open in Sentry](${summary.permalink})` : null,
    "",
    "---",
    "",
    "### Human-approved maintenance workflow (AI-12549)",
    "1. This issue was auto-created from a Sentry alert.",
    "2. An automated **suggested** fix is posted as a comment — advisory only.",
    "3. An engineer reproduces, implements, and opens a PR.",
    `4. Nothing ships automatically — this issue carries the \`${HUMAN_REVIEW_LABEL}\` label until a human approves and merges.`,
    "",
    `_Source: Sentry issue \`${summary.issueId}\`. Dedup key prevents repeat alerts from creating duplicate issues._`,
  ].filter(Boolean)
  return lines.join("\n")
}

// ── Linear GraphQL helpers ──────────────────────────────────────

async function linearFetch(
  apiKey: string,
  query: string,
  variables?: Record<string, unknown>
): Promise<any> {
  const res = await fetch(LINEAR_GRAPHQL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: apiKey },
    body: JSON.stringify({ query, variables }),
  })
  return res.json()
}

/** Find an existing open Linear issue by exact title (dedup). */
async function findExistingIssue(
  apiKey: string,
  title: string
): Promise<{ identifier: string; url: string } | null> {
  try {
    const data = await linearFetch(
      apiKey,
      `query Search($filter: IssueFilter!) {
        issues(filter: $filter, first: 1) { nodes { identifier url } }
      }`,
      { filter: { title: { eq: title } } }
    )
    return data.data?.issues?.nodes?.[0] ?? null
  } catch {
    return null
  }
}

/**
 * Look up a label id by name, creating it on the team if it doesn't exist.
 * Best-effort — returns null on any failure so issue creation never blocks.
 */
async function ensureLabelId(
  apiKey: string,
  teamId: string,
  name: string
): Promise<string | null> {
  try {
    const data = await linearFetch(
      apiKey,
      `query Labels($name: String!) {
        issueLabels(filter: { name: { eq: $name } }) { nodes { id } }
      }`,
      { name }
    )
    const existing = data.data?.issueLabels?.nodes?.[0]?.id
    if (existing) return existing

    const created = await linearFetch(
      apiKey,
      `mutation CreateLabel($input: IssueLabelCreateInput!) {
        issueLabelCreate(input: $input) { success issueLabel { id } }
      }`,
      { input: { name, teamId } }
    )
    return created.data?.issueLabelCreate?.issueLabel?.id ?? null
  } catch {
    return null
  }
}

async function postComment(
  apiKey: string,
  issueId: string,
  body: string
): Promise<void> {
  try {
    await linearFetch(
      apiKey,
      `mutation Comment($input: CommentCreateInput!) {
        commentCreate(input: $input) { success }
      }`,
      { input: { issueId, body } }
    )
  } catch (err) {
    console.error("[Sentry→Linear] Failed to post suggestion comment:", err)
  }
}

// ── Main entry point ────────────────────────────────────────────

/**
 * Create a Linear issue from a normalized Sentry summary, with the
 * human-review guardrail. Idempotent by issue title (dedup).
 */
export async function createLinearIssueFromSentry(
  summary: SentryIssueSummary
): Promise<LinearIssueResult> {
  const apiKey = process.env.LINEAR_API_KEY
  if (!apiKey) {
    return { success: false, error: "LINEAR_API_KEY not configured" }
  }

  const title = buildIssueTitle(summary)

  try {
    // Dedup: repeat Sentry alerts for the same error must not spam Linear.
    const existing = await findExistingIssue(apiKey, title)
    if (existing) {
      return {
        success: true,
        duplicate: true,
        identifier: existing.identifier,
        url: existing.url,
      }
    }

    // Resolve team + project.
    const meta = await linearFetch(
      apiKey,
      `query {
        teams(filter: { name: { eq: "${LINEAR_TEAM}" } }) { nodes { id } }
        projects(filter: { name: { eq: "${LINEAR_PROJECT}" } }) { nodes { id } }
      }`
    )
    const teamId = meta.data?.teams?.nodes?.[0]?.id
    if (!teamId) {
      return { success: false, error: `Team "${LINEAR_TEAM}" not found in Linear` }
    }
    const projectId = meta.data?.projects?.nodes?.[0]?.id

    // Labels: Bug + sentry + needs-human-review (create if missing).
    const labelIds = (
      await Promise.all([
        ensureLabelId(apiKey, teamId, "Bug"),
        ensureLabelId(apiKey, teamId, SENTRY_SOURCE_LABEL),
        ensureLabelId(apiKey, teamId, HUMAN_REVIEW_LABEL),
      ])
    ).filter((id): id is string => Boolean(id))

    const created = await linearFetch(
      apiKey,
      `mutation CreateIssue($input: IssueCreateInput!) {
        issueCreate(input: $input) { success issue { id identifier url } }
      }`,
      {
        input: {
          teamId,
          title,
          description: buildIssueDescription(summary),
          priority: sentryLevelToPriority(summary.level),
          ...(labelIds.length ? { labelIds } : {}),
          ...(projectId ? { projectId } : {}),
        },
      }
    )

    const issue = created.data?.issueCreate?.issue
    if (!issue?.identifier) {
      return {
        success: false,
        error: `Linear issue creation failed: ${JSON.stringify(
          created.errors || created
        )}`,
      }
    }

    // Post the advisory suggestion (human-review only, never executed).
    await postComment(apiKey, issue.id, buildSuggestedFix(summary))

    return { success: true, identifier: issue.identifier, url: issue.url }
  } catch (err) {
    return {
      success: false,
      error: `Linear API error: ${err instanceof Error ? err.message : String(err)}`,
    }
  }
}
