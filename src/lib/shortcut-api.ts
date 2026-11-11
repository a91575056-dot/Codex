import "server-only";
import { createClient } from "@supabase/supabase-js";
import { supabaseConfig } from "./supabase/config";
import type { Database } from "./supabase/database.types";
export function shortcutClient() {
  const config = supabaseConfig();
  return config
    ? createClient<Database>(config.url, config.key, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        },
      })
    : null;
}
export function json(value: unknown, status = 200) {
  return Response.json(value, {
    status,
    headers: {
      "Cache-Control": "private, no-store",
      Pragma: "no-cache",
      "X-Content-Type-Options": "nosniff",
      ...(status === 429 ? { "Retry-After": "60" } : {}),
    },
  });
}
export function deviceToken(request: Request) {
  return (
    /^Bearer (ft_sc_[a-f0-9]{64})$/.exec(
      request.headers.get("authorization") || "",
    )?.[1] || null
  );
}
export async function readShortcutJson(request: Request): Promise<unknown> {
  if (
    !request.headers
      .get("content-type")
      ?.toLowerCase()
      .startsWith("application/json")
  )
    throw new Error("content-type");
  const reader = request.body?.getReader();
  if (!reader) throw new Error("json");
  const parts: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 8192) {
        await reader.cancel();
        throw new Error("size");
      }
      parts.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const part of parts) {
    bytes.set(part, offset);
    offset += part.length;
  }
  return JSON.parse(new TextDecoder().decode(bytes));
}
export function rpcError(error: { code?: string }) {
  if (error.code === "42501")
    return json(
      {
        error:
          "Activează veniturile pentru acest telefon din FinTrack → iPhone și scurtături. Dacă telefonul nu îți aparține, reconectează-l din contul corect.",
      },
      403,
    );
  if (error.code === "28000")
    return json(
      {
        error:
          "Token invalid, expirat sau revocat. Reconectează telefonul din Setări → iPhone.",
      },
      401,
    );
  if (error.code === "53300")
    return json(
      {
        error:
          "Prea multe cereri. Reîncearcă peste un minut cu același request_id.",
      },
      429,
    );
  if (error.code === "23505")
    return json(
      {
        error:
          "Acest request_id există cu alte date. Verifică tranzacțiile înainte de o cerere nouă.",
      },
      409,
    );
  if (["22023", "23503", "23514", "22P02", "22003"].includes(error.code || ""))
    return json(
      {
        error:
          "Verifică suma, metoda de plată și categoria. Conturile trebuie să îți aparțină.",
      },
      422,
    );
  return json(
    {
      error:
        "FinTrack nu poate confirma salvarea momentan. Reîncearcă aceeași cerere; nu genera un request_id nou.",
    },
    503,
  );
}
export function inputError(error: unknown) {
  const message = error instanceof Error ? error.message : "json";
  if (message === "size")
    return json({ error: "Cererea este prea mare." }, 413);
  if (message === "content-type")
    return json({ error: "Trimite corpul cererii ca JSON." }, 415);
  return json({ error: "Corpul JSON este invalid." }, 400);
}
