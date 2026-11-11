"use client";
import Link from "next/link";
import { useActionState } from "react";
import { authEmailAction, updatePassword } from "@/app/auth/actions";
import { Button } from "./ui/button";
export function RecoveryForm({
  kind,
}: {
  kind: "reset" | "resend" | "update";
}) {
  const action =
    kind === "update" ? updatePassword : authEmailAction.bind(null, kind);
  const [state, formAction, pending] = useActionState(action, {});
  return (
    <form action={formAction} className="form-grid">
      {kind === "update" ? (
        <>
          <label>
            Parola nouă
            <input
              name="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              maxLength={128}
            />
          </label>
          <label>
            Confirmă parola
            <input
              name="confirmation"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              maxLength={128}
            />
          </label>
        </>
      ) : (
        <label>
          Email
          <input
            name="email"
            type="email"
            autoComplete="email"
            required
            maxLength={254}
          />
        </label>
      )}
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
          : kind === "update"
            ? "Actualizează parola"
            : "Trimite emailul"}
      </Button>
      <Link
        className="text-link"
        href={kind === "update" ? "/" : "/auth/login"}
      >
        {kind === "update" ? "Înapoi la aplicație" : "Înapoi la conectare"}
      </Link>
    </form>
  );
}
