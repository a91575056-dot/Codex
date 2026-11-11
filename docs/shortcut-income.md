# O scurtătură pentru venituri și cheltuieli

Implementare locală, nepublicată. Necesită migrația
`20261111133351_shortcut_income_opt_in.sql` înainte de publicarea codului.
Nu se aplică automat migrații în proiectul public.

Scurtăturile existente folosesc în continuare `/api/shortcut/options` și
`/api/shortcut/expenses`, fără modificări de contract sau permisiuni implicite.
Noile tokenuri și cele existente au `allow_income=false` inițial.
Proprietarul activează veniturile din `/iphone`, la telefonul ales; nu este nevoie
să copieze din nou tokenul. Activarea adaugă atomic categoriile de venit lipsă
Salariu, Bonus și Alte venituri, fără tranzacții fictive sau modificarea
categoriilor existente. Dezactivarea păstrează istoricul și accesul la cheltuieli.

Noua scurtătură folosește POST `/api/shortcut/finance-options`, cu același Bearer.
Răspunsul are `categories` (cheltuieli), `income_categories` (venituri) și
`income_enabled`. Categoriile de venit sunt ascunse dacă permisiunea este oprită.
După meniul Cheltuială/Venit, se alege dicționarul potrivit; rezultatul selecției
directe din dicționar este UUID-ul categoriei. Urmează suma, cash/card, detalii și
CerereID, apoi POST `/api/shortcut/transactions` cu cele cinci câmpuri existente și
`kind` obligatoriu (`expense` sau `income`). Nicio sumă nu se înregistrează doar
pentru că utilizatorul a ales o ramură a meniului.

Veniturile intră în contul Cash sau Card deja asociat telefonului; nu se acceptă
account_id, user_id, date istorice, transferuri sau alte câmpuri arbitrare.
Data este ziua curentă în Europe/Chisinau. Suma este pozitivă, în bani MDL;
tipul determină efectul asupra soldului. Categoria trebuie să fie a proprietarului
și să aibă tipul corect. UI-ul nativ Apple se configurează manual: ghidul din
`/iphone` explică modificarea scurtăturii existente. Nu este furnizat un fișier
.shortcut semnat. La succes se poate încheia fără nimic afișat; erorile trebuie
extrase din cheia `error` și afișate ca alertă, în loc de Privire rapidă cu JSON.

## Permisiuni și idempotentă

`configure_shortcut_income` este SECURITY INVOKER, EXECUTE doar authenticated,
cu auth.uid(), filtru de proprietar, RLS și UPDATE limitat la coloana allow_income.
Clientul nu poate modifica expirarea, conturile, hashul sau contoarele de rată.

`shortcut_income` și `shortcut_finance_options` urmează modelul existent al
RPC-urilor anonime, autorizate prin token: SECURITY DEFINER cu search_path gol,
validare centrală privată, expirare, revocare, verificare auth.uid() dacă există și
aceeași limită de 20 operații/minut. Aceste două intrări publice sunt intenționat
apelabile fără cookie, deoarece Shortcuts folosește tokenul dispozitivului.
Avertismentul advisor pentru EXECUTE pe definer este așteptat; nu se oferă citirea
soldurilor/istoricului sau drepturi de administrare prin token. Nu există service
role în aplicație.

UUID-ul tranzacției se derivă din același device + request_id, inclusiv între
endpointurile vechi/noi și între venit/cheltuială. Retrimiterea identică revine la
aceeași înregistrare; reutilizarea cu alt conținut/tip produce conflict, nu două
tranzacții. Rularea din nou de la început generează alt request_id: înainte de
repetare după o eroare de rețea se verifică istoricul.

Testele SQL locale verifică opt-in/opt-out, RLS între proprietari, categorii și
tipuri, exactitatea sumelor, retrimitere/conflict și revocare. Testul browser/API
verifică activarea pe telefon, salvarea venitului fără cookie-uri, apariția în
registru, compatibilitatea cheltuielilor și dezactivarea accesului la venituri.
