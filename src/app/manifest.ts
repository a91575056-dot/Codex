import type { MetadataRoute } from "next";
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "FinTrack — Finanțe personale",
    short_name: "FinTrack",
    description: "Înregistrează cheltuieli, urmărește bugete și obiective.",
    lang: "ro",
    start_url: "/?source=homescreen",
    scope: "/",
    display: "standalone",
    background_color: "#f8fafc",
    theme_color: "#2563eb",
    icons: [
      { src: "/icons/fintrack-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/fintrack-512.png", sizes: "512x512", type: "image/png" },
    ],
    shortcuts: [
      {
        name: "Adaugă venit",
        short_name: "Venit",
        url: "/transactions?create=income#transaction-form",
      },
      {
        name: "Cheltuială rapidă",
        url: "/quick-expense",
        short_name: "Cheltuială",
      },
      { name: "Panou de control", url: "/" },
    ],
  };
}
