import { expect, test } from "@playwright/test";

test("dashboard shell renders", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Monthly control room" })).toBeVisible();
  await expect(page.getByText("Recent ledger activity")).toBeVisible();
  await expect(page.getByText("-$9,340.80 spent")).toBeVisible();
});

test("accounts page supports local account entry", async ({ page }) => {
  await page.goto("/accounts");

  await expect(page.getByRole("heading", { name: "Accounts" })).toBeVisible();
  await expect(page.getByText("Balance control file")).toBeVisible();

  await page.getByPlaceholder("Operating Checking").fill("Vacation Reserve");
  await page.getByPlaceholder("Bank or brokerage").fill("Ally");
  await page.getByPlaceholder("1842").fill("7777");
  await page.getByRole("button", { name: "Save account" }).click();

  await expect(page.getByText("Vacation Reserve")).toBeVisible();
});
