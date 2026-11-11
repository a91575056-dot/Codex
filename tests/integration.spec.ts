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
  await form.getByLabel("Sold inițial (MDL)").fill("1000");
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
    await f.getByLabel("Sumă (MDL)").fill(amount);
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
  await form.getByLabel("Limită lunară (MDL)").fill("80");
  await form.getByRole("button", { name: "Adaugă înregistrarea" }).click();
  await expect(page.getByText("Buget depășit", { exact: true })).toBeVisible();
  await page.goto("/investments");
  form = card(page, "Înregistrează un activ");
  await form.getByLabel("Numele activului").fill("ETF educație");
  await form.getByLabel("Cantitate", { exact: true }).fill("2,5");
  await form.getByLabel("Cost mediu pe unitate (MDL)").fill("100");
  await form.getByLabel("Preț introdus pe unitate (MDL)").fill("120");
  await form.getByRole("button", { name: "Adaugă înregistrarea" }).click();
  await expect(
    page.getByRole("heading", { name: "ETF educație", exact: true }),
  ).toBeVisible();
  const position = card(page, "ETF educație");
  await position
    .getByText("Actualizează poziția sau prețul", { exact: true })
    .click();
  await position.getByLabel("Preț introdus pe unitate (MDL)").fill("130");
  await position.getByRole("button", { name: "Salvează modificările" }).click();
  await expect(position.getByText("325 MDL", { exact: true })).toBeVisible();
  await page.goto("/goals");
  form = card(page, "Un obiectiv nou");
  await form.getByLabel("Numele obiectivului").fill("Laptop test");
  await form.getByLabel("Suma țintă (MDL)").fill("3000");
  await form.getByLabel("Termen dorit").fill("2027-12-31");
  await form.getByRole("button", { name: "Creează obiectivul" }).click();
  await expect(
    page.getByRole("heading", { name: "Laptop test", exact: true }),
  ).toBeVisible();
  const goal = card(page, "Laptop test");
  await goal.getByText("Adaugă o contribuție", { exact: true }).click();
  await goal.getByLabel("Contribuție (MDL)").fill("500");
  await goal.getByRole("button", { name: "Înregistrează contribuția" }).click();
  await expect(
    goal.getByText("500 MDL", { exact: true }).first(),
  ).toBeVisible();
  await goal.getByRole("link", { name: "Simulează acest obiectiv" }).click();
  await expect(
    page.getByLabel("Economii deja dedicate obiectivului (MDL)"),
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
  await expect(page.getByText("1.899,5 MDL", { exact: true })).toBeVisible();
  const promise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Descarcă raportul CSV" }).click();
  const download = await promise;
  const stream = await download.createReadStream();
  let csv = "";
  for await (const c of stream!) csv += c.toString();
  expect(csv).toContain("Curs de programare");
  expect(csv).not.toContain("Venit istoric");
  await page.goto("/");
  await expect(page.getByText("5.899,5 MDL", { exact: true })).toBeVisible();
  await expect(page.getByText("325 MDL", { exact: true })).toBeVisible();
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

test("iPhone quick expense uses a personal profile, records cash/card, retries idempotently and remembers accounts", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await login(page, "b@fintrack.invalid");
  await page.goto("/settings");
  let f = card(page, "Profilul tău");
  await f.getByLabel("Nume afișat").fill("Dionis");
  await f.getByRole("button", { name: "Salvează numele" }).click();
  await expect(f.getByRole("status")).toHaveText(
    "Numele profilului a fost actualizat.",
  );
  f = card(page, "Adaugă un cont");
  await f.getByLabel("Numele contului").fill("Portofel Dionis");
  await f.getByRole("button", { name: "Adaugă înregistrarea" }).click();
  await expect(
    page.getByRole("heading", { name: "Portofel Dionis", exact: true }),
  ).toBeVisible();
  await page.goto("/quick-expense");
  await expect(page.getByText(/Cont personal: Dionis/)).toBeVisible();
  await page.getByRole("button", { name: "Cash", exact: true }).click();
  await page
    .getByRole("combobox", { name: "Din ce cont?" })
    .selectOption({ label: "Portofel Dionis" });
  await page
    .getByRole("combobox", { name: "Pe ce ai cheltuit?" })
    .selectOption({ label: "Alimente" });
  await page.getByLabel("Suma cheltuită (MDL)").fill("25,50");
  await page.getByLabel("Detalii (opțional)").fill("Cafea rapidă Cash");
  const request = await page.locator("input[name=request_id]").inputValue();
  await page.getByRole("button", { name: "Salvează cheltuiala" }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Salvat:" }),
  ).toBeVisible();
  await expect(page.getByLabel("Suma cheltuită (MDL)")).toHaveValue("");
  await page
    .getByRole("combobox", { name: "Pe ce ai cheltuit?" })
    .selectOption({ label: "Alimente" });
  await page.getByLabel("Suma cheltuită (MDL)").fill("25,50");
  await page.getByLabel("Detalii (opțional)").fill("Cafea rapidă Cash");
  await page.locator("input[name=request_id]").evaluate((element, value) => {
    (element as HTMLInputElement).value = value;
  }, request);
  await page.getByRole("button", { name: "Salvează cheltuiala" }).click();
  await expect(
    page.getByRole("button", { name: "Salvează cheltuiala" }),
  ).toBeEnabled();
  await expect(page.getByLabel("Suma cheltuită (MDL)")).toHaveValue("");
  await page.goto("/transactions");
  await expect(
    page.getByRole("heading", { name: "Cafea rapidă Cash", exact: true }),
  ).toHaveCount(1);
  await expect(
    page
      .locator(".ledger-item")
      .filter({ has: page.getByRole("heading", { name: "Cafea rapidă Cash" }) })
      .getByText(/Cash/)
      .first(),
  ).toBeVisible();
  await page.goto("/quick-expense");
  await page.getByRole("button", { name: "Card", exact: true }).click();
  await page
    .getByRole("combobox", { name: "Din ce cont?" })
    .selectOption({ label: "Cont personal" });
  await page
    .getByRole("combobox", { name: "Pe ce ai cheltuit?" })
    .selectOption({ label: "Alimente" });
  await page.getByLabel("Suma cheltuită (MDL)").fill("10");
  await page.getByLabel("Detalii (opțional)").fill("Plată rapidă Card");
  await page.getByRole("button", { name: "Salvează cheltuiala" }).click();
  await expect(page.getByLabel("Suma cheltuită (MDL)")).toHaveValue("");
  await page.reload();
  await expect(
    page
      .getByRole("combobox", { name: "Din ce cont?" })
      .locator("option:checked"),
  ).toHaveText("Cont personal");
  await page.getByRole("button", { name: "Cash", exact: true }).click();
  await expect(
    page
      .getByRole("combobox", { name: "Din ce cont?" })
      .locator("option:checked"),
  ).toHaveText("Portofel Dionis");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "artifacts/iphone-quick-expense.png",
    fullPage: true,
  });
  await page.goto("/reports");
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Descarcă raportul CSV" }).click();
  const file = await downloadPromise;
  const stream = await file.createReadStream();
  let csv = "";
  for await (const chunk of stream!) csv += chunk.toString();
  expect(csv).toContain("Cash");
  expect(csv).toContain("Card");
  expect(csv).not.toContain("Curs de programare");
});

