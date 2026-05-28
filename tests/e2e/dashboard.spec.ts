import { expect, test } from "@playwright/test";

test("dashboard shell renders", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Monthly control room" })).toBeVisible();
  await expect(page.getByText("Recent ledger activity")).toBeVisible();
  await expect(page.getByText("Net cashflow")).toBeVisible();
  await expect(page.getByRole("heading", { name: /spent$/ })).toBeVisible();
  await expect(page.getByRole("link", { name: "Export backup package" })).toHaveAttribute("href", "/api/exports?format=backup_package");
});

test("accounts page supports local account entry", async ({ page }) => {
  await page.goto("/accounts");

  await expect(page.getByRole("heading", { name: "Accounts" })).toBeVisible();
  await expect(page.getByText("Balance control file")).toBeVisible();

  await page.getByPlaceholder("Operating Checking").fill("Vacation Reserve");
  await page.getByPlaceholder("Bank or brokerage").fill("Ally");
  await page.getByPlaceholder("1842").fill("7777");
  await page.getByRole("button", { name: /Save account|Saving/ }).click();

  await expect(page.getByText("Vacation Reserve")).toBeVisible();
});

test("transactions page supports local transaction entry", async ({ page }) => {
  await page.goto("/transactions");

  await expect(page.getByRole("heading", { name: "Transactions" })).toBeVisible();
  await expect(page.getByText("Register")).toBeVisible();
  await expect(page.getByRole("link", { name: "Export transactions" })).toHaveAttribute("href", "/api/exports?format=transactions_csv");

  await page.getByPlaceholder("Trader Joe's").fill("Local Bookstore");
  await page.getByPlaceholder("-42.18").fill("-31.45");
  await page.getByRole("button", { name: "Save transaction" }).click();

  await expect(page.getByText("Local Bookstore")).toBeVisible();
});

test("imports page supports local staged row", async ({ page }) => {
  await page.goto("/imports");

  await expect(page.getByRole("heading", { name: "Imports" })).toBeVisible();
  await expect(page.getByText("Import review")).toBeVisible();

  await page.getByRole("button", { name: "Add sample row" }).click();

  await expect(page.getByText("NEW CSV ROW")).toBeVisible();
  await expect(page.getByRole("button", { name: "Commit import" })).toBeVisible();
  await page.getByRole("button", { name: "Commit import" }).click();
  await expect(page.getByText(/committed/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Roll back import" })).toBeEnabled();
});

test("settings page supports ledger settings edits", async ({ page }) => {
  await page.goto("/settings");

  await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();
  await expect(page.getByText("Ownership boundary")).toBeVisible();
  await expect(page.getByText("Production readiness")).toBeVisible();

  await page.getByPlaceholder("Personal ledger").fill("Forensic Ledger");
  await page.getByRole("button", { name: /Save settings|Saving/ }).click();

  await expect(page.getByText("Forensic Ledger")).toBeVisible();
});

test("review, cashflow, and net worth pages render", async ({ page }) => {
  await page.goto("/review");
  await expect(page.getByRole("heading", { name: "Review", exact: true })).toBeVisible();
  await expect(page.getByText("Unresolved transactions")).toBeVisible();

  await page.goto("/rules");
  await expect(page.getByRole("heading", { name: "Rules" })).toBeVisible();
  await expect(page.getByText("Classification control file")).toBeVisible();
  await page.getByPlaceholder("Apple subscriptions").fill("Bookstore rule");
  await page.getByPlaceholder("APPLE.COM/BILL").fill("LOCAL BOOKSTORE");
  await page.getByRole("button", { name: "Save rule" }).click();
  await expect(page.getByText("Bookstore rule")).toBeVisible();
  await page.getByRole("button", { name: "Apply rules" }).click();
  await expect(page.getByText(/transactions|Demo preview/)).toBeVisible();

  await page.goto("/cashflow");
  await expect(page.getByRole("heading", { name: "Cashflow" })).toBeVisible();
  await expect(page.getByText("Category movement")).toBeVisible();

  await page.goto("/net-worth");
  await expect(page.getByRole("heading", { name: "Net Worth" })).toBeVisible();
  await expect(page.getByText("Account position")).toBeVisible();
});
