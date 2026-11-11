# Obiective, contribuții și scenarii salvate

## Flux implementat

1. `/goals`: creați un obiectiv cu nume, sumă țintă în MDL și termen dorit.
2. Înregistrați contribuții cu sumă, dată (până astăzi) și notă opțională.
3. Progresul se calculează din contribuțiile acelui obiectiv. Depășirea țintei este
   permisă; bara de progres se oprește la 100%, iar suma reală rămâne afișată.
4. „Simulează acest obiectiv” deschide `/decision-lab?goal=<id>`. Suma țintă și
   economiile dedicate provin din obiectiv și sunt doar pentru citire în laborator.
5. Selectați reducerile și salvați un scenariu numit. Sunt necesare tranzacții în
   ultimele trei luni încheiate. Un istoric gol nu este înlocuit cu date fictive.
6. Revenind în Obiective, comparați economiile înregistrate cu planul salvat.
   Ipotezele, perioada istorică și reducerile pe categorii pot fi inspectate.

Înregistrările pot fi șterse cu confirmare. Ștergerea unui obiectiv șterge în cascadă
contribuțiile și scenariile lui. Corectarea unei contribuții se face prin ștergere
și reînregistrare. Scenariile sunt imuabile; un plan modificat este un scenariu nou.

## Ce reprezintă contribuțiile

Sunt evidențe manuale ale economiilor dedicate, NU transferuri între conturi și NU
tranzacții bancare. Nu se adaugă la venituri și nu se scad din soldul dashboardului.
Utilizatorul trebuie să evite alocarea acelorași economii la mai multe obiective.
Nu există încă reconciliere automată cu conturi sau retrageri; o corectare poate fi
făcută prin ștergerea unei înregistrări și adăugarea sumei corecte.

„Necesar orientativ/lună” împarte suma rămasă la numărul lunilor calendaristice
rămase, inclusiv luna curentă și luna termenului. Dacă termenul a trecut, este
semnalat explicit și nu se afișează o contribuție lunară înșelătoare.

## Compararea cu planul

La salvare, serverul revalidează utilizatorul, încarcă obiectivul, contribuțiile și
istoricul și recalculează scenariul. Nu acceptă rezultate sau agregate financiare
calculate de browser. Dacă ținta sau contribuțiile diferă de cele vizibile în
formular, cere reîncărcarea paginii. Ipotezele se pot schimba dacă istoricul a fost
modificat între afișare și salvare; snapshot-ul păstrează calculul autoritativ de la salvare.

Se salvează ținta originală, economiile inițiale, surplusul lunar pozitiv (zero dacă
planul nu are surplus), data salvării și snapshot-ul versionat al ipotezelor.

`plan_până_astăzi = min(țintă_originală, economii_inițiale + contribuție_lunară × luni_încheiate)`

O lună se încheie la aniversarea lunară a salvării. Pentru salvări în ziua 29–31,
ziua este limitată la ultima zi disponibilă a lunii (de exemplu 31 ianuarie →
28/29 februarie). Nu se pretinde progres lunar înainte de încheierea primului interval.

`diferență = min(economii_înregistrate_astăzi, țintă_originală) − plan_până_astăzi`

Modificarea ulterioară a obiectivului NU rescrie snapshot-ul. Interfața semnalează
schimbarea țintei și folosește ținta originală pentru comparație. Contribuțiile
corectate sau înregistrate retroactiv schimbă progresul real; comparația nu este
un audit bancar și nu dovedește că o reducere de cheltuieli a cauzat economisirea.

Exemplu demo fixat la 11 noiembrie 2026: plan salvat la 11 august cu 1.000 MDL
inițiali și 1.650 MDL/lună. După trei intervale, planul cere 5.950 MDL. Evidența
fictivă arată 5.500 MDL: diferență −450 MDL.

## Securitate și migrație

Fișier: `supabase/migrations/20261111074234_savings_goals.sql`.
Tabele: `savings_goals`, `goal_contributions`, `goal_scenarios`. Fiecare are RLS și
politici pentru proprietar. Cheile externe includ `user_id`, împiedicând asocierile
la obiectivele altor utilizatori. Accesul anonim este revocat. Rolul authenticated
nu are UPDATE pe scenarii, pentru a păstra snapshot-urile originale.

Migrația a fost aplicată proiectului Supabase FinTrack conectat și verificată.
Pentru ALT proiect, aplicați după migrația financiară inițială, o singură dată.
Nu reaplicați SQL-ul într-un proiect care are deja tabelele. Aplicarea prin MCP
poate folosi alt timestamp în istoricul Supabase decât numele fișierului local;
aliniați istoricul înainte de folosirea `supabase db push` pe acel proiect.

## Verificări și limite

Testele unitare acoperă calculele, lunile scurte, termenele depășite, contribuțiile
viitoare, validarea și snapshot-urile invalide. PostgreSQL embedded verifică RLS
cu doi utilizatori, refuzul asocierilor străine, imuabilitatea și ștergerea în cascadă.
Testele browser verifică demonstrația, legătura cu laboratorul, câmpurile preluate,
lipsa salvării în demo, dimensiunea mobilă și protejarea rutelor.
Verificarea completă a formularelor cu o sesiune Supabase reală rămâne de efectuat
cu un utilizator înregistrat și confirmat. Nu au fost create conturi de test reale.
