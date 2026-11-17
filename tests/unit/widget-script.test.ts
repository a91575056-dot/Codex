import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
const token = "ft_wg_" + "e".repeat(64);
const snapshot = {
  currency: "MDL",
  source: "allocations",
  updated_at: new Date().toISOString(),
  budgets: [
    {
      id: "food",
      name: "Alimente",
      limit_minor: 10000,
      remaining_minor: 7500,
      remaining_percent: 75,
    },
    {
      id: "fun",
      name: "Distracții",
      limit_minor: 10000,
      remaining_minor: -2500,
      remaining_percent: -25,
    },
  ],
};
async function run(
  options: {
    status?: number;
    offline?: boolean;
    cache?: unknown;
    missing?: boolean;
    parameter?: string;
    throwDenied?: boolean;
  } = {},
) {
  const labels: string[] = [];
  const store = new Map<string, string>();
  const files = new Map<string, string>();
  const calls: { url: string; headers: unknown }[] = [];
  if (!options.missing) store.set("fintrack.widget.token.v1", token);
  if (options.cache) files.set("cache", JSON.stringify(options.cache));
  class Stack {
    addText(value: string) {
      labels.push(value);
      return {};
    }
    addSpacer() {}
    addStack() {
      return new Stack();
    }
    addImage() {
      return {};
    }
  }
  class Widget extends Stack {
    setPadding() {}
    async presentMedium() {}
  }
  class Color {
    static dynamic(a: unknown) {
      return a;
    }
  }
  class Request {
    headers: unknown;
    response = { statusCode: options.status || 200 };
    url: string;
    constructor(url: string) {
      this.url = url;
    }
    async loadJSON() {
      calls.push({ url: this.url, headers: this.headers });
      if (options.offline || options.throwDenied) throw Error("offline");
      return this.response.statusCode === 200 ? snapshot : { error: "denied" };
    }
  }
  class DrawContext {
    setFillColor() {}
    fillRect() {}
    getImage() {
      return {};
    }
  }
  const context = vm.createContext({
    FileManager: {
      local: () => ({
        documentsDirectory: () => "",
        joinPath: () => "cache",
        fileExists: (p: string) => files.has(p),
        remove: (p: string) => files.delete(p),
        readString: (p: string) => {
          if (!files.has(p)) throw Error();
          return files.get(p);
        },
        writeString: (p: string, v: string) => files.set(p, v),
      }),
    },
    Keychain: {
      contains: (k: string) => store.has(k),
      get: (k: string) => store.get(k),
    },
    config: { runsInWidget: true, widgetFamily: "medium" },
    ListWidget: Widget,
    Color,
    Font: { semiboldSystemFont: () => ({}), systemFont: () => ({}) },
    Request,
    args: { widgetParameter: options.parameter || "" },
    DrawContext,
    Size: class {},
    Rect: class {},
    Script: { setWidget() {}, complete() {} },
    Intl,
    Date,
  });
  await new vm.Script(
    "(async()=>{" +
      (await readFile("public/widgets/FinTrack.js", "utf8")) +
      "})()",
  ).runInContext(context);
  return { labels: labels.join(" | "), calls, files };
}
test("Scriptable script renders chosen real budgets, negative amounts and remaining percentages", async () => {
  const r = await run({ parameter: "Distractii" });
  assert.ok(r.labels.includes("Distracții"));
  assert.ok(r.labels.includes("-25%"));
  assert.ok(r.labels.includes("Depășit"));
  assert.ok(!r.labels.includes("Alimente"));
  assert.equal(
    r.calls[0].url,
    "https://fintrack-dionis.netlify.app/api/widget/budgets",
  );
  assert.ok(!r.labels.includes(token));
});
test("Scriptable offline cache is dated and expires after 24 hours", async () => {
  assert.ok(
    (await run({ offline: true, cache: snapshot })).labels.includes("Offline"),
  );
  const old = {
    ...snapshot,
    updated_at: new Date(Date.now() - 25 * 3600000).toISOString(),
  };
  const result = await run({ offline: true, cache: old });
  assert.ok(!result.labels.includes("75%"));
  assert.ok(result.labels.includes("nu sunt disponibile"));
});
test("Scriptable never displays cached finances after HTTP revocation, including throwing HTTP clients", async () => {
  for (const throwDenied of [false, true]) {
    const r = await run({ status: 401, cache: snapshot, throwDenied });
    assert.ok(r.labels.includes("revocată"));
    assert.ok(!r.labels.includes("75%"));
    assert.equal(r.files.size, 0);
  }
});
test("Scriptable missing credentials shows setup without making requests", async () => {
  const r = await run({ missing: true });
  assert.equal(r.calls.length, 0);
  assert.ok(r.labels.includes("conectează cheia"));
});
