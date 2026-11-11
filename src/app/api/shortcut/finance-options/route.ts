import {
  shortcutClient,
  deviceToken,
  json,
  rpcError,
} from "@/lib/shortcut-api";
export async function POST(request: Request) {
  const token = deviceToken(request);
  if (!token)
    return json(
      {
        error:
          "Este necesar tokenul telefonului în antetul Authorization: Bearer.",
      },
      401,
    );
  const client = shortcutClient();
  if (!client)
    return json(
      { error: "Modul demo nu permite conectarea telefoanelor." },
      503,
    );
  try {
    const { data, error } = await client.rpc("shortcut_finance_options", {
      p_token: token,
    });
    return error ? rpcError(error) : json(data);
  } catch {
    return json({ error: "Conexiunea la FinTrack nu este disponibilă." }, 503);
  }
}
