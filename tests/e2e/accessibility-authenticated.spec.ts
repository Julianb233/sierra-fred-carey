import { test, expect } from "./fixtures/auth";
import AxeBuilder from "@axe-core/playwright";

const authenticatedPages = [
  { name: "Dashboard", path: "/dashboard" },
  { name: "Chat", path: "/chat" },
  { name: "Check-ins", path: "/check-ins" },
  { name: "Dashboard Settings", path: "/dashboard/settings" },
  { name: "Dashboard Next Steps", path: "/dashboard/next-steps" },
];

test.describe("Accessibility: Authenticated Pages", () => {
  for (const { name, path } of authenticatedPages) {
    test(`${name} (${path}) should have no critical WCAG violations`, async ({
      authenticatedPage: page,
    }) => {
      await page.goto(path);
      await page.waitForLoadState("networkidle");

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
