# Native loan recording in FinTrack

The generated MDL Shortcut offers `Împrumut dat` under Cheltuială and
`Împrumut primit` under Venit. These are local menu choices, not ordinary
income/expense categories. It asks for the person's name, principal, cash/card
and a note. Normal categories, including Tips, still come from finance-options.
The full source is `public/shortcuts/fintrack-mdl.cherri.txt`, with a device-local
import question; no real token is included. It compiles with Cherri 9774897.
Its three requests have explicit literal JSON field dictionaries and exactly
one `Authorization` header, with no leading spaces. This avoids the malformed
header found in the user's earlier attachment.

`POST /api/shortcut/loans` accepts request_id, direction (lent/borrowed), person,
amount, payment_method (cash/card), description. No user/account/currency/date
parameters. Token hashing, expiry, account mapping, auth.uid mismatch checking
and rate limiting reuse the private credential validator. Separate allow_loans
opt-in defaults to false; configure_shortcut_loans is owner-only/invoker. The
new anonymous SECURITY DEFINER shortcut_loan is intentional and bounded, like
existing device RPCs; it cannot list balances/history or settle/delete loans.
Do not revoke its anonymous EXECUTE without replacing device authentication.

Principal changes cash, not earned income, consumption, report totals or income
allocation snapshots. Initial lending is negative, borrowing positive. A full
repayment uses the opposite sign and a selected own account in the same currency.
Settled entries remain immutable in history. Existing manual receivables stay a
separate no-cash record and are not converted or silently paid.

loans has owner RLS, composite account ownership FKs, unit validation and limited
column grants. record_loan and settle_loan are SECURITY INVOKER; owner inserts
and one immutable full settlement are allowed. No owner principal updates or
row deletion are granted. Native IDs share the existing device/request_id
namespace; cross-table collision triggers prevent reusing a device request as
both a loan and an ordinary transaction. Device row locks serialize requests.
Replays match the original content and never re-fund or double-repay.

Schema migration: 20261112112020_native_loans_and_cash_movements.sql. No existing
records are rewritten by the migration. MDL only for native; the authenticated
app supports separate MDL/EUR loan records. No automatic partial repayments,
interest calculation, bank integration or real transfers are implemented.

Validation: unit tests cover cash/owner/currency/opt-in/replay/conflicts and
single settlement; integration covers API 201/200/409/403, UI creation, balances,
no fabricated salary totals, owner isolation and repayment/history. The template
is structurally compiled/inspected; physical iOS execution and remote signing
remain unverified. Browser screenshot: artifacts/loans-mobile.png.

The user's unused `Altele` category was removed only after verifying there were
no transactions, budgets, envelope rules or recurring rules referencing it.
The existing `Alte cheltuieli` category and its automatic-budget rule were kept.
No production loan transactions were created for tests.

## Release verification — 12 November 2026

- 36 unit/SQL tests passed, including the new three loan suites.
- Existing 10 browser integration cases passed; the new native loan case passed
  on focused rerun after synchronizing the permission-disable assertion with
  the server action. Legacy EUR receivables also passed the focused regression.
- 10 demo/navigation/gesture tests and 1 authentication guard test passed.
- TypeScript, ESLint and production build passed (36 generated entries).
- Generated Shortcut: 140 actions; all output UUID references, three exact
  Authorization headers and six-field loan/transaction bodies validated.
- Inspected 375px loan screenshot; no document overflow.
- Applied the migration to the connected project and enabled allow_loans only
  for the requesting owner's single active device. No token regeneration.
- Verified live RLS, denied anon table reads/settlement/configuration and zero
  live loan records after release preparation. All financial test records were
  isolated locally. The intentional anonymous/authenticated definer advisory
  gains one bounded shortcut_loan finding; the other baseline notices remain.

## Category-list correction

The compiler emitted `@categoryNames += @loanLabel` as Set Variable, replacing
all normal categories. The template now explicitly emits appendvariable through
a named action declaration. Categories are kept as one immutable dictionary.
The save route uses explicit text comparison (`operation == "loan"`), rather
than a has-value test of a 0/1 flag. Recompiled output: 138 actions.

A local simulation of the emitted category/selection actions verifies five
scenarios: expense/Alimente, income/Salariu, income/Tips, loan/lent and
loan/borrowed. Every list retains all mocked normal categories plus the loan
option, normal choices resolve their category ID and retain transaction mode,
and loan choices select loan mode. This is an action-graph regression check,
not a claim of physical iOS execution.

## Solduri Cash/Card și datorii de început

Conturile au un `account_type` (`cash`, `card`, `other`). Soldul fiecărui cont
include soldul inițial, tranzacțiile, transferurile și mișcările împrumuturilor.
Panoul afișează separat Cash și Card, apoi totalul conturilor din aceeași monedă.
MDL și EUR nu sunt adunate și nu există conversie implicită. Conturile vechi
neclasificate rămân `other`; nu le deducem tipul din nume.

Pentru `opening_loan=true`, acordarea/primirea inițială nu modifică soldul:
împrumutul exista înainte de începutul evidenței. Rambursarea unui împrumut dat
creditează contul ales; rambursarea unuia primit debitează acel cont. Închiderea
rămâne integrală, idempotentă și limitată la un cont propriu în aceeași monedă.
Principalul nu generează venit salarial, cheltuială de consum sau alocări de buget.
Împrumuturile noi (`opening_loan=false`, implicit) își păstrează fluxurile normale.
Soldurile negative reale nu sunt mascate prin limitare la zero.

Formularele sincronizează metoda Cash/Card cu tipul contului. Verificarea există
și în acțiunile server și în trigger-ele bazei de date, inclusiv pentru scrierile
scurtăturii. Asocierea Cash/Card a telefonului determină contul folosit; schimbarea
asocierii nu necesită schimbarea tokenului. Soldurile inițiale ale economiilor se
introduc separat în Setări pentru fiecare cont.

Migrarea schemei nu convertește automat datoriile tuturor utilizatorilor și nu
modifică soldurile lor inițiale. Corectarea datoriilor istorice necesită identificare
explicită și păstrarea sumelor, monedelor, persoanelor, notelor și datelor.
