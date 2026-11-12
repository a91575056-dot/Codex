import { revalidatePath } from "next/cache";
import { shortcutLoanSchema } from "@/lib/shortcut";
import {
  shortcutClient,
  deviceToken,
  json,
  readShortcutJson,
  inputError,
  rpcError,
} from "@/lib/shortcut-api";
import { money } from "@/lib/finance";
import { loanLabels } from "@/lib/loans";
export async function POST(request: Request) {
  const token = deviceToken(request);
  if (!token)
    return json(
      { error: "Tokenul telefonului lipsește sau este invalid." },
      401,
    );
  const client = shortcutClient();
  if (!client)
    return json({ error: "Modul demo nu salvează împrumuturi." }, 503);
  let body: unknown;
  try {
    body = await readShortcutJson(request);
  } catch (e) {
    return inputError(e);
  }
  const parsed = shortcutLoanSchema.safeParse(body);
  if (!parsed.success)
    return json({ error: parsed.error.issues[0].message }, 422);
  const p = parsed.data;
  try {
    const { data, error } = await client.rpc("shortcut_loan", {
      p_token: token,
      p_request_id: p.request_id,
      p_direction: p.direction,
      p_person: p.person,
      p_amount_minor: p.amount,
      p_payment_method: p.payment_method,
      p_note: p.description,
    });
    if (error?.code === "42501")
      return json(
        {
          error:
            "Activează împrumuturile pentru acest telefon din FinTrack → iPhone și scurtături.",
        },
        403,
      );
    if (error) return rpcError(error);
    if (!data)
      return json(
        { error: "Salvarea împrumutului nu a putut fi confirmată." },
        503,
      );
    revalidatePath("/", "layout");
    return json(
      {
        ...data,
        message: `${loanLabels[data.direction]} salvat: ${money(data.amount_minor / 100)} · ${data.person}.`,
      },
      data.replayed ? 200 : 201,
    );
  } catch {
    return json(
      {
        error:
          "Conexiunea s-a întrerupt. Verifică împrumuturile înainte să repeți înregistrarea.",
      },
      503,
    );
  }
}
