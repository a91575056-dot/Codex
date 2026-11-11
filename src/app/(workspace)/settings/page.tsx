import { ProfileNameForm } from "@/components/profile-name-form";
import { profileName } from "@/lib/auth/validation";
import Link from "next/link";
import { supabaseConfig } from "@/lib/supabase/config";
import { getLedger } from "@/lib/supabase/repository";
import { safeTotal } from "@/lib/planning";
import { todayISO } from "@/lib/goals";
import { accountFields, categoryFields } from "@/lib/form-fields";
import { money } from "@/lib/finance";
import { Heading } from "@/components/finance-view";
import { DemoSection } from "@/components/demo-section";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ResourceForm, DeleteResource } from "@/components/resource-form";
export const instant = false;
export default async function SettingsPage() {
  if (!supabaseConfig())
    return <DemoSection params={Promise.resolve({ section: "settings" })} />;
  const ledger = await getLedger();
  return (
    <>
      <Heading
        title="Setări"
        description="Administrează conturile și categoriile tale. Toate sumele sunt în RON."
      />
      <div className="demo-banner">
        <p>
          Cont: {ledger.user.email} · Fus orar pentru calcule: Europe/Chisinau.
          Înregistrările nu conectează conturi bancare reale.
        </p>
      </div>
      <p className="mb-6">
        <Link className="text-link" href="/install">
          Instalează FinTrack pe iPhone
        </Link>
      </p>
      <p className="mb-6">
        <Link className="text-link" href="/auth/update-password">
          Schimbă parola contului
        </Link>
      </p>
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Profilul tău</CardTitle>
        </CardHeader>
        <CardContent>
          <ProfileNameForm name={profileName(ledger.user)} />
        </CardContent>
      </Card>
      <div className="bottom-grid">
        <Card>
          <CardHeader>
            <CardTitle>Adaugă un cont</CardTitle>
          </CardHeader>
          <CardContent>
            <ResourceForm resource="account" fields={accountFields()} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Adaugă o categorie</CardTitle>
          </CardHeader>
          <CardContent>
            <ResourceForm resource="category" fields={categoryFields()} />
          </CardContent>
        </Card>
      </div>
      <h2 className="overview-heading">Conturile tale</h2>
      <div className="goal-grid mb-8">
        {ledger.accounts.map((a) => {
          const balance = safeTotal([
            a.opening_balance_minor,
            ...ledger.transactions
              .filter(
                (t) => t.account_id === a.id && t.occurred_on <= todayISO(),
              )
              .map((t) =>
                t.kind === "income" ? t.amount_minor : -t.amount_minor,
              ),
          ]);
          return (
            <Card key={a.id}>
              <CardHeader>
                <CardTitle>{a.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <strong className="stat-value">{money(balance / 100)}</strong>
                <details className="goal-detail">
                  <summary>Modifică numele sau soldul inițial</summary>
                  <ResourceForm
                    resource="account"
                    id={a.id}
                    fields={accountFields(a)}
                  />
                </details>
                <DeleteResource resource="account" id={a.id} />
              </CardContent>
            </Card>
          );
        })}
      </div>
      <h2 className="overview-heading">Categorii</h2>
      <div className="goal-grid">
        {ledger.categories.map((c) => (
          <Card key={c.id}>
            <CardHeader className="section-heading">
              <CardTitle>{c.name}</CardTitle>
              <span className="category">
                {c.kind === "income" ? "Venit" : "Cheltuială"}
              </span>
            </CardHeader>
            <CardContent>
              <details className="goal-detail">
                <summary>Editează categoria</summary>
                <ResourceForm
                  resource="category"
                  id={c.id}
                  fields={categoryFields(c)}
                />
              </details>
              <DeleteResource resource="category" id={c.id} />
            </CardContent>
          </Card>
        ))}
      </div>
      <p className="lab-help mt-6">
        Conturile și categoriile utilizate nu pot fi șterse până la modificarea
        înregistrărilor asociate. Schimbarea tipului unei categorii utilizate
        este blocată. Nu înregistra transferurile între conturile tale ca venit
        sau cheltuială: această versiune nu are un registru separat de
        transferuri.
      </p>
    </>
  );
}
