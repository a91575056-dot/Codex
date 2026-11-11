import Link from "next/link";
import { Target, ArrowRight, CalendarDays } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "./ui/card";
import { Button } from "./ui/button";
import { Heading, DemoNotice } from "./finance-view";
import { GoalForm, ContributionForm, DeleteGoalRecord } from "./goal-forms";
import {
  goalProgress,
  compareScenario,
  readScenarioSnapshot,
  todayISO,
  type Goal,
  type Contribution,
  type Scenario,
} from "@/lib/goals";
import { money as formatMoney } from "@/lib/finance";
export function GoalsView({
  goals,
  contributions,
  scenarios,
  demo = false,
}: {
  goals: Goal[];
  contributions: Contribution[];
  scenarios: Scenario[];
  demo?: boolean;
}) {
  const today = demo ? "2026-11-11" : todayISO();
  return (
    <>
      <Heading
        title="Obiective de economisire"
        description="Urmărește economiile dedicate și compară planurile cu progresul real."
      />
      {demo && <DemoNotice />}
      <div className="goal-intro">
        <Target />
        <p>
          Contribuțiile reprezintă economii înregistrate manual. Nu sunt plăți
          și nu se scad din soldul conturilor. Scenariile salvate păstrează
          ipotezele originale.
        </p>
      </div>
      <div className="goal-intro" aria-label="Economii pe monede">
        {(["MDL", "EUR"] as const).map((currency) => {
          const total = goals
            .filter((g) => g.currency === currency)
            .reduce(
              (sum, g) =>
                sum + BigInt(goalProgress(g, contributions, today).saved),
              BigInt(0),
            );
          if (total > BigInt(Number.MAX_SAFE_INTEGER))
            throw Error("Economiile depășesc limita de precizie.");
          return (
            <p key={currency}>
              Economii dedicate {currency}:{" "}
              <strong>{formatMoney(Number(total) / 100, currency)}</strong>
            </p>
          );
        })}
      </div>
      {!demo && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Un obiectiv nou</CardTitle>
          </CardHeader>
          <CardContent>
            <GoalForm />
          </CardContent>
        </Card>
      )}
      {!goals.length && (
        <p className="empty-state" role="status">
          Nu ai obiective încă. Creează primul obiectiv și înregistrează
          economiile deja dedicate lui.
        </p>
      )}
      <div className="goal-grid">
        {goals.map((goal) => {
          const money = (amount: number) => formatMoney(amount, goal.currency);
          const progress = goalProgress(goal, contributions, today);
          const entries = contributions.filter((c) => c.goal_id === goal.id);
          const plans = scenarios.filter((s) => s.goal_id === goal.id);
          return (
            <Card key={goal.id}>
              <CardHeader className="section-heading">
                <CardTitle>{goal.name}</CardTitle>
                <span className="category">
                  {progress.remaining === 0
                    ? "Atins"
                    : progress.overdue
                      ? "Termen depășit"
                      : "În progres"}
                </span>
              </CardHeader>
              <CardContent>
                <div className="goal-value">
                  <strong>{money(progress.saved / 100)}</strong>
                  <span>din {money(goal.target_minor / 100)}</span>
                </div>
                <div
                  className="budget-track"
                  role="progressbar"
                  aria-label={`Progres ${goal.name}`}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={progress.percent}
                >
                  <div
                    style={{
                      width: `${progress.percent}%`,
                      background: "var(--chart-1)",
                    }}
                  />
                </div>
                <div className="goal-meta">
                  <span>{progress.percent}% realizat</span>
                  <span>
                    <CalendarDays size={13} /> {goal.due_on}
                  </span>
                </div>
                <p className="lab-help">
                  Rămas: {money(progress.remaining / 100)}.{" "}
                  {progress.requiredMonthly === null
                    ? "Termenul a trecut; poți stabili un termen nou."
                    : progress.remaining === 0
                      ? "Obiectivul este acoperit."
                      : `Necesar orientativ: ${money(progress.requiredMonthly / 100)} / lună, inclusiv luna curentă.`}
                </p>
                {goal.currency === "MDL" ? (
                  <Button asChild variant="outline">
                    <Link
                      href={`${demo ? "/demo" : ""}/decision-lab?goal=${goal.id}`}
                    >
                      Simulează acest obiectiv <ArrowRight />
                    </Link>
                  </Button>
                ) : (
                  <p className="lab-help">
                    Economii în EUR, separate de soldul în MDL. Contribuțiile
                    sunt în EUR. Simularea pe veniturile în MDL necesită un curs
                    de schimb și nu este disponibilă pentru acest obiectiv.
                  </p>
                )}
                {!demo && (
                  <>
                    <details className="goal-detail">
                      <summary>Adaugă o contribuție</summary>
                      <ContributionForm
                        goalId={goal.id}
                        currency={goal.currency}
                      />
                    </details>
                    <details className="goal-detail">
                      <summary>Editează obiectivul</summary>
                      <GoalForm goal={goal} />
                    </details>
                  </>
                )}
                <details className="goal-detail">
                  <summary>Contribuții înregistrate ({entries.length})</summary>
                  {!entries.length && (
                    <p className="lab-help">Nicio contribuție înregistrată.</p>
                  )}
                  {entries.map((c) => (
                    <div className="goal-record" key={c.id}>
                      <strong>{money(c.amount_minor / 100)}</strong>
                      <span>
                        {c.occurred_on}
                        {c.note ? ` · ${c.note}` : ""}
                      </span>
                      {!demo && (
                        <DeleteGoalRecord id={c.id} type="contribution" />
                      )}
                    </div>
                  ))}
                </details>
                <div className="goal-plans">
                  <h3>Plan versus rezultat real</h3>
                  {!plans.length ? (
                    <p className="lab-help">
                      Deschide obiectivul în laborator și salvează un scenariu.
                      Aici vei compara apoi progresul cu planul inițial.
                    </p>
                  ) : (
                    plans.map((s) => {
                      const c = compareScenario(s, progress.saved, today);
                      const snapshot = readScenarioSnapshot(s.snapshot);
                      return (
                        <div className="goal-plan" key={s.id}>
                          <strong>{s.name}</strong>
                          <p>
                            Salvat la {s.saved_on} ·{" "}
                            {money(s.monthly_minor / 100)} / interval lunar
                          </p>
                          <div className="goal-comparison">
                            <span>
                              Plan până acum <b>{money(c.expected / 100)}</b>
                            </span>
                            <span>
                              Economii înregistrate{" "}
                              <b>{money(c.actual / 100)}</b>
                            </span>
                            <span>
                              Diferență{" "}
                              <b
                                className={
                                  c.delta >= 0 ? "positive" : "negative"
                                }
                              >
                                {c.delta > 0 ? "+" : ""}
                                {money(c.delta / 100)}
                              </b>
                            </span>
                          </div>
                          <p className="lab-help">
                            {c.months} intervale lunare încheiate. Țintă
                            originală: {money(s.target_minor / 100)}.{" "}
                            {goal.target_minor !== s.target_minor
                              ? "Obiectivul a fost modificat; comparația păstrează ținta originală."
                              : ""}{" "}
                            Comparația folosește contribuțiile înregistrate,
                            inclusiv eventualele corectări ale istoricului.
                          </p>
                          <details className="goal-detail">
                            <summary>Vezi ipotezele salvate</summary>
                            <p className="lab-help">
                              Țintă: {money(s.target_minor / 100)} · economii la
                              salvare: {money(s.saved_minor / 100)} ·
                              contribuție lunară planificată:{" "}
                              {money(s.monthly_minor / 100)}.
                            </p>
                            {snapshot?.baseline && (
                              <p className="lab-help">
                                Istoric: {snapshot.baseline.period} · venit
                                mediu{" "}
                                {money(snapshot.baseline.incomeMinor / 100)} ·
                                cheltuieli medii{" "}
                                {money(snapshot.baseline.expensesMinor / 100)}.
                              </p>
                            )}
                            {snapshot?.inputs && (
                              <p className="lab-help">
                                Marjă:{" "}
                                {money(snapshot.inputs.bufferMinor / 100)} · șoc
                                de venit testat: {snapshot.inputs.shockPercent}
                                %.
                              </p>
                            )}
                            {snapshot && (
                              <ul className="lab-help">
                                {snapshot.baseline.categories.map(
                                  (category) => {
                                    const percent = Object.hasOwn(
                                      snapshot.inputs.cuts,
                                      category.id,
                                    )
                                      ? snapshot.inputs.cuts[category.id]
                                      : 0;
                                    return percent > 0 ? (
                                      <li key={category.id}>
                                        {category.name}: reducere {percent}% din{" "}
                                        {money(category.monthlyMinor / 100)} /
                                        lună.
                                      </li>
                                    ) : null;
                                  },
                                )}
                              </ul>
                            )}
                            {!snapshot && (
                              <p className="lab-help">
                                Ipotezele detaliate nu sunt disponibile într-un
                                format valid. Comparația folosește valorile
                                originale salvate.
                              </p>
                            )}
                          </details>
                          {!demo && (
                            <DeleteGoalRecord id={s.id} type="scenario" />
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
                {!demo && <DeleteGoalRecord id={goal.id} type="goal" />}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </>
  );
}
