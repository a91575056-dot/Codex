"use server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { supabaseConfig } from "@/lib/supabase/config";
import { credentialsSchema, safeNext } from "@/lib/auth/validation";
export type AuthState = { error?: string; message?: string };
export async function authenticate(
  mode: "login" | "register",
  _previous: AuthState,
  form: FormData,
): Promise<AuthState> {
  if (!supabaseConfig())
    return { error: "Supabase nu este configurat. Poți explora modul demo." };
  const parsed = credentialsSchema.safeParse({
    email: form.get("email"),
    password: form.get("password"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const client = await createClient();
  if (mode === "register") {
    const origin = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
    const { error } = await client.auth.signUp({
      ...parsed.data,
      options: {
        emailRedirectTo: new URL("/auth/callback", origin).toString(),
      },
    });
    if (error)
      return {
        error:
          "Înregistrarea nu a reușit. Verifică datele sau încearcă din nou mai târziu.",
      };
    return {
      message:
        "Dacă adresa este eligibilă, vei primi un email de confirmare. Verifică și folderul Spam, apoi conectează-te.",
    };
  }
  const { error } = await client.auth.signInWithPassword(parsed.data);
  if (error)
    return {
      error:
        "Conectarea nu a reușit. Verifică emailul, parola și confirmarea adresei.",
    };
  redirect(safeNext(form.get("next")));
}
export async function signOut() {
  if (supabaseConfig()) {
    const client = await createClient();
    const { error } = await client.auth.signOut();
    if (error) throw new Error("Deconectarea nu a reușit. Încearcă din nou.");
  }
  redirect("/auth/login");
}
