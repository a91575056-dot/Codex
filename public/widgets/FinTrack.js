/* global FileManager, Keychain, Alert, config, ListWidget, Color, Font, Request, args, DrawContext, Size, Rect, Script */
// FinTrack · Bugete MDL · Scriptable
// Rulează o dată în Scriptable pentru conectare. Cheia se păstrează în Keychain.
const SITE = "https://fintrack-dionis.netlify.app";
const KEY = "fintrack.widget.token.v1";
const FILTER = "fintrack.widget.categories.v1";
const fm = FileManager.local();
const cachePath = fm.joinPath(
  fm.documentsDirectory(),
  "fintrack-widget-v1.json",
);
let cancelled = false;

function clearCache() {
  if (fm.fileExists(cachePath)) fm.remove(cachePath);
}
async function configure() {
  const prompt = new Alert();
  prompt.title = "Conectează FinTrack";
  prompt.message =
    "Creează cheia widgetului în FinTrack → iPhone și scurtături → Widget cu bugetele tale. Folosește cheia ft_wg_, separată de scurtătură.";
  prompt.addSecureTextField("Cheia widgetului", "");
  prompt.addTextField(
    "Categorii, separate prin virgulă (opțional)",
    Keychain.contains(FILTER) ? Keychain.get(FILTER) : "",
  );
  prompt.addAction("Conectează");
  prompt.addCancelAction("Anulează");
  if ((await prompt.presentAlert()) < 0) {
    cancelled = true;
    return;
  }
  const token = prompt.textFieldValue(0).trim();
  if (!/^ft_wg_[a-f0-9]{64}$/.test(token)) {
    const error = new Alert();
    error.title = "Cheie invalidă";
    error.message =
      "Copiază cheia completă a widgetului din FinTrack. Începe cu ft_wg_.";
    error.addAction("OK");
    await error.presentAlert();
    cancelled = true;
    return;
  }
  clearCache();
  Keychain.set(KEY, token);
  Keychain.set(FILTER, prompt.textFieldValue(1).trim());
}
if (!config.runsInWidget) {
  if (!Keychain.contains(KEY)) await configure();
  else {
    const menu = new Alert();
    menu.title = "FinTrack · Bugete";
    menu.addAction("Previzualizează");
    menu.addAction("Alege categoriile");
    menu.addAction("Schimbă cheia");
    menu.addDestructiveAction("Deconectează acest iPhone");
    menu.addCancelAction("Anulează");
    const choice = await menu.presentSheet();
    if (choice === 1) {
      const filter = new Alert();
      filter.title = "Categorii afișate";
      filter.message =
        "Scrie numele din FinTrack, separate prin virgulă. Lasă gol pentru toate. Un widget mediu arată primele 3 categorii selectate.";
      filter.addTextField(
        "Alimente, Distracții, Investiții",
        Keychain.contains(FILTER) ? Keychain.get(FILTER) : "",
      );
      filter.addAction("Salvează");
      filter.addCancelAction("Anulează");
      if ((await filter.presentAlert()) >= 0)
        Keychain.set(FILTER, filter.textFieldValue(0).trim());
    } else if (choice === 2) await configure();
    else if (choice === 3) {
      Keychain.remove(KEY);
      if (Keychain.contains(FILTER)) Keychain.remove(FILTER);
      clearCache();
    } else if (choice < 0) cancelled = true;
  }
}

const widget = new ListWidget();
widget.backgroundColor = Color.dynamic(
  new Color("F8FAFC"),
  new Color("111827"),
);
widget.setPadding(10, 10, 10, 10);
widget.url = SITE + "/budgets";
widget.refreshAfterDate = new Date(Date.now() + 30 * 60 * 1000);
const ink = Color.dynamic(new Color("0F172A"), new Color("F8FAFC"));
const muted = Color.dynamic(new Color("475569"), new Color("94A3B8"));
function text(stack, value, size, color, bold) {
  const t = stack.addText(String(value));
  t.font = bold ? Font.semiboldSystemFont(size) : Font.systemFont(size);
  t.textColor = color;
  t.lineLimit = 1;
  t.minimumScaleFactor = 0.7;
  return t;
}
function money(minor) {
  return (
    new Intl.NumberFormat("ro-RO", { maximumFractionDigits: 2 }).format(
      minor / 100,
    ) + " MDL"
  );
}
function normalize(value) {
  return String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}
function valid(data) {
  return (
    data &&
    data.currency === "MDL" &&
    Array.isArray(data.budgets) &&
    Number.isFinite(Date.parse(data.updated_at)) &&
    data.budgets.every(
      (b) =>
        typeof b.name === "string" &&
        Number.isSafeInteger(b.limit_minor) &&
        b.limit_minor >= 0 &&
        Number.isSafeInteger(b.remaining_minor) &&
        (b.remaining_percent === null || Number.isFinite(b.remaining_percent)),
    )
  );
}
let data = null,
  offline = false,
  message = "";
