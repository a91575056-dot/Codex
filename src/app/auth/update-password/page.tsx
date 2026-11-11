import { requireUser } from "@/lib/auth/session";
import { supabaseConfig } from "@/lib/supabase/config";
import { redirect } from "next/navigation";
import { RecoveryForm } from "@/components/recovery-form";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
export const instant = false;
export default async function UpdatePassword() {
  if (!supabaseConfig()) redirect("/auth/login");
  await requireUser();
  return (
    <Card>
      <CardHeader>
        <CardTitle>Alege o parolă nouă</CardTitle>
      </CardHeader>
      <CardContent>
        <RecoveryForm kind="update" />
      </CardContent>
    </Card>
  );
}
