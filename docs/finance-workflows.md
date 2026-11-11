# Fluxurile financiare complete — review local

Această versiune se pregătește local, fără push, publicare Netlify sau modificarea
proiectului Supabase public, conform instrucțiunii utilizatorului. Codul depinde de
migrația nouă `20261111111543_transfers_recurring_and_csv_import.sql`. Nu porniți
modul personal împotriva unei baze vechi fără migrația respectivă. Modul demo poate
porni fără chei. Testele folosesc exclusiv o bază locală embedded, separată.

## Venituri, cheltuieli și solduri

Panoul are butoane pentru venit/cheltuială, acțiuni pe carduri și acces la toate
modulele. Soldul inițial se setează în Setări; nu este un venit lunar. Tranzacția
are cont, categorie potrivită tipului, metodă, sumă și data efectivă. La eroare se
păstrează formularul. Datele viitoare nu intră încă în soldul zilei sau în buget.
Toate sumele registrului sunt în bani întregi MDL. Obiectivele EUR rămân separate.

## Transferuri

`/transfers`: adăugare, editare, ștergere cu confirmare și istoric. Necesită două
conturi proprii diferite. Aceeași sumă este debitată din sursă și creditată în
destinație. Nu există două înregistrări independente care să poată rămâne în stare
parțială: transferul este un singur rând. Soldurile sunt calculate din soldul
inițial, tranzacții și transferuri. Totalul conturilor, veniturile, cheltuielile,
cash flow și consumul bugetelor nu se umflă printr-un transfer.

Un transfer viitor se aplică la data sa. Editarea sau ștergerea recalculează ambele
conturi. Cheile străine compuse impun același proprietar pentru sursă/destinație.
Conturile folosite nu pot fi șterse înainte de rezolvarea transferurilor. Dacă o
mutare are comision, comisionul se înregistrează separat ca cheltuială. Această
versiune transferă numai MDL; nu inventează conversii EUR/MDL.

## Salariu, chirie și abonamente recurente

`/recurring`: reguli săptămânale, lunare sau anuale, cont/categorie/tip/sumă/metodă,
ancoră calendaristică, următoarea scadență și stare Activă/În pauză. Panoul arată
următoarele cinci reguli active. O regulă singură este planificare, nu bani deja
încasați sau plătiți.

Pentru o scadență ajunsă, utilizatorul introduce data efectivă și confirmă că nu a
înregistrat-o deja manual. RPC-ul `post_recurring` blochează rândul regulii și, în
aceeași tranzacție SQL, adaugă tranzacția, markerul unic `(rule_id,due_on)` și
avansează calendarul. Retrimiterea aceleiași scadențe returnează tranzacția existentă.
O regulă editată între afișare și confirmare este respinsă prin versiunea updated_at.
O regulă în pauză, o dată viitoare sau o referință străină nu poate fi materializată.
Nu există cron care să înregistreze plăți neconfirmate sau transferuri bancare.

Ziua ancorei se păstrează: 31 ianuarie → ultima zi din februarie → 31 martie;
29 februarie revine în anii bisecți. Pentru întârzieri, data tranzacției este data
reală introdusă, iar următoarea scadență rămâne pe calendarul planificat. Se confirmă
fiecare scadență restantă separat. La limita anului 2100 regula este oprită după
ultima înregistrare posibilă. Ștergerea regulii păstrează tranzacțiile istorice;
ștergerea unei tranzacții elimină markerul asociat, dar nu derulează calendarul
automat. Modificarea scadenței înapoi la una deja înregistrată returnează aceeași
înregistrare; utilizatorul trebuie să corecteze următoarea dată din editor.

## Import și export CSV

`/import`: șablon gol descărcabil, alegere de fișier și cont implicit, validare pe
server, previzualizare, erori pe rând și confirmare explicită. Limite: 512 KiB și
500 tranzacții, UTF-8, separator `;` sau `,`, câmpuri citate și ghilimele escaped.
Date: `AAAA-LL-ZZ` sau `ZZ.LL.AAAA`. Sume fără separatori de mii, maximum două
zecimale. Coloane: `data;descriere;tip;suma;categorie;metoda`; opțional `cont;moneda`.
Doar MDL este acceptat. Conturile și categoriile se rezolvă numai din datele
utilizatorului; numele lipsă sau ambigue trebuie corectate, nu sunt ghicite.

Sunt acceptate rapoartele CSV personale FinTrack, inclusiv cele mai vechi fără
coloana Cont. Sumele semnate determină tipul când acesta lipsește. Contul implicit
se folosește numai când rândul nu conține nume de cont. Exportul nou include contul
și păstrează protecția contra formulelor CSV. Prefixele de siguranță sunt eliminate
la reimport numai pentru formatul personal FinTrack recunoscut. Fișierele marcate
DEMO sunt respinse în importul personal. Fișierul nu este păstrat pe server.

RPC-ul `import_transactions` verifică sesiunea și inserează sub RLS. O eroare de
cont/categorie/sumă anulează integral importul. Fingerprint-ul SHA-256 este calculat
în SQL din conținutul canonic și ordinalul apariției identice în fișier. Astfel două
plăți identice în același fișier sunt păstrate, dar reimportul nu le dublează.
Ordinea rândurilor distincte și numele fișierului nu afectează deduplicarea.
Tranzacțiile introduse manual nu au fingerprint și nu sunt deduplicate automat;
previzualizarea trebuie verificată înainte de confirmare. Transferurile nu se
importă drept venit/cheltuială. Exportul tranzacțiilor nu este backup complet pentru
reguli, obiective, dispozitive sau transferuri; acestea au istoricul propriu în UI.

## Securitate și verificare

Cele trei tabele noi au RLS, granturi explicite și proprietar auth.uid(). Relațiile
către cont, categorie, regulă și tranzacție folosesc chei compuse cu user_id. RPC-urile
noi sunt SECURITY INVOKER, cu search_path gol și EXECUTE numai pentru authenticated.
Nu se folosesc user_metadata pentru autorizare sau chei service_role. Nu sunt
necesare dependențe noi. Tokenurile iPhone existente rămân limitate la cheltuieli;
nu primesc drepturi de transfer, import sau administrare a regulilor.

Testele acoperă calcule și date viitoare, RLS pentru doi utilizatori, ancorare în
luni scurte/ani bisecți, scadențe inactive și versiuni stale, reîncercări, importuri
atomice, duplicate, delimitatori/ghilimele și fluxul browser complet. Migrațiile
vechi nu au fost rescrise. Înainte de o publicare autorizată, aplicați numai noua
migrație în proiectul corect, apoi publicați codul după verificarea bazei.

## Limite externe

SMTP propriu și verificarea efectivă a gestului Back Tap necesită configurare în
serviciul extern/pe telefon. Aplicația nu citește conturi bancare, nu efectuează
plăți, nu execută trading și nu oferă conversii valutare automate. Acestea nu sunt
ascunse sub butoane nefuncționale și nu sunt prezentate ca funcții finalizate.
