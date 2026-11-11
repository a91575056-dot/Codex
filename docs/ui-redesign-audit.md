# FinTrack UI audit and implementation plan

Baseline: published commit 4c373fb. Next 16.4.6 App Router, React 19.3,
TypeScript, Tailwind 4, local shadcn-style primitives, Recharts, Supabase SSR.
Personal routes, public read-only demo routes, auth and device API routes are
separate. Financial amounts use integer minor units; MDL/EUR are isolated.

Inspected route/component inventory: dashboard, transactions, investments,
budgets/envelopes, analytics, reports, settings, goals, decision lab, transfers,
debts, recurring rules, CSV import, iPhone pairing, install, quick capture, auth,
loading/error/not-found and all forms. Existing test suites cover SQL RLS,
finance calculations, mutations, native APIs, mobile gestures and demo flows.

Findings: ~2,000 lines of accumulated CSS with overlapping global selectors,
small 8–11px labels and weak contrast; hardcoded green colors in charts,
components and styles; no dark theme; flat/long navigation; large feature grids
before useful dashboard charts; no transaction sort/pagination; long inline
editing forms; text-only loading state; no reusable dialog or empty-state
primitives. Existing forms preserve server validation, owner scope and errors.

Implementation order:
1. Semantic light/dark tokens, self-hosted Geist, shared surfaces/forms/states.
2. Shell/navigation hierarchy, persistent theme control, responsive drawer/tabs.
3. Data-backed dashboard, cash/expense/portfolio charts and precise labels.
4. Transactions: compact ledger, sort/pagination, accessible edit/delete dialogs.
5. Portfolio: summary/table/detail/modals using existing valuation calculations.
6. Consistent visual treatment of all remaining feature/auth/mobile pages.
7. Typecheck, lint, all existing test suites, production build, screenshots and
   browser checks at 320/375/768/1440, both themes and keyboard navigation.

Scope boundaries: no schema or financial calculation changes. Current holdings
have no execution ledger, realized returns or price history. Do not fabricate
these or present an unavailable buy/sell action. Show valuation dates, cost and
unrealized P/L; disclose the unsupported history in the delivery notes. Theme
and default reporting currency are local device preferences, never currency
conversion. Production publication was subsequently authorized by the user.
