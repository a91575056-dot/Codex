# Supabase — implementarea etapei 2

Clienții browser/server folosesc `@supabase/ssr` și o cheie publică publishable.
`src/proxy.ts` reîmprospătează cookie-urile de sesiune și dezactivează cache-ul
răspunsurilor conectate. Server Components verifică utilizatorul cu `getUser`, nu
cu identitatea citită doar din cookie. Fiecare operație CRUD verifică din nou sesiunea.

## Model

- `accounts`: proprietar, nume, monedă RON, sold inițial în bani întregi.
- `categories`: proprietar, nume și tip `income`/`expense`.
- `transactions`: proprietar, cont, categorie, tip, descriere, sumă pozitivă în bani
  întregi și dată calendaristică. Semnul este derivat din tip.

Cheile externe compuse includ `user_id`. O tranzacție nu poate fi asociată contului
sau categoriei altui utilizator; categoria trebuie să corespundă tipului tranzacției.
RLS permite numai datele pentru care `auth.uid() = user_id`. Rolul `anon` nu primește
acces la tabele. Nicio cheie privilegiată nu este necesară pentru aplicație.

Triggerul cu `security definer` inițializează numai structura contului nou, are
`search_path` gol și nu este executabil direct de rolurile API. Migrația inițializează
și utilizatorii existenți, fără tranzacții fictive. Rularea se face o singură dată.
Nu există migrare automată la pornirea aplicației.

## Date și calcule

Repository-ul Supabase încarcă toate paginile de câte 500 de tranzacții pentru a
preveni trunchierea silențioasă la limita implicită PostgREST. Pentru volume mari,
următoarea etapă poate muta agregările și paginarea UI în SQL, menținând RLS.
Nu există cache global pentru datele utilizatorilor. Contul nou are sold zero.

Datele demonstrative rămân în adapterul separat din `src/lib/finance.ts`; eșecurile
Supabase nu activează un fallback la valori demo. Bugetele și investițiile nu sunt
încă persistate. Tipurile SQL locale corespund migrației; după aplicare, pot fi
regenerate prin Supabase CLI și comparate cu schema versionată.

## Verificare

`tests/unit/rls.test.ts` execută migrația într-un PostgreSQL embedded PGlite cu o
schemă `auth` minimă și doi utilizatori. Verifică select/insert/update/delete,
proprietatea relațiilor, schimbarea proprietarului și refuzul accesului anonim.
Acesta validează SQL/RLS, nu emite sau verifică JWT-uri reale.
Fluxul real de email, PKCE și persistența sesiunii în Supabase necesită configurarea
proiectului și verificarea manuală din README. Nu s-au rulat migrații la distanță.
