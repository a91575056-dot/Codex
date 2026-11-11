import { Shell } from "@/components/shell";
import { supabaseConfig } from "@/lib/supabase/config";
import { requireUser } from "@/lib/auth/session";
export const instant = false;
export default async function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = supabaseConfig() ? await requireUser() : null;
  return (
    <Shell demo={!session} email={session?.user.email}>
      {children}
    </Shell>
  );
}
