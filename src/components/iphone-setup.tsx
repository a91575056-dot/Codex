"use client";
import { useState, useSyncExternalStore } from "react";
import { Copy } from "lucide-react";
import { Button } from "./ui/button";
const subscribe = () => () => {};
export function IphoneSetup() {
  const url = useSyncExternalStore(
    subscribe,
    () => window.location.origin + "/quick-expense",
    () => "",
  );
  const [message, setMessage] = useState("");
  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setMessage("Link copiat. Lipește-l în acțiunea URL din Shortcuts.");
    } catch {
      setMessage("Selectează și copiază manual linkul afișat.");
    }
  }
  return (
    <details className="iphone-setup">
      <summary>Configurează cele 3 atingeri pe iPhone</summary>
      <ol>
        <li>
          După publicare, deschide această pagină pe iPhone și conectează-te în
          browserul folosit de comandă.
        </li>
        <li>
          În aplicația <strong>Scurtături / Shortcuts</strong>, creează
          „FinTrack — Cheltuială”. Adaugă acțiunea <strong>URL</strong> cu
          linkul de mai jos, apoi <strong>Deschide URL-uri / Open URLs</strong>.
        </li>
        <li>
          În{" "}
          <strong>
            Configurări → Accesibilitate → Atingere → Atingere spate / Back Tap
            → Atingere triplă
          </strong>
          , selectează scurtătura creată.
        </li>
        <li>
          Atinge de trei ori spatele iPhone-ului, introdu cheltuiala și apasă
          Salvează. Poate fi necesară deblocarea telefonului.
        </li>
      </ol>
      <label>
        Link pentru scurtătură
        <input
          readOnly
          value={url}
          aria-label="Link pentru scurtătură"
          onFocus={(e) => e.target.select()}
        />
      </label>
      <Button type="button" variant="outline" onClick={copy} disabled={!url}>
        <Copy /> Copiază linkul
      </Button>
      {message && <p role="status">{message}</p>}
      <p>
        Folosește adresa publică HTTPS după publicare. „localhost” pe iPhone
        desemnează telefonul, nu calculatorul. Funcția cere internet; nu citește
        automat plățile Apple Pay sau numerarul.
      </p>
      <a
        className="text-link"
        href="https://support.apple.com/en-ie/guide/shortcuts/apd897693606/ios"
        target="_blank"
        rel="noreferrer"
      >
        Instrucțiuni Apple pentru Back Tap
      </a>
    </details>
  );
}
