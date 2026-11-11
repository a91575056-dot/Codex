import { revalidatePath } from "next/cache";
import { shortcutTransactionSchema } from "@/lib/shortcut";
import {
  shortcutClient,
  deviceToken,
  json,
  readShortcutJson,
  inputError,
  rpcError,
} from "@/lib/shortcut-api";
import { money } from "@/lib/finance";
import { paymentLabels } from "@/lib/payment";
export async function POST(request: Request) {
  const token = deviceToken(request);
  if (!token)
    return json(
      { error: "Tokenul telefonului lipsește sau este invalid." },
      401,
    );
  const client = shortcutClient();
  if (!client)
    return json({ error: "Modul demo nu salvează tranzacții." }, 503);
  let body: unknown;
  try {
    body = await readShortcutJson(request);
  } catch (e) {
    return inputError(e);
  }
  const parsed = shortcutTransactionSchema.safeParse(body);
  if (!parsed.success)
    return json({ error: parsed.error.issues[0].message }, 422);
  const p = parsed.data;
  try {
    const { data, error } = await client.rpc(
      p.kind === "income" ? "shortcut_income" : "shortcut_expense",
      {
        p_token: token,
        p_request_id: p.request_id,
        p_amount_minor: p.amount,
        p_payment_method: p.payment_method,
        p_category_id: p.category_id,
        p_description: p.description,
      },
    );
    if (error) return rpcError(error);
    if (!data)
      return json({ error: "Salvarea nu a putut fi confirmată." }, 503);
    revalidatePath("/", "layout");
    return json(
      {
        ...data,
        kind: p.kind,
        message: `${p.kind === "income" ? "Venit salvat" : "Cheltuială salvată"}: ${money(data.amount_minor / 100)} · ${paymentLabels[data.payment_method]} · ${data.category}.`,
      },
      data.replayed ? 200 : 201,
    );
  } catch {
    return json(
      {
        error:
          "Conexiunea s-a întrerupt. Retrimite aceeași cerere cu același request_id.",
      },
      503,
    );
  }
}
