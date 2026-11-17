import { z } from "zod";
const minor = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
export const widgetRawSchema = z.object({
  currency: z.literal("MDL"),
  source: z.enum(["allocations", "monthly"]),
  as_of: z.iso.date(),
  updated_at: z.iso.datetime({ offset: true }),
  budgets: z.array(
    z.object({
      id: z.uuid(),
      name: z.string().max(100),
      limit_minor: minor,
      spent_minor: minor,
      enabled: z.boolean(),
    }),
  ),
});
export type WidgetDevice = {
  id: string;
  user_id: string;
  name: string;
  token_hash: string;
  created_at: string;
  expires_at: string;
  last_used_at: string | null;
};
export type WidgetView = Omit<WidgetDevice, "user_id" | "token_hash">;
export function widgetSnapshot(raw: unknown) {
  const data = widgetRawSchema.parse(raw);
  return {
    ...data,
    budgets: data.budgets.map((b) => ({
      ...b,
      remaining_minor: b.limit_minor - b.spent_minor,
      remaining_percent:
        b.limit_minor > 0
          ? Math.round((1 - b.spent_minor / b.limit_minor) * 1000) / 10
          : null,
    })),
  };
}
export function widgetToken(request: Request) {
  return (
    /^Bearer (ft_wg_[a-f0-9]{64})$/.exec(
      request.headers.get("authorization") || "",
    )?.[1] || null
  );
}
