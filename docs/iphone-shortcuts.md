# Cheltuieli din dialogurile native iPhone

În `/iphone` (Setări → iPhone: cheltuieli fără browser) utilizatorul autentificat
conectează telefonul, selectând contul MDL pentru Cash și pentru Card. Se generează
un token de dispozitiv, afișat o singură dată. Nu este parola contului și nu este
cheia Supabase. Interfața include pașii pentru configurarea manuală a unei scurtături
Apple: sumă numerică, listă Cash/Card, categorii din cont, detalii și notificare.
Back Tap, Siri sau widgetul pot rula acea scurtătură fără deschiderea browserului.

Pictograma PWA rămâne disponibilă. Nu există un fișier IPA sau un `.shortcut`
semnat instalabil automat; configurația JSON este doar o referință. Asamblarea
scurtăturii și alegerea gestului sunt operații locale pe iPhone. Este necesar
internetul și, în funcție de setările iOS, deblocarea telefonului. Nu citește plăți
Apple Pay sau tranzacții bancare. Nu funcționează ca o înregistrare offline.

## Configurare unică

1. Conectează-te în FinTrack. În Setări creează, de exemplu, conturile Numerar și
   Card în MDL, apoi deschide `/iphone` și conectează telefonul la aceste conturi.
2. Copiază tokenul privat în acțiunea Text dintr-o scurtătură personală nouă și
   salvează ca variabila Token. Nu distribui o scurtătură care include tokenul.
3. Obține categoriile prin POST la `/api/shortcut/options`, cu antetul
   `Authorization: Bearer [Token]`. Corpul poate lipsi. Obține dicționarul
   `categories`, toate cheile sale, apoi Alege din listă. Folosește numele selectat
   drept cheie în dicționar pentru a obține UUID-ul categoriei.
4. Solicită suma (tip Număr), metoda (listă cu `cash`, `card`) și detaliile (Text).
   Creează CerereID o singură dată pentru acea cheltuială: Data curentă formatată
   `yyyyMMddHHmmss`, o cratimă și Număr aleator între 100000 și 999999.
5. POST la `/api/shortcut/expenses` cu același antet și corp JSON folosind variabilele
   acțiunilor. Nu lipi literalmente numele variabilelor drept valori.
6. Dacă răspunsul are `message`, afișează o notificare; altfel afișează `error`.
   Dacă dorești o reîncercare în aceeași scurtătură, reutilizează întreg corpul și
   CerereID. Nu genera un identificator nou după o întrerupere de rețea; verifică
   Tranzacții înainte de a începe o înregistrare nouă a aceleiași plăți.
7. În Configurări iPhone → Accesibilitate → Atingere → Atingere spate → Atingere
   triplă selectează scurtătura. Alternativ, adaug-o în widgetul Shortcuts.

