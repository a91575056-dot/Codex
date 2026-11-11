import { test, expect } from "@playwright/test";
test("dashboard, all navigation destinations and demo export", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Bună, Alex 👋" }),
  ).toBeVisible();
  await expect(page.locator(".recharts-surface").first()).toBeVisible();
  const sections = [
    ["Tranzacții", "/transactions"],
    ["Bugete", "/budgets"],
    ["Investiții", "/investments"],
    ["Analize", "/analytics"],
    ["Rapoarte", "/reports"],
    ["Setări", "/settings"],
  ];
  for (const [label, url] of sections) {
    await page
      .getByRole("navigation")
      .getByRole("link", { name: label, exact: true })
      .click();
    await expect(page).toHaveURL(url);
    await expect(
      page.getByRole("heading", { name: label, exact: true }),
    ).toBeVisible();
    await expect(
      page
        .getByRole("navigation")
        .getByRole("link", { name: label, exact: true }),
    ).toHaveAttribute("aria-current", "page");
  }
  await page.goto("/reports");
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Descarcă raportul demo" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("fintrack-demo-noiembrie-2026.csv");
  const stream = await download.createReadStream();
  let contents = "";
  for await (const chunk of stream!) contents += chunk.toString();
  expect(contents).toContain("DEMO — Date fictive");
  expect(contents).toContain("10500");
  await page.goto("/ruta-inexistenta");
  await expect(
    page.getByRole("heading", { name: "Pagina nu a fost găsită" }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});
test("mobile menu navigates and pages fit the viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "Deschide meniul" }).click();
  await page
    .getByRole("navigation")
    .getByRole("link", { name: "Tranzacții", exact: true })
    .click();
  await expect(page).toHaveURL("/transactions");
  await expect(
    page.getByRole("button", { name: "Deschide meniul" }),
  ).toHaveAttribute("aria-expanded", "false");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.goto("/");
  await page.screenshot({
    path: "artifacts/fintrack-mobile.png",
    fullPage: true,
  });
});
test("desktop dashboard screenshot", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1100 });
  await page.goto("/");
  await expect(page.locator(".recharts-surface").first()).toBeVisible();
  await page.screenshot({
    path: "artifacts/fintrack-dashboard.png",
    fullPage: true,
  });
});
