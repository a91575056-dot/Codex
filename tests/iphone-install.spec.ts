import { test, expect } from "@playwright/test";
test("PWA advertises standalone installation and demo quick capture cannot save", async ({
  page,
  request,
}) => {
  const manifest = await request.get("/manifest.webmanifest");
  expect(manifest.ok()).toBe(true);
  const value = await manifest.json();
  expect(value.display).toBe("standalone");
  expect(value.start_url).toContain("/quick-expense");
  for (const icon of value.icons) {
    expect((await request.get(icon.src)).ok()).toBe(true);
  }
  await page.goto("/install");
  await expect(
    page.getByRole("heading", { name: "FinTrack pe iPhone" }),
  ).toBeVisible();
  await expect(
    page.locator("meta[name=apple-mobile-web-app-capable]"),
  ).toHaveAttribute("content", "yes");
  await page.goto("/quick-expense");
  await expect(
    page.getByRole("button", { name: "Salvează cheltuiala" }),
  ).toBeDisabled();
  await expect(
    page.getByText("Date fictive — nu este contul tău personal"),
  ).toBeVisible();
  await page.goto("/iphone");
  await expect(
    page.getByRole("heading", { name: "iPhone și scurtături" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Conectează telefonul", exact: true }),
  ).toHaveCount(0);
  expect((await request.post("/api/shortcut/options")).status()).toBe(401);
  expect(
    (
      await request.post("/api/shortcut/options", {
        headers: { Authorization: "Bearer ft_sc_" + "a".repeat(64) },
      })
    ).status(),
  ).toBe(503);
});
