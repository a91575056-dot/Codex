"use client";
import { useActionState, useEffect, useState } from "react";
import {
  createWidget,
  revokeWidget,
  type WidgetState,
} from "@/app/(workspace)/iphone/widget-actions";
import type { WidgetView } from "@/lib/widget";
import { Button } from "./ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "./ui/card";
export function WidgetSettings({ devices }: { devices: WidgetView[] }) {
  const [token, setToken] = useState<string>();
  const [feedback, setFeedback] = useState("");
  const [script, setScript] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    fetch("/widgets/FinTrack.js", { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw Error();
        return response.text();
      })
      .then(setScript)
      .catch(() => {
        /* The download link remains available. */
      });
    return () => controller.abort();
  }, []);
  const [state, action, pending] = useActionState(
    async (prev: WidgetState, form: FormData): Promise<WidgetState> => {
      const result = await createWidget(prev, form);
      if (result.token) setToken(result.token);
      return { error: result.error, success: result.success };
    },
    {},
  );
  async function copyScript() {
    try {
      await navigator.clipboard.writeText(script);
      setFeedback("Script copiat. Lipește-l într-un script nou în Scriptable.");
    } catch {
      setFeedback("Copierea nu a reușit. Folosește linkul Descarcă scriptul.");
    }
  }
  return (
    <section id="widgets" className="mt-8" aria-label="Widgeturi iPhone">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Widget cu bugetele tale</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="lab-help">
            Pe ecranul principal vezi suma și procentul rămas din fiecare buget
            în MDL. Folosește alocările automate; dacă nu le-ai activat, arată
            bugetele lunii curente. Cheia widgetului permite doar citirea
            acestor rezumate.
          </p>
          <ol className="widget-instructions">
            <li>
              Instalează{" "}
              <a
                className="text-link"
                href="https://apps.apple.com/app/scriptable/id1405459188"
                target="_blank"
                rel="noreferrer"
              >
                Scriptable din App Store
              </a>
              .
            </li>
            <li>
              Copiază scriptul de mai jos. În Scriptable apasă +, lipește tot și
              numește-l FinTrack.
            </li>
            <li>
              Creează o cheie aici, apoi rulează scriptul o dată și lipește
              cheia când o cere. Poți alege categoriile separate prin virgulă.
            </li>
            <li>
              Pe ecranul principal ține apăsat → Adaugă widget → Scriptable.
              Alege dimensiunea medie, apoi Editează widgetul → Script:
              FinTrack.
            </li>
          </ol>
          <div className="lab-actions mb-4">
            <Button
              type="button"
              variant="outline"
              onClick={copyScript}
              disabled={!script}
            >
              Copiază scriptul complet
            </Button>
            <Button asChild variant="outline">
              <a href="/widgets/FinTrack.js" download="FinTrack.js">
                Descarcă scriptul
              </a>
            </Button>
          </div>
          {feedback && (
            <p role="status" className="lab-help">
              {feedback}
            </p>
          )}
          <form action={action} className="form-grid">
            <label>
              Numele widgetului
              <input
                name="name"
                maxLength={80}
                required
                defaultValue="iPhone · Bugete"
                disabled={pending || !!token}
              />
            </label>
            <Button disabled={pending || !!token}>
              {pending ? "Se conectează…" : "Creează cheia widgetului"}
            </Button>
            {state.error && (
              <p role="alert" className="form-error">
                {state.error}
              </p>
            )}
            {state.success && (
              <p role="status" className="form-success">
                {state.success}
              </p>
            )}
          </form>
          {token && (
            <div className="form-grid mt-4">
              <label>
                Cheia widgetului
                <input
                  readOnly
                  type="password"
                  value={token}
                  autoComplete="off"
                  onFocus={(e) => e.target.select()}
                />
              </label>
              <div className="lab-actions">
                <Button
                  type="button"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(token);
                      setFeedback("Cheie copiată.");
                    } catch {
                      setFeedback("Selectează și copiază cheia din câmp.");
                    }
                  }}
                >
                  Copiază cheia widgetului
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setToken(undefined)}
                >
                  Ascunde cheia
                </Button>
              </div>
            </div>
          )}
          <p className="lab-help mt-4">
            iOS decide când actualizează widgetul. Ultima actualizare apare pe
            widget; atingerea lui deschide bugetele în FinTrack. Pentru alte
            categorii, rulează scriptul din Scriptable sau schimbă parametrul
            widgetului, de exemplu: Alimente, Distracții, Investiții.
          </p>
        </CardContent>
      </Card>
      <div className="goal-grid">
        {devices.map((d) => (
          <Card key={d.id}>
            <CardHeader>
              <CardTitle>{d.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="lab-help">
                Doar citire · expiră la{" "}
                {new Date(d.expires_at).toLocaleDateString("ro-RO", {
                  timeZone: "Europe/Chisinau",
                })}
              </p>
              <WidgetRevoke id={d.id} />
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
function WidgetRevoke({ id }: { id: string }) {
  const [state, action, pending] = useActionState(revokeWidget, {});
  return (
    <form action={action} className="form-grid mt-4">
      <input type="hidden" name="id" value={id} />
      <label className="confirm-label">
        <input type="checkbox" name="confirm" value="yes" required />
        Confirm deconectarea acestui widget
      </label>
      <Button variant="outline" disabled={pending}>
        {pending ? "Se deconectează…" : "Deconectează widgetul"}
      </Button>
      {state.error && (
        <p role="alert" className="form-error">
          {state.error}
        </p>
      )}
      {state.success && (
        <p role="status" className="form-success">
          {state.success}
        </p>
      )}
    </form>
  );
}
