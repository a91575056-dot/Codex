import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FinTrack — Finanțele tale, în perspectivă",
  description:
    "Finanțe personale și urmărirea portofoliului, cu un mod demonstrativ separat.",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ro">
      <body>{children}</body>
    </html>
  );
}
