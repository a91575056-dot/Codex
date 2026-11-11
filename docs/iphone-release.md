# Review: instalare iPhone și cheltuieli rapide

- Manifest standalone, pictograme și ghid `/install`; formular mobil `/quick-expense`.
- Salvare autentificată Cash/Card cu validare server, RLS și identificator idempotent.
- Metoda plății în tranzacții și CSV; datele istorice rămân nespecificate.
- Nume personal la înregistrare și în Setări; demo separat.
- Teste: bani/validare, preferințe izolate, profil, flux mobil Cash/Card/reîncercare,
  manifest/pictograme/demo și protecția rutelor. Supabase Auth este simulat în
  integrare; SQL/RLS rulează local în PGlite.
- Necesită internet. Fără sincronizare offline sau dialoguri native Shortcuts.
- Instalarea pe un iPhone fizic, confirmarea emailului și autentificarea pe domeniul
  public trebuie verificate manual. Migrațiile existente trebuie reconciliate cu
  istoricul proiectului înaintea unui `supabase db push`; nu se reaplică orbește.
