# Review — inițializare FinTrack

## Implementare

- Next.js App Router în rădăcina repository-ului, TypeScript strict și Tailwind 4.
- Shell responsive în română, șapte destinații, indicator de pagină activă.
- Componente UI locale în stil shadcn/ui, Radix Slot, CVA și Lucide.
- Carduri reutilizabile, grafice Recharts, tranzacții și bugete fictive.
- Export CSV local; toate datele sunt etichetate ca demo.
- Contract de repository pentru viitorul adapter Supabase, fără chei API.
- README, plan Supabase și workflow GitHub Actions.

## Validare locală

- `npm run lint` — trecut.
- `npm run typecheck` — trecut.
- `npm run build` — trecut.
- `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run test:e2e`
  — 3 teste trecute: navigare desktop, export CSV și 404; navigare mobilă fără
  overflow; captură dashboard desktop.
- Capturi desktop 1440px și mobil 390px inspectate vizual.
- `git diff --check` — trecut.

Chromium din sistem a fost folosit deoarece descărcarea Playwright este blocată
în acest mediu (HTTP 403 de la cdn.playwright.dev). Acest lucru nu a împiedicat testele.
CLI-ul shadcn nu a putut accesa registry-ul în mediul inițial; componentele Card și
Button sunt incluse local după modelul shadcn/Radix și pot fi ajustate direct.

## Limite asumate pentru etapa 1

Nu există autentificare, persistență, conturi reale sau tranzacționare. Perioada și
valorile demo sunt fixe. Lista tranzacțiilor recente este un eșantion și nu reconciliază
totalurile lunare. Planul etapei următoare este în `docs/supabase.md`.
