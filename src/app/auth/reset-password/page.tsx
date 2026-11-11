import { RecoveryForm } from "@/components/recovery-form";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
export default function ResetPassword() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recuperează accesul</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="lab-help">
          Trimitem un link pentru alegerea unei parole noi.
        </p>
        <RecoveryForm kind="reset" />
      </CardContent>
    </Card>
  );
}
