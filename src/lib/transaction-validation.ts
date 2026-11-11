import { z } from "zod";
export const transactionSchema = z.object({
  id: z.union([z.uuid(), z.literal("")]).optional(),
  account_id: z.uuid("Selectează un cont valid."),
  category_id: z.uuid("Selectează o categorie validă."),
  kind: z.enum(["income", "expense"], {
    error: "Selectează tipul tranzacției.",
  }),
  payment_method: z
    .enum(["unspecified", "cash", "card"])
    .default("unspecified"),
  description: z
    .string()
    .trim()
    .min(1, "Descrierea este obligatorie.")
    .max(160, "Descrierea poate avea maximum 160 de caractere."),
  amount: z
    .string()
    .trim()
    .regex(
      /^\d{1,10}([.,]\d{1,2})?$/,
      "Introdu o sumă pozitivă cu maximum două zecimale.",
    )
    .transform((v) => {
      const [whole, fraction = ""] = v.replace(",", ".").split(".");
      return Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
    })
    .pipe(
      z
        .number()
        .int()
        .min(1, "Suma trebuie să fie mai mare decât zero.")
        .max(1000000000000, "Suma este prea mare."),
    ),
  occurred_on: z.iso
    .date("Introdu o dată calendaristică validă.")
    .refine(
      (v) => v >= "1900-01-01" && v <= "2100-12-31",
      "Data trebuie să fie între 1900 și 2100.",
    ),
});
export const idSchema = z.uuid("Identificator invalid.");
export const filterSchema = z
  .object({
    q: z.string().max(160).default(""),
    category: z.union([z.uuid(), z.literal("")]).default(""),
    kind: z.enum(["", "income", "expense"]).default(""),
    from: z.union([z.iso.date(), z.literal("")]).default(""),
    to: z.union([z.iso.date(), z.literal("")]).default(""),
  })
  .refine(
    (v) => !v.from || !v.to || v.from <= v.to,
    "Intervalul de date este invalid.",
  );
