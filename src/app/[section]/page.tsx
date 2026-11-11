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
export const instant = false;

const sections = {
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
export function generateStaticParams() {
  return Object.keys(sections).map((section) => ({ section }));
}
export default async function Section({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section } = await params;
  if (!Object.hasOwn(sections, section)) notFound();
  const [title, description] = sections[section as keyof typeof sections];
  const data = await financeRepository.getSnapshot();
  return (
    <>
      <Heading title={title} description={description} />
      <DemoNotice />
      {section === "transactions" && <Transactions data={data} full />}
      {section === "budgets" && <Budgets data={data} />}{" "}
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
            <dl>
              <div>
                <dt>Profil</dt>
                <dd>Alex Demo · utilizator fictiv</dd>
              </div>
              <div>
                <dt>Monedă</dt>
                <dd>Leu românesc (RON)</dd>
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
                <dd>Planificat pentru etapa următoare</dd>
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
