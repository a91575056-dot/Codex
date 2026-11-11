type AuthFailure = { code?: string; status?: number; message?: string };
export function authErrorMessage(error: AuthFailure, fallback: string) {
  if (
    error.code === "over_email_send_rate_limit" ||
    /email rate limit exceeded/i.test(error.message || "")
  )
    return "Supabase a atins limita de trimitere a emailurilor. Așteaptă reînnoirea limitei, apoi încearcă din nou. Repetarea cererii sau ștergerea contului nu resetează limita.";
  if (error.code === "over_request_rate_limit" || error.status === 429)
    return "Au fost prea multe încercări. Așteaptă înainte de a încerca din nou.";
  if (error.code === "email_address_not_authorized")
    return "Serviciul de email permite momentan doar adresele echipei Supabase. Administratorul trebuie să configureze un serviciu SMTP pentru înregistrări publice.";
  if (error.code === "email_not_confirmed")
    return "Confirmă adresa de email înainte de conectare. Poți solicita un email nou din Retrimite confirmarea emailului.";
  return fallback;
}
