import { ThemeControl, CurrencyPreference } from "@/components/theme-control";
import { getEnvelopes } from "@/lib/supabase/envelope-repository";
import { EnvelopeConfig, StartEnvelopes } from "@/components/envelope-forms";
import { ProfileNameForm } from "@/components/profile-name-form";
import { profileName } from "@/lib/auth/validation";
import Link from "next/link";
import { supabaseConfig } from "@/lib/supabase/config";
import { getLedger } from "@/lib/supabase/repository";
import { accountBalance } from "@/lib/operations";
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
  const [ledger, envelopes] = await Promise.all([getLedger(), getEnvelopes()]);
  return (
    <>
      <Heading
        title="Setări"
        description="Conturi în MDL și EUR, cu solduri separate. Categorii distincte pentru venituri și cheltuieli."
      />
      <nav className="settings-nav" aria-label="Secțiunile setărilor">
        <a href="#profile-settings">Profil</a>
        <a href="#appearance-settings">Aspect</a>
        <a href="#budget-percentages">Procente</a>
        <a href="#account-settings">Conturi</a>
        <a href="#category-settings">Categorii</a>
      </nav>
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
        <Link className="text-link" href="/iphone">
          iPhone: cheltuieli fără browser și telefoane conectate
        </Link>
      </p>
      <p className="mb-6">
        <Link className="text-link" href="/auth/update-password">
          Schimbă parola contului
        </Link>
      </p>
      <Card id="profile-settings" className="mb-6">
        <CardHeader>
          <CardTitle>Profilul tău</CardTitle>
        </CardHeader>
        <CardContent>
          <ProfileNameForm name={profileName(ledger.user)} />
        </CardContent>
      </Card>
      <Card id="appearance-settings" className="mb-6">
        <CardHeader>
          <CardTitle>Preferințe de afișare</CardTitle>
        </CardHeader>
        <CardContent className="form-grid">
          <div className="theme-settings">
            <div>
              <h3>Aspectul aplicației</h3>
              <p className="lab-help">
                Luminos, întunecat sau după dispozitiv.
              </p>
            </div>
            <ThemeControl />
          </div>
          <CurrencyPreference />
        </CardContent>
      </Card>
      <section id="budget-percentages" className="mb-8">
        <h2 className="overview-heading">Procentele bugetelor automate</h2>
        <p className="lab-help mb-4">
          Configurează cum se împart salariul, bonusurile și celelalte venituri
          noi. Procentele trebuie să totalizeze 100%. Alocările existente se
          păstrează.
        </p>
        {envelopes.plans.map((plan) => (
          <Card key={plan.id} className="mb-6">
            <CardHeader>
              <CardTitle>Procente {plan.currency}</CardTitle>
            </CardHeader>
            <CardContent>
              <EnvelopeConfig
                key={plan.id}
                plan={plan}
                rules={envelopes.rules.filter((r) => r.plan_id === plan.id)}
                names={Object.fromEntries(
                  ledger.categories.map((c) => [c.id, c.name]),
                )}
              />
            </CardContent>
          </Card>
        ))}
        <StartEnvelopes
          currencies={(["MDL", "EUR"] as const).filter(
            (c) => !envelopes.plans.some((p) => p.currency === c),
          )}
        />
      </section>
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
      <h2 id="account-settings" className="overview-heading">
        Conturile tale
      </h2>
      <div className="goal-grid mb-8">
        {ledger.accounts.map((a) => {
          const balance = accountBalance(
            a,
            ledger.transactions,
            ledger.transfers,
          );
          return (
            <Card key={a.id}>
              <CardHeader>
                <CardTitle>{a.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <strong className="stat-value">
                  {money(balance / 100, a.currency)}
                </strong>
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
      <h2 id="category-settings" className="overview-heading">
        Categorii de venituri și cheltuieli
      </h2>
      <div className="goal-grid">
        {ledger.categories.map((c) => (
          <Card key={c.id}>
            <CardHeader className="category-card-heading">
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
        este blocată. Folosește pagina Transferuri pentru mutarea banilor între
        conturile tale.
      </p>
    </>
  );
}
