"use client";
import { Download } from "lucide-react";
import { Button } from "./ui/button";
import type { Transaction } from "@/types/finance";
export function ReportDownload({
  transactions,
}: {
  transactions: Transaction[];
}) {
  function download() {
    const rows = [
      ["DEMO — Date fictive"],
      ["Dată", "Descriere", "Categorie", "Sumă RON"],
      ...transactions.map((t) => [t.date, t.name, t.category, t.amount]),
    ];
    const csv =
      "\uFEFF" +
      rows
        .map((r) =>
          r.map((c) => '"' + String(c).replaceAll('"', '""') + '"').join(";"),
        )
        .join("\r\n");
    const url = URL.createObjectURL(
      new Blob([csv], { type: "text/csv;charset=utf-8;" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "fintrack-demo-noiembrie-2026.csv";
    a.click();
    URL.revokeObjectURL(url);
  }
  return (
    <Button onClick={download}>
      <Download /> Descarcă raportul demo
    </Button>
  );
}
