import "server-only";
import { requireUser } from "@/lib/auth/session";
import { allRows } from "./planning-repository";
import type {
  EnvelopePlan,
  EnvelopeRule,
  EnvelopeFunding,
  EnvelopeSnapshot,
} from "@/lib/envelopes";
export async function getEnvelopes(): Promise<EnvelopeSnapshot> {
  const { client, user } = await requireUser("/budgets");
  const [plans, rules, funding] = await Promise.all([
    allRows<EnvelopePlan>((f, t) =>
      client
        .from("envelope_plans")
        .select("*")
        .eq("user_id", user.id)
        .order("id")
        .range(f, t),
    ),
    allRows<EnvelopeRule>((f, t) =>
      client
        .from("envelope_rules")
        .select("*")
        .eq("user_id", user.id)
        .order("sort_order")
        .order("id")
        .range(f, t),
    ),
    allRows<EnvelopeFunding>((f, t) =>
      client
        .from("envelope_funding")
        .select("*")
        .eq("user_id", user.id)
        .order("transaction_id")
        .order("rule_id")
        .range(f, t),
    ),
  ]);
  return { plans, rules, funding };
}
