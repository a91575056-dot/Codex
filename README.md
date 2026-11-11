# FinTrack

Aplicație de licență pentru finanțe personale și urmărirea portofoliului, cu Next.js
App Router, TypeScript, Tailwind CSS, shadcn/ui, Lucide și Recharts. Interfață în română.

## Pornire locală

Necesită Node.js 22.13+ (recomandat 24) și npm.

```bash
npm ci
npm run dev
```

Deschideți **http://localhost:3000**. Fără variabile Supabase, aplicația pornește în
mod demonstrativ, doar pentru citire. Toate identitățile și valorile demo sunt fictive.
Nu există conectări bancare, brokeri sau tranzacționare.

## Configurarea Supabase — etapa 2

1. În Supabase, deschideți proiectul și **Project Settings → API** (sau **API Keys**).
   Copiați URL-ul proiectului și cheia **publishable** (`sb_publishable_...`).
2. Copiați `.env.example` în `.env.local` la rădăcina proiectului:

   ```powershell
   Copy-Item .env.example .env.local
   ```

   Pe macOS/Linux: `cp .env.example .env.local`.

3. Completați local:

   ```dotenv
   NEXT_PUBLIC_SUPABASE_URL=https://proiectul-tau.supabase.co
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_cheia_ta
   ```

   Nu trimiteți chei în chat. Nu folosiți chei `service_role` sau `sb_secret_...`.
   `.env.local` este ignorat de Git. Lăsați AMBELE valori goale pentru modul demo;
   o configurare parțială este tratată ca eroare, nu înlocuită cu date fictive.

4. În **SQL Editor**, creați o interogare și rulați conținutul fișierului
   [`supabase/migrations/202611110001_finance.sql`](supabase/migrations/202611110001_finance.sql).
   Verificați proiectul selectat înainte de rulare. Migrația creează tabelele,
   politicile RLS, relațiile de proprietate și inițializarea utilizatorilor.
   Aplicați fișierul **o singură dată**. Nu este o migrație idempotentă.
   Pentru un proiect deja administrat prin CLI, folosiți fluxul de migrații al
   proiectului în loc să aplicați același SQL și din editor, și prin CLI.
5. În **Authentication → Providers → Email**, activați Email și **Confirm email**.
6. În **Authentication → URL Configuration**, setați:

   - Site URL: `http://localhost:3000`
   - Redirect URLs: `http://localhost:3000/auth/callback`
   - Pentru șablonul de email de mai jos: `http://localhost:3000/auth/confirm`

7. În **Authentication → Email Templates → Confirm signup**, recomandăm linkul:

   ```html
   <a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email"
     >Confirmă adresa de email</a
   >
   ```

   Acest flux funcționează și dacă emailul este deschis în alt browser. Șablonul
   implicit `{{ .ConfirmationURL }}` este suportat prin callback PKCE, dar necesită
   browserul în care a început înregistrarea. Nu folosiți linkuri consumate sau expirate.

8. Reporniți serverul (`Ctrl+C`, apoi `npm run dev`). Creați un cont la
   `/auth/register`, confirmați emailul și conectați-vă. Contul pornește cu sold zero,
   un cont personal și categorii implicite, **fără tranzacții fictive**.

În producție, setați și `NEXT_PUBLIC_SITE_URL=https://domeniul-tau`, apoi configurați
Site URL, redirecturile și șablonul de email pentru acel domeniu HTTPS. Variabilele
`NEXT_PUBLIC_*` se aplică la build; reconstruiți aplicația după modificare.

Dacă înregistrarea returnează o eroare de bază de date, verificați migrația și
jurnalele triggerului în Supabase. Pentru erori de email, verificați limita de
trimitere și configurarea serviciului de email din Supabase. Nicio schemă la distanță
nu este modificată automat de aplicație sau de comenzile de dezvoltare.

## Funcționalități și separarea datelor

- `/auth/register`, `/auth/login`, `/auth/confirm`, `/auth/callback`: autentificare SSR.
- `/`, `/transactions`, `/analytics`, `/reports`, `/settings`: datele contului
  autentificat când Supabase este configurat. Accesul este verificat pe server.
