"use client";
import { useActionState } from "react";
import { updateDisplayName } from "@/app/auth/actions";
import { Button } from "./ui/button";
export function ProfileNameForm({ name }: { name: string }) {
  const [state, action, pending] = useActionState(updateDisplayName, {});
  return (
    <form action={action} className="form-grid">
      <label>
        Nume afișat
        <input
          name="display_name"
          defaultValue={name === "Cont personal" ? "" : name}
          maxLength={80}
          required
          placeholder="De exemplu: Dionis"
        />
      </label>
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
        {pending ? "Se salvează…" : "Salvează numele"}
      </Button>
    </form>
  );
}
