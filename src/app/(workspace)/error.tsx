"use client";
import { Button } from "@/components/ui/button";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <div className="form-grid py-12">
      <h1>Datele nu au putut fi încărcate</h1>
      <p role="alert">
        Verifică conexiunea și configurarea bazei de date. Datele demo nu
        înlocuiesc datele contului tău.
      </p>
      <Button onClick={reset}>Încearcă din nou</Button>
    </div>
  );
}
