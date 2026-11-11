import { AuthForm } from "@/components/auth-form";
import { safeNext } from "@/lib/auth/validation";
import { supabaseConfig } from "@/lib/supabase/config";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
export const instant = false;
export default async function Login({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const params = await searchParams;
  return (
    <Card>
      <CardHeader>
        <CardTitle>Conectare</CardTitle>
      </CardHeader>
      <CardContent>
        {params.error && (
          <p className="form-error" role="alert">
            Linkul de confirmare este invalid sau a expirat. Solicită un email
            nou prin reînregistrare sau încearcă să te conectezi dacă adresa
            este deja confirmată.
          </p>
        )}
        {!supabaseConfig() && (
          <p className="mb-4">
            Supabase nu este configurat. Modul demo este disponibil.
          </p>
        )}
        <AuthForm mode="login" next={safeNext(params.next)} />
      </CardContent>
    </Card>
  );
}
