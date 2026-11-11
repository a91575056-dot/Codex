import { Dashboard } from "@/components/finance-view";
import { financeRepository } from "@/lib/finance";
import Link from "next/link";
export default async function DemoPage() {
  return (
    <>
      <p className="mb-6">
        <Link className="text-link" href="/">
          Înapoi la contul personal / conectare
        </Link>
      </p>
      <Dashboard
        data={await financeRepository.getSnapshot()}
        basePath="/demo"
      />
    </>
  );
}
