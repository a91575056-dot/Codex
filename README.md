# FinTrack 1.0

Aplicație web de licență pentru finanțe personale, bugete, obiective de economisire
și urmărirea unui portofoliu introdus manual. Interfață în română, monedă principală MDL și economii în EUR,
fus orar de calcul Europe/Chisinau. Nu conectează bănci/brokeri și nu execută trading.

## Pornire rapidă

Necesită **Node.js 24 recomandat**, minimum 22.13, și npm. Node.js 16 nu este compatibil.

```powershell
node -v
npm ci
npm run dev
```

Deschideți http://localhost:3000. Fără configurare Supabase, aplicația folosește
numai date demonstrative etichetate. Exemplul complet este și la `/demo`.

Pe Windows, dacă Node este prea vechi:

```powershell
winget install --id OpenJS.NodeJS.LTS --exact --source winget
```

Închideți complet VS Code și redeschideți-l după instalare. Dacă `node -v` arată tot
versiunea veche, verificați `where.exe node` și eliminați din PATH instalarea veche.
`.nvmrc` și `.node-version` indică versiunea recomandată.

## Actualizare sau clonare

Versiunea completă se publică pe branch-ul **work**:

```powershell
git fetch origin
git switch work
git pull --ff-only
npm ci
npm run dev
```

Pe alt calculator:

```powershell
git clone -b work https://github.com/a91575056-dot/Codex.git FinTrack
cd FinTrack
npm ci
code .
npm run dev
```

Fișierul `.env.local` nu vine din GitHub. Copiați-l separat de pe calculatorul vechi
sau configurați-l conform pașilor de mai jos. Nu suprascrieți modificările locale
necomise prin comenzi Git destructive.

## Funcționalități

| Secțiune             | Mod conectat                                                                             |
| -------------------- | ---------------------------------------------------------------------------------------- |
| Dashboard            | Solduri, venituri, cheltuieli, bugetele lunii, portofoliu manual și cash flow            |
| Tranzacții           | Creare, editare, ștergere cu confirmare, căutare și filtre                               |
| Bugete               | Limite lunare pe categorii de cheltuieli, progres și depășiri calculate automat          |
| Investiții           | Poziții manuale, cantitate fracționară, cost/preț în MDL, alocare și rezultat nerealizat |
| Obiective            | Ținte, termene, contribuții, scenarii salvate și comparație plan/rezultat                |
| Laborator de decizii | Impactul reducerilor de cheltuieli, obiectiv și șoc de venit, formule explicabile        |
| Analize              | Flux net, rata surplusului, distribuția cheltuielilor, cash flow și alocare              |
| Rapoarte             | Interval de date inclusiv, categorii, CSV și tipărire/salvare PDF în browser             |
| Setări               | Administrarea conturilor, soldurilor inițiale și categoriilor, schimbare parolă          |
| Autentificare        | Înregistrare, confirmare/retrimitere email, login, logout și recuperare parolă           |

Toate paginile personale folosesc datele utilizatorului autentificat. Nu există
fallback la valori fictive dacă baza de date returnează o eroare. Datele demo
rămân în `/demo/*` și în modul fără configurare, fără salvare în conturi.

## Configurarea Supabase

Proiectul FinTrack conectat are migrațiile de bază deja aplicate.
**Nu le rulați din nou acolo.** Migrația MDL/EUR necesită aprobarea și aplicarea separată descrise în `docs/currencies.md`. Pentru alt proiect, aplicați fișierele SQL o singură
dată, în ordinea din `supabase/migrations`, folosind SQL Editor. Migrațiile nu sunt
idempotente și nu se execută automat la pornirea aplicației.

1. În Project Settings → API / API Keys, identificați URL-ul și cheia **publishable**.
2. Copiați exemplul în `.env.local`, la rădăcină:

   ```powershell
   Copy-Item .env.example .env.local
   ```

3. Completați local, fără a trimite secrete în chat:

   ```dotenv
   NEXT_PUBLIC_SUPABASE_URL=https://proiectul-tau.supabase.co
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_cheia_ta
   NEXT_PUBLIC_SITE_URL=http://localhost:3000
   ```

   Nu folosiți `service_role` sau `sb_secret_...`. `.env.local` este ignorat de Git.
   Lăsați ambele valori Supabase goale pentru modul demo; o configurare parțială este eroare.

4. În Authentication → Providers → Email, activați Email și **Confirm email**.
5. În Authentication → URL Configuration:
   - Site URL: `http://localhost:3000`
   - Redirect URL: `http://localhost:3000/auth/callback`
   - Pentru șabloanele de mai jos: `http://localhost:3000/auth/confirm`
