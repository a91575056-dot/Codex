export function supabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url && !key) return null;
  if (!url || !key)
    throw new Error("Configurație Supabase incompletă. Verifică .env.local.");
  if (
    !URL.canParse(url) ||
    !["http:", "https:"].includes(new URL(url).protocol)
  )
    throw new Error("URL Supabase invalid.");
  if (!key.startsWith("sb_publishable_"))
    throw new Error("Folosește cheia publishable, niciodată o cheie secretă.");
  return { url, key };
}
