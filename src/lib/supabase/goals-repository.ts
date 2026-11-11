import "server-only";
import { requireUser } from "@/lib/auth/session";
import type { Goal, Contribution, Scenario } from "@/lib/goals";
async function all<T>(
  page: (
    from: number,
    to: number,
  ) => PromiseLike<{ data: T[] | null; error: unknown }>,
) {
  const result: T[] = [];
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await page(offset, offset + 499);
    if (error || !data)
      throw Error(
        "Obiectivele nu au putut fi încărcate. Verifică migrația bazei de date.",
      );
    result.push(...data);
    if (data.length < 500) break;
  }
  return result;
}
export async function getGoals() {
  const { client, user } = await requireUser();
  const [goals, contributions, scenarios] = await Promise.all([
    all<Goal>((f, t) =>
      client
        .from("savings_goals")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .order("id")
        .range(f, t),
    ),
    all<Contribution>((f, t) =>
      client
        .from("goal_contributions")
        .select("*")
        .eq("user_id", user.id)
        .order("occurred_on", { ascending: false })
        .order("id")
        .range(f, t),
    ),
    all<Scenario>((f, t) =>
      client
        .from("goal_scenarios")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .order("id")
        .range(f, t),
    ),
  ]);
  return { goals, contributions, scenarios };
}
