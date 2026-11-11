import type { Metadata, Viewport } from "next";
import "./globals.css";

export const viewport: Viewport = {
  themeColor: "#137d67",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};
export const metadata: Metadata = {
  applicationName: "FinTrack",
  other: { "apple-mobile-web-app-capable": "yes" },
  appleWebApp: { capable: true, title: "FinTrack", statusBarStyle: "default" },
  icons: { apple: "/icons/fintrack-180.png" },
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
