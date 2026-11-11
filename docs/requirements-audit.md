# Auditul cerințelor FinTrack — 11 noiembrie 2026

Acest document reflectă codul, nu doar ce a fost promis în conversație. Migrațiile
și publicarea sunt verificate separat de dezvoltarea locală; starea unui deploy
Netlify nu dovedește că fluxul a fost rulat pe un iPhone fizic.

| Cerință | Implementare și verificare |
| --- | --- |
| Next App Router, TypeScript, Tailwind, shadcn/ui, Lucide, Recharts | `package.json`, `src/app`, componente UI și charts; lint, typecheck, build |
| Dashboard profesional, responsive, navigare completă în română | `shell.tsx`, dashboard, grafice; smoke desktop/mobil și navigare |
| Sold, venituri, cheltuieli și portofoliu | Repository Supabase, calcule în unități minore, portofoliu manual și grafice |
| Demo fictiv etichetat și separat de Dionis | `/demo/*` separat; conturile reale încep fără tranzacții și fără fallback fictiv |
| Supabase SSR și verificare server | Clienți browser/server, requireUser, acțiuni server și proxy; auth-guard și integrare |
| Înregistrare, email, login/logout, recuperare | Pagini Auth și callback/confirm; erorile 429 explicate. SMTP implicit are limite externe |
| SQL, RLS, doi utilizatori, relații între proprietari | Migrații versionate, teste PostgreSQL embedded și integrare A/B |
| Tranzacții CRUD, filtre și validare | `/transactions`; confirmare ștergere, sumă exactă, filtre și stări de eroare |
| Conturi și categorii personale | `/settings`; CRUD, sold inițial și restricții când sunt folosite |
| Bugete | Limite pe categorie/lună, consum și depășiri din tranzacții reale |
| Investiții | Poziții și prețuri manuale, valoare, rezultat nerealizat; fără trading |
| Rapoarte și analize | Interval, categorii, export CSV cu monedă/metodă și print/PDF din browser |
| Contribuție distinctivă pentru licență | Laborator explicabil, impact marginal, șoc de venit, obiective, snapshot și plan versus progres |
| MDL și economii EUR | MDL pentru registru; ținte/contribuții EUR și total separat, fără amestec sau curs inventat |
| Instalare pe iPhone | Manifest, pictograme, `/install`, standalone PWA; verificare manuală iOS necesară |
| Înregistrare rapidă Cash/Card | `/quick-expense`, conturi preferate, dată automată, idempotency |
| Dialoguri iPhone fără browser și trei atingeri | `/iphone`, token per telefon, API pentru Shortcuts și ghid pentru Back Tap; teste HTTP fără cookie-uri |
| Revocarea telefonului și protecție împotriva dublării | Token SHA-256, expirare, RLS și RPC limitat, retry, rate limit; teste SQL și browser |
| Update GitHub și Netlify | Branch dedicat, commit, work urmărit de Netlify; Git local se actualizează prin pull, fără suprascriere automată |
| README și instrucțiuni | Setup, Supabase, auth URLs, monede, iPhone, limitări și comenzi de verificare |

## Comparație cu aplicații existente

Surse oficiale consultate la 11 noiembrie 2026. Nu pretindem că absența unei funcții
în pagina citită dovedește că produsul nu o are în nicio versiune.

| Produs și sursă | Ce oferă documentat | Comparație cu FinTrack |
| --- | --- | --- |
| [YNAB — Goal Tracking](https://www.ynab.com/features/goal-tracking) | Ținte de economisire și calculul sumelor necesare pe perioadă | FinTrack are ținte și contribuții; diferența lucrării este fluxul explicabil cu reduceri marginale, stres de venit și comparația snapshot/progres |
| [Wallet — produs](https://budgetbakers.com/en/products/wallet/) și [monede](https://support.budgetbakers.com/hc/en-us/articles/7149418777746-Multiple-Currencies-Exchange-Rates) | Bugete, cash flow, mai multe monede și conectare bancară | FinTrack are bugete și cash flow; MDL și economii EUR sunt separate. Nu are conversii automate sau bank sync și nu revendică paritate cu Wallet |
| [Spendee — bugete](https://help.spendee.com/article/131-budget-my-money) și [Shared Wallets](https://help.spendee.com/article/224-shared-wallets) | Bugete și portofele partajate | FinTrack oferă bugete personale și izolare între utilizatori; portofelele comune nu sunt implementate și nu au fost cerute |

Bugetele, dashboard-ul, multimoneda și scurtăturile mobile nu sunt invenții unice
mondial. Contribuția susținută pentru licență este implementarea și evaluarea unui
flux explicabil pentru decizii personale: istoric verificabil → schimbări pe categorii
→ impact marginal asupra termenului → stres de venit → plan salvat → progres real.
Metodele, formulele, limitele și un exemplu reproductibil sunt în `decision-lab.md`.

## Ce necesită configurare externă sau rămâne limitat

- Configurarea unică a scurtăturii și a gestului Back Tap se face pe iPhone; nu există
  `.shortcut` semnat, IPA, App Store sau instalare automată prin Descărcări.
- Fluxul HTTP fără browser este testat automat; dialogurile Apple și gestul fizic
  trebuie verificate pe telefonul utilizatorului, după configurare.
- Supabase SMTP implicit limitează trimiterea emailurilor. Pentru înregistrări
  publice fiabile este necesar SMTP propriu, cu domeniu verificat și configurare Auth.
  Nu se dezactivează confirmarea emailului pentru a ascunde limita.
- Fără offline financiar, bank sync, trading, prețuri bursiere live sau conversii
  valutare automate. Nu se revendică implementarea lor.
- După pull pe calculator: `git pull --ff-only origin work`, `npm ci`, `npm run dev`,
  cu Node.js 24. Publicarea Netlify urmărește branch-ul work.

## Observație din verificarea Supabase

Advisory-ul existent indică protecția împotriva parolelor compromise dezactivată.
Nu a fost schimbată configurația Auth la acest update. Configurarea se poate face
conform [documentației Supabase](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).

## Extensie locală pentru administrarea zilnică

În branch-ul local de review sunt adăugate transferuri între conturi, reguli
recurente confirmate manual, scadențe în panou și import CSV cu previzualizare și
deduplicare. Acestea elimină limitele istorice privind transferurile și importul
menționate în documentele v1. Sunt descrise în `finance-workflows.md` și necesită
migrația nouă. Nu sunt încă publicate; instrucțiunea utilizatorului interzice push.