test("signup explains the provider email limit and retains entered values", async ({
  page,
}) => {
  await page.goto("/auth/register");
  await page.getByLabel("Numele tău").fill("Cont test");
  await page
    .getByLabel("Email", { exact: true })
    .fill("rate-limit@fintrack.invalid");
  await page.getByLabel("Parolă", { exact: true }).fill("FixturePassword2026!");
  await page.getByRole("button", { name: "Creează cont", exact: true }).click();
  await expect(page.locator(".form-error[role=alert]")).toContainText(
    "limita de trimitere a emailurilor",
  );
  await expect(page.getByLabel("Numele tău")).toHaveValue("Cont test");
  await expect(page.getByLabel("Email", { exact: true })).toHaveValue(
    "rate-limit@fintrack.invalid",
  );
  await expect(page.getByLabel("Parolă", { exact: true })).toHaveValue(
    "FixturePassword2026!",
  );
});

test("EUR savings use their own currency and stay separate from the MDL ledger", async ({
  page,
}) => {
  await login(page, "b@fintrack.invalid");
  await page.goto("/goals");
  const form = card(page, "Un obiectiv nou");
  await form.getByLabel("Moneda obiectivului").selectOption("EUR");
  await form.getByLabel("Numele obiectivului").fill("Economii euro vacanță");
  await form.getByLabel("Suma țintă (EUR)").fill("2000");
  await form.getByLabel("Termen dorit").fill("2027-12-31");
  await form.getByRole("button", { name: "Creează obiectivul" }).click();
  const goal = card(page, "Economii euro vacanță");
  await expect(goal.getByText("din 2.000 EUR", { exact: true })).toBeVisible();
  await goal.getByText("Adaugă o contribuție", { exact: true }).click();
  await goal.getByLabel("Contribuție (EUR)").fill("125,50");
  await goal.getByRole("button", { name: "Înregistrează contribuția" }).click();
  await expect(goal.locator(".goal-value strong")).toHaveText("125,5 EUR");
  await expect(
    goal.getByRole("link", { name: "Simulează acest obiectiv" }),
  ).toHaveCount(0);
  await expect(page.getByLabel("Economii pe monede")).toContainText(
    "Economii dedicate EUR: 125,5 EUR",
  );
  await expect(page.getByLabel("Economii pe monede")).toContainText(
    "Economii dedicate MDL: 0 MDL",
  );
  await goal.getByText("Editează obiectivul", { exact: true }).click();
  await expect(goal.locator("select[name=currency]")).toHaveCount(0);
  const goalId = await goal.locator("input[name=id]").first().inputValue();
  await page.goto(`/decision-lab?goal=${goalId}`);
  await expect(
    page.getByRole("heading", { name: "Obiectiv în EUR" }),
  ).toBeVisible();
  await page.goto("/reports");
  await expect(page.getByText("125,5 EUR", { exact: true })).toHaveCount(0);
});

