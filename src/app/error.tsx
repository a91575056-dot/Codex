"use client";
import Link from "next/link";
import { Button } from "@/components/ui/button";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="auth-shell form-grid">
      <h1>Conexiunea nu este disponibilă</h1>
      <p role="alert">
        Nu am putut încărca această pagină. Verifică conexiunea, apoi încearcă
        din nou.
      </p>
      <Button onClick={reset}>Încearcă din nou</Button>
      <Link href="/demo" className="text-link">
        Explorează separat datele DEMO
      </Link>
    </main>
  );
}
