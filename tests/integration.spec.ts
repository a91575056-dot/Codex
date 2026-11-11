import { test, expect, type Page } from "@playwright/test";
const today = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Chisinau",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
const card = (page: Page, title: string) =>
  page
    .locator("[data-slot=card]")
    .filter({ has: page.getByRole("heading", { name: title, exact: true }) });
async function login(page: Page, email: string) {
  await page.goto("/auth/login");
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Parolă", { exact: true }).fill("FinTrackFixture2026!");
  await page
    .getByRole("button", { name: "Conectează-te", exact: true })
    .click();
  await expect(page).toHaveURL("/");
  await expect(
    page.getByRole("heading", { name: "Finanțele tale" }),
  ).toBeVisible();
}
test("connected UI: accounts, categories, transactions, budgets, investments, goals, saved plans, reports and user isolation", async ({
  page,
  browser,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await login(page, "a@fintrack.invalid");
  await page.goto("/settings");
  let form = card(page, "Adaugă un cont");
  await form.getByLabel("Numele contului").fill("Numerar test");
  await form.getByLabel("Sold inițial (RON)").fill("1000");
  await form.getByRole("button", { name: "Adaugă înregistrarea" }).click();
  await expect(
    page.getByRole("heading", { name: "Numerar test", exact: true }),
  ).toBeVisible();
  form = card(page, "Adaugă o categorie");
  await form.getByLabel("Numele categoriei").fill("Educație test");
  await form.getByRole("button", { name: "Adaugă înregistrarea" }).click();
  await expect(
    page.getByRole("heading", { name: "Educație test", exact: true }),
  ).toBeVisible();
  async function transaction(
    description: string,
    type: "income" | "expense",
    amount: string,
    date: string,
  ) {
    await page.goto("/transactions");
    const f = card(page, "Adaugă o tranzacție");
    await f.getByLabel("Descriere", { exact: true }).fill(description);
    await f
      .getByRole("combobox", { name: "Tip", exact: true })
      .selectOption(type);
    await f.getByLabel("Sumă (RON)").fill(amount);
    await f
      .getByRole("combobox", { name: "Cont", exact: true })
      .selectOption({ label: "Numerar test" });
    await f
      .getByRole("combobox", { name: "Categorie", exact: true })
      .selectOption({ label: type === "income" ? "Salariu" : "Educație test" });
    await f.getByLabel("Dată", { exact: true }).fill(date);
    await f
      .getByRole("button", { name: "Adaugă tranzacția", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: description, exact: true }),
    ).toBeVisible();
  }
  await transaction("Curs de programare", "expense", "100,50", today());
  await transaction("Venit curent", "income", "2000", today());
  const [year, month] = today().split("-").map(Number);
  const historical = new Date(Date.UTC(year, month - 2, 10))
    .toISOString()
    .slice(0, 10);
  await transaction("Venit istoric", "income", "7000", historical);
  await transaction("Cheltuială istorică", "expense", "4000", historical);
  await page.goto("/budgets");
  form = card(page, "Adaugă un buget");
  await form
    .getByLabel("Categorie de cheltuieli")
    .selectOption({ label: "Educație test" });
  await form.getByLabel("Limită lunară (RON)").fill("80");
  await form.getByRole("button", { name: "Adaugă înregistrarea" }).click();
  await expect(page.getByText("Buget depășit", { exact: true })).toBeVisible();
  await page.goto("/investments");
  form = card(page, "Înregistrează un activ");
  await form.getByLabel("Numele activului").fill("ETF educație");
  await form.getByLabel("Cantitate", { exact: true }).fill("2,5");
  await form.getByLabel("Cost mediu pe unitate (RON)").fill("100");
  await form.getByLabel("Preț introdus pe unitate (RON)").fill("120");
  await form.getByRole("button", { name: "Adaugă înregistrarea" }).click();
  await expect(
    page.getByRole("heading", { name: "ETF educație", exact: true }),
  ).toBeVisible();
  const position = card(page, "ETF educație");
  await position
    .getByText("Actualizează poziția sau prețul", { exact: true })
    .click();
  await position.getByLabel("Preț introdus pe unitate (RON)").fill("130");
  await position.getByRole("button", { name: "Salvează modificările" }).click();
  await expect(position.getByText("325 RON", { exact: true })).toBeVisible();
  await page.goto("/goals");
  form = card(page, "Un obiectiv nou");
  await form.getByLabel("Numele obiectivului").fill("Laptop test");
  await form.getByLabel("Suma țintă (RON)").fill("3000");
  await form.getByLabel("Termen dorit").fill("2027-12-31");
  await form.getByRole("button", { name: "Creează obiectivul" }).click();
  await expect(
    page.getByRole("heading", { name: "Laptop test", exact: true }),
  ).toBeVisible();
  const goal = card(page, "Laptop test");
  await goal.getByText("Adaugă o contribuție", { exact: true }).click();
  await goal.getByLabel("Contribuție (RON)").fill("500");
  await goal.getByRole("button", { name: "Înregistrează contribuția" }).click();
  await expect(
    goal.getByText("500 RON", { exact: true }).first(),
  ).toBeVisible();
  await goal.getByRole("link", { name: "Simulează acest obiectiv" }).click();
  await expect(
    page.getByLabel("Economii deja dedicate obiectivului (RON)"),
  ).toHaveValue("500.00");
  await page.getByLabel("Numele scenariului").fill("Plan laptop");
  await page
    .getByRole("button", { name: "Salvează scenariul pentru obiectiv" })
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: "Scenariul a fost salvat" }),
  ).toBeVisible();
  await page.goto("/goals");
  await expect(page.getByText("Plan laptop", { exact: true })).toBeVisible();
  await page.goto("/reports");
  await expect(page.getByText("1.899,5 RON", { exact: true })).toBeVisible();
  const promise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Descarcă raportul CSV" }).click();
  const download = await promise;
  const stream = await download.createReadStream();
  let csv = "";
  for await (const c of stream!) csv += c.toString();
  expect(csv).toContain("Curs de programare");
  expect(csv).not.toContain("Venit istoric");
  await page.goto("/");
  await expect(page.getByText("5.899,5 RON", { exact: true })).toBeVisible();
  await expect(page.getByText("325 RON", { exact: true })).toBeVisible();
  await page.screenshot({
    path: "artifacts/connected-dashboard.png",
    fullPage: true,
  });
  const context = await browser.newContext();
  const other = await context.newPage();
  await login(other, "b@fintrack.invalid");
  for (const path of ["/transactions", "/budgets", "/investments", "/goals"]) {
    await other.goto(path);
    await expect(
      other.getByText(
        /Curs de programare|ETF educație|Laptop test|Plan laptop/,
      ),
    ).toHaveCount(0);
  }
  await context.close();
  await page.goto("/investments");
  await position.getByText("Șterge înregistrarea", { exact: true }).click();
  await position.getByLabel("Confirm ștergerea").check();
  await position.getByRole("button", { name: "Șterge definitiv" }).click();
  await expect(
    page.getByRole("heading", { name: "ETF educație", exact: true }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Deconectare", exact: true }).click();
  await expect(page).toHaveURL("/auth/login");
  await page.goto("/reports");
  await expect(page).toHaveURL("/auth/login");
  expect(errors).toEqual([]);
});
