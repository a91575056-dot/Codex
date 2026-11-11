import { test, expect } from "@playwright/test";
test("decision lab recalculates, explains, exports and resets a hypothetical decision", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/demo/decision-lab");
  await expect(
    page.getByRole("heading", { name: "Laborator de decizii" }),
  ).toBeVisible();
  await expect(page.getByTestId("lab-gain")).toHaveText("0 luni câștigate");
  const slider = page.getByRole("slider", { name: "Reducere Timp liber" });
  await expect(slider).toBeEnabled();
  await slider.fill("50");
  await expect(page.getByTestId("lab-gain")).toHaveText("2 luni câștigate");
  await expect(
    page.getByText("Impact marginal: 2 luni.", { exact: false }),
  ).toBeVisible();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: "artifacts/decision-lab-desktop.png",
    fullPage: true,
  });
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Exportă simularea" }).click();
  const download = await downloadPromise;
  const stream = await download.createReadStream();
  let text = "";
  for await (const c of stream!) text += c.toString();
  const report = JSON.parse(text);
  expect(report.result.planMonths).toBe(6);
  expect(report.result.stressMonths).toBe(36);
  await page.getByRole("button", { name: "Resetează" }).click();
  await expect(page.getByTestId("lab-gain")).toHaveText("0 luni câștigate");
  await page.getByLabel("Valoare obiectiv (MDL)").fill("abc");
  await expect(
    page.getByRole("alert").filter({ hasText: "Introdu sume" }),
  ).toBeVisible();
  await page.getByLabel("Valoare obiectiv (MDL)").fill("10000");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: "artifacts/decision-lab-mobile.png",
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
