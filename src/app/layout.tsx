import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ThemeRuntime } from "@/components/theme-control";

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8fafc" },
    { media: "(prefers-color-scheme: dark)", color: "#090e1a" },
  ],
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
    <html lang="ro" data-scroll-behavior="smooth" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('fintrack.theme');document.documentElement.dataset.theme=(t==='dark'||(t!=='light'&&matchMedia('(prefers-color-scheme: dark)').matches))?'dark':'light';}catch(e){}})();`,
          }}
        />
      </head>
      <body>
        <ThemeRuntime />
        {children}
      </body>
    </html>
  );
}
