import { test, expect } from "@playwright/test";
test("configured app protects financial routes and exposes a separate read-only demo", async ({
  page,
}) => {
  for (const path of [
    "/",
    "/transactions",
    "/transfers",
    "/debts",
    "/recurring",
    "/import",
    "/quick-expense",
    "/iphone",
    "/decision-lab",
    "/goals",
    "/analytics",
    "/reports",
    "/settings",
    "/budgets",
    "/investments",
    "/auth/update-password",
  ]) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/auth\/login/);
    await expect(
      page.getByRole("heading", { name: "Conectare" }),
    ).toBeVisible();
  }
  await page.goto("/demo");
  await expect(
    page.getByText("Mod demonstrativ", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("navigation")
    .getByRole("link", { name: "Tranzacții", exact: true })
    .click();
  await expect(page).toHaveURL("/demo/transactions");
  await expect(
    page.getByRole("heading", { name: "Toate tranzacțiile demo" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Adaugă tranzacția" }),
  ).toHaveCount(0);
  await page.goto("/auth/register");
  await expect(
    page.getByRole("heading", { name: "Creează un cont FinTrack" }),
  ).toBeVisible();
  await expect(page.getByLabel("Email", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Parolă", { exact: true })).toHaveAttribute(
    "minlength",
    "8",
  );
  await page.goto("/auth/callback");
  await expect(page).toHaveURL(/error=confirmation/);
  await expect(
    page.getByRole("alert").filter({ hasText: "Linkul de confirmare" }),
  ).toBeVisible();
  await page.goto("/auth/confirm?type=email");
  await expect(page).toHaveURL(/error=confirmation/);
});
