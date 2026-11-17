# Widget de bugete pentru iPhone

FinTrack → iPhone și scurtături → Widget cu bugetele tale (`/iphone#widgets`).
Instalează Scriptable, copiază scriptul complet din pagină într-un script nou,
creează cheia widgetului și rulează scriptul o dată pentru conectare. Adaugă un
widget Scriptable pe ecranul principal și selectează scriptul FinTrack.

Procentul afișat este **bugetul rămas / bugetul alimentat × 100**, nu procentul
alocat din salariu. Sumele sunt în MDL. Dacă există un plan MDL, widgetul folosește
alocările și cheltuielile acelui plan, cu aceleași reguli de perioadă, monedă,
categorie și fallback ca `envelopeBalances`. În absența planului, folosește
bugetele lunii curente. Fondurile nealimentate nu primesc procente inventate.
Depășirile rămân negative; doar lungimea barei este limitată între 0% și 100%.

Categorii: configurează scriptul sau parametrul fiecărui widget cu nume separate
prin virgulă, în ordinea dorită. Diacriticele și literele mari nu sunt obligatorii.
Mic: 2 categorii; mediu: 3; mare: 6. Atingerea widgetului deschide `/budgets`.

Scriptul cere o reîmprospătare după 30 de minute; iOS decide momentul efectiv.
Ultima citire este datată. La eroare temporară, un snapshot local mai nou de 24h
poate fi afișat explicit cu „Offline”. Un răspuns 401/403 șterge snapshot-ul.
Datele vechi de peste 24h nu sunt prezentate drept bugete disponibile.

## Acces și verificări

- Cheie separată `ft_wg_` de 256 biți, păstrată în Scriptable Keychain.
- Serverul păstrează doar SHA-256; cheia expiră după 365 de zile și este revocabilă.
- `GET /api/widget/budgets` cere cheia în Authorization: Bearer, fără sesiune browser.
- Cheia nu poate înregistra tranzacții și nu citește conturi, persoane sau istoric.
- RLS izolează administrarea widgeturilor; RPC-ul tokenizat verifică expirarea,
  deținătorul sesiunii dacă există și o limită de 20 de cereri/minut.
- Răspunsuri `private, no-store`; cheia nu apare în URL sau fișierul public.

Testele verifică echivalența calculelor cu date PostgreSQL reale în PGlite,
izolarea, expirarea, revocarea, pairing-ul UI/API și comportamentul scriptului
într-un mediu Scriptable simulat. Execuția pe un iPhone fizic necesită instalarea
Scriptable de către utilizator; testele simulate nu constituie verificare pe iOS.
