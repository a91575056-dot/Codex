import { z } from "zod";
export const credentialsSchema = z.object({
  email: z.string().trim().email("Introdu o adresă de email validă.").max(254),
  password: z
    .string()
    .min(8, "Parola trebuie să aibă cel puțin 8 caractere.")
    .max(128, "Parola este prea lungă."),
});
export function safeNext(value: unknown) {
  if (
    typeof value !== "string" ||
    !/^\/(?!\/)/.test(value) ||
    /[\\\r\n]/.test(value)
  )
    return "/";
  try {
    const u = new URL(value, "http://localhost");
    return u.origin === "http://localhost" && !u.pathname.startsWith("/auth")
      ? u.pathname + u.search
      : "/";
  } catch {
    return "/";
  }
}

export const displayNameSchema = z
  .string()
  .trim()
  .min(1, "Introdu numele afișat.")
  .max(80, "Numele poate avea maximum 80 de caractere.");
export function profileName(user: { user_metadata?: Record<string, unknown> }) {
  const value = user.user_metadata?.display_name;
  return typeof value === "string" && value.trim()
    ? value.trim().slice(0, 80)
    : "Cont personal";
}