6. Șablonul recomandat **Confirm signup**:

   ```html
   <a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email"
     >Confirmă emailul</a
   >
   ```

   Șablonul recomandat **Reset password**:

   ```html
   <a
     href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery"
     >Alege parola nouă</a
   >
   ```

   Acestea permit deschiderea emailului și în alt browser. Șablonul implicit
   `{{ .ConfirmationURL }}` este suportat prin PKCE, în browserul din care a început
   cererea. Codurile redirecționate la rădăcină sunt trimise automat către callback.
   Linkurile expirate sau consumate produc un mesaj și pot fi solicitate din nou.

7. Reporniți serverul. Înregistrați-vă, confirmați emailul și conectați-vă.
   Contul nou are sold zero, un cont personal și categorii, fără tranzacții fictive.

În producție utilizați domeniul HTTPS în variabile, Site URL și lista de redirecturi,
apoi reconstruiți aplicația. `NEXT_PUBLIC_*` este evaluat la build. Configurarea reală
a emailurilor/URL-urilor se face în panoul Supabase; integrarea MCP disponibilă nu
permite administrarea acestor setări. Verificați limitele de email ale proiectului.

Aplicarea migrațiilor prin MCP poate produce timestamp-uri diferite în istoricul
Supabase. Comparați istoricul și aliniați-l înainte de a folosi `supabase db push`
pe proiectul deja configurat. Nu reaplicați SQL doar pentru că numele diferă.

## Reguli de calcul și limite ale versiunii 1

- Sumele monetare sunt stocate în bani întregi. Soldul = solduri inițiale + venituri
  − cheltuieli până astăzi. Înregistrările viitoare sunt vizibile, dar nu intră în sold.
- Soldul inițial se referă la momentul anterior tranzacțiilor înregistrate. Schimbarea
  lui modifică soldul calculat. Nu există încă un registru separat de transferuri;
  nu introduceți transferuri între conturile proprii ca venit/cheltuială.
- Bugetele sunt unice pe categorie de cheltuieli și lună; cheltuielile viitoare nu
  sunt consumate anticipat. O categorie sau un cont utilizat nu se poate șterge
  până la modificarea înregistrărilor care îl referă.
- Pozițiile de portofoliu sunt manuale, cu maximum șase zecimale la cantitate.
  Valoarea și costul se rotunjesc la ban după înmulțire. Prețurile nu sunt live;
  fiecare poziție arată data evaluării. Rezultatul este nerealizat și nu include
  dividende, taxe, comisioane sau operațiuni închise. Nu se scade automat din numerar.
- Rapoartele folosesc intervale inclusive. Portofoliul afișat este evaluarea curentă
  introdusă, nu o reconstrucție a valorii istorice. CSV exportă selecția raportului;
  tipărirea poate salva PDF prin browser. Textele care pot deveni formule CSV sunt neutralizate.
- Contribuțiile pentru obiective sunt evidențe manuale, nu mișcări de bani. Nu sunt
  adăugate la venituri și nu se adună cu soldurile conturilor/portofoliului.
- Simulatorul este determinist, fără randamente sau inflație. Istoricul incomplet
  limitează rezultatele. Scenariile salvate sunt imuabile și nu garantează termene.
- Aplicația nu este un serviciu bancar, contabilitate fiscală sau platformă de trading.

[Laborator: model și evaluare academică](docs/decision-lab.md) ·
[Obiective și comparații](docs/savings-goals.md) · [Securitate Supabase](docs/supabase.md).

## Arhitectură

Next.js App Router, TypeScript strict, Tailwind 4, componente shadcn/ui locale cu
Radix Slot/CVA, Lucide și Recharts. Server actions validează cu Zod și verifică
sesiunea înaintea modificărilor. Clienți Supabase separați browser/server; cookie-urile
se reîmprospătează în `src/proxy.ts`. Datele personale nu folosesc cache global.

- `src/app/(workspace)`: pagini protejate și operații server.
- `src/app/auth`, `src/lib/auth`: autentificare și recuperare.
- `src/lib/supabase`: tipuri SQL și repository-uri cu paginare integrală de 500 rânduri.
- `src/lib/planning.ts`, `reports.ts`, `finance-calculations.ts`: calcule și validare.
- `src/components`: componente reutilizabile, formulare și grafice.
- `supabase/migrations`: schema versionată, RLS și relații de proprietate.
- `tests`: verificări de model, SQL, browser și integrare locală.

## Verificări

```bash
npm run lint
npm run typecheck
npm test
npm run build
npm start
```

Pentru testele browser:

```bash
npx playwright install chromium
npm run test:e2e
npm run test:auth
npm run test:integration
```

