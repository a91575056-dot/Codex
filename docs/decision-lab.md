# Laborator de decizii — contribuție distinctivă FinTrack

Funcție implementată la `/decision-lab`; exemplu public fără conectare la
`/demo/decision-lab`. Nu revendicăm exclusivitate mondială sau brevetabilitate.
Contribuția propusă este integrarea, în română, a unui simulator explicabil bazat pe
istoricul personal, a analizei marginale pe categorii și a testului de rezistență
la scăderea venitului, într-un singur flux fără conectare bancară obligatorie.

## Problema rezolvată

O listă de cheltuieli spune unde s-au dus banii. Laboratorul arată cum ar putea
influența o schimbare aleasă de utilizator termenul unui obiectiv și dacă planul
rămâne fezabil la venituri mai mici. Ipotezele și contribuțiile categoriilor sunt vizibile.

## Intrări și proveniență

Media veniturilor și cheltuielilor provine din ultimele trei luni calendaristice
încheiate, în fusul Europe/Chisinau. Luna curentă și datele viitoare sunt excluse.
Lunile fără tranzacții contribuie cu zero; aplicația afișează câte luni au înregistrări
și avertizează că un istoric incomplet produce o simulare incompletă. Nu presupune
că lipsa înregistrărilor dovedește lipsa veniturilor sau a cheltuielilor.

Utilizatorul alege obiectivul, economiile deja dedicate, marja lunară nealocată,
reducerile procentuale pe categorii și scăderea ipotetică a venitului. Valorile
inițiale ale formularului sunt ipoteze, nu date deduse despre persoană.
Datele demo sunt agregate fictive separate de istoricul contului autentificat.

## Algoritm

Calcule în bani întregi, medii și reduceri rotunjite la cel mai apropiat ban:

- `V`: venit mediu lunar; `C`: cheltuieli medii; `M`: marja aleasă.
- `R`: suma reducerilor selectate pe categorii, plafonată la `C` pentru rotunjiri.
- `G = max(0, obiectiv − economii dedicate)`.
- Situație actuală: `P0 = V − C − M`.
- Plan: `P1 = P0 + R`.
- Stres: `P2 = P1 − round(V × procent_scădere / 100)`.
- Termen: `ceil(G / P)` luni dacă `P > 0`; obiectiv inaccesibil în acele condiții
  dacă `P <= 0`; zero luni dacă `G = 0`.
- Impact marginal: se elimină reducerea unei singure categorii și se recalculează
  termenul. Diferența față de plan arată contribuția acelei schimbări.

Impacturile marginale NU se adună: pragurile lunare și rotunjirile produc un rezultat
neliniar. Un impact de zero luni poate ascunde economii reale sub pragul unei luni.

## Exemplu reproductibil

Venit 7.000 RON, cheltuieli 5.600 RON, marjă 200 RON, obiectiv 10.000 RON,
economii dedicate 1.000 RON. Contribuție actuală: 1.200 RON → 8 luni.
Reducerea cu 50% a categoriei Timp liber (900 RON/lună) adaugă 450 RON:
planul ajunge la 1.650 RON/lună → 6 luni. Impact marginal: 2 luni.
Cu venit redus permanent cu 20%, contribuția devine 250 RON → 36 luni.
Aceste rezultate sunt verificate automat în testele unitare și în browser.

## Limite

Model determinist de scenarii, nu predicție statistică și nu identificare cauzală.
Presupune că reducerile sunt realizabile și independente, că veniturile și
cheltuielile rămân constante și că surplusul este alocat la sfârșitul fiecărei luni.
Nu include inflație, randamente, dobânzi, incertitudine sau modificări ale prețurilor.
Nu consideră automat o categorie esențială sau dispensabilă: utilizatorul decide.
Nu modifică tranzacțiile, nu efectuează plăți și nu salvează ipotezele pe server.
Exportul JSON local include agregatele, ipotezele, formulele descriptive și rezultatele;
nu include emailul sau lista tranzacțiilor individuale. Închiderea paginii pierde scenariul.

## Evaluare propusă pentru licență — încă neefectuată

Comparați îndeplinirea acelorași sarcini folosind dashboardul clasic și laboratorul:
identificarea unei reduceri suficiente pentru un obiectiv, explicarea calculului,
recunoașterea unui plan care devine imposibil la scăderea venitului. Măsurați rata
răspunsurilor corecte, timpul și înțelegerea ipotezelor. Alternați ordinea interfețelor
între participanți. Rezultatele evaluării vor susține utilitatea funcției; nu demonstrează
că alte aplicații nu au funcții similare.
