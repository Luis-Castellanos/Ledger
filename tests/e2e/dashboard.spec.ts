import { expect, test } from "@playwright/test";

test("dashboard shell renders", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Overview" })).toBeVisible();
  await expect(page.getByText("Recent activity")).toBeVisible();
  await expect(page.getByText("Net cashflow")).toBeVisible();
  await expect(page.getByRole("heading", { name: /spent$/ })).toBeVisible();
  await expect(page.getByRole("link", { name: "Export backup package" })).toHaveAttribute("href", "/api/exports?format=backup_package");
  await expect(page.getByRole("link", { name: "View all" })).toHaveAttribute("href", "/transactions");

  await page.getByLabel("Search ledger").fill("Costco");
  await expect(page.getByText("Costco")).toBeVisible();
  await expect(page.getByText("Apple Music")).toHaveCount(0);
});

test("accounts page supports local account entry", async ({ page }) => {
  await page.goto("/accounts");

  await expect(page.getByRole("heading", { name: "Accounts" })).toBeVisible();
  await expect(page.getByText("Balance control file")).toBeVisible();
  await expect(page.getByLabel("Account detail reporting")).toBeVisible();
  await expect(page.getByRole("link", { name: "View register" })).toHaveAttribute("href", /\/transactions\?account=/);

  await page.getByPlaceholder("Operating Checking").fill("Vacation Reserve");
  await page.getByPlaceholder("Bank or brokerage").fill("Ally");
  await page.getByPlaceholder("1842").fill("7777");
  await page.getByRole("button", { name: /Save account|Saving/ }).click();

  await expect(page.getByLabel("Accounts", { exact: true }).getByText("Vacation Reserve")).toBeVisible();
  await page.getByRole("button", { name: "View Vacation Reserve detail" }).click();
  await expect(page.getByRole("heading", { name: "Vacation Reserve" })).toBeVisible();
  await expect(page.getByText("Current position")).toBeVisible();
  await expect(page.getByRole("link", { name: /Operating inflow/ })).toHaveAttribute("href", /\/transactions\?account=Vacation%20Reserve&direction=inflow/);
  await expect(page.getByRole("link", { name: /Operating outflow/ })).toHaveAttribute("href", /\/transactions\?account=Vacation%20Reserve&direction=outflow/);
  await page.getByPlaceholder("1250.42").fill("125.50");
  await page.getByRole("button", { name: /Save snapshot|Saving/ }).click();
  await expect(page.getByLabel("Accounts", { exact: true }).getByText("$125.50")).toBeVisible();
  await page.getByRole("button", { name: "Close Vacation Reserve" }).click();
  await expect(page.getByText("asset / closed")).toBeVisible();
  await page.getByRole("button", { name: "Reopen Vacation Reserve" }).click();
  await expect(page.getByText("asset / closed")).toHaveCount(0);
});

