import "server-only";
import { requireUser } from "@/lib/auth/session";
import { allRows } from "./planning-repository";
import type { RecurringRule, RecurringOccurrence } from "@/lib/operations";
export async function getRecurringRules() {
  const { client, user } = await requireUser();
  return allRows<RecurringRule>((f, t) =>
    client
      .from("recurring_rules")
      .select("*")
      .eq("user_id", user.id)
      .order("next_due_on")
      .order("id")
      .range(f, t),
  );
}
export async function getRecurringOccurrences() {
  const { client, user } = await requireUser();
  return allRows<RecurringOccurrence>((f, t) =>
    client
      .from("recurring_occurrences")
      .select("*")
      .eq("user_id", user.id)
      .order("due_on", { ascending: false })
      .order("id")
      .range(f, t),
  );
}
