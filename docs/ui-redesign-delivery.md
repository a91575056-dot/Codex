# FinTrack redesign delivery

The existing Next.js application was refactored in place. No dependencies,
database migrations, production records or device APIs were changed.

## Implemented

- Semantic light/dark tokens, persistent system/manual theme, self-hosted Geist
  with Romanian glyphs and bundled SIL Open Font License.
- Grouped sidebar, compact header, profile, mobile drawer/tabs and keyboard focus
  trap; retained edge swipe, pull refresh and Home document refresh.
- Data-backed six-metric dashboard, income/expense range chart, actual expense
  distribution, valuation overview and top positions. Separate MDL/EUR totals.
- Transactions search/date/type/category/currency filters, ordering, 25-row
  pagination, responsive ledger and native add/edit/delete dialogs.
- Portfolio cost/value/unrealized result, allocation, holdings, manual valuation
  date and add/update/delete dialogs using the existing calculation functions.
- Budget summaries/progress, monthly report breakdown/CSV/print, analytics of
  monthly surplus, organized settings and device-local report currency.
- Shared styling across goals, decision lab, debts, recurring entries, transfers,
  import, quick capture, iPhone, installation and authentication.
- Reusable Modal, FinancialAmount, PerformanceBadge, EmptyState, ChartCard,
  SectionHeader, LoadingSkeleton, ThemeControl and CurrencyPreference. Existing
  Card, Button, Heading, StatCard and transaction primitives were reused.

## Limits

Holdings have no buy/sell execution ledger, realized-return history or market
price series. These remain unsupported and are identified in the UI, rather
than represented with fabricated data or dead actions. Prices are manual; no
real-money trading. Theme/report currency preferences are local to the device.
Browser QA is Chromium, not physical iOS/Safari or assistive-technology testing.
Production publication is authorized through the existing Netlify Git deployment on branch `work`.

## Files

- `next.config.ts`
- `public/fonts/NOTICE.md`
- `public/fonts/OFL.txt`
- `public/fonts/geist-latin-ext.woff2`
- `public/fonts/geist-latin.woff2`
- `src/app/(workspace)/analytics/page.tsx`
- `src/app/(workspace)/budgets/page.tsx`
- `src/app/(workspace)/error.tsx`
- `src/app/(workspace)/investments/page.tsx`
- `src/app/(workspace)/loading.tsx`
- `src/app/(workspace)/reports/page.tsx`
- `src/app/(workspace)/settings/page.tsx`
- `src/app/(workspace)/transactions/page.tsx`
- `src/app/auth/layout.tsx`
- `src/app/error.tsx`
- `src/app/globals.css`
- `src/app/layout.tsx`
- `src/app/manifest.ts`
- `src/components/charts.tsx`
- `src/components/connected-dashboard.tsx`
- `src/components/demo-section.tsx`
- `src/components/envelope-view.tsx`
- `src/components/finance-view.tsx`
- `src/components/financial-ui.tsx`
- `src/components/goals-view.tsx`
- `src/components/resource-form.tsx`
- `src/components/shell.tsx`
- `src/components/theme-control.tsx`
- `src/components/transaction-form.tsx`
- `src/components/ui/button.tsx`
- `src/components/ui/card.tsx`
- `src/components/ui/modal.tsx`
- `src/lib/finance.ts`
- `src/lib/planning.ts`
- `src/lib/supabase/repository.ts`
- `src/styles/features.css`
- `src/styles/system.css`
- `src/styles/tokens.css`
- `src/types/finance.ts`
- `tests/integration.spec.ts`
- `tests/iphone-install.spec.ts`
- `tests/smoke.spec.ts`

## Validation

- `npm test`: 33/33 finance, validation, SQL/RLS and idempotency tests passed.
- `npm run test:integration`: 10/10 passed against the isolated local database
  fixture, including responsive/theme QA and financial CRUD.
- `npm run test:e2e`: 10/10 passed (demo, navigation, gestures, pull refresh, Home,
  goals, decision lab, recovery and read-only behavior).
- `npm run test:auth`: 1/1 passed (authenticated-route protection/demo isolation).
- `npm run typecheck`, `npm run lint` and `npm run build`: passed; all 35
  prerendered entries generated successfully.
- Connected pages checked for document overflow at 320px; seven main pages
  captured at 375/768/1440px in both themes (42 screenshots). Theme switching,
  system preference, persistence, default report currency, dialog Escape and
  focus return were exercised in Chromium.
- Inspected dashboard light/dark desktop/mobile/tablet, transaction mobile,
  investment desktop and budget tablet captures. Fixed tablet metric columns
  and compact transaction rows after visual inspection.

Screenshots are workspace QA artifacts under `artifacts/redesign-*.png` (ignored
by Git), generated from isolated test accounts. No private production records
were used.
