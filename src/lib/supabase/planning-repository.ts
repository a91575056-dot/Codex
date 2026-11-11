import "server-only";
import { requireUser } from "@/lib/auth/session";
import type { BudgetRow, HoldingRow } from "@/lib/planning";
export async function allRows<T>(
  page: (
    from: number,
    to: number,
  ) => PromiseLike<{ data: T[] | null; error: unknown }>,
) {
  const rows: T[] = [];
  for (let offset = 0; ; offset += 500) {
    const r = await page(offset, offset + 499);
    if (r.error || !r.data)
      throw Error(
        "Datele nu au putut fi încărcate. Verifică migrațiile Supabase.",
      );
    rows.push(...r.data);
    if (r.data.length < 500) break;
  }
  return rows;
}
export async function getPlanning() {
  const { client, user } = await requireUser();
  const [budgets, holdings] = await Promise.all([
    allRows<BudgetRow>((f, t) =>
      client
        .from("budgets")
        .select("*")
        .eq("user_id", user.id)
        .order("month_start", { ascending: false })
        .order("id")
        .range(f, t),
    ),
    allRows<HoldingRow>((f, t) =>
      client
        .from("holdings")
        .select("*")
        .eq("user_id", user.id)
        .order("name")
        .order("id")
        .range(f, t),
    ),
  ]);
  return { budgets, holdings };
}
