import { test, expect } from "@playwright/test";
test("recovery and resend forms are discoverable and demo does not send email", async ({
  page,
}) => {
  await page.goto("/auth/login");
  await page.getByRole("link", { name: "Am uitat parola" }).click();
  await expect(
    page.getByRole("heading", { name: "Recuperează accesul" }),
  ).toBeVisible();
  const form = page
    .locator("[data-slot=card]")
    .filter({
      has: page.getByRole("heading", {
        name: "Recuperează accesul",
        exact: true,
      }),
    });
  await form
    .getByLabel("Email", { exact: true })
    .fill("example@fintrack.invalid");
  await form.getByRole("button", { name: "Trimite emailul" }).click();
  await expect(
    page.getByRole("alert").filter({ hasText: "Supabase nu este configurat" }),
  ).toBeVisible();
  await page.goto("/auth/login");
  await page
    .getByRole("link", { name: "Retrimite confirmarea emailului" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Retrimite confirmarea" }),
  ).toBeVisible();
});