if (!Keychain.contains(KEY))
  message = "Rulează scriptul în Scriptable și conectează cheia widgetului.";
else {
  let request;
  try {
    request = new Request(SITE + "/api/widget/budgets");
    request.headers = { Authorization: "Bearer " + Keychain.get(KEY) };
    request.timeoutInterval = 15;
    const result = await request.loadJSON();
    const status = request.response ? request.response.statusCode : 0;
    if (status === 401 || status === 403) {
      clearCache();
      message =
        "Cheie expirată sau revocată. Reconectează widgetul în Scriptable.";
    } else {
      if (status !== 200 || !valid(result)) throw new Error("unavailable");
      data = result;
      fm.writeString(cachePath, JSON.stringify(data));
    }
  } catch {
    if (
      request &&
      request.response &&
      [401, 403].includes(request.response.statusCode)
    ) {
      clearCache();
      message =
        "Cheie expirată sau revocată. Reconectează widgetul în Scriptable.";
    } else {
      offline = true;
      try {
        const cached = JSON.parse(fm.readString(cachePath));
        const age = Date.now() - Date.parse(cached.updated_at);
        if (valid(cached) && age >= 0 && age < 24 * 60 * 60 * 1000)
          data = cached;
      } catch {
        /* No local snapshot. */
      }
      if (!data)
        message =
          "Bugetele nu sunt disponibile. Deschide FinTrack sau încearcă din nou mai târziu.";
    }
  }
}
const header = widget.addStack();
text(header, "FinTrack", 13, ink, true);
header.addSpacer();
text(header, "MDL", 10, muted, false);
widget.addSpacer(6);
if (!data) {
  const t = widget.addText(message);
  t.font = Font.systemFont(12);
  t.textColor = muted;
  t.lineLimit = 4;
} else {
  const parameter =
    args.widgetParameter ||
    (Keychain.contains(FILTER) ? Keychain.get(FILTER) : "");
  const names = [
    ...new Set(String(parameter).split(",").map(normalize).filter(Boolean)),
  ];
  let rows = data.budgets;
  if (names.length)
    rows = names
      .map((name) =>
        rows.find((b) => normalize(b.name) === name || b.id === name),
      )
      .filter(Boolean);
  const family = config.widgetFamily || "medium";
  const max =
    family === "small"
      ? 2
      : family === "large" || family === "extraLarge"
        ? 6
        : 3;
  if (!rows.length) {
    const empty = widget.addText(
      names.length
        ? "Nu am găsit categoriile alese. Verifică numele în FinTrack."
        : "Nu ai bugete în MDL. Configurează alocările sau bugetele în FinTrack.",
    );
    empty.font = Font.systemFont(12);
    empty.textColor = muted;
    empty.lineLimit = 4;
  }
  const selected = rows.slice(0, max);
  selected.forEach((b, index) => {
    const negative = b.remaining_minor < 0;
    const color = negative
      ? Color.dynamic(new Color("B91C1C"), new Color("FCA5A5"))
      : Color.dynamic(new Color("2563EB"), new Color("60A5FA"));
    const row = widget.addStack();
    text(row, b.name, 11, ink, true);
    row.addSpacer(4);
    text(
      row,
      b.remaining_percent === null
        ? "—"
        : new Intl.NumberFormat("ro-RO", { maximumFractionDigits: 1 }).format(
            b.remaining_percent,
          ) + "%",
      11,
      color,
      true,
    );
    widget.addSpacer(1);
    text(
      widget,
      (negative
        ? "Depășit · "
        : b.limit_minor === 0
          ? "Nealimentat · "
          : "Rămas · ") + money(b.remaining_minor),
      10,
      muted,
      false,
    );
    widget.addSpacer(2);
    const width = family === "small" ? 110 : 250;
    const context = new DrawContext();
    context.size = new Size(width, 2);
    context.opaque = false;
    context.setFillColor(
      Color.dynamic(new Color("CBD5E1"), new Color("334155")),
    );
    context.fillRect(new Rect(0, 0, width, 2));
    const ratio =
      b.remaining_percent === null
        ? 0
        : Math.max(0, Math.min(1, b.remaining_percent / 100));
    context.setFillColor(color);
    if (ratio > 0) context.fillRect(new Rect(0, 0, width * ratio, 2));
    const image = widget.addImage(context.getImage());
    image.imageSize = new Size(width, 2);
    if (index < selected.length - 1) widget.addSpacer(5);
  });
  widget.addSpacer();
  const date = new Date(data.updated_at);
  const stamp = new Intl.DateTimeFormat("ro-RO", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
  }).format(date);
  text(
    widget,
    (offline
      ? "Offline · "
      : data.source === "monthly"
        ? "Luna curentă · "
        : data.budgets.some((b) => b.enabled === false)
          ? "Alocări în pauză · "
          : "Alocări · ") + stamp,
    8,
    muted,
    false,
  );
}
if (!config.runsInWidget && !cancelled) await widget.presentMedium();
Script.setWidget(widget);
Script.complete();
