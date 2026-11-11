"use client";
import { useSyncExternalStore } from "react";
import Link from "next/link";
import { Smartphone, Share, PlusSquare } from "lucide-react";
import { IphoneSetup } from "./iphone-setup";
const subscribe = (listener: () => void) => {
  const media = window.matchMedia("(display-mode: standalone)");
  media.addEventListener("change", listener);
  return () => media.removeEventListener("change", listener);
};
export function InstallGuide() {
  const standalone = useSyncExternalStore(
    subscribe,
    () =>
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true,
    () => false,
  );
  return (
    <main className="quick-shell">
      <Link className="brand mb-8" href="/">
        FinTrack.
      </Link>
      <h1>FinTrack pe iPhone</h1>
      <p className="subtitle">Aplicație instalabilă, fără App Store.</p>
      {standalone ? (
        <p className="form-success" role="status">
          FinTrack este deja deschisă ca aplicație instalată.
        </p>
      ) : (
        <div className="quick-form mt-6">
          <Smartphone size={30} />
          <ol className="install-steps">
            <li>Deschide adresa FinTrack pe iPhone în Safari.</li>
            <li>
              Apasă{" "}
              <strong>
                <Share size={15} /> Partajare
              </strong>{" "}
              și alege{" "}
              <strong>
                <PlusSquare size={15} /> Adaugă pe ecranul principal
              </strong>
              .
            </li>
            <li>
              Dacă apare opțiunea{" "}
              <strong>Deschide ca aplicație web / Open as Web App</strong>,
              activeaz-o și apasă Adaugă.
            </li>
            <li>
              Deschide iconița FinTrack și conectează-te în contul tău. Prima
              autentificare în aplicația instalată poate fi separată de Safari.
            </li>
          </ol>
          <p className="quick-hint">
            Ulterior, iconița deschide panoul complet într-o fereastră proprie,
            cu acces la venituri, cheltuieli și toate secțiunile. Salvarea cere
            internet și un cont personal autentificat. Nu colectează automat
            plăți și nu salvează tranzacții offline.
          </p>
        </div>
      )}
      <p className="lab-actions mt-6">
        <Link className="text-link" href="/quick-expense">
          Deschide cheltuiala rapidă
        </Link>
        <Link className="text-link" href="/auth/register">
          Creează contul personal
        </Link>
      </p>
      <IphoneSetup />
      <p className="quick-hint">
        PWA este o aplicație web instalată, nu un fișier IPA și nu se instalează
        din Descărcări. Etichetele meniurilor pot varia cu versiunea și limba
        iOS.
      </p>
    </main>
  );
}
