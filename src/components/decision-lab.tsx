"use client";
import { useState, useSyncExternalStore } from "react";
import {
  FlaskConical,
  ArrowRight,
  Download,
  RotateCcw,
  ShieldCheck,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "./ui/card";
import { Button } from "./ui/button";
import { Heading } from "./finance-view";
import { SaveScenarioForm } from "./goal-forms";
import { money } from "@/lib/finance";
import { simulateDecision, type DecisionBaseline } from "@/lib/decision-lab";
const minor = (v: string) => {
  if (!/^\d{1,10}([.,]\d{1,2})?$/.test(v)) return NaN;
  const [whole, fraction = ""] = v.replace(",", ".").split(".");
  return Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
};
const term = (months: number | null) =>
  months === null
    ? "Nu se atinge în aceste condiții"
    : months === 0
      ? "Obiectiv deja acoperit"
      : `${months} luni`;
const subscribeReady = () => () => {};
export type LabGoal = {
  id: string;
  name: string;
  targetMinor: number;
  savedMinor: number;
  dueOn: string;
};
export function DecisionLab({
  baseline,
  goal,
}: {
  baseline: DecisionBaseline;
  goal?: LabGoal;
}) {
  const ready = useSyncExternalStore(
    subscribeReady,
    () => true,
    () => false,
  );
  const [target, setTarget] = useState("10000"),
    [saved, setSaved] = useState("1000"),
    [buffer, setBuffer] = useState("200"),
    [shock, setShock] = useState(20),
    [cuts, setCuts] = useState<Record<string, number>>({});
  const cutFor = (id: string) => (Object.hasOwn(cuts, id) ? cuts[id] : 0);
  const input = {
    targetMinor: goal?.targetMinor ?? minor(target),
    savedMinor: goal?.savedMinor ?? minor(saved),
    bufferMinor: minor(buffer),
    shockPercent: shock,
    cuts,
  };
  let result: ReturnType<typeof simulateDecision> | null = null;
  try {
    result = simulateDecision(baseline, input);
  } catch {
    /* Invalid inputs are explained inline; never display a misleading result. */
  }
  function reset() {
    setTarget("10000");
    setSaved("1000");
    setBuffer("200");
    setShock(20);
    setCuts({});
  }
  function download() {
    if (!result) return;
    const report = {
      version: 1,
      kind: "Simulare ipotetică FinTrack, nu predicție",
      source: baseline.demo ? "Date fictive" : "Tranzacții personale agregate",
      baseline,
      inputs: input,
      result,
      assumptions: [
        "Venituri și cheltuieli lunare constante",
        "Fără dobândă, randament sau inflație",
        "Contribuție la sfârșitul fiecărei luni",
        "Reduceri independente pe categorii; fără modificarea tranzacțiilor",
      ],
    };
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(report, null, 2)], { type: "application/json" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "fintrack-simulare-decizie.json";
    a.click();
    URL.revokeObjectURL(url);
  }
  return (
    <>
      <Heading
        title="Laborator de decizii"
        description="Transformă o schimbare de obicei într-un termen pentru obiectivul tău."
      />
      {goal && (
        <div className="demo-banner">
          <p>
            <strong>{goal.name}</strong> · Termen dorit: {goal.dueOn}. Ținta și
            economiile sunt preluate din obiectiv; le poți modifica în pagina
            Obiective.
          </p>
        </div>
      )}
      <div className="lab-intro">
        <span>
          <FlaskConical />
        </span>
        <div>
          <strong>Ce câștigi dacă schimbi ceva?</strong>
          <p>
            Compară situația actuală, planul tău și o scădere de venit. Fiecare
            rezultat are o explicație verificabilă.
          </p>
        </div>
        <b>{baseline.demo ? "DEMO · DATE FICTIVE" : "DATELE TALE"}</b>
      </div>
      <p className="lab-source">
        Bază: {baseline.period} · {baseline.transactionCount} înregistrări ·{" "}
        {baseline.monthsWithRecords} din {baseline.months} luni cu înregistrări.
        Mediile folosesc toate cele 3 luni încheiate, inclusiv lunile fără
        înregistrări. Un istoric incomplet produce o simulare incompletă.
      </p>
      {!baseline.transactionCount && (
        <p className="empty-state" role="status">
          Nu există tranzacții în ultimele trei luni încheiate. Adaugă istoricul
          tău în Tranzacții sau explorează laboratorul din modul demo. Nu
          folosim date fictive în contul personal. Salvarea scenariilor este
          disponibilă după înregistrarea acestui istoric.
        </p>
      )}
      <div className="lab-layout">
        <fieldset className="lab-controls" disabled={!ready}>
          <Card>
            <CardHeader>
              <CardTitle>1. Definește obiectivul</CardTitle>
            </CardHeader>
            <CardContent className="form-grid">
              <label>
                Valoare obiectiv (MDL)
                <input
                  inputMode="decimal"
                  value={goal ? (goal.targetMinor / 100).toFixed(2) : target}
                  readOnly={!!goal}
                  onChange={(e) => setTarget(e.target.value)}
                />
              </label>
              <label>
                Economii deja dedicate obiectivului (MDL)
                <input
                  inputMode="decimal"
                  value={goal ? (goal.savedMinor / 100).toFixed(2) : saved}
                  readOnly={!!goal}
                  onChange={(e) => setSaved(e.target.value)}
                />
              </label>
              <label>
                Marjă lunară păstrată, nealocată obiectivului (MDL)
                <input
                  inputMode="decimal"
                  value={buffer}
                  onChange={(e) => setBuffer(e.target.value)}
                />
              </label>
              <small>
                {goal
                  ? "Economiile dedicate sunt contribuțiile înregistrate pentru acest obiectiv, nu soldul bancar."
                  : "Valorile inițiale sunt ipoteze editabile, nu solduri preluate din cont."}
              </small>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>2. Alege schimbările</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="lab-help">
                Tu alegi categoriile ajustabile. Reducerile nu modifică
                istoricul.
              </p>
              {baseline.categories.map((c) => (
                <label className="lab-slider" key={c.id}>
                  <span>
                    <strong>{c.name}</strong>
                    <b>{cutFor(c.id)}%</b>
                  </span>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={5}
                    value={cutFor(c.id)}
                    onChange={(e) =>
                      setCuts({ ...cuts, [c.id]: Number(e.target.value) })
                    }
                    aria-label={`Reducere ${c.name}`}
                  />
                  <small>
                    Medie: {money(c.monthlyMinor / 100)} / lună{" "}
                    <ArrowRight size={12} /> Economisești{" "}
                    {money(
                      Math.round((c.monthlyMinor * cutFor(c.id)) / 100) / 100,
                    )}
                  </small>
                </label>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>3. Testează rezistența planului</CardTitle>
            </CardHeader>
            <CardContent>
              <label className="lab-slider">
                <span>
                  Scădere ipotetică a venitului <b>{shock}%</b>
                </span>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={shock}
                  onChange={(e) => setShock(Number(e.target.value))}
                  aria-label="Scădere venit"
                />
              </label>
              <p className="lab-help">
                Șocul se aplică în fiecare lună a scenariului; nu este o
                estimare a probabilității.
              </p>
            </CardContent>
          </Card>
        </fieldset>
        <div className="lab-results">
          {!result ? (
            <p role="alert" className="form-error">
              Introdu sume pozitive valide, cu maximum două zecimale. Obiectivul
              trebuie să fie mai mare decât zero.
            </p>
          ) : (
            <>
              <div className="lab-outcome" aria-live="polite">
                <span>EFECTUL SCHIMBĂRILOR TALE</span>
                <strong data-testid="lab-gain">
                  {result.gap === 0
                    ? "Ai acoperit deja obiectivul"
                    : result.monthsGained !== null
                      ? `${result.monthsGained} luni câștigate`
                      : result.planMonths !== null
                        ? "Obiectivul devine accesibil"
                        : "Planul are nevoie de ajustări"}
                </strong>
                <p>
                  Reduceri selectate:{" "}
                  <b>{money(result.savingsMinor / 100)} pe lună</b>.{" "}
                  {result.planMonthly <= 0 && result.gap > 0
                    ? "Contribuția disponibilă nu este pozitivă."
                    : "Calculul presupune că aloci lunar surplusul rămas obiectivului."}
                </p>
              </div>
              <div className="lab-scenarios">
                {[
                  {
                    label: "Ritmul actual",
                    monthly: result.baselineMonthly,
                    months: result.baselineMonths,
                  },
                  {
                    label: "Cu schimbările tale",
                    monthly: result.planMonthly,
                    months: result.planMonths,
                  },
                  {
                    label: `Cu venit redus cu ${shock}%`,
                    monthly: result.stressedMonthly,
                    months: result.stressMonths,
                  },
                ].map((s) => (
                  <Card key={s.label}>
                    <CardContent>
                      <h2>{s.label}</h2>
                      <strong>{term(s.months)}</strong>
                      <p>
                        {money(Math.max(0, s.monthly) / 100)} / lună către
                        obiectiv
                      </p>
                      {s.monthly < 0 && (
                        <small>Deficit: {money(-s.monthly / 100)} / lună</small>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
              <Card>
                <CardHeader>
                  <CardTitle>Ce schimbare contează cel mai mult?</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="lab-help">
                    Eliminăm pe rând câte o reducere și recalculăm planul.
                    Impacturile nu se adună: pragurile lunare și rotunjirea le
                    pot face diferite.
                  </p>
                  {result.contributions.filter((c) => c.savingMinor > 0)
                    .length === 0 ? (
                    <p className="empty-state">
                      Mișcă un cursor pentru a vedea impactul categoriei.
                    </p>
                  ) : (
                    result.contributions
                      .filter((c) => c.savingMinor > 0)
                      .sort((a, b) => b.savingMinor - a.savingMinor)
                      .map((c) => (
                        <div className="lab-attribution" key={c.id}>
                          <strong>{c.name}</strong>
                          <span>{money(c.savingMinor / 100)} / lună</span>
                          <p>
                            Fără această schimbare: {term(c.monthsWithout)}.{" "}
                            {result.planMonths !== null &&
                            c.monthsWithout !== null
                              ? `Impact marginal: ${c.monthsWithout - result.planMonths} luni.`
                              : ""}
                          </p>
                        </div>
                      ))
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>De unde vin rezultatele?</CardTitle>
                </CardHeader>
                <CardContent>
                  <dl className="lab-formula">
                    <div>
                      <dt>Venit mediu lunar înregistrat</dt>
                      <dd>{money(baseline.incomeMinor / 100)}</dd>
                    </div>
                    <div>
                      <dt>− Cheltuieli medii lunare înregistrate</dt>
                      <dd>{money(baseline.expensesMinor / 100)}</dd>
                    </div>
                    <div>
                      <dt>− Marja lunară aleasă</dt>
                      <dd>{money(input.bufferMinor / 100)}</dd>
                    </div>
                    <div>
                      <dt>+ Reducerile selectate</dt>
                      <dd>{money(result.savingsMinor / 100)}</dd>
                    </div>
                    <div>
                      <dt>= Surplus lunar în plan</dt>
                      <dd>{money(result.planMonthly / 100)}</dd>
                    </div>
                  </dl>
                  <p className="lab-help">
                    Sumă rămasă = max(0, obiectiv − economii dedicate). Număr
                    luni = suma rămasă ÷ contribuția lunară pozitivă, rotunjit
                    în sus. În scenariul de stres scădem încă{" "}
                    {money(result.shockLossMinor / 100)} pe lună.
                  </p>
                  <p className="lab-help">
                    Simulare cu valori constante, fără randamente, dobândă sau
                    inflație. Nu execută plăți sau investiții. Rezultatele nu
                    sunt termene garantate.
                  </p>
                  <div className="lab-actions">
                    <Button onClick={download}>
                      <Download /> Exportă simularea
                    </Button>
                    <Button variant="outline" onClick={reset}>
                      <RotateCcw /> Resetează
                    </Button>
                  </div>
                  {goal && !baseline.demo && (
                    <SaveScenarioForm
                      goalId={goal.id}
                      targetMinor={goal.targetMinor}
                      savedMinor={goal.savedMinor}
                      bufferMinor={input.bufferMinor}
                      shockPercent={shock}
                      cuts={cuts}
                      disabled={!result || !ready || !baseline.transactionCount}
                    />
                  )}
                </CardContent>
              </Card>
            </>
          )}
          <p className="lab-privacy">
            <ShieldCheck size={16} /> Scenariul se calculează în browser.
            Ipotezele sunt păstrate pe server doar la salvarea unui scenariu
            pentru un obiectiv. Exportul conține agregate și alegerile tale.
          </p>
        </div>
      </div>
    </>
  );
}
