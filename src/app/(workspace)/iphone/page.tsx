import Link from "next/link";
import { requireUser } from "@/lib/auth/session";
import { supabaseConfig } from "@/lib/supabase/config";
import { allRows } from "@/lib/supabase/planning-repository";
import type { AccountRow } from "@/lib/supabase/database.types";
import type { DeviceView } from "@/lib/shortcut";
import { Heading, DemoNotice } from "@/components/finance-view";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  ShortcutDeviceForm,
  RevokeShortcutDevice,
} from "@/components/shortcut-device-form";
import { ShortcutGuide } from "@/components/shortcut-guide";
export const instant = false;
export default async function IphonePage() {
  if (!supabaseConfig())
    return (
      <>
        <Heading
          title="iPhone și scurtături"
          description="Cheltuieli din dialogurile native Apple Shortcuts."
        />
        <DemoNotice />
        <p>
          Modul demo nu generează tokenuri și nu salvează plăți. Conectează un
          cont personal după configurarea Supabase.
        </p>
        <ShortcutGuide />
      </>
    );
  const { client, user } = await requireUser("/iphone");
  const [accounts, devices] = await Promise.all([
    allRows<AccountRow>((f, t) =>
      client
        .from("accounts")
        .select("*")
        .eq("user_id", user.id)
        .eq("currency", "MDL")
        .order("name")
        .order("id")
        .range(f, t),
    ),
    allRows<DeviceView>((f, t) =>
      client
        .from("shortcut_devices")
        .select(
          "id,name,cash_account_id,card_account_id,created_at,expires_at,last_used_at",
        )
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .order("id")
        .range(f, t),
    ),
  ]);
  const names = new Map(accounts.map((a) => [a.id, a.name]));
  return (
    <>
      <Heading
        title="iPhone și scurtături"
        description="Introdu suma, alege Cash/Card și categoria în dialogurile iPhone-ului. Cheltuiala ajunge în același cont FinTrack."
      />
      <p className="mb-6">
        <Link className="text-link" href="/install">
          Instalează FinTrack pe ecranul principal
        </Link>{" "}
        ·{" "}
        <Link className="text-link" href="/quick-expense">
          Deschide formularul rapid
        </Link>
      </p>
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Conectează un iPhone</CardTitle>
        </CardHeader>
        <CardContent>
          {!accounts.length && (
            <p>
              Adaugă mai întâi un cont în{" "}
              <Link className="text-link" href="/settings">
                Setări
              </Link>
              .
            </p>
          )}
          <ShortcutDeviceForm accounts={accounts} />
        </CardContent>
      </Card>
      <h2 className="overview-heading">Telefoane conectate</h2>
      {!devices.length && (
        <p className="empty-state">
          Niciun telefon conectat. Creează un token și configurează scurtătura
          de mai sus.
        </p>
      )}
      <div className="goal-grid">
        {devices.map((device) => (
          <Card key={device.id}>
            <CardHeader>
              <CardTitle>{device.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <p>
                Cash: {names.get(device.cash_account_id)} · Card:{" "}
                {names.get(device.card_account_id)}
              </p>
              <p>
                Expiră la:{" "}
                {new Date(device.expires_at).toLocaleDateString("ro-RO", {
                  timeZone: "Europe/Chisinau",
                })}
              </p>
              <p>
                {device.last_used_at
                  ? `Ultima utilizare: ${new Date(device.last_used_at).toLocaleString("ro-RO", { timeZone: "Europe/Chisinau" })}`
                  : "Încă neutilizat"}
              </p>
              <RevokeShortcutDevice id={device.id} />
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}