test("native iPhone shortcut pairs once, saves without browser cookies, retries safely and can be revoked", async ({
  page,
  request,
  browser,
}) => {
  await login(page, "a@fintrack.invalid");
  await page.goto("/settings");
  const account = card(page, "Adaugă un cont");
  await account.getByLabel("Numele contului").fill("Cash Shortcut");
  await account.getByRole("button", { name: "Adaugă înregistrarea" }).click();
  await expect(
    page.getByRole("heading", { name: "Cash Shortcut", exact: true }),
  ).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/iphone");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.getByLabel("Numele telefonului").fill("iPhone test nativ");
  await page
    .getByLabel("Cont pentru Cash")
    .selectOption({ label: "Cash Shortcut · MDL" });
  await page
    .getByLabel("Cont pentru Card")
    .selectOption({ label: "Cont personal · MDL" });
  await page
    .getByRole("button", { name: "Conectează telefonul", exact: true })
    .click();
  const secretInput = page.getByLabel("Tokenul telefonului", { exact: true });
  await expect(secretInput).toHaveValue(/^ft_sc_[a-f0-9]{64}$/);
  const token = await secretInput.inputValue();
  const headers = { Authorization: "Bearer " + token };
  await page
    .getByRole("button", { name: "Am copiat — ascunde tokenul" })
    .click();
  await expect(secretInput).toHaveCount(0);
  await page.reload();
  await expect(secretInput).toHaveCount(0);
  let response = await request.post("/api/shortcut/options");
  expect(response.status()).toBe(401);
  expect(response.headers()["cache-control"]).toContain("no-store");
  response = await request.post("/api/shortcut/options", { headers });
  expect(response.status()).toBe(200);
  const options = await response.json();
  expect(options.currency).toBe("MDL");
  expect(options.categories.Salariu).toBeUndefined();
  const payload = {
    request_id: "native-expense-0001",
    amount: "37,25",
    payment_method: "cash",
    category_id: options.categories.Alimente,
    description: "Cheltuială Shortcut Cash",
  };
  response = await request.post("/api/shortcut/expenses", {
    headers,
    data: payload,
  });
  expect(response.status()).toBe(201);
  const saved = await response.json();
  expect(saved.amount_minor).toBe(3725);
  expect(saved.replayed).toBe(false);
  response = await request.post("/api/shortcut/expenses", {
    headers,
    data: payload,
  });
  expect(response.status()).toBe(200);
  expect((await response.json()).transaction_id).toBe(saved.transaction_id);
  expect(
    (
      await request.post("/api/shortcut/expenses", {
        headers,
        data: { ...payload, amount: "99" },
      })
    ).status(),
  ).toBe(409);
  expect(
    (
      await request.post("/api/shortcut/expenses", {
        headers,
        data: { ...payload, amount: "1.234" },
      })
    ).status(),
  ).toBe(422);
  expect(
    (
      await request.post("/api/shortcut/expenses", {
        headers,
        data: { ...payload, user_id: "forged" },
      })
    ).status(),
  ).toBe(422);
  expect(
    (
      await request.post("/api/shortcut/expenses", {
        headers: { ...headers, "content-type": "application/json" },
        data: Buffer.from("{"),
      })
    ).status(),
  ).toBe(400);
  expect(
    (
      await request.post("/api/shortcut/expenses", {
        headers: { ...headers, "content-type": "text/plain" },
        data: "hello",
      })
    ).status(),
  ).toBe(415);
  expect(
    (
      await request.post("/api/shortcut/expenses", {
        headers,
        data: { ...payload, description: "x".repeat(9000) },
      })
    ).status(),
  ).toBe(413);
  expect((await request.get("/api/shortcut/expenses")).status()).toBe(405);
  response = await request.post("/api/shortcut/expenses", {
    headers,
    data: {
      ...payload,
      request_id: "native-expense-0002",
      amount: 10.5,
      payment_method: "card",
      description: "Cheltuială Shortcut Card",
    },
  });
  expect(response.status()).toBe(201);
  await page.goto("/transactions");
  await expect(
    page.getByRole("heading", {
      name: "Cheltuială Shortcut Cash",
      exact: true,
    }),
  ).toHaveCount(1);
  const cash = page.locator(".ledger-item").filter({
    has: page.getByRole("heading", {
      name: "Cheltuială Shortcut Cash",
      exact: true,
    }),
  });
  await expect(cash).toContainText("Cash Shortcut");
  await expect(cash).toContainText("37,25 MDL");
  const otherContext = await browser.newContext();
  const other = await otherContext.newPage();
  await login(other, "b@fintrack.invalid");
  await other.goto("/iphone");
  await expect(
    other.getByRole("heading", { name: "iPhone test nativ", exact: true }),
  ).toHaveCount(0);
  await otherContext.close();
  await page.goto("/iphone");
  const device = card(page, "iPhone test nativ");
  await device.getByText("Revocă accesul", { exact: true }).click();
  await device
    .getByLabel("Confirm revocarea accesului acestui telefon")
    .check();
  await device
    .getByRole("button", { name: "Revocă telefonul", exact: true })
    .click();
  await expect(device).toHaveCount(0);
  expect(
    (await request.post("/api/shortcut/options", { headers })).status(),
  ).toBe(401);
  expect(
    (
      await request.post("/api/shortcut/expenses", { headers, data: payload })
    ).status(),
  ).toBe(401);
  await page.goto("/transactions");
  await expect(
    page.getByRole("heading", {
      name: "Cheltuială Shortcut Cash",
      exact: true,
    }),
  ).toHaveCount(1);
});
