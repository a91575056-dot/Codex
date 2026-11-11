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
  await form.getByLabel("Sold inițial (în moneda contului)").fill("1000");
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
    await f
      .getByRole("button", { name: "Adaugă o tranzacție", exact: true })
      .click();
    await f.getByLabel("Descriere", { exact: true }).fill(description);
    await f
      .getByRole("combobox", { name: "Tip", exact: true })
      .selectOption(type);
    await f.getByLabel("Sumă (MDL)").fill(amount);
    await f
      .getByRole("combobox", { name: "Cont", exact: true })
      .selectOption({ label: "Numerar test · MDL" });
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
  await form
    .getByRole("button", { name: "Adaugă investiție", exact: true })
    .click();
  await form.getByLabel("Numele activului").fill("ETF educație");
  await form.getByLabel("Cantitate", { exact: true }).fill("2,5");
  await form.getByLabel("Cost mediu pe unitate (MDL)").fill("100");
  await form.getByLabel("Preț introdus pe unitate (MDL)").fill("120");
  await form.getByRole("button", { name: "Adaugă înregistrarea" }).click();
  await expect(
    page.getByRole("heading", { name: "ETF educație", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Închide dialogul" })
    .click();
  const position = page.locator(".holding-row").filter({
    has: page.getByRole("heading", { name: "ETF educație", exact: true }),
  });
  await position
    .getByText("Actualizează poziția sau prețul", { exact: true })
    .click();
  await position.getByLabel("Preț introdus pe unitate (MDL)").fill("130");
  await position.getByRole("button", { name: "Salvează modificările" }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Închide dialogul" })
    .click();
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
  await expect(
    page.locator(".stats-grid").getByText("325 MDL", { exact: true }),
  ).toBeVisible();
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
  await position.getByRole("button", { name: "Actualizează poziția" }).click();
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
    .selectOption({ label: "Portofel Dionis · MDL" });
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
    .selectOption({ label: "Cont personal · MDL" });
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
  ).toHaveText("Cont personal · MDL");
  await page.getByRole("button", { name: "Cash", exact: true }).click();
  await expect(
    page
      .getByRole("combobox", { name: "Din ce cont?" })
      .locator("option:checked"),
  ).toHaveText("Portofel Dionis · MDL");
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
  let financeOptions = await (
    await request.post("/api/shortcut/finance-options", { headers })
  ).json();
  expect(financeOptions.income_enabled).toBe(false);
  expect(financeOptions.income_categories).toEqual({});
  const incomePayload = {
    ...payload,
    kind: "income",
    request_id: "native-income-0001",
    amount: "1250,50",
    description: "Salariu din Shortcut",
  };
  expect(
    (
      await request.post("/api/shortcut/transactions", {
        headers,
        data: incomePayload,
      })
    ).status(),
  ).toBe(403);
  await device
    .getByRole("button", { name: "Activează veniturile", exact: true })
    .click();
  await expect(
    device.getByRole("button", {
      name: "Dezactivează veniturile",
      exact: true,
    }),
  ).toBeVisible();
  financeOptions = await (
    await request.post("/api/shortcut/finance-options", { headers })
  ).json();
  expect(financeOptions.income_enabled).toBe(true);
  expect(financeOptions.income_categories.Bonus).toBeTruthy();
  incomePayload.category_id = financeOptions.income_categories.Salariu;
  response = await request.post("/api/shortcut/transactions", {
    headers,
    data: incomePayload,
  });
  expect(response.status()).toBe(201);
  const incomeReceipt = await response.json();
  expect(incomeReceipt.kind).toBe("income");
  expect(incomeReceipt.amount_minor).toBe(125050);
  expect(incomeReceipt.message).toContain("Venit salvat");
  expect(response.headers()["cache-control"]).toContain("no-store");
  expect(
    (
      await request.post("/api/shortcut/transactions", {
        headers,
        data: incomePayload,
      })
    ).status(),
  ).toBe(200);
  expect(
    (
      await request.post("/api/shortcut/transactions", {
        headers,
        data: { ...incomePayload, kind: "expense" },
      })
    ).status(),
  ).toBe(422);
  expect(
    (
      await request.post("/api/shortcut/transactions", {
        headers,
        data: { ...incomePayload, account_id: "forged" },
      })
    ).status(),
  ).toBe(422);
  // The unified expense endpoint shares idempotency with the original shortcut.
  expect(
    (
      await request.post("/api/shortcut/transactions", {
        headers,
        data: { ...payload, kind: "expense" },
      })
    ).status(),
  ).toBe(200);
  await page.goto("/transactions");
  await expect(
    page.getByRole("heading", { name: "Salariu din Shortcut", exact: true }),
  ).toHaveCount(1);
  await page.goto("/iphone");
  await device
    .getByRole("button", { name: "Dezactivează veniturile", exact: true })
    .click();
  await expect(
    device.getByRole("button", { name: "Activează veniturile", exact: true }),
  ).toBeVisible();
  expect(
    (
      await request.post("/api/shortcut/transactions", {
        headers,
        data: { ...incomePayload, request_id: "disabled-income-1" },
      })
    ).status(),
  ).toBe(403);
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

test("dashboard exposes income and every feature; opening balance stays distinct from earned income", async ({
  page,
}) => {
  await login(page, "c@fintrack.invalid");
  await page.goto("/settings");
  const initial = card(page, "Cont personal");
  await initial
    .getByText("Modifică numele sau soldul inițial", { exact: true })
    .click();
  await initial.getByLabel("Sold inițial (în moneda contului)").fill("10000");
  await initial
    .getByRole("button", { name: "Salvează modificările", exact: true })
    .click();
  await expect(initial.getByText("10.000 MDL", { exact: true })).toBeVisible();
  await page.goto("/");
  const incomeStat = page
    .locator(".stat-card")
    .filter({ hasText: "Venituri lunare" });
  const balanceStat = page
    .locator(".stat-card")
    .filter({ hasText: "Sold total" });
  await expect(incomeStat.locator(".stat-value")).toHaveText("0 MDL");
  await expect(balanceStat.locator(".stat-value")).toHaveText("10.000 MDL");
  await expect(
    page.getByRole("heading", {
      name: "Începe cu primul venit sau prima cheltuială",
    }),
  ).toBeVisible();
  await expect(
    page.getByText(/Acesta nu se numără ca venit lunar/),
  ).toBeVisible();
  await page
    .getByText("Toate instrumentele financiare", { exact: true })
    .click();
  const tools = page.getByRole("region", { name: "Ce vrei să gestionezi?" });
  for (const href of [
    "/settings",
    "/budgets",
    "/goals",
    "/investments",
    "/analytics",
    "/reports",
    "/decision-lab",
    "/iphone",
  ]) {
    await expect(tools.locator(`a[href="${href}"]`)).toBeVisible();
  }
  await page.getByRole("link", { name: "Adaugă venit", exact: true }).click();
  await expect(page).toHaveURL(/create=income#transaction-form/);
  let form = card(page, "Adaugă o tranzacție");
  await expect(
    form.getByRole("combobox", { name: "Tip", exact: true }),
  ).toHaveValue("income");
  await expect(
    form
      .getByRole("combobox", { name: "Categorie", exact: true })
      .locator("option"),
  ).toContainText(["Selectează categoria", "Alte venituri", "Salariu"]);
  await form.getByLabel("Descriere", { exact: true }).fill("Salariu din panou");
  await form.getByLabel("Sumă (MDL)").fill("2500");
  await form
    .getByRole("combobox", { name: "Categorie", exact: true })
    .selectOption({ label: "Salariu" });
  await form
    .getByRole("button", { name: "Adaugă tranzacția", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Salariu din panou", exact: true }),
  ).toBeVisible();
  await expect(form.getByLabel("Descriere", { exact: true })).toHaveValue("");
  await expect(
    form.getByRole("combobox", { name: "Tip", exact: true }),
  ).toHaveValue("income");
  await form.getByLabel("Descriere", { exact: true }).fill("Al doilea venit");
  await form.getByLabel("Sumă (MDL)").fill("500");
  await form
    .getByRole("combobox", { name: "Categorie", exact: true })
    .selectOption({ label: "Alte venituri" });
  await form
    .getByRole("button", { name: "Adaugă tranzacția", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Al doilea venit", exact: true }),
  ).toBeVisible();
  await page.goto("/");
  await expect(incomeStat.locator(".stat-value")).toHaveText("3.000 MDL");
  await expect(balanceStat.locator(".stat-value")).toHaveText("13.000 MDL");
  await expect(
    page.getByRole("heading", {
      name: "Începe cu primul venit sau prima cheltuială",
    }),
  ).toHaveCount(0);
  await page
    .getByRole("link", { name: "Adaugă cheltuială", exact: true })
    .click();
  form = card(page, "Adaugă o tranzacție");
  await expect(
    form.getByRole("combobox", { name: "Tip", exact: true }),
  ).toHaveValue("expense");
  await expect(
    form
      .getByRole("combobox", { name: "Categorie", exact: true })
      .locator("option"),
  ).not.toContainText(["Salariu"]);
  await form
    .getByLabel("Descriere", { exact: true })
    .fill("Plată invalidă păstrată");
  await form.getByLabel("Sumă (MDL)").fill("0");
  await form
    .getByRole("combobox", { name: "Categorie", exact: true })
    .selectOption({ label: "Alimente" });
  await form
    .getByRole("button", { name: "Adaugă tranzacția", exact: true })
    .click();
  await expect(form.locator(".form-error[role=alert]")).toContainText(
    "mai mare decât zero",
  );
  await expect(form.getByLabel("Descriere", { exact: true })).toHaveValue(
    "Plată invalidă păstrată",
  );
  await expect(form.getByLabel("Sumă (MDL)")).toHaveValue("0");
  await expect(
    form.getByRole("combobox", { name: "Tip", exact: true }),
  ).toHaveValue("expense");
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Finanțele tale", exact: true }),
  ).toBeVisible();
  await expect(balanceStat.locator(".stat-value")).toHaveText("13.000 MDL");
  await page.screenshot({
    path: "artifacts/dashboard-actions-desktop.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(
    page.getByRole("link", { name: "Adaugă venit", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "artifacts/dashboard-actions-mobile.png",
    fullPage: true,
  });
});

test("complete finance: transfers stay neutral, recurring confirmation posts once, and CSV preview/import/reimport is safe", async ({
  page,
}) => {
  await login(page, "d@fintrack.invalid");
  await page.goto("/settings");
  let c = card(page, "Cont personal");
  await c
    .getByText("Modifică numele sau soldul inițial", { exact: true })
    .click();
  await c.getByLabel("Sold inițial (în moneda contului)").fill("1000");
  await c
    .getByRole("button", { name: "Salvează modificările", exact: true })
    .click();
  await expect(c.getByText("1.000 MDL", { exact: true })).toBeVisible();
  c = card(page, "Adaugă un cont");
  await c.getByLabel("Numele contului").fill("Numerar complet");
  await c.getByRole("button", { name: "Adaugă înregistrarea" }).click();
  await expect(
    page.getByRole("heading", { name: "Numerar complet", exact: true }),
  ).toBeVisible();
  await page.goto("/transfers");
  let f = card(page, "Un transfer nou");
  await f
    .getByRole("combobox", { name: "Din contul", exact: true })
    .selectOption({ label: "Cont personal · MDL" });
  await f
    .getByRole("combobox", { name: "În contul", exact: true })
    .selectOption({ label: "Numerar complet · MDL" });
  await f.getByLabel("Sumă transferată (MDL)").fill("100");
  await f
    .getByRole("button", { name: "Înregistrează transferul", exact: true })
    .click();
  await expect(
    card(page, "Cont personal").getByText("900 MDL", { exact: true }),
  ).toBeVisible();
  await expect(
    card(page, "Numerar complet").getByText("100 MDL", { exact: true }),
  ).toBeVisible();
  const transfer = card(page, "Cont personal → Numerar complet");
  await transfer.getByText("Editează transferul", { exact: true }).click();
  await transfer.getByLabel("Sumă transferată (MDL)").fill("50");
  await transfer
    .getByRole("button", { name: "Salvează transferul", exact: true })
    .click();
  await expect(
    card(page, "Cont personal").getByText("950 MDL", { exact: true }),
  ).toBeVisible();
  await transfer.getByText("Șterge transferul", { exact: true }).click();
  await transfer.getByLabel("Confirm ștergerea", { exact: true }).check();
  await transfer
    .getByRole("button", { name: "Șterge definitiv", exact: true })
    .click();
  await expect(transfer).toHaveCount(0);
  await expect(
    card(page, "Cont personal").getByText("1.000 MDL", { exact: true }),
  ).toBeVisible();
  f = card(page, "Un transfer nou");
  await f
    .getByRole("combobox", { name: "Din contul", exact: true })
    .selectOption({ label: "Cont personal · MDL" });
  await f
    .getByRole("combobox", { name: "În contul", exact: true })
    .selectOption({ label: "Numerar complet · MDL" });
  await f.getByLabel("Sumă transferată (MDL)").fill("200");
  await f
    .getByRole("button", { name: "Înregistrează transferul", exact: true })
    .click();
  await expect(
    card(page, "Cont personal").getByText("800 MDL", { exact: true }),
  ).toBeVisible();
  await page.goto("/");
  await expect(
    page
      .locator(".stat-card")
      .filter({ hasText: "Sold total" })
      .locator(".stat-value"),
  ).toHaveText("1.000 MDL");
  await expect(
    page
      .locator(".stat-card")
      .filter({ hasText: "Venituri lunare" })
      .locator(".stat-value"),
  ).toHaveText("0 MDL");
  await expect(
    page
      .locator(".stat-card")
      .filter({ hasText: "Cheltuieli lunare" })
      .locator(".stat-value"),
  ).toHaveText("0 MDL");
  await page.goto("/recurring");
  f = card(page, "O regulă nouă");
  await f.getByLabel("Denumire", { exact: true }).fill("Abonament complet");
  await f.getByLabel("Sumă recurentă (MDL)").fill("25");
  await f
    .getByRole("combobox", { name: "Categoria regulii", exact: true })
    .selectOption({ label: "Alimente" });
  await f.getByRole("button", { name: "Creează regula", exact: true }).click();
  let rule = card(page, "Abonament complet");
  await expect(rule).toBeVisible();
  await page.goto("/");
  await expect(
    page.getByRole("region", { name: "Următoarele scadențe" }),
  ).toContainText("Abonament complet");
  await page.goto("/recurring");
  rule = card(page, "Abonament complet");
  await rule.getByText("Confirmă scadența", { exact: true }).click();
  await rule.getByLabel(/Confirm că această scadență/).check();
  await rule
    .getByRole("button", { name: "Înregistrează scadența", exact: true })
    .click();
  await expect(
    rule.getByText("1 scadențe înregistrate", { exact: true }),
  ).toBeVisible();
  await expect(
    rule.getByRole("button", { name: "Înregistrează scadența", exact: true }),
  ).toBeDisabled();
  await rule.getByText("Editează sau pune în pauză", { exact: true }).click();
  await rule
    .getByRole("combobox", { name: "Starea regulii", exact: true })
    .selectOption("false");
  await rule
    .getByRole("button", { name: "Salvează regula", exact: true })
    .click();
  await expect(rule.getByText(/Scadență:.*În pauză/)).toBeVisible();
  await rule.getByText("Șterge regula", { exact: true }).click();
  await rule.getByLabel("Confirm ștergerea", { exact: true }).check();
  await rule
    .getByRole("button", { name: "Șterge definitiv", exact: true })
    .click();
  await expect(rule).toHaveCount(0);
  await page.goto("/transactions");
  await expect(
    page.getByRole("heading", { name: "Abonament complet", exact: true }),
  ).toHaveCount(1);
  const csv = `data;descriere;tip;suma;categorie;metoda\n${today()};Salariu CSV;venit;150;Salariu;card\n${today()};Pâine CSV;cheltuiala;10;Alimente;cash\n${today()};Pâine CSV;cheltuiala;10;Alimente;cash`;
  async function preview(text: string) {
    await page.getByLabel("Fișier CSV").setInputFiles({
      name: "istoric.csv",
      mimeType: "text/csv",
      buffer: Buffer.from(text),
    });
    await page
      .getByRole("button", { name: "Verifică fișierul", exact: true })
      .click();
  }
  await page.goto("/import");
  await preview(csv);
  await expect(
    page.getByRole("heading", { name: "Previzualizare: 3 tranzacții valide" }),
  ).toBeVisible();
  const other = await page.context().newPage();
  await other.goto("/transactions");
  await expect(
    other.getByRole("heading", { name: "Salariu CSV", exact: true }),
  ).toHaveCount(0);
  await other.close();
  await page.getByLabel("Confirm importul tranzacțiilor verificate").check();
  await page
    .getByRole("button", { name: "Confirmă importul", exact: true })
    .click();
  await expect(page.locator(".form-success[role=status]")).toContainText(
    "3 adăugate, 0 duplicate ignorate",
  );
  await preview(csv);
  await page.getByLabel("Confirm importul tranzacțiilor verificate").check();
  await page
    .getByRole("button", { name: "Confirmă importul", exact: true })
    .click();
  await expect(page.locator(".form-success[role=status]")).toContainText(
    "0 adăugate, 3 duplicate ignorate",
  );
  await preview(
    `data;descriere;tip;suma;categorie;metoda\n${today()};Eroare;venit;10;Nu există;card`,
  );
  await expect(page.locator(".form-error[role=alert]")).toContainText(
    "Categoria nu există",
  );
  await expect(
    page.getByRole("button", { name: "Confirmă importul", exact: true }),
  ).toHaveCount(0);
  await page.goto("/transactions");
  await expect(
    page.getByRole("heading", { name: "Pâine CSV", exact: true }),
  ).toHaveCount(2);
  await expect(
    page.getByRole("heading", { name: "Salariu CSV", exact: true }),
  ).toHaveCount(1);
  await page.goto("/");
  await expect(
    page
      .locator(".stat-card")
      .filter({ hasText: "Sold total" })
      .locator(".stat-value"),
  ).toHaveText("1.105 MDL");
  await expect(
    page
      .locator(".stat-card")
      .filter({ hasText: "Venituri lunare" })
      .locator(".stat-value"),
  ).toHaveText("150 MDL");
  await expect(
    page
      .locator(".stat-card")
      .filter({ hasText: "Cheltuieli lunare" })
      .locator(".stat-value"),
  ).toHaveText("45 MDL");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/transfers");
  await expect(
    page.getByRole("heading", {
      name: "Transferuri între conturi",
      exact: true,
    }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("EUR accounts keep separate totals and receivables settle into history", async ({
  page,
  browser,
}) => {
  await login(page, "e@fintrack.invalid");
  await page.goto("/settings");
  const account = card(page, "Adaugă un cont");
  await account.getByLabel("Numele contului").fill("Economii euro");
  await account
    .getByLabel("Moneda contului", { exact: true })
    .selectOption("EUR");
  await account.getByLabel("Sold inițial (în moneda contului)").fill("500");
  await account.getByRole("button", { name: "Adaugă înregistrarea" }).click();
  await expect(card(page, "Economii euro")).toContainText("500 EUR");
  await page.goto("/transactions");
  const entry = card(page, "Adaugă o tranzacție");
  await entry
    .getByRole("button", { name: "Adaugă o tranzacție", exact: true })
    .click();
  await entry.getByLabel("Descriere", { exact: true }).fill("Salariu în euro");
  await entry
    .getByRole("combobox", { name: "Tip", exact: true })
    .selectOption("income");
  await entry
    .getByRole("combobox", { name: "Cont", exact: true })
    .selectOption({ label: "Economii euro · EUR" });
  await entry.getByLabel("Sumă (EUR)", { exact: true }).fill("120");
  await entry
    .getByRole("combobox", { name: "Categorie", exact: true })
    .selectOption({ label: "Salariu" });
  await entry.getByRole("button", { name: "Adaugă tranzacția" }).click();
  await expect(
    page.locator(".ledger-item").filter({ hasText: "Salariu în euro" }),
  ).toContainText("120 EUR");
  await page.goto("/");
  await expect(
    page.getByRole("region", { name: "Conturi în euro" }),
  ).toContainText("620 EUR");
  await expect(page.locator(".stats-grid")).toContainText("0 MDL");
  await page.goto("/reports?currency=EUR");
  await expect(page.locator(".stats-grid")).toContainText("120 EUR");
  await page.goto("/reports?currency=MDL");
  await expect(page.locator(".stats-grid")).toContainText("0 MDL");
  await page.goto("/debts");
  const form = card(page, "Adaugă o datorie");
  await form.getByLabel("Cine îți datorează bani?").fill("Ion · test");
  await form.getByLabel("Moneda datoriei").selectOption("EUR");
  await form.getByLabel("Sumă (EUR)", { exact: true }).fill("75,50");
  await form.getByLabel("Detalii (opțional)").fill("Împrumut personal");
  await form.getByRole("button", { name: "Adaugă datoria" }).click();
  let debt = card(page, "Ion · test");
  await expect(debt).toContainText("75,5 EUR");
  await expect(card(page, "De primit în EUR")).toContainText("75,5 EUR");
  await debt.getByLabel("Confirm că am primit toată suma").check();
  await debt.getByRole("button", { name: "Marchează achitat" }).click();
  await expect(debt).toHaveCount(0);
  await expect(card(page, "De primit în EUR")).toContainText("0 EUR");
  await page.getByRole("link", { name: /Istoric achitate/ }).click();
  debt = card(page, "Ion · test");
  await expect(debt).toContainText("Achitat la");
  await debt.getByLabel("Confirm că datoria este încă neachitată").check();
  await debt.getByRole("button", { name: "Mută în lista activă" }).click();
  await expect(debt).toHaveCount(0);
  await page.goto("/debts");
  await expect(card(page, "Ion · test")).toBeVisible();
  const context = await browser.newContext();
  const other = await context.newPage();
  await login(other, "b@fintrack.invalid");
  await other.goto("/debts");
  await expect(card(other, "Ion · test")).toHaveCount(0);
  await context.close();
  await page.goto("/settings");
  const category = card(page, "Adaugă o categorie");
  await category
    .getByLabel("Numele categoriei")
    .fill(
      "Altele · descriere foarte lungă pentru verificarea aspectului pe telefon",
    );
  await category.getByRole("button", { name: "Adaugă înregistrarea" }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  const heading = page
    .locator(".category-card-heading")
    .filter({ hasText: "Altele · descriere foarte lungă" });
  await expect(heading).toBeVisible();
  const boxes = await heading.evaluate((el) => {
    const title = el.querySelector("h2")!.getBoundingClientRect(),
      badge = el.querySelector(".category")!.getBoundingClientRect();
    return {
      overlap:
        title.left < badge.right &&
        title.right > badge.left &&
        title.top < badge.bottom &&
        title.bottom > badge.top,
      overflow: document.documentElement.scrollWidth > innerWidth,
    };
  });
  expect(boxes.overlap).toBe(false);
  expect(boxes.overflow).toBe(false);
  await page.screenshot({
    path: "artifacts/euro-accounts-categories-mobile.png",
    fullPage: true,
  });
  await page.goto("/");
  await expect(
    page.getByRole("region", { name: "Conturi în euro" }),
  ).toContainText("620 EUR");
});

test("automatic budgets allocate salaries, carry balances, reserve investments and emergency funds", async ({
  page,
}) => {
  await login(page, "f@fintrack.invalid");
  await page.goto("/budgets");
  await page.getByLabel("Moneda bugetelor automate").selectOption("MDL");
  await page
    .getByLabel("Activez împărțirea automată", { exact: false })
    .check();
  await page
    .getByRole("button", { name: "Activează bugetele automate" })
    .click();
  const auto = page.getByRole("region", { name: "Bugete automate MDL" });
  await expect(auto).toBeVisible();
  const budget = (name: string) =>
    auto
      .locator("[data-slot=card]")
      .filter({ has: page.getByRole("heading", { name, exact: true }) });
  await expect(budget("Fond de urgență")).toContainText("0 MDL");
  async function entry(
    kind: "income" | "expense",
    description: string,
    amount: string,
    category: string,
  ) {
    await page.goto("/transactions");
    const form = card(page, "Adaugă o tranzacție");
    await form
      .getByRole("button", { name: "Adaugă o tranzacție", exact: true })
      .click();
    await form.getByLabel("Descriere", { exact: true }).fill(description);
    await form
      .getByRole("combobox", { name: "Tip", exact: true })
      .selectOption(kind);
    await form.getByLabel("Sumă (MDL)").fill(amount);
    await form
      .getByRole("combobox", { name: "Categorie", exact: true })
      .selectOption({ label: category });
    await form.getByRole("button", { name: "Adaugă tranzacția" }).click();
    await expect(form.getByRole("status")).toContainText("adăugată");
  }
  await entry("income", "Salariu auto", "10000", "Salariu");
  await page.goto("/budgets");
  await expect(budget("Alimente")).toContainText("2.500 MDL");
  await expect(budget("Investiții")).toContainText("1.500 MDL");
  await expect(budget("Fond de urgență")).toContainText("1.000 MDL");
  await entry("expense", "Cumpărături", "500", "Alimente");
  await entry("income", "Bonus auto", "2000", "Alte venituri");
  await page.goto("/budgets");
  await expect(budget("Alimente").locator(".stat-value")).toHaveText(
    "2.500 MDL",
  );
  await expect(budget("Investiții").locator(".stat-value")).toHaveText(
    "1.800 MDL",
  );
  await expect(budget("Fond de urgență").locator(".stat-value")).toHaveText(
    "1.200 MDL",
  );
  await page.goto("/settings#budget-percentages");
  const config = card(page, "Procente MDL");
  await config.getByLabel("Alimente (%)", { exact: true }).fill("30");
  await config.getByLabel("Locuință (%)", { exact: true }).fill("20");
  await config.getByRole("button", { name: "Salvează procentele" }).click();
  await expect(config.getByRole("status")).toContainText("Plan salvat");
  await page.goto("/budgets");
  await expect(budget("Alimente").locator(".stat-value")).toHaveText(
    "2.500 MDL",
  );
  await entry("income", "Încasare nouă", "1000", "Alte venituri");
  await page.goto("/budgets");
  await expect(budget("Alimente").locator(".stat-value")).toHaveText(
    "2.800 MDL",
  );
  await expect(budget("Locuință").locator(".stat-value")).toHaveText(
    "3.200 MDL",
  );
  await page.goto("/settings#budget-percentages");
  await config.getByLabel("Împărțirea veniturilor noi").selectOption("false");
  await config.getByRole("button", { name: "Salvează procentele" }).click();
  await expect(config.getByRole("status")).toContainText("Plan salvat");
  await page.goto("/budgets");
  await expect(auto).toContainText("În pauză");
  await entry("income", "Venit în pauză", "500", "Alte venituri");
  await page.goto("/");
  const section = page.getByRole("region", {
    name: "Alocările veniturilor tale",
  });
  await expect(section).toContainText("2.800 MDL");
  await expect(section).toContainText("1.950 MDL");
  await expect(page.locator(".stats-grid")).toContainText("13.000 MDL");
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "artifacts/automatic-budgets-mobile.png",
    caret: "initial",
    fullPage: true,
  });
  const investment = section.locator("[data-slot=card]").filter({
    has: page.getByRole("heading", { name: "Investiții", exact: true }),
  });
  await investment
    .getByText("Am investit suma disponibilă", { exact: true })
    .click();
  await investment
    .getByLabel("Contul din care ai investit")
    .selectOption({ label: "Cont personal · MDL" });
  await investment
    .getByLabel("Confirm că am investit", { exact: false })
    .check();
  await investment.getByRole("button", { name: "Confirmă investiția" }).click();
  await expect(investment.locator(".stat-value")).toHaveText("0 MDL");
  await expect(page.locator(".stats-grid")).toContainText("11.050 MDL");
  await page.goto("/transactions");
  await expect(
    page.getByRole("heading", {
      name: "Investiție confirmată din buget",
      exact: true,
    }),
  ).toHaveCount(1);
  await page.goto("/settings#budget-percentages");
  await config.getByLabel("Împărțirea veniturilor noi").selectOption("true");
  await config.getByRole("button", { name: "Salvează procentele" }).click();
  await expect(config.getByRole("status")).toContainText("Plan salvat");
  await entry("income", "Venit după investiție", "1000", "Alte venituri");
  await page.goto("/");
  await expect(investment.locator(".stat-value")).toHaveText("150 MDL");
});

test("redesign: connected responsive layouts and persistent themes", async ({
  page,
}) => {
  test.setTimeout(240000);
  await login(page, "a@fintrack.invalid");
  for (const theme of ["light", "dark"]) {
    await page.evaluate((value) => {
      localStorage.setItem("fintrack.theme", value);
    }, theme);
    for (const width of [375, 768, 1440]) {
      await page.setViewportSize({ width, height: 960 });
      for (const route of [
        "/",
        "/transactions",
        "/investments",
        "/budgets",
        "/analytics",
        "/reports",
        "/settings",
      ]) {
        await page.goto(route);
        await page.waitForLoadState("networkidle");
        await page.evaluate(() => document.fonts.ready);
        await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
        await expect(page.locator("main")).toBeVisible();
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
          `${route} ${theme} ${width}`,
        ).toBe(true);
        await page.screenshot({
          path: `artifacts/redesign-${route.slice(1) || "dashboard"}-${theme}-${width}.png`,
          fullPage: true,
          caret: "initial",
        });
      }
    }
  }
  await page
    .getByRole("button", { name: "Temă luminoasă", exact: true })
    .filter({ visible: true })
    .first()
    .click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" });
  await page
    .getByRole("button", { name: "Tema dispozitivului", exact: true })
    .filter({ visible: true })
    .first()
    .click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.getByLabel("Moneda implicită a rapoartelor").selectOption("EUR");
  await page.goto("/reports");
  await expect(page.getByLabel("Moneda raportului")).toHaveValue("EUR");
  await page.goto("/transactions");
  await page
    .getByRole("button", { name: "Adaugă o tranzacție", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(
    page.getByRole("button", { name: "Adaugă o tranzacție", exact: true }),
  ).toBeFocused();
  await page.setViewportSize({ width: 320, height: 780 });
  for (const route of [
    "/",
    "/transactions",
    "/investments",
    "/budgets",
    "/analytics",
    "/reports",
    "/settings",
    "/debts",
    "/recurring",
    "/transfers",
    "/import",
    "/iphone",
    "/goals",
    "/decision-lab",
    "/quick-expense",
  ]) {
    await page.goto(route);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      `320px ${route}`,
    ).toBe(true);
  }
});
