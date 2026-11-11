import { AuthForm } from "@/components/auth-form";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
export default function Register() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Creează un cont FinTrack</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="mb-5 text-muted-foreground">
          Confirmă adresa de email înainte de conectare. Contul nou începe fără
          tranzacții.
        </p>
        <AuthForm mode="register" />
      </CardContent>
    </Card>
  );
}
