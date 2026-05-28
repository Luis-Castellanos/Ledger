import { expect, test } from "@playwright/test";

test("dashboard shell renders", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Monthly control room" })).toBeVisible();
  await expect(page.getByText("Recent ledger activity")).toBeVisible();
  await expect(page.getByText("-$9,340.80 spent")).toBeVisible();
});
