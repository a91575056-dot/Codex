# FinTrack 1.0 — versiune pentru review

## Rezultat

Toate secțiunile modului conectat funcționează cu date persistente ale utilizatorului.
Bugetele și investițiile nu mai sunt exemple în contul personal. Modul demonstrativ
rămâne separat și etichetat. Nu există conectări bancare, prețuri live sau trading.

## Funcții finalizate

- Tranzacții CRUD, căutare și filtre, solduri și cash flow calculate.
- Conturi și categorii CRUD în Setări; sold inițial semnat; ștergeri protejate de FK.
- Bugete lunare CRUD, unice pe categorie de cheltuieli, progres și depășiri.
- Portofoliu manual CRUD, cantități cu șase zecimale, evaluare în bani întregi,
  cost/preț/rezultat nerealizat și alocare după clasă; data evaluării vizibilă.
- Obiective și contribuții, simulator explicabil și comparație cu planuri imuabile.
- Rapoarte pe interval inclusiv, distribuție pe categorii, CSV și tipărire/PDF.
- Analize ale surplusului, cheltuielilor și alocării; dashboard cu date reale.
- Autentificare SSR, confirmare/retrimitere email, recuperare și schimbare parolă.
- README pentru Node/Windows, configurare, actualizare și verificări; CI complet.

## Verificare

`npm run lint`, `npm run typecheck`, `npm test`, `npm run build`, suitele Playwright
`test:e2e`, `test:auth` și `test:integration`, plus `git diff --check`.

Testul de integrare parcurge UI-ul și server actions reale: login, cont, categorie,
patru tranzacții, buget depășit, activ și actualizare preț, obiectiv, contribuție,
scenariu salvat, raport/CSV, dashboard, izolarea utilizatorului B, ștergere și logout.
Serviciul de autentificare este o fixture locală; stocarea și politicile sunt PostgreSQL
embedded PGlite. Datele DATE sunt serializate ca PostgREST, fără ore artificiale.
Fixture-ul este numai în tests, nu este roută Next.js și nu este publicat în aplicație.

În testarea cu sesiune s-au corectat și accesări ale timpului înaintea fazei dinamice
Next.js; `connection()` este apelat înaintea verificărilor de sesiune și a datelor
calendaristice de pe paginile care le calculează înaintea repository-urilor.

Migrația `20261111081108_budgets_and_portfolio.sql` a fost aplicată proiectului
Supabase FinTrack conectat. Tabelele au RLS și politici de proprietar, cheile externe
ale bugetelor includ user_id și tipul expense, iar accesul anonim este revocat.
Verificarea de securitate Supabase nu raportează probleme la momentul validării.

## Limite explicite

- Efectuarea emailurilor și validarea reală Supabase Auth necesită verificare cu un
  cont confirmat și setările de URL/email ale mediului țintă. Testele locale nu
  pretind verificarea unui serviciu real de email sau a semnăturilor JWT Supabase.
- Monedă principală MDL și obiective de economisire EUR separate, fără conversii automate. Nu există transferuri între conturi, import bancar,
  contabilitate fiscală, retrageri automate sau prețuri în timp real.
- Portofoliul este un inventar manual, fără registru de ordine executate, dividende,
  comisioane ori randament ponderat în timp. Valoarea nu se adună automat la numerar.
- Contribuțiile sunt declarate manual; utilizatorul evită dubla alocare a economiilor.
- Simulatorul nu prezice piața, nu estimează probabilități și nu garantează termene.

Aceste limite definesc versiunea de licență 1.0; nu sunt module conectate la date
fictive sau butoane prezentate drept funcționalități implementate.
