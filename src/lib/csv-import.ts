import { z } from "zod";
import { transactionSchema } from "./transaction-validation";
import type { AccountRow, CategoryRow } from "./supabase/database.types";
export type ImportRow = {
  account_id: string;
  category_id: string;
  kind: "income" | "expense";
  description: string;
  amount_minor: number;
  payment_method: "unspecified" | "cash" | "card";
  occurred_on: string;
};
export const importRowSchema = z
  .object({
    account_id: z.uuid(),
    category_id: z.uuid(),
    kind: transactionSchema.shape.kind,
    description: transactionSchema.shape.description,
    amount_minor: z.number().int().min(1).max(1000000000000),
    payment_method: transactionSchema.shape.payment_method,
    occurred_on: transactionSchema.shape.occurred_on,
  })
  .strict();
export const importRowsSchema = z.array(importRowSchema).min(1).max(500);
const normalize = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, "_");
function delimiter(text: string) {
  let quoted = false,
    comma = 0,
    semi = 0;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      if (quoted && text[i + 1] === '"') {
        i++;
        continue;
      }
      quoted = !quoted;
    } else if (!quoted) {
      if (c === "\n" || c === "\r") break;
      if (c === ",") comma++;
      if (c === ";") semi++;
    }
  }
  return semi >= comma ? ";" : ",";
}
export function parseCSV(text: string): string[][] {
  if (new TextEncoder().encode(text).length > 512 * 1024)
    throw Error("Fișierul poate avea maximum 512 KiB.");
  text = text.replace(/^\uFEFF/, "");
  // FinTrack exports start with a one-cell metadata line. Infer from the header.
  const probe =
    text
      .split(/\r?\n/)
      .find((line) => line.includes(";") || line.includes(",")) || text;
  const sep = delimiter(probe);
  const rows: string[][] = [];
  let row: string[] = [],
    value = "",
    quoted = false,
    closed = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          value += '"';
          i++;
        } else {
          quoted = false;
          closed = true;
        }
      } else value += c;
      continue;
    }
    if (c === '"') {
      if (value !== "" || closed) throw Error("Ghilimele CSV invalide.");
      quoted = true;
    } else if (c === sep) {
      row.push(value);
      value = "";
      closed = false;
    } else if (c === "\r" || c === "\n") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(value);
      if (row.some((v) => v.trim())) rows.push(row);
      row = [];
      value = "";
      closed = false;
    } else {
      if (closed && c.trim()) throw Error("Text neașteptat după ghilimele.");
      if (!closed) value += c;
    }
  }
  if (quoted) throw Error("Ghilimele CSV neînchise.");
  row.push(value);
  if (row.some((v) => v.trim())) rows.push(row);
  if (rows.length > 502)
    throw Error("Importul acceptă maximum 500 de tranzacții.");
  return rows;
}
export function previewCSV(
  text: string,
  accounts: AccountRow[],
  categories: CategoryRow[],
  fallbackAccount: string,
) {
  const records = parseCSV(text);
  let exported = false;
  if (records[0]?.length === 1 && /DEMO|Date fictive/i.test(records[0][0]))
    throw Error("Fișierele demo nu pot fi importate în contul personal.");
  if (
    records[0]?.length === 1 &&
    records[0][0] === "FinTrack — Tranzacții personale"
  ) {
    records.shift();
    exported = true;
  }
  const aliases: Record<string, string> = {
    data: "date",
    descriere: "description",
    categorie: "category",
    tip: "kind",
    suma: "amount",
    suma_mdl: "amount",
    plata: "method",
    metoda: "method",
    metoda_de_plata: "method",
    cont: "account",
    moneda: "currency",
  };
  const headers = (records.shift() || []).map(
    (h) => aliases[normalize(h)] || normalize(h),
  );
  if (new Set(headers).size !== headers.length)
    throw Error("Antetul conține coloane duplicate.");
  for (const h of ["date", "description", "category", "amount"])
    if (!headers.includes(h))
      throw Error(
        "Antetul trebuie să conțină data, descriere, categorie și suma în MDL.",
      );
  if (
    headers.some(
      (h) =>
        ![
          "date",
          "description",
          "category",
          "kind",
          "amount",
          "method",
          "account",
          "currency",
        ].includes(h),
    )
  )
    throw Error(
      "Fișierul conține coloane necunoscute sau o monedă diferită de MDL.",
    );
  if (records.length > 500)
    throw Error("Importul acceptă maximum 500 de tranzacții.");
  if (!records.length) throw Error("Fișierul nu conține tranzacții.");
  const rows: ImportRow[] = [];
  const errors: string[] = [];
  const clean = (v: string) =>
    exported && /^'[\s]*[=+@-]/.test(v) ? v.slice(1) : v;
  for (let index = 0; index < records.length; index++) {
    try {
      const cells = records[index];
      if (cells.length !== headers.length)
        throw Error("Număr incorect de coloane.");
      const obj = Object.fromEntries(
        headers.map((h, i) => [h, clean(cells[i].trim())]),
      );
      if (obj.currency && obj.currency !== "MDL")
        throw Error(
          "Sunt acceptate doar tranzacții MDL; nu se efectuează conversii.",
        );
      const negative = obj.amount.startsWith("-");
      const amountText = obj.amount.replace(/^[+-]/, "");
      const kind = obj.kind
        ? (
            {
              venit: "income",
              income: "income",
              cheltuiala: "expense",
              expense: "expense",
            } as Record<string, "income" | "expense">
          )[normalize(obj.kind)]
        : negative
          ? "expense"
          : "income";
      if (!kind || (negative && kind !== "expense"))
        throw Error("Tipul nu corespunde semnului sumei.");
      const amount = transactionSchema.shape.amount.safeParse(amountText);
      if (!amount.success) throw Error(amount.error.issues[0].message);
      const date = /^\d{2}\.\d{2}\.\d{4}$/.test(obj.date)
        ? obj.date.split(".").reverse().join("-")
        : obj.date;
      const candidates = obj.account
        ? accounts.filter((a) => normalize(a.name) === normalize(obj.account))
        : accounts.filter((a) => a.id === fallbackAccount);
      if (candidates.length !== 1)
        throw Error(
          "Cont inexistent sau ambiguu. Alege contul corect și verifică numele.",
        );
      const cats = categories.filter(
        (c) => c.kind === kind && normalize(c.name) === normalize(obj.category),
      );
      if (cats.length !== 1)
        throw Error(
          "Categoria nu există pentru acest tip sau este ambiguă. Creeaz-o în Setări.",
        );
      const method = (
        {
          "": "unspecified",
          nespecificat: "unspecified",
          unspecified: "unspecified",
          cash: "cash",
          numerar: "cash",
          card: "card",
        } as Record<string, ImportRow["payment_method"]>
      )[normalize(obj.method || "")];
      if (!method)
        throw Error("Metoda trebuie să fie cash, card sau nespecificat.");
      rows.push(
        importRowSchema.parse({
          account_id: candidates[0].id,
          category_id: cats[0].id,
          kind,
          description: obj.description,
          amount_minor: amount.data,
          payment_method: method,
          occurred_on: date,
        }),
      );
    } catch (e) {
      errors.push(
        `Rândul ${index + 2 + (exported ? 1 : 0)}: ${e instanceof z.ZodError ? e.issues[0].message : e instanceof Error ? e.message : "Date invalide."}`,
      );
    }
  }
  return { rows, errors };
}
export const csvTemplate = "data;descriere;tip;suma;categorie;metoda\r\n";
