import { test, expect } from "@playwright/test";
test("demo goals show real-versus-plan math and load linked goal into the lab without writes", async ({
  page,
}) => {
  await page.goto("/demo/goals");
  await expect(page.locator(".goal-value")).toHaveCSS("display", "flex");
  await expect(
    page.getByRole("heading", { name: "Obiective de economisire" }),
  ).toBeVisible();
  await expect(
    page.getByRole("progressbar", { name: "Progres Fond de urgență · DEMO" }),
  ).toHaveAttribute("aria-valuenow", "55");
  await expect(page.getByText("5.950 RON", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Creează obiectivul" }),
  ).toHaveCount(0);
  await page.getByRole("link", { name: "Simulează acest obiectiv" }).click();
  await expect(page).toHaveURL(/\/demo\/decision-lab\?goal=/);
  await expect(page.getByLabel("Valoare obiectiv (RON)")).toHaveValue(
    "10000.00",
  );
  await expect(
    page.getByLabel("Economii deja dedicate obiectivului (RON)"),
  ).toHaveValue("5500.00");
  await expect(page.getByLabel("Valoare obiectiv (RON)")).toHaveAttribute(
    "readonly",
    "",
  );
  await expect(
    page.getByRole("button", { name: "Salvează scenariul pentru obiectiv" }),
  ).toHaveCount(0);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/demo/goals");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({ path: "artifacts/goals-mobile.png", fullPage: true });
});