Rulați suitele secvențial. Porturile 3000, 3001, 3002 și 54329 trebuie să fie libere.
Pentru Chromium de sistem pe Linux, prefixați comenzile Playwright cu
`PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium`.

- `npm test`: modele financiare și migrațiile/RLS în PostgreSQL embedded PGlite.
- `test:e2e`: demo, navigare, mobil, export, obiective și laborator.
- `test:auth`: protejarea tuturor rutelor cu o configurație fictivă fără sesiune.
- `test:integration`: formularele reale și cookie-urile SSR împotriva unui serviciu
  local de test, cu PostgreSQL/RLS reale. Verifică doi utilizatori, conturi/categorii,
  tranzacții, buget depășit, evaluare portofoliu, obiectiv, scenariu, raport și logout.
  **Autentificarea furnizorului este simulată**; fixture-ul nu se publică, nu trimite
  emailuri și nu înlocuiește verificarea Supabase Auth real.

Înainte de publicare pe un domeniu propriu, verificați cu două conturi reale:
confirmarea emailului, recuperarea parolei, persistența sesiunii și CRUD-ul. Nu
folosiți conturile/cheile din fixture cu un serviciu real. GitHub Actions rulează
verificările automate; documentația de review este în `docs/release-v1.md`.

## Instalare pe iPhone și cheltuieli rapide

FinTrack se instalează ca aplicație web (PWA), după publicare pe un domeniu HTTPS.
În Safari deschideți `/install`, apoi Partajare → Adăugați pe ecranul principal →
Deschideți ca aplicație web. Pictograma pornește formularul `/quick-expense`.
Nu este un fișier IPA și nu se instalează din Descărcări. Necesită internet;
nu păstrează în cache paginile financiare pentru utilizare offline.

Înregistrați un cont personal cu numele dorit, confirmați emailul, apoi conectați-vă.
Datele demo rămân separate. Formularul rapid salvează suma, contul, categoria și
metoda Cash/Card în tranzacțiile utilizatorului autentificat. Retrimiterea aceleiași
cereri nu creează duplicate. Contul preferat pentru fiecare metodă este reținut
local, separat pentru fiecare utilizator. Metoda tranzacțiilor istorice rămâne
„Nespecificat”. Migrația necesară este
`supabase/migrations/20261111084659_quick_expense_payment_method.sql`.

Opțional, o comandă Apple Shortcuts poate deschide adresa formularului prin
Atingere spate de trei ori. Aceasta poate deschide Safari; dialogurile native
Shortcuts pentru introducerea sumei nu sunt implementate în această etapă.

### Publicare pe Netlify

Proiectul pregătit: https://app.netlify.com/projects/fintrack-dionis .
Conectați repository-ul `a91575056-dot/Codex`, branch `work`, în
Project configuration → Build & deploy → Continuous deployment → Link repository.
`netlify.toml` configurează build-ul Next.js; nu adăugați redirect SPA.
Configurați cele trei variabile publice din `.env.example` în Netlify, cu
`NEXT_PUBLIC_SITE_URL` egal cu domeniul HTTPS publicat. Nu folosiți service_role.
Alternativ, din copia locală actualizată, cu Node.js 24:

```bash
npx netlify-cli login
npx netlify-cli deploy --prod --site a112f59d-ed1f-4599-9e8a-8669f08f7a39
```

În Supabase Authentication → URL Configuration configurați Site URL cu domeniul
public și adăugați URL-urile de callback și recuperare descrise mai sus pentru
acel domeniu. Verificați întâi finalizarea deploy-ului: crearea proiectului Netlify
nu publică automat codul. Instalarea pe un iPhone fizic necesită verificare manuală.


## Monede: MDL și economii EUR

Tranzacțiile, soldurile conturilor, bugetele, portofoliul manual, rapoartele CSV
și laboratorul folosesc MDL. În Obiective alegeți MDL sau EUR la creare; fiecare
contribuție este exprimată în moneda obiectivului. Totalurile economiilor sunt
afișate separat. Nu există cursuri valutare, conversii sau adunare MDL + EUR.
Moneda unui obiectiv existent nu poate fi schimbată. Scenariile bazate pe istoricul
MDL sunt disponibile doar pentru obiective MDL.

Înainte de publicarea acestei versiuni este necesară migrația
`20261111093037_mdl_and_euro_savings.sql`. Aceasta corectează etichetele istorice
RON în MDL **fără să schimbe numeric sumele**; nu reprezintă o conversie valutară.
Nu o aplicați în producție până când proprietarul confirmă că datele vechi au fost
introduse ca lei moldovenești. Pașii de review sunt în `docs/currencies.md`.
