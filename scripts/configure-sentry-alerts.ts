#!/usr/bin/env npx tsx
/**
 * Configure Sentry alert rules for Sahara production monitoring.
 * Run once after Sentry env vars are set:
 *   SENTRY_AUTH_TOKEN=... SENTRY_ORG=... SENTRY_PROJECT=... npx tsx scripts/configure-sentry-alerts.ts
 */

const SENTRY_API = "https://sentry.io/api/0";
const authToken = process.env.SENTRY_AUTH_TOKEN;
const org = process.env.SENTRY_ORG;
const project = process.env.SENTRY_PROJECT;

if (!authToken || !org || !project) {
  console.error("Missing env vars: SENTRY_AUTH_TOKEN, SENTRY_ORG, SENTRY_PROJECT");
  process.exit(1);
}

const headers = {
  Authorization: `Bearer ${authToken}`,
  "Content-Type": "application/json",
};

async function createAlertRule(
  name: string,
  conditions: object[],
  actions: object[],
  frequency: number = 300
) {
  const res = await fetch(`${SENTRY_API}/projects/${org}/${project}/rules/`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      name,
      conditions,
      actions,
      actionMatch: "any",
      filterMatch: "all",
      frequency, // seconds between alerts (300 = 5 min)
      environment: "production",
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    console.error(`Failed to create "${name}": ${res.status} ${err}`);
    return;
  }
  console.log(`Created alert rule: ${name}`);
}

async function main() {
  // Alert 1: High-frequency errors (>10 events in 5 minutes)
  await createAlertRule(
    "High Error Rate",
    [
      {
        id: "sentry.rules.conditions.event_frequency.EventFrequencyCondition",
        value: 10,
        interval: "5m",
      },
    ],
    [{ id: "sentry.mail.actions.NotifyEmailAction", targetType: "IssueOwners" }],
    300
  );

  // Alert 2: New issue (first occurrence)
  await createAlertRule(
    "New Issue Detected",
    [{ id: "sentry.rules.conditions.first_seen_event.FirstSeenEventCondition" }],
    [{ id: "sentry.mail.actions.NotifyEmailAction", targetType: "IssueOwners" }],
    1800 // 30 min cooldown for new issues
  );

  // Alert 3: Issue regression (previously resolved, reappeared)
  await createAlertRule(
    "Issue Regression",
    [{ id: "sentry.rules.conditions.regression_event.RegressionEventCondition" }],
    [{ id: "sentry.mail.actions.NotifyEmailAction", targetType: "IssueOwners" }],
    300
  );

  console.log("\nAlert rules configured. Verify at:");
  console.log(
    `https://sentry.io/organizations/${org}/alerts/rules/?project=${project}`
  );
}

main().catch(console.error);
