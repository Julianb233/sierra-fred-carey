import { test, expect } from "./fixtures/auth";
import AxeBuilder from "@axe-core/playwright";

const authenticatedPages = [
  { name: "Dashboard Home", path: "/dashboard" },
  { name: "Chat", path: "/chat" },
  { name: "Check-ins", path: "/check-ins" },
  { name: "Settings", path: "/dashboard/settings" },
  { name: "Next Steps", path: "/dashboard/next-steps" },
  { name: "Strategy", path: "/dashboard/strategy" },
  { name: "Insights", path: "/dashboard/insights" },
  { name: "Journey", path: "/dashboard/journey" },
  { name: "Coaching", path: "/dashboard/coaching" },
  { name: "Pitch Deck", path: "/dashboard/pitch-deck" },
  { name: "Investor Targeting", path: "/dashboard/investor-targeting" },
  { name: "Communities", path: "/dashboard/communities" },
  { name: "Documents", path: "/dashboard/documents" },
  { name: "Notifications", path: "/dashboard/notifications" },
  { name: "Wellbeing", path: "/dashboard/wellbeing" },
  { name: "Profile Snapshot", path: "/dashboard/profile/snapshot" },
];

test.describe("Accessibility: Authenticated Pages", () => {
  test.setTimeout(30_000);

  for (const { name, path } of authenticatedPages) {
    test(`${name} (${path}) should have no critical WCAG violations`, async ({
      authenticatedPage: page,
    }) => {
      await page.goto(path);
      await page.waitForLoadState("networkidle");

      // Wait for main content area to render before running axe analysis
      // to avoid false positives from analyzing loading states
      await page
        .waitForSelector('[id="main-content"], main', { timeout: 10_000 })
        .catch(() => {});

      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .analyze();

      const criticalViolations = results.violations.filter(
        (v) => v.impact === "critical" || v.impact === "serious",
      );

      if (criticalViolations.length > 0) {
        console.log(`\n${name} a11y violations:`);
        for (const v of criticalViolations) {
          console.log(`  [${v.impact}] ${v.id}: ${v.description}`);
          for (const node of v.nodes.slice(0, 3)) {
            console.log(`    - ${node.html.substring(0, 100)}`);
          }
        }
      }

      expect(
        criticalViolations,
        `${name} has ${criticalViolations.length} critical/serious a11y violations`,
      ).toHaveLength(0);
    });
  }
});
