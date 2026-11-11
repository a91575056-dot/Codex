"use client";
import { useActionState } from "react";
import Link from "next/link";
import { authenticate } from "@/app/auth/actions";
import { Button } from "./ui/button";
export function AuthForm({
  mode,
  next = "/",
}: {
  mode: "login" | "register";
  next?: string;
}) {
  const [state, action, pending] = useActionState(
    authenticate.bind(null, mode),
    {},
  );
  return (
    <form action={action} className="form-grid">
      <input type="hidden" name="next" value={next} />
      <label>
        Email
        <input
          name="email"
          type="email"
          autoComplete="email"
          maxLength={254}
          required
        />
      </label>
      <label htmlFor="password">
        Parolă
        <input
          id="password"
          aria-describedby="password-help"
          name="password"
          type="password"
          minLength={8}
          maxLength={128}
          autoComplete={
            mode === "register" ? "new-password" : "current-password"
          }
          required
        />
      </label>
      <small id="password-help">Minimum 8 caractere.</small>
      {state.error && (
        <p role="alert" className="form-error">
          {state.error}
        </p>
      )}
      {state.message && (
        <p role="status" className="form-success">
          {state.message}
        </p>
      )}
      <Button disabled={pending}>
        {pending
          ? "Se procesează…"
          : mode === "login"
            ? "Conectează-te"
            : "Creează cont"}
      </Button>
      <Link
        className="text-link"
        href={mode === "login" ? "/auth/register" : "/auth/login"}
      >
        {mode === "login"
          ? "Nu ai cont? Înregistrează-te"
          : "Ai deja cont? Conectează-te"}
      </Link>
      {mode === "login" && (
        <>
          <Link className="text-link" href="/auth/reset-password">
            Am uitat parola
          </Link>
          <Link className="text-link" href="/auth/resend-confirmation">
            Retrimite confirmarea emailului
          </Link>
        </>
      )}
      <Link className="text-link" href="/demo">
        Explorează datele fictive
      </Link>
    </form>
  );
}
