import type { MetadataRoute } from "next";
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "FinTrack — Finanțe personale",
    short_name: "FinTrack",
    description: "Înregistrează cheltuieli, urmărește bugete și obiective.",
    lang: "ro",
    start_url: "/quick-expense?source=homescreen",
    scope: "/",
    display: "standalone",
    background_color: "#f7f9f8",
    theme_color: "#137d67",
    icons: [
      { src: "/icons/fintrack-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/fintrack-512.png", sizes: "512x512", type: "image/png" },
    ],
    shortcuts: [
      {
        name: "Cheltuială rapidă",
        url: "/quick-expense",
        short_name: "Cheltuială",
      },
      { name: "Panou de control", url: "/" },
    ],
  };
}
