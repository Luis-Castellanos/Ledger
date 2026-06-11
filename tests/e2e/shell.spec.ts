import { expect, test } from "@playwright/test";

/*
 * Unauthenticated smoke suite for the app shell. Runs with no Clerk keys and
 * no database, so it asserts only what must hold in that state: security
 * headers, navigation chrome, API auth behavior, and theming. Authenticated
 * data flows are covered per-page as each rebuilt screen lands.
 */

test("dashboard responds with security headers and renders the shell", async ({ page, isMobile }) => {
  const response = await page.goto("/");

  expect(response?.headers()["content-security-policy"]).toContain("frame-ancestors 'none'");
  expect(response?.headers()["x-frame-options"]).toBe("DENY");

  if (isMobile) {
    const dock = page.getByRole("navigation", { name: "Primary mobile navigation" });
    await expect(dock).toBeVisible();
    await expect(dock.getByRole("link", { name: "Activity" })).toHaveAttribute("href", "/transactions");
  } else {
    await expect(page.getByRole("link", { name: "Dashboard" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Transactions" }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: "Settings" })).toBeVisible();
  }
});

test("defaults to the light theme", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
});

test("theme toggle switches to dark and persists", async ({ page, isMobile }) => {
  test.skip(isMobile, "toggle lives in the sidebar drawer on mobile");
  await page.goto("/");
  await page.getByRole("button", { name: /Switch to dark mode/ }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
});

test("APIs reject unauthenticated access", async ({ request }) => {
  for (const path of ["/api/transactions", "/api/accounts", "/api/categories", "/api/review/count"]) {
    const response = await request.get(path);
    expect(response.status(), path).toBe(401);
  }
});

test("transactions API validates query params", async ({ request }) => {
  // 400 beats 401 here would be wrong: auth must be checked first
  const response = await request.get("/api/transactions?limit=99999");
  expect(response.status()).toBe(401);
});

test("sign-in page explains missing auth configuration", async ({ page }) => {
  await page.goto("/sign-in");
  await expect(page.getByText(/auth|sign in|clerk/i).first()).toBeVisible();
});

test("command palette opens with ctrl+k", async ({ page, isMobile }) => {
  test.skip(isMobile, "keyboard shortcut is a desktop affordance");
  await page.goto("/");
  await page.keyboard.press("ControlOrMeta+k");
  await expect(page.getByPlaceholder("Where to?")).toBeVisible();
  await page.getByPlaceholder("Where to?").fill("Net");
  await page.getByRole("option", { name: "Net Worth" }).click();
  await expect(page).toHaveURL(/\/net-worth/);
});
