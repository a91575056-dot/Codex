# Conturi EUR și datorii de primit

Actualizare locală, fără push, deploy sau modificări ale bazei publice. Necesită
migrația `20261111134530_euro_accounts_and_receivables.sql`, după migrațiile
anterioare, înainte de publicarea codului.

## Monede

Conturile noi pot fi create în MDL sau EUR, cu sold inițial în moneda aleasă.
Moneda unui cont existent este imuabilă în SQL; soldurile și tranzacțiile vechi
nu sunt redenumite sau convertite. Tranzacțiile moștenesc moneda contului.
Formularul normal și cel rapid afișează moneda contului selectat, iar registrul,
ultimele tranzacții și soldurile folosesc unitatea corectă. Mutarea unei tranzacții
existente la un cont de altă monedă este blocată în SQL.

Panoul afișează indicatorii MDL și un sumar EUR separat (sold, venituri și
cheltuieli lunare). Nu există total numeric MDL+EUR sau curs de schimb fictiv.
Rapoartele permit alegerea MDL/EUR, inclusiv CSV și tipărire. CSV în EUR este
etichetat în antet; importul CSV rămâne explicit MDL și respinge conturile EUR.
Bugetele, analizele primare, simulările și portofoliul rămân MDL; filtrele de cont
împiedică includerea sumelor EUR în calculele lor. Obiectivele EUR rămân separate.

Transferurile necesită două conturi proprii în aceeași monedă (MDL sau EUR),
verificat atât în UI/server, cât și prin trigger SQL invoker. Nu există conversie
MDL→EUR. Recurențele folosesc moneda contului asociat. Scurtăturile native cu
Bearer păstrează conturile MDL asociate telefonului; această actualizare nu le
schimbă implicit permisiunile sau moneda.

## Datorii

`/debts`, disponibil din meniu și panou: persoană, sumă pozitivă exactă în bani,
monedă MDL/EUR, dată și notă. Se pot adăuga și edita datorii active. Totalurile de
primit se calculează separat pe monedă și exclud înregistrările achitate.

După confirmarea primirii întregii sume, „Marchează achitat” setează settled_on.
Înregistrarea dispare din lista activă și rămâne în „Istoric achitate”. Poate fi
restabilită dacă marcarea a fost greșită, sau ștearsă cu confirmare. Nu există
rambursări parțiale în acest flux. Crearea folosește UUID-ul cererii pentru a
împiedica duplicarea accidentală la retrimitere.

Aceasta este o evidență a sumelor de primit, separată de conturi: adăugarea și
achitarea nu generează automat venituri/cheltuieli, pentru a nu dubla operații
înregistrate separat. UI-ul explică această regulă înainte de adăugare.

Tabelul receivables are RLS pe proprietar, granturi explicite numai pentru
utilizatori autentificați, validare SQL a monedei/sumei/datei și index pentru lista
proprietarului. Toate acțiunile server validează sesiunea și user_id. Testele
folosesc numai PGlite și conturi fictive locale, nu datele contului personal.

## Categorii

Numele lungi și etichetele Venit/Cheltuială trec pe rânduri separate în carduri;
etichetele din tabele se pot împărți pe linii. Filtrul de tranzacții include tipul
în numele opțiunii, astfel încât „Altele · Venit” și „Altele · Cheltuială” să nu se
confunde. Nu se șterg sau reunesc automat categorii existente.

Alocările de pe panou nu au fost modificate, conform ultimei instrucțiuni.
