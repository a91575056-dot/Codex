> Document istoric al etapei 2. Starea actuală: [auditul cerințelor](requirements-audit.md). Bugetele și portofoliul manual sunt acum funcționale în contul autentificat.

# Review — etapa 2: Supabase și tranzacții

Branch: `feat/supabase-transactions`, pornit din `work`.

## Comportament

Cu Supabase configurat, utilizatorii se înregistrează, confirmă emailul și se
conectează. Datele personale sunt protejate pe server și prin RLS. Utilizatorul nou
primește un cont personal cu sold zero și categorii, fără tranzacții fictive.
Tranzacțiile pot fi create, editate, șterse cu confirmare, căutate și filtrate.
Dashboardul calculează soldul, veniturile, cheltuielile și cash flow din datele salvate.

Fără configurare, rutele existente rămân demonstrative. `/demo` păstrează permanent
un spațiu fictiv separat. Bugetele și investițiile rămân explicit DEMO. Eșecurile
Supabase nu înlocuiesc datele personale cu date fictive.

## Fișiere de urmărit

- `supabase/migrations/202611110001_finance.sql`: tabele, RLS, chei externe compuse,
  trigger de inițializare. Aplicare manuală o singură dată, conform README.
- `src/lib/supabase`: clienți SSR/browser, tipuri și repository fără cache global.
- `src/lib/auth`, `src/app/auth`, `src/proxy.ts`: autentificare și sesiune.
- `src/app/(workspace)/transactions`: CRUD autorizat și pagină cu filtre.
- `src/lib/transaction-validation.ts`, `src/lib/finance-calculations.ts`: validare și calcule.
- `tests/unit`, `tests/auth-guard.spec.ts`: verificări noi de securitate și comportament.
- `.env.example`, README și `docs/supabase.md`: configurare și limite.

## Verificări

- Lint și verificarea TypeScript.
- Teste Node: validare sumă/dată/filtre, autentificare/redirecționări, calcule și RLS.
- Migrația executată în PostgreSQL embedded PGlite: doi utilizatori, CRUD, refuzul
  accesului anonim și al asocierilor cu resursele altui utilizator.
- Playwright demo: navigare, mobil fără overflow, export CSV și 404.
- Playwright configurat cu endpoint fictiv: rute protejate, formulare auth,
  confirmare invalidă și navigare demo separată.
- Build de producție fără configurare și cu o configurație Supabase fictivă,
  plus `git diff --check`.

## Configurare și limite rămase

Nu a fost accesat sau modificat niciun proiect Supabase la distanță. Fluxul real de
email, conectarea reușită, refresh-ul unei sesiuni reale și CRUD prin PostgREST trebuie
verificate după configurarea variabilelor și aplicarea migrației. Pașii sunt în README.
Testul SQL simulează `auth.uid()`; nu înlocuiește verificarea serviciului Auth real.

Conturile/categoriile sunt inițializate automat, fără formulare de administrare în
această etapă. Pentru volume mari, agregările și paginarea UI pot fi mutate în SQL;
repository-ul încarcă acum toate paginile pentru a nu trunchia totalurile.
