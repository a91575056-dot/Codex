"use client";
import { Printer } from "lucide-react";
import { Button } from "./ui/button";
export function PrintReport() {
  return (
    <Button variant="outline" onClick={() => window.print()}>
      <Printer /> Tipărește / Salvează PDF
    </Button>
  );
}
