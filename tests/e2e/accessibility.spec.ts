import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const publicPages = [
  { name: "Homepage", path: "/" },
  { name: "About", path: "/about" },
  { name: "Login", path: "/login" },
  { name: "Get Started", path: "/get-started" },
  { name: "Pricing", path: "/pricing" },
  { name: "Contact", path: "/contact" },
  { name: "Blog", path: "/blog" },
];

test.describe("Accessibility: Public Pages", () => {
  for (const { name, path } of publicPages) {
    test(`${name} (${path}) should have no critical WCAG violations`, async ({
      page,
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