- `/transactions`: creare, editare, ștergere cu confirmare, căutare după descriere,
  filtre după tip, categorie și interval inclusiv de date. Formularele validează
  atât în browser, cât și pe server. Sumele se salvează ca bani întregi, în RON.
- Soldul include soldurile inițiale și toate tranzacțiile până astăzi. Veniturile,
  cheltuielile și graficul folosesc luna curentă și ultimele șase luni, în fusul
  `Europe/Chisinau`. Tranzacțiile viitoare se afișează, dar nu intră încă în sold.
- `/budgets` și `/investments` sunt încă **DEMO** și sunt etichetate explicit.
- `/demo` și `/demo/*`: exemple fictive separate, fără salvare. Deconectarea nu
  este necesară pentru explorare. Datele demo nu sunt inserate în conturi.
- Raportul conectat exportă toate tranzacțiile salvate; raportul demo exportă
  numai eșantionul fictiv. Exportul este local și neutralizează formulele CSV.

Conturile și categoriile sunt inițializate automat de migrație/trigger. În această
etapă nu există încă formulare de administrare a conturilor, bugetelor sau categoriilor.
Lista demo este un eșantion; totalurile și procentele demo sunt exemple independente.

## Structură

- `src/app/(workspace)`: pagini protejate, tranzacții și server actions.
- `src/app/auth`: formulare și rute de confirmare/sesiune.
- `src/app/demo`: spațiul demonstrativ explicit.
- `src/lib/supabase`: clienți browser/server, tipuri SQL și repository cu filtre user_id.
- `src/proxy.ts`: reîmprospătarea cookie-urilor; autorizarea rămâne pe server și în RLS.
- `src/lib/finance-calculations.ts`: calcule din unități monetare minore.
- `src/lib/transaction-validation.ts`: validare comună Zod.
- `src/components/ui`: componente locale după modelul shadcn/Radix.
- `supabase/migrations`: schema versionată. [Detalii de securitate](docs/supabase.md).

## Verificări

```bash
npm run lint
npm run typecheck
npm test
npm run build
npm start
```

`npm test` execută validarea, calculele și migrația/RLS într-un PostgreSQL embedded
PGlite. Nu necesită Docker, chei sau acces la proiectul Supabase. Testul RLS simulează
identitatea JWT prin `auth.uid()` și verifică doi utilizatori, CRUD, accesul anonim,
asocierea între utilizatori și tipul categoriei. Nu înlocuiește verificarea serviciului
Supabase Auth real.

```bash
npx playwright install chromium
npm run test:e2e
npm run test:auth
```

Prima suită verifică modul fără Supabase: navigare, mobil, CSV și 404. A doua pornește
un server separat cu o configurație Supabase fictivă, verifică protejarea rutelor,
formularele auth, linkurile de confirmare invalide și izolarea navigării demo.
Nu trimite emailuri și nu testează conectarea reușită la un serviciu real.
Pentru Chromium deja instalat, pe Linux:

```bash
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run test:e2e
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run test:auth
```

Suitele browser trebuie rulate **secvențial**, cu porturile 3000/3001 libere. Pentru
suita demo, lăsați variabilele Supabase neconfigurate. GitHub Actions rulează aceleași verificări.

### Verificare manuală după configurarea proiectului real

1. Înregistrați doi utilizatori de test, confirmați emailurile și conectați-vă în
   două profiluri de browser diferite.
2. În contul A, creați, editați și ștergeți o tranzacție; verificați dashboardul,
   filtrele și exportul. În contul B, tranzacția nu trebuie să apară.
3. Verificați refresh-ul paginii și deconectarea; revenirea la o rută protejată
   trebuie să redirecționeze la conectare.
4. Testați linkurile de confirmare expirate și sesiunea expirată. Dacă este necesar,
   retrimiteți confirmarea din panoul Supabase pentru utilizatorul de test.

## Actualizarea copiei locale

După ce modificările sunt publicate pe GitHub:

```bash
git fetch origin
git switch feat/supabase-transactions
git pull --ff-only
npm ci
```

Nu este necesară reclonarea. Salvați/commitați modificările locale înainte de schimbarea
branch-ului. Git nu descarcă automat modificările de pe GitHub.