Ghidul din aplicație are URL-urile absolute ale site-ului și câmpurile exacte.
Surse Apple: [cereri POST și JSON](https://support.apple.com/en-lamr/guide/shortcuts/apd58d46713f/ios),
[Back Tap](https://support.apple.com/en-ie/guide/shortcuts/apd897693606/ios).

## Contract API

Toate cererile se fac prin HTTPS pe domeniul propriu FinTrack, cu tokenul numai în
antetul Authorization, nu în URL. Nu se folosesc cookie-uri sau cheia Supabase în
scurtătură. Răspunsurile sunt JSON și `private, no-store`; nu este activat CORS public.

POST `/api/shortcut/options`:

```json
{"currency":"MDL","categories":{"Alimente":"uuid-categorie-personală"}}
```

POST `/api/shortcut/expenses`, Content-Type `application/json`:

```json
{
  "request_id": "20261111120000-123456",
  "amount": "25,50",
  "payment_method": "cash",
  "category_id": "UUID-ul real primit din categories",
  "description": "Cafea"
}
```

`amount` poate fi număr JSON sau text cu punct/virgulă, cel mult două zecimale,
strict pozitiv. `request_id` are 8–128 caractere alfanumerice, cratimă sau underscore.
`description` are maximum 160 caractere și poate lipsi. Restul câmpurilor sunt
obligatorii. Sunt respinse câmpurile suplimentare, inclusiv `user_id`, `kind` și
`account_id`; telefonul nu poate selecta un proprietar sau un cont arbitrar.

201 la prima salvare, 200 la retrimiterea identică; răspunsul include `message`,
`transaction_id`, `amount_minor`, `currency`, `payment_method`, `category`,
`occurred_on` și `replayed`. Data provine din fusul Europe/Chisinau al serverului.
Identificatorul tranzacției este derivat din dispozitiv și request_id. Retrimiterea
cu aceleași valori nu dublează suma, inclusiv după miezul nopții; cu alte valori
întoarce 409 și nu modifică tranzacția existentă.

Erori: 400 JSON invalid, 401 token absent/greșit/expirat/revocat, 409 conflict,
413 corp mai mare de 8 KiB, 415 tip greșit, 422 câmpuri invalide, 429 limită de
20 operații valide/minut/dispozitiv (Retry-After 60), 503 configurare/conexiune indisponibilă.
Nu se returnează mesaje SQL brute, tokenuri sau solduri. Modul demo nu generează
tokenuri și nu salvează nimic. Rate limiting-ul SQL limitează operațiile confirmate;
cererile care se termină cu excepție fac rollback inclusiv pentru contor.

## Securitate și migrație

`20261111095516_iphone_shortcut_devices.sql` adaugă un tabel cu RLS. Un utilizator
poate lista, crea și șterge doar propriile dispozitive; conturile sunt legate prin
chei străine compuse `(user_id, account_id)`. Clientul nu poate seta expirarea sau
contoarele. Tokenul conține 32 octeți aleatori generați pe server; în bază există
doar SHA-256. Expiră după 90 zile; ștergerea rândului îl revocă. Schimbarea parolei
sau deconectarea browserului nu revocă automat tokenurile dispozitivelor.

Autentificarea tokenului este implementată într-o funcție din schema neexpusă
`fintrack_private`, fără EXECUTE/USAGE pentru rolurile client. Două RPC-uri publice
sunt expuse intenționat: listează exclusiv categoriile de cheltuieli și adaugă o
cheltuială în conturile prestabilite. Aceste RPC-uri folosesc SECURITY DEFINER
pentru autentificarea prin token fără sesiune Supabase, cu search_path gol, nume
calificate și verificare explicită a tokenului, expirării, proprietarului și scope-ului.
Dacă există auth.uid(), acesta trebuie să coincidă cu proprietarul tokenului.
Nu oferă citirea tranzacțiilor, soldurilor sau alte operații financiare. Nu există
chei service_role în aplicație. Nu mutați funcția privată într-o schemă expusă.

Aplicarea în proiectul publicat se face numai după autorizarea proprietarului,
verificarea tabelelor/migrațiilor existente și testele locale. Migrația nu introduce
tranzacții demo. Testele de securitate se execută în PostgreSQL PGlite, iar testul
HTTP folosește un serviciu Auth local simulat și RPC-uri SQL reale.

## Starea proiectului FinTrack publicat

Migrația a fost aplicată în proiectul conectat la 11 noiembrie 2026 pentru
finalizarea integrării iPhone cerute. Nu o reaplicați acolo. Au fost verificate
RLS, accesul restrâns al rolului anon și revocarea accesului la schema privată.
Testele nu au creat tranzacții sau dispozitive demo în contul personal.

### Avertismentele intenționate ale linterului pentru RPC

Supabase semnalează cele două RPC-uri ca SECURITY DEFINER executabile de anon și
authenticated. Această expunere este intenționată pentru autentificarea limitată
prin token de dispozitiv, verificată înaintea oricărei operații. Niciun rol client
nu poate executa direct funcția privată. Schimbarea în SECURITY INVOKER sau revocarea
EXECUTE fără o altă arhitectură de autentificare ar dezactiva Shortcuts. Nu acordați
același model unor funcții care citesc solduri sau execută operații arbitrare.
Decizia este acoperită prin teste cu token invalid, token expirat/revocat, alt
utilizator, alt cont/categorie și parametri de scope modificați.
Referințe de review:
[anon SECURITY DEFINER](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable),
[authenticated SECURITY DEFINER](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable).
