import { DemoSection } from "@/components/demo-section";
import { supabaseConfig } from "@/lib/supabase/config";
import { getUserFinance } from "@/lib/supabase/repository";
import { ConnectedStats } from "@/components/connected-dashboard";
import { notFound } from "next/navigation";
import { Heading, Charts } from "@/components/finance-view";
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
  return Object.keys(sections)
    .filter((section) => section !== "transactions")
    .map((section) => ({ section }));
}

export default async function Section({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  if (!supabaseConfig()) return <DemoSection params={params} />;
  const { section } = await params;
  if (!Object.hasOwn(sections, section)) notFound();
  if (section === "budgets" || section === "investments")
    return <DemoSection params={params} />;
  const data = await getUserFinance();
  const [title, description] = sections[section as keyof typeof sections];
  return (
    <>
      <Heading title={title} description={description} />
      {section === "analytics" && (
        <>
          <ConnectedStats data={data} />
          <Charts data={data} only="cash" demo={false} />
        </>
      )}
      {section === "reports" && (
        <Card>
          <CardHeader>
            <CardTitle>Raportul tranzacțiilor tale</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-5">
              Exportă toate tranzacțiile salvate, inclusiv cele cu dată
              viitoare.
            </p>
            <ReportDownload transactions={data.transactions} demo={false} />
          </CardContent>
        </Card>
      )}
      {section === "settings" && (
        <Card>
          <CardHeader>
            <CardTitle>Cont personal</CardTitle>
          </CardHeader>
          <CardContent>
            <p>
              Datele tale sunt salvate în Supabase. Monedă: RON. Fus orar pentru
              calcule: Europe/Chisinau.
            </p>
            <p className="mt-4">
              Soldul include soldurile inițiale și tranzacțiile până astăzi.
              Investițiile și bugetele sunt încă exemple DEMO separate.
            </p>
          </CardContent>
        </Card>
      )}
    </>
  );
}
