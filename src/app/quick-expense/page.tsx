import { profileName } from "@/lib/auth/validation";
import { randomUUID } from "node:crypto";
import Link from "next/link";
import { Landmark, ArrowLeft } from "lucide-react";
import { supabaseConfig } from "@/lib/supabase/config";
import { getLedger } from "@/lib/supabase/repository";
import { QuickExpenseForm } from "@/components/quick-expense-form";
import { IphoneSetup } from "@/components/iphone-setup";
export const instant = false;
export default async function QuickExpensePage() {
  const demo = !supabaseConfig();
  const data = demo
    ? {
        accounts: [
          {
            id: "00000000-0000-4000-8000-000000000010",
            user_id: "demo",
            name: "Cont demonstrativ",
            currency: "RON" as const,
            opening_balance_minor: 0,
            created_at: "",
          },
        ],
        categories: [
          {
            id: "00000000-0000-4000-8000-000000000011",
            user_id: "demo",
            name: "Alimente · DEMO",
            kind: "expense" as const,
            created_at: "",
          },
        ],
        user: { id: "demo", email: undefined, user_metadata: {} },
      }
    : await getLedger("/quick-expense");
  return (
    <main className="quick-shell">
      <header>
        <Link className="brand" href="/">
          <Landmark /> FinTrack.
        </Link>
        <Link href="/transactions" className="quick-back">
          <ArrowLeft size={16} /> Tranzacții
        </Link>
      </header>
      <h1>Cheltuială rapidă</h1>
      <p className="subtitle">O sumă, o metodă de plată, o categorie.</p>
      {demo && (
        <p className="demo-banner">
          DEMO · Publică și configurează Supabase pentru a salva. Formularul
          demonstrativ este doar pentru vizualizare.
        </p>
      )}
      <p className="quick-account">
        {demo
          ? "Date fictive — nu este contul tău personal"
          : `Cont personal: ${profileName(data.user)}${data.user.email ? " · " + data.user.email : ""}`}
      </p>
      <QuickExpenseForm
        accounts={data.accounts}
        categories={data.categories}
        userId={data.user.id}
        requestId={demo ? "00000000-0000-4000-8000-000000000012" : randomUUID()}
        demo={demo}
      />
      <p className="mt-6">
        <Link href="/install" className="text-link">
          Instalează FinTrack pe ecranul iPhone-ului
        </Link>
      </p>
      <IphoneSetup />
    </main>
  );
}