test("transactions page supports local transaction entry", async ({ page }) => {
  await page.goto("/transactions");

  await expect(page.getByRole("heading", { name: "Transactions" })).toBeVisible();
  await expect(page.getByText("Register")).toBeVisible();
  await expect(page.getByRole("link", { name: "Export transactions" })).toHaveAttribute("href", "/api/exports?format=transactions_csv");

  await page.getByLabel("Transfer filter").selectOption("transfer");
  await expect(page.getByText("Internal transfer", { exact: true })).toBeVisible();
  await page.getByLabel("Transfer filter").selectOption("all");
  await page.getByLabel("Direction filter").selectOption("inflow");
  await expect(page.getByText("Payroll deposit")).toBeVisible();
  await expect(page.getByText("Mortgage payment")).toHaveCount(0);
  await page.getByLabel("Direction filter").selectOption("all");
  await page.getByLabel("Tag filter").selectOption("subscription");
  await expect(page.getByText("Apple Music")).toBeVisible();
  await expect(page.getByText("Costco")).toHaveCount(0);
  await page.getByLabel("Tag filter").selectOption("all");
  await page.getByLabel("Sort transactions").selectOption("merchant_asc");
  await expect(page.locator(".transactions-table-row").first()).toContainText("Ally Interest");
  await page.getByLabel("Sort transactions").selectOption("amount_asc");
  await expect(page.locator(".transactions-table-row").first()).toContainText("Mortgage payment");
  await page.getByLabel("Sort transactions").selectOption("date_desc");
  await page.getByLabel("Select Costco").check();
  await page.getByLabel("Select Apple Music").check();
  await page.getByLabel("Bulk transaction category").selectOption("Restaurants");
  await page.getByRole("button", { name: "Set category" }).click();
  await expect(page.getByText("2 selected transactions recategorized.")).toBeVisible();
  await page.getByLabel("Category filter").selectOption("Restaurants");
  await expect(page.getByText("Costco")).toBeVisible();
  await expect(page.getByText("Apple Music")).toBeVisible();
  await page.getByLabel("Category filter").selectOption("all");

  await page.getByPlaceholder("Trader Joe's").fill("Local Bookstore");
  await page.getByPlaceholder("-42.18").fill("-31.45");
  await page.getByPlaceholder("tax, reimbursable").fill("tax, reimbursable");
  await page.getByRole("button", { name: "Save transaction" }).click();

  await expect(page.getByText("Local Bookstore")).toBeVisible();
  await page.getByLabel("Tag filter").selectOption("tax");
  await expect(page.getByText("Local Bookstore")).toBeVisible();
  await page.getByLabel("Tag filter").selectOption("all");
  await page.getByLabel("Tags for Local Bookstore").fill("tax, audit");
  await page.getByLabel("Tags for Local Bookstore").blur();
  await page.getByLabel("Tag filter").selectOption("audit");
  await expect(page.getByText("Local Bookstore")).toBeVisible();
  await page.getByLabel("Tag filter").selectOption("all");
  await page.getByLabel("Account filter").selectOption("Operating Checking");
  await expect(page.getByText("Local Bookstore")).toBeVisible();
  await page.getByLabel("Category filter").selectOption("Groceries");
  await expect(page.getByText("Local Bookstore")).toBeVisible();
  await page.getByLabel("Account filter").selectOption("all");
  await page.getByLabel("Category filter").selectOption("all");
  await page.getByLabel("Transfer status for Local Bookstore").selectOption("transfer");
  await expect(page.getByLabel("Transfer status for Local Bookstore")).toHaveValue("transfer");
  await page.getByRole("button", { name: "Edit Local Bookstore" }).click();
  await page.getByLabel("Edit transaction merchant").fill("Local Bookstore Updated");
  await page.getByLabel("Edit transaction amount").fill("-32.10");
  await page.getByLabel("Edit transaction notes").fill("Receipt checked");
  await page.getByRole("button", { name: "Save edit" }).click();
  await expect(page.getByText("Local Bookstore Updated")).toBeVisible();
  await expect(page.getByRole("row", { name: /Local Bookstore Updated/ }).getByText("-$32.10")).toBeVisible();
  await page.getByRole("button", { name: "Delete Local Bookstore Updated" }).click();
  await expect(page.getByText("Local Bookstore Updated deleted.")).toBeVisible();
  await expect(page.getByText("Local Bookstore Updated", { exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Restore" }).click();
  await expect(page.getByText("Local Bookstore Updated", { exact: true })).toBeVisible();
});

test("imports page supports local staged row", async ({ page }) => {
  await page.goto("/imports");

  await expect(page.getByRole("heading", { name: "Imports" })).toBeVisible();
  await expect(page.getByText("Import review")).toBeVisible();
  await page.getByPlaceholder("Bank CSV").fill("Bookstore CSV");
  await page.getByRole("button", { name: "Save mapping" }).click();
  await expect(page.getByRole("button", { name: "Save mapping" })).toBeVisible();

  await page.getByLabel("Stage CSV file").setInputFiles({
    name: "checking-import.csv",
    mimeType: "text/csv",
    buffer: Buffer.from("Date,Description,Amount,Category\n2026-05-27,LOCAL CSV COFFEE,-4.25,Restaurants\n2026-05-27,LOCAL CSV COFFEE,-4.25,Restaurants"),
  });

  await expect(page.getByText("LOCAL CSV COFFEE")).toHaveCount(2);
  await expect(page.getByLabel("Status for row 3")).toHaveValue("duplicate");

  await page.getByRole("button", { name: "Add sample row" }).click();

  await expect(page.getByText("NEW CSV ROW")).toBeVisible();
  await expect(page.getByRole("button", { name: "Commit import" })).toBeVisible();
});

test("settings page supports ledger settings edits", async ({ page }) => {
  await page.goto("/settings");

  await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();
  await expect(page.getByText("Display name")).toBeVisible();
  await page.getByRole("button", { name: "Ledger" }).click();
  await expect(page.getByText("Ledger name")).toBeVisible();
  await page.getByRole("button", { name: "Data & exports" }).click();
  await expect(page.getByText("Backup and portability log")).toBeVisible();
  await expect(page.getByRole("link", { name: "Transactions CSV" })).toHaveAttribute("href", "/api/exports?format=transactions_csv");
  await expect(page.getByRole("link", { name: "Backup package" })).toHaveAttribute("href", "/api/exports?format=backup_package");
  await page.getByRole("button", { name: "Audit trail" }).click();
  await expect(page.getByText("Recent control events")).toBeVisible();
  await page.getByRole("button", { name: "Ledger" }).click();

  await page.getByPlaceholder("Personal ledger").fill("Forensic Ledger");
  await page.getByRole("button", { name: /Save ledger|Saving/ }).click();

  await expect(page.getByPlaceholder("Personal ledger")).toHaveValue("Forensic Ledger");
});

test("review, cashflow, and net worth pages render", async ({ page }) => {
  await page.goto("/review");
  await expect(page.getByRole("heading", { name: "Review", exact: true })).toBeVisible();
  await expect(page.getByText("remaining")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Costco" })).toBeVisible();
  await expect(page.getByText("Similar transactions", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Mark reviewed" }).click();
  await expect(page.getByText(/Costco reviewed as|Costco marked reviewed/)).toBeVisible();
  await expect(page.getByText("Recently reviewed")).toBeVisible();
  await page.getByRole("button", { name: /Costco/ }).last().click();
  await expect(page.getByText("Review decision undone.")).toBeVisible();

  await page.goto("/rules");
  await expect(page.getByRole("heading", { name: "Rules" })).toBeVisible();
  await expect(page.getByText("Classification control file")).toBeVisible();
  await page.getByPlaceholder("Professional Dues").fill("Professional Dues");
  await page.getByRole("button", { name: "Add category" }).click();
  const customCategories = page.getByLabel("Custom categories");
  await expect(customCategories.getByLabel("Name for Professional Dues")).toBeVisible();
  await customCategories.getByLabel("Name for Professional Dues").fill("Professional Fees");
  await customCategories.getByRole("button", { name: "Save" }).click();
  await expect(customCategories.getByLabel("Name for Professional Fees")).toBeVisible();
  await customCategories.getByRole("button", { name: "Archive" }).click();
  await expect(customCategories.getByRole("button", { name: "Restore" })).toBeVisible();
  await page.getByPlaceholder("Apple subscriptions").fill("Bookstore rule");
  await page.getByPlaceholder("APPLE.COM/BILL").fill("LOCAL BOOKSTORE");
  await page.getByRole("button", { name: "Save rule" }).click();
  await expect(page.getByText("Bookstore rule")).toBeVisible();
  await page.getByRole("button", { name: "Apply rules" }).click();
  await expect(page.getByText(/transactions|Demo preview/)).toBeVisible();

  await page.goto("/cashflow");
  await expect(page.getByRole("heading", { name: "Cashflow" })).toBeVisible();
  await expect(page.getByText("Category movement")).toBeVisible();
  await expect(page.getByRole("link", { name: /Outflow/ })).toHaveAttribute("href", "/transactions?direction=outflow");
  await page.goto("/transactions?category=Shopping");
  await expect(page.getByLabel("Category filter")).toHaveValue("Shopping");
  await expect(page.getByText("Costco")).toBeVisible();
  await expect(page.getByText("Payroll deposit")).toHaveCount(0);

  await page.goto("/net-worth");
  await expect(page.getByRole("heading", { name: "Net Worth" })).toBeVisible();
  await expect(page.getByText("Account position")).toBeVisible();
  await expect(page.getByText("Position evidence")).toBeVisible();
  await expect(page.getByText("Transaction-derived").first()).toBeVisible();
  await expect(page.getByRole("link", { name: /Rewards Card/ })).toHaveAttribute("href", "/accounts?account=Rewards%20Card");
  await page.getByRole("link", { name: /Rewards Card/ }).click();
  await expect(page.getByRole("heading", { name: "Rewards Card" })).toBeVisible();
  await expect(page.getByRole("link", { name: /Transactions 2 rows/ })).toHaveAttribute("href", "/transactions?account=Rewards%20Card");
});
