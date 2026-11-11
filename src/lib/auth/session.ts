import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
export async function requireUser() {
  const client = await createClient();
  const {
    data: { user },
    error,
  } = await client.auth.getUser();
  if (error || !user) redirect("/auth/login");
  return { client, user };
}
