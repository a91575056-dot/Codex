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

export async function authEmailAction(
  kind: "reset" | "resend",
  _state: AuthState,
  form: FormData,
): Promise<AuthState> {
  if (!supabaseConfig())
    return {
      error: "Supabase nu este configurat. Modul demo este disponibil.",
    };
  const email = credentialsSchema.shape.email.safeParse(form.get("email"));
  if (!email.success) return { error: "Introdu o adresă de email validă." };
  const client = await createClient();
  const origin = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const callback = new URL("/auth/callback", origin).toString();
  const result =
    kind === "reset"
      ? await client.auth.resetPasswordForEmail(email.data, {
          redirectTo: callback,
        })
      : await client.auth.resend({
          type: "signup",
          email: email.data,
          options: { emailRedirectTo: callback },
        });
  if (result.error)
    return {
      error: "Cererea nu a putut fi trimisă. Încearcă din nou mai târziu.",
    };
  return {
    message:
      "Dacă adresa este eligibilă, vei primi un email. Verifică și folderul Spam. Deschide linkul în același browser sau folosește șablonul de confirmare descris în README.",
  };
}
export async function updatePassword(
  _state: AuthState,
  form: FormData,
): Promise<AuthState> {
  if (!supabaseConfig()) return { error: "Supabase nu este configurat." };
  const password = credentialsSchema.shape.password.safeParse(
    form.get("password"),
  );
  if (!password.success) return { error: password.error.issues[0].message };
  if (password.data !== form.get("confirmation"))
    return { error: "Parolele nu coincid." };
  const client = await createClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) redirect("/auth/login");
  const { error } = await client.auth.updateUser({ password: password.data });
  if (error)
    return {
      error:
        "Parola nu a putut fi actualizată. Folosește un link nou de recuperare și încearcă din nou.",
    };
  return { message: "Parola a fost actualizată. Poți reveni la aplicație." };
}
