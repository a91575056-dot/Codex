import { ThemeControl, CurrencyPreference } from "./theme-control";
import { notFound } from "next/navigation";
import {
  Heading,
  DemoNotice,
  Transactions,
  Budgets,
  Charts,
  Stats,
} from "@/components/finance-view";
import { financeRepository } from "@/lib/finance";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ReportDownload } from "@/components/report-download";

const demoSections = {
  transactions: ["Tranzacții", "Activitatea financiară, într-un singur loc."],
  budgets: ["Bugete", "Un plan clar pentru fiecare categorie de cheltuieli."],
  investments: [
    "Investiții",
    "Urmărește structura portofoliului demonstrativ.",
  ],
  analytics: ["Analize", "Înțelege tiparele din finanțele tale."],
  reports: ["Rapoarte", "O imagine de ansamblu pe care o poți lua cu tine."],
  settings: ["Setări", "Informații despre aplicație și modul demonstrativ."],
} as const;

export async function DemoSection({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section } = await params;
  if (!Object.hasOwn(demoSections, section)) notFound();
  const [title, description] =
    demoSections[section as keyof typeof demoSections];
  const data = await financeRepository.getSnapshot();
  return (
    <>
      <Heading title={title} description={description} />
      <DemoNotice />
      {section === "transactions" && <Transactions data={data} full />}
      {section === "budgets" && <Budgets data={data} basePath="/demo" />}{" "}
      {section === "investments" && (
        <>
          <Stats data={data} />
          <Charts data={data} only="allocation" />
        </>
      )}
      {section === "analytics" && (
        <>
          <Stats data={data} />
          <Charts data={data} only="cash" />
        </>
      )}
      {section === "reports" && (
        <Card>
          <CardHeader>
            <CardTitle>Raport de activitate · Noiembrie 2026</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-6 text-sm text-muted-foreground">
              Exportă tranzacțiile fictive în format CSV. Fișierul este generat
              local, în browser.
            </p>
            <ReportDownload transactions={data.transactions} />
          </CardContent>
        </Card>
      )}
      {section === "settings" && (
        <Card>
          <CardHeader>
            <CardTitle>Despre acest spațiu</CardTitle>
          </CardHeader>
          <CardContent className="settings-content">
            <div className="theme-settings">
              <h3>Aspectul aplicației</h3>
              <ThemeControl />
            </div>
            <div className="form-grid mt-6">
              <CurrencyPreference />
            </div>
            <dl>
              <div>
                <dt>Profil</dt>
                <dd>Alex Demo · utilizator fictiv</dd>
              </div>
              <div>
                <dt>Monedă</dt>
                <dd>Leu moldovenesc (MDL)</dd>
              </div>
              <div>
                <dt>Limbă</dt>
                <dd>Română</dd>
              </div>
              <div>
                <dt>Sursă de date</dt>
                <dd>Date demonstrative locale</dd>
              </div>
              <div>
                <dt>Supabase</dt>
                <dd>Disponibil în zona contului personal</dd>
              </div>
            </dl>
            <p>
              FinTrack este un proiect de licență. Aplicația nu conectează
              conturi financiare, nu execută tranzacții și nu necesită chei API.
            </p>
          </CardContent>
        </Card>
      )}
    </>
  );
}
