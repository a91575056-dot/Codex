import { shortcutClient, json } from "@/lib/shortcut-api";
import { widgetSnapshot, widgetToken } from "@/lib/widget";
export async function GET(request: Request) {
  const token = widgetToken(request);
  if (!token)
    return json({ error: "Conectează widgetul cu cheia sa de citire." }, 401);
  const client = shortcutClient();
  if (!client)
    return json({ error: "Widgetul necesită un cont personal." }, 503);
  try {
    const { data, error } = await client.rpc("widget_budget_snapshot", {
      p_token: token,
    });
    if (error) {
      if (error.code === "28000")
        return json(
          { error: "Cheia widgetului este invalidă, expirată sau revocată." },
          401,
        );
      if (error.code === "53300")
        return json({ error: "Reîncearcă peste un minut." }, 429);
      return json({ error: "Bugetele nu sunt disponibile momentan." }, 503);
    }
    return json(widgetSnapshot(data));
  } catch {
    return json({ error: "Bugetele nu sunt disponibile momentan." }, 503);
  }
}
