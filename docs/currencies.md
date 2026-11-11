# MDL principal și economii EUR

Moneda principală este MDL pentru conturi, tranzacții, bugete, portofoliul manual,
rapoarte și laborator. Economiile din Obiective pot fi MDL sau EUR; ținta,
contribuțiile, suma rămasă și necesarul lunar sunt în moneda obiectivului.
Totalurile MDL și EUR sunt separate și nu se adună la soldul conturilor.
Contribuțiile nu efectuează transferuri bancare.

Moneda obiectivului se alege la creare și devine imuabilă, inclusiv prin Data API.
Contribuțiile moștenesc moneda obiectivului. Nu există curs valutar implicit.
Laboratorul calculează scenarii din veniturile MDL, deci scenariile EUR sunt blocate
în UI, în acțiunea server și în SQL. Nu se convertesc automat sume MDL în EUR.

## Publicare și date istorice

Migrația locală: `supabase/migrations/20261111093037_mdl_and_euro_savings.sql`.
Aceasta modifică valorile implicite și constrângerile pentru MDL/EUR. Pentru
conturile, activele și obiectivele vechi schimbă codul RON în MDL fără să modifice
sumele numerice. Tranzacțiile folosesc moneda conturilor. Și scenariile existente
vor fi interpretate în MDL. Este o corectare a monedei inițiale, nu o conversie.

**Înainte de aplicare trebuie confirmat că valorile istorice sunt lei moldovenești.**
Dacă sunt realmente RON, nu aplicați migrația: este necesară o migrare separată cu
istoric RON și o decizie explicită despre conversie. Nu publicați codul înaintea
migrației, deoarece schema veche respinge obiectivele MDL/EUR.

După aprobare, verificați datele existente, aplicați numai noul fișier SQL o singură
dată în proiectul corect și verificați monedele, numărul înregistrărilor și sumele.
Păstrați migrațiile vechi neschimbate. Reconcilierea timestamp-urilor MCP rămâne
necesară înaintea folosirii `supabase db push`. Apoi publicați branch-ul pe Netlify.

## Verificare

- Teste PGlite: corectarea păstrează sumele, MDL implicit, EUR acceptat, alte monede
  respinse; schimbarea monedei și planurile cu unități incompatibile sunt blocate.
- RLS: alt utilizator nu vede obiectivele/contribuțiile și nu le poate asocia.
- Integrare UI: obiectiv EUR, contribuție cu cenți, totaluri separate, laborator
  blocat pentru EUR și rapoarte MDL fără economii EUR.
- Testele Auth folosesc un serviciu local simulat; verificarea pe contul personal
  și pe iPhone se face manual după publicare.
