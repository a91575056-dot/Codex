import { RecoveryForm } from "@/components/recovery-form";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
export default function ResendConfirmation() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Retrimite confirmarea</CardTitle>
      </CardHeader>
      <CardContent>
        <RecoveryForm kind="resend" />
      </CardContent>
    </Card>
  );
}
