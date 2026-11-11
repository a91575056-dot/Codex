import Link from "next/link";
import { supabaseConfig } from "@/lib/supabase/config";
import { getLedger } from "@/lib/supabase/repository";
import { Heading, DemoNotice } from "@/components/finance-view";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { CSVImportForm } from "@/components/csv-import-form";
export const instant = false;
export default async function ImportPage() {
  if (!supabaseConfig())
    return (
      <>
        <Heading
          title="Importă tranzacții CSV"
          description="Verifică fișierul înainte de salvarea în contul personal."
        />
        <DemoNotice />
        <p>Modul demo nu acceptă importuri și nu modifică date.</p>
      </>
    );
  const ledger = await getLedger("/import");
  return (
    <>
      <Heading
        title="Importă tranzacții CSV"
        description="Adaugă istoricul dintr-un fișier local, cu previzualizare și protecție împotriva importului repetat."
      />
      <p className="mb-6">
        <Link className="text-link" href="/transactions">
          Înapoi la tranzacții
        </Link>
      </p>
      <Card>
        <CardHeader>
          <CardTitle>Import verificat în MDL</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="lab-help mb-6">
            Coloane: data, descriere, tip, suma, categorie, metoda. Opțional:
            cont și moneda (numai MDL). Data: AAAA-LL-ZZ sau ZZ.LL.AAAA. Tip:
            venit/cheltuiala. Suma: fără separatori de mii, maximum două
            zecimale. Sunt acceptate și rapoartele CSV personale FinTrack;
            fișierele demo sunt respinse. Categoriile și conturile trebuie să
            existe în{" "}
            <Link className="text-link" href="/settings">
              Setări
            </Link>
            . Transferurile între conturi se înregistrează în Transferuri, nu
            prin import ca venit/cheltuială.
          </p>
          <CSVImportForm
            accounts={ledger.accounts}
            categories={ledger.categories}
          />
        </CardContent>
      </Card>
    </>
  );
}
