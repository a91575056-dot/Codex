import { safeNext } from "./validation";
import "server-only";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
export async function requireUser(next = "/") {
  await connection();
  const client = await createClient();
  const {
    data: { user },
    error,
  } = await client.auth.getUser();
  if (error || !user)
    redirect(
      next === "/"
        ? "/auth/login"
        : "/auth/login?next=" + encodeURIComponent(safeNext(next)),
    );
  return { client, user };
}
