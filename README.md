# FinTrack

Aplicație web de licență pentru gestionarea finanțelor personale și urmărirea
portofoliului de investiții. Interfață în română, responsive, cu date **fictive**.
Nu conectează conturi bancare, nu execută tranzacții și nu necesită chei API.

## Dezvoltare

Necesită Node.js 22.13+ și npm. Versiunea folosită la dezvoltare: Node.js 24.

```bash
npm ci
npm run dev
```

Deschideți http://localhost:3000. Pentru verificări și producție:

```bash
npm run lint
npm run typecheck
npm run build
npm start
```

## Tehnologii și structură

Next.js App Router, TypeScript strict, Tailwind CSS 4, componente shadcn/ui cu
Radix Slot/CVA, Lucide și Recharts. Componentele shadcn sunt deținute local,
în `src/components/ui`; configurația CLI este `components.json`.

- `src/app`: layout, dashboard, paginile secțiunilor și pagina 404 în română.
- `src/components`: shell responsive, carduri, grafice și export CSV local.
- `src/types/finance.ts`: modele și contractul `FinanceRepository`.
- `src/lib/finance.ts`: adapter demo și formatare RON.
- `docs/supabase.md`: planul integrării Supabase, securitate și model de date.
- `tests/smoke.spec.ts`: verificări de navigare, mobil și export CSV.

Rute: `/`, `/transactions`, `/budgets`, `/investments`, `/analytics`, `/reports`,
`/settings`. Secțiunile arată exemple relevante; datele sunt doar pentru citire.
Exportul din Rapoarte descarcă cele patru tranzacții demo, nu o situație contabilă
completă. Totalurile lunare și procentele sunt exemple independente; lista recentă
nu reprezintă toate tranzacțiile lunii. Perioada demo este fixată la noiembrie 2026.
Nu se salvează modificări, nu există autentificare sau conexiuni externe.

## Teste browser

```bash
npx playwright install chromium
npm run test:e2e
```

Playwright pornește automat serverul de dezvoltare. Testele verifică toate rutele,
meniul mobil, lipsa overflow-ului orizontal și exportul CSV. Pentru un build local
complet rulați separat comenzile de verificare de mai sus.

## Următoarea etapă

Consultați [planul Supabase](docs/supabase.md). Înlocuiți adapterul demo cu unul
server-only; nu adăugați chei secrete în repository. `.env*` este ignorat de Git.

Dacă Chromium este deja instalat în sistem, puteți evita descărcarea browserului:

```bash
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run test:e2e
```
