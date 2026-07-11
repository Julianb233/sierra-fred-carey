import { describe, it, expect, beforeEach, afterEach } from "vitest"
import { createHmac } from "crypto"
import {
  verifySentrySignature,
  normalizeSentryPayload,
  sentryLevelToPriority,
  buildSuggestedFix,
  buildIssueTitle,
  buildIssueDescription,
  HUMAN_REVIEW_LABEL,
  type SentryIssueSummary,
} from "./linear-bridge"

const ISSUE: SentryIssueSummary = {
  issueId: "123456",
  shortId: "SAHARA-42",
  title: "TypeError: Cannot read properties of undefined (reading 'id')",
  culprit: "app/dashboard/page.tsx",
  level: "error",
  permalink: "https://sentry.io/organizations/ai-acrobatics/issues/123456/",
  count: 7,
  environment: "production",
}

describe("verifySentrySignature", () => {
  const OLD = process.env.SENTRY_WEBHOOK_SECRET
  afterEach(() => {
    if (OLD === undefined) delete process.env.SENTRY_WEBHOOK_SECRET
    else process.env.SENTRY_WEBHOOK_SECRET = OLD
  })

  it("skips verification (returns true) when no secret configured", () => {
    delete process.env.SENTRY_WEBHOOK_SECRET
    expect(verifySentrySignature("{}", null)).toBe(true)
  })

  it("accepts a correctly-signed body", () => {
    process.env.SENTRY_WEBHOOK_SECRET = "s3cr3t"
    const body = JSON.stringify({ hello: "world" })
    const sig = createHmac("sha256", "s3cr3t").update(body, "utf8").digest("hex")
    expect(verifySentrySignature(body, sig)).toBe(true)
  })

  it("rejects a wrong signature", () => {
    process.env.SENTRY_WEBHOOK_SECRET = "s3cr3t"
    expect(verifySentrySignature("{}", "deadbeef")).toBe(false)
  })

  it("rejects a missing signature when secret is set", () => {
    process.env.SENTRY_WEBHOOK_SECRET = "s3cr3t"
    expect(verifySentrySignature("{}", null)).toBe(false)
  })
})

describe("sentryLevelToPriority", () => {
  it("maps levels to Linear priorities", () => {
    expect(sentryLevelToPriority("fatal")).toBe(1)
    expect(sentryLevelToPriority("error")).toBe(2)
    expect(sentryLevelToPriority("warning")).toBe(3)
    expect(sentryLevelToPriority("info")).toBe(4)
    expect(sentryLevelToPriority("something-else")).toBe(4)
  })

  it("is case-insensitive", () => {
    expect(sentryLevelToPriority("ERROR")).toBe(2)
  })
})

describe("normalizeSentryPayload", () => {
  it("normalizes the internal-integration issue resource shape", () => {
    const payload = {
      action: "created",
      data: {
        issue: {
          id: "999",
          shortId: "SAHARA-7",
          title: "Boom",
          culprit: "lib/x.ts",
          level: "fatal",
          permalink: "https://sentry.io/x",
          count: 3,
        },
      },
    }
    const s = normalizeSentryPayload(payload)
    expect(s?.issueId).toBe("999")
    expect(s?.shortId).toBe("SAHARA-7")
    expect(s?.level).toBe("fatal")
    expect(s?.count).toBe(3)
  })

  it("normalizes the legacy issue-alert event shape", () => {
    const payload = {
      data: {
        event: {
          event_id: "abc",
          issue_id: "555",
          title: "Fetch failed",
          level: "warning",
          web_url: "https://sentry.io/e/abc",
          environment: "production",
        },
      },
    }
    const s = normalizeSentryPayload(payload)
    expect(s?.issueId).toBe("555")
    expect(s?.title).toBe("Fetch failed")
    expect(s?.permalink).toBe("https://sentry.io/e/abc")
  })

  it("returns null when there is no issue/event", () => {
    expect(normalizeSentryPayload({ action: "installed" })).toBeNull()
    expect(normalizeSentryPayload(null)).toBeNull()
    expect(normalizeSentryPayload("not-an-object")).toBeNull()
  })

  it("defaults level to error when absent", () => {
    const s = normalizeSentryPayload({ data: { issue: { id: "1", title: "x" } } })
    expect(s?.level).toBe("error")
  })
})

describe("buildSuggestedFix", () => {
  it("always includes the human-review guardrail banner", () => {
    const text = buildSuggestedFix(ISSUE)
    expect(text).toContain("HUMAN REVIEW REQUIRED")
    expect(text.toLowerCase()).toContain("do **not** auto-merge or auto-deploy")
  })

  it("gives a null-guard hint for undefined-access errors", () => {
    expect(buildSuggestedFix(ISSUE).toLowerCase()).toContain("null/undefined")
  })

  it("gives a network hint for timeout errors", () => {
    const text = buildSuggestedFix({ ...ISSUE, title: "Fetch failed: ETIMEDOUT" })
    expect(text.toLowerCase()).toContain("network/timeout")
  })

  it("gives an auth hint for 403 errors", () => {
    const text = buildSuggestedFix({ ...ISSUE, title: "Request failed 403 Forbidden" })
    expect(text.toLowerCase()).toContain("auth/permissions")
  })
})

describe("buildIssueTitle", () => {
  it("prefixes with [Sentry] for consistent dedup", () => {
    expect(buildIssueTitle(ISSUE)).toBe(`[Sentry] ${ISSUE.title}`)
  })

  it("caps length at 250 chars", () => {
    const long = { ...ISSUE, title: "x".repeat(500) }
    expect(buildIssueTitle(long).length).toBeLessThanOrEqual(250)
  })
})

describe("buildIssueDescription", () => {
  it("documents the human-approved workflow and dedup key", () => {
    const desc = buildIssueDescription(ISSUE)
    expect(desc).toContain(HUMAN_REVIEW_LABEL)
    expect(desc).toContain("Nothing ships automatically")
    expect(desc).toContain(ISSUE.issueId)
  })

  it("omits missing optional fields", () => {
    const desc = buildIssueDescription({ issueId: "1", title: "x", level: "error" })
    expect(desc).not.toContain("Culprit")
    expect(desc).not.toContain("Environment")
  })
})
