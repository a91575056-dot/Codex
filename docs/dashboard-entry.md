# Review local: acces la venituri și funcțiile aplicației

Problema: panoul afișa sold, venituri, cheltuieli și portofoliu, dar oferea doar un
buton de cheltuială rapidă. Un utilizator cu sold inițial 10.000 MDL și fără
tranzacții vedea venituri zero fără acces clar pentru înregistrarea salariului.

Schimbări:

- Butoane vizibile Adaugă venit, Adaugă cheltuială și Toate tranzacțiile.
- Acțiuni pe cardurile cu sume și opt scurtături spre funcțiile existente.
- Formularul preselectează Venit din `?create=income`, independent de filtrele
  istoricului, și selectează numai categoriile potrivite tipului.
- Explicație pentru sold inițial versus venit lunar, stări goale cu acțiune utilă.
- Formular controlat: la eroare se păstrează datele; la succes se golesc suma,
  descrierea și categoria, păstrând tipul, contul, metoda și data.
- PWA pornește panoul complet. Cheltuiala rapidă și venitul au scurtături dedicate.
- Datele personale și calculele rămân în MDL, cu economii EUR separate.

Verificare: utilizator fictiv separat în fixture-ul local, sold inițial 10.000 MDL,
venituri inițiale zero, două venituri de 2.500 și 500 MDL, venituri lunare 3.000 MDL
și sold 13.000 MDL. Verificare categorie după tip, acces la toate funcțiile și
încadrare mobilă. Nu există modificări de schemă și nu se adaugă date în Supabase
public. Acest update se pregătește local, fără push sau publicare, la cererea
utilizatorului.
