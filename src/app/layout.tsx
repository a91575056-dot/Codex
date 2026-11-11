import type { Metadata } from "next";
import "./globals.css";
import { Shell } from "@/components/shell";
export const metadata: Metadata = {
  title: "FinTrack — Finanțele tale, în perspectivă",
  description:
    "Aplicație demonstrativă pentru finanțe personale și urmărirea portofoliului.",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ro">
      <body>
        <Shell>{children}</Shell>
      </body>
    </html>
  );
}
