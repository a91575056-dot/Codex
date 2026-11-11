# Împărțirea automată a veniturilor

Implementare locală, nepublicată. Necesită migrația
`20261111145537_automatic_income_envelopes.sql`, după celelalte migrații locale.
Nu se aplică automat schimbări bazei publice.

## Reguli de produs

Utilizatorul activează o singură dată planul pentru MDL și, independent, pentru
EUR din Bugete. Configurația inițială: Alimente 25%, Locuință 25%, Transport 10%,
Distracții 10%, Investiții 15%, Fond de urgență 10%, Alte cheltuieli 5%.
Categoriile de cheltuieli lipsă se creează; cele existente sunt reutilizate.
Procentele pot fi modificate, cu două zecimale, dar suma trebuie să fie 100%.

Toate veniturile noi în moneda planului se împart: salariu, bonus, alte încasări.
Formularul normal, scurtătura nativă, confirmarea unei recurențe și importul CSV
folosesc același trigger de bază de date. Nu este nevoie de browser deschis, cron
sau o automatizare suplimentară pe telefon. Aceasta nu detectează încasări din
bancă: întâi trebuie înregistrat venitul în FinTrack.

Transferurile, soldurile inițiale, achitarea datoriilor și contribuțiile la
obiective nu sunt venituri și nu generează alocări. Veniturile existente înainte
activării, cele datate înaintea activării și încasările introduse în pauză nu se
redistribuie la activare/reluare sau la simpla lor editare ulterioară.

Banii necheltuiți se reportează fără reset la început de lună. La un venit nou se
adaugă procentul din noua sumă, fără a redistribui restul din bugete. Exemplu:
salariu 10.000 → alimente 2.500; cheltuială 500 → disponibil 2.000; bonus 2.000 →
încă 500 la alimente, deci disponibil 2.500. Un venit mai mic adaugă proporțional
mai puțini bani. O depășire produce un disponibil negativ; următoarea alocare
acoperă întâi acel deficit. Nu se iau bani automat din alt buget.

Cheltuielile cu categorie asociată scad din bugetul respectiv, numai în aceeași
monedă și după activare. Cele fără regulă distinctă scad din Alte cheltuieli,
fără a fi ignorate. Cheltuielile viitoare nu se scad încă. Veniturile cu dată
viitoare au alocări salvate atomic, dar sunt excluse din disponibil până la data
încasării. Aceste date sunt calculate la citire; nu depind de rularea unui cron.

Investițiile și fondul de urgență sunt rezerve de planificare în soldul existent,
nu active noi și nu transferuri bancare. Nu se cumpără investiții și nu crește
artificial valoarea portofoliului. O cheltuială în categoria Investiții sau Fond
de urgență consumă rezerva corespunzătoare. Rezerva de urgență nu are un plafon
implicit: utilizatorul poate reduce procentul când consideră fondul suficient.

Limitele lunare manuale MDL rămân un instrument separat și sunt etichetate ca
atare; nu se adună cu alocările și nu se suprascriu. Panoul afișează acum soldurile
bugetelor automate, distincte de repartizarea activelor din portofoliu.

## Consistență și corecturi

`envelope_plans`: un plan per proprietar/monedă, momentul activării, stare activă.
`envelope_rules`: categorie de cheltuieli proprie, procent în basis points, ordine
stabilă și o singură regulă fallback. Identitatea și categoria regulii nu pot fi
modificate prin granturile clientului, astfel încât istoricul să nu fie reclasat.
`envelope_funding`: o înregistrare per venit/regulă cu procentul capturat și suma
exactă în bani. Toate sumele unui venit totalizează suma venitului.

Rotunjire prin metoda celui mai mare rest: întâi partea întreagă, apoi banii
rămași se distribuie după fracțiune și ordinea stabilă. Un venit de 100,01 MDL nu
pierde și nu creează bani. Procentele vechi rămân capturate pe fiecare încasare;
editarea procentelor planului afectează doar încasările viitoare. Schimbarea sumei
unui venit deja alocat recalculează numai alocările lui, cu procentele originale.
Ștergerea venitului elimină alocările prin cascade. Schimbarea tipului în
cheltuială retrage alocările; schimbarea datei în viitor le scoate temporar din
soldul disponibil. Corecturile pot produce sold negativ dacă banii erau cheltuiți.

Retrimiterea aceleiași cheltuieli/încasări native nu dublează alocările. Triggerul
rulează în aceeași tranzacție SQL cu venitul; o eroare anulează ambele operații.
Configurarea și alimentarea blochează planul pentru o imagine coerentă a regulilor.
Verificarea sumei procentelor este și în SQL, prin constraint triggers deferred,
nu doar în interfață.

## Securitate și validare

Toate cele trei tabele au RLS și filtre de proprietar. Aplicația autentificată
poate citi alocările, dar nu le poate crea, modifica sau șterge direct. Planurile
și regulile au granturi pe coloanele necesare, fără schimbarea datei de activare
sau a identității regulilor. RPC-urile de configurare sunt SECURITY INVOKER,
EXECUTE doar authenticated, cu auth.uid(), validare de proprietar și sumă 100%.

Triggerul de alimentare și cel de constrângere sunt SECURITY DEFINER numai în
schema privată neexpusă, search_path gol și EXECUTE revocat clientului. Triggerul
validează și auth.uid() dacă există; apelurile prin token rămân limitate la
utilizatorul verificat de RPC-ul dispozitivului. Nu este necesară cheie service
role sau o nouă permisiune pentru tokenul telefonului.

Testele SQL locale acoperă procente, bani exacți, snapshoturi, corecturi, ștergere,
pauză/reluare, MDL/EUR, RLS, granturi și idempotenta scurtăturii. Testele browser
verifică salariu + cheltuială + bonus, editarea procentelor fără redistribuire,
pauza și afișarea pe panoul mobil. Datele reale nu sunt folosite.
