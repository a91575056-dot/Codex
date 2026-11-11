"use client";
import { paymentLabels } from "@/lib/payment";
import { Download } from "lucide-react";
import { Button } from "./ui/button";
import type { Transaction } from "@/types/finance";
export function ReportDownload({
  transactions,
  demo = true,
}: {
  transactions: Transaction[];
  demo?: boolean;
}) {
  function download() {
    const rows = [
      [demo ? "DEMO — Date fictive" : "FinTrack — Tranzacții personale"],
      ["Dată", "Descriere", "Categorie", "Plată", "Sumă MDL", "Cont"],
      ...transactions.map((t) => [
        t.date,
        t.name,
        t.category,
        paymentLabels[t.paymentMethod || "unspecified"],
        t.amount,
        t.account || "",
      ]),
    ];
    const csv =
      "\uFEFF" +
      rows
        .map((r) =>
          r
            .map(
              (c) =>
                '"' +
                (typeof c === "string" && /^[\s]*[=+@\-]|^[\t\r]/.test(c)
                  ? "'" + c
                  : String(c)
                ).replaceAll('"', '""') +
                '"',
            )
            .join(";"),
        )
        .join("\r\n");
    const url = URL.createObjectURL(
      new Blob([csv], { type: "text/csv;charset=utf-8;" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = demo
      ? "fintrack-demo-noiembrie-2026.csv"
      : "fintrack-tranzactii.csv";
    a.click();
    URL.revokeObjectURL(url);
  }
  return (
    <Button onClick={download}>
      <Download /> {demo ? "Descarcă raportul demo" : "Descarcă raportul CSV"}
    </Button>
  );
}
