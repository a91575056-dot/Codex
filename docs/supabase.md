# Supabase — etapa următoare

Nu există încă un client Supabase și nu sunt necesare chei API.
`FinanceRepository` din `src/types/finance.ts` este contractul de acces la date;
adapterul demo din `src/lib/finance.ts` furnizează modele UI tipizate.

Plan de integrare:

1. Adăugați `@supabase/ssr` și clienți separați server/browser.
2. Implementați un repository server-only și selectați-l la nivelul compoziției paginilor.
3. Adăugați autentificare și migrații pentru profiles, accounts, transactions,
   budgets, holdings și asset_prices. Portofoliul urmărește valori, fără trading.
4. Activați RLS pe toate tabelele utilizatorului; derivați user_id din sesiune.
5. Stocați sume monetare în unități minore întregi, cu monedă explicită.
6. Adăugați tipurile generate, validarea datelor și teste de izolare între utilizatori.

Folosiți variabilele publice pentru URL și cheia publishable doar în etapa conectată.
Nu expuneți niciodată chei service-role în browser. Păstrați datele demonstrative
separate de datele autentificate. Datele actuale și comparațiile procentuale sunt
exemple fictive, nu rezultate calculate pe un istoric real.
