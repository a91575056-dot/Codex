import { test, expect } from "@playwright/test";
test("PWA advertises standalone installation and demo quick capture cannot save", async ({
  page,
  request,
}) => {
  const manifest = await request.get("/manifest.webmanifest");
  expect(manifest.ok()).toBe(true);
  const value = await manifest.json();
  expect(value.display).toBe("standalone");
  expect(value.start_url).toBe("/?source=homescreen");
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

test("mobile menu supports swipes, keyboard dismissal and quick navigation", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/demo");
  const menu = page.locator("#sidebar");
  const swipe = async (x: number, y: number, endX: number, endY: number) => {
    await page.locator("main").dispatchEvent("touchstart", {
      touches: [{ identifier: 1, clientX: x, clientY: y }],
    });
    await page.locator("main").dispatchEvent("touchend", {
      changedTouches: [{ identifier: 1, clientX: endX, clientY: endY }],
    });
  };
  await swipe(25, 200, 30, 500);
  await expect(menu).not.toBeVisible();
  await swipe(180, 200, 320, 200);
  await expect(menu).not.toBeVisible();
  await swipe(25, 200, 170, 210);
  await expect(menu).toBeVisible();
  await expect(page.locator(".main-shell")).toHaveAttribute("inert", "");
  await expect(
    menu.getByRole("button", { name: "Închide meniul" }),
  ).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(menu.locator("a:visible").last()).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(menu).not.toBeVisible();
  await expect(page.locator(".main-shell")).not.toHaveAttribute("inert", "");
  await page
    .locator(".mobile-tabs")
    .getByRole("button", { name: "Deschide meniul" })
    .click();
  await swipe(200, 220, 50, 225);
  await expect(menu).not.toBeVisible();
  await page
    .locator(".mobile-tabs")
    .getByRole("link", { name: "Tranzacții" })
    .click();
  await expect(page).toHaveURL(/\/demo\/transactions$/);
  await expect(
    page.locator(".mobile-tabs").getByRole("link", { name: "Tranzacții" }),
  ).toHaveAttribute("aria-current", "page");
  await expect(page.locator(".mobile-tabs")).toHaveCSS("position", "fixed");
  await page.screenshot({
    path: "artifacts/mobile-navigation.png",
    fullPage: true,
  });
});

test("pull refresh and Home perform fresh document loads", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/demo");
  let documents = 0;
  page.on("request", (request) => {
    if (request.isNavigationRequest() && request.frame() === page.mainFrame())
      documents++;
  });
  const pull = async (amount: number) => {
    const main = page.locator("main");
    await main.dispatchEvent("touchstart", {
      touches: [{ identifier: 1, clientX: 180, clientY: 200 }],
    });
    await main.dispatchEvent("touchmove", {
      cancelable: true,
      touches: [{ identifier: 1, clientX: 180, clientY: 200 + amount }],
    });
  };
  await pull(60);
  await expect(page.getByRole("status")).toContainText("Trage în jos");
  await page.locator("main").dispatchEvent("touchend");
  expect(documents).toBe(0);
  await pull(170);
  await expect(page.getByRole("status")).toContainText("Eliberează");
  await Promise.all([
    page.waitForEvent("load"),
    page.locator("main").dispatchEvent("touchend"),
  ]);
  expect(documents).toBe(1);
  await page
    .locator(".mobile-bar")
    .getByRole("button", { name: "Deschide meniul" })
    .click();
  await expect(page.locator("#sidebar")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator("#sidebar")).not.toBeVisible();
  await page.evaluate(() => window.scrollTo(0, 250));
  await Promise.all([
    page.waitForEvent("load"),
    page
      .locator(".mobile-tabs")
      .getByRole("link", { name: "Panou", exact: true })
      .click({ position: { x: 5, y: 5 } }),
  ]);
  await expect(page).toHaveURL(/\/demo$/);
  expect(await page.evaluate(() => window.scrollY)).toBe(0);
  expect(documents).toBe(2);
  await page.goto("/demo/transactions");
  await Promise.all([
    page.waitForEvent("load"),
    page
      .locator(".mobile-tabs")
      .getByRole("link", { name: "Panou", exact: true })
      .click({ position: { x: 5, y: 5 } }),
  ]);
  await expect(page).toHaveURL(/\/demo$/);
});
