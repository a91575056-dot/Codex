# FinTrack pentru iPhone și iPad

Proiect iOS 17+ cu aplicație SwiftUI și extensie WidgetKit. Contul, tranzacțiile,
bugetele, datoriile și calculele existente rămân pe serviciul FinTrack publicat.

- **FinTrack:** interfața existentă în WKWebView, cu sesiune persistentă, navigare
  înapoi, erori de conexiune și descărcare CSV în meniul iOS de partajare.
- **Bugete:** ecran SwiftUI cu date MDL reale, procente rămase, depășiri și
  conectare prin cheia separată de citire `ft_wg_`. Cheia aplicației este în Keychain.
- **Widget:** mic/mediu/mare, categorii selectate, acces doar la rezumate de buget.
  iOS decide când actualizează widgetul; se solicită o actualizare după 30 minute.
  Configurarea widgetului păstrează cheia de citire în sistemul iOS, separat de
  Keychain-ul aplicației. Nu introduce parola contului în configurarea widgetului.
  Nu sunt necesare App Groups, push notifications sau servicii de tranzacționare.

Aplicația este un client hibrid: fluxurile complete existente folosesc WebKit,
iar ecranul de bugete și widgetul folosesc interfață nativă. Nu este o rescriere
completă a tuturor paginilor în SwiftUI. Accesul la internet rămâne necesar.

## Compilare și descărcare

Workflow-ul **FinTrack iOS** rulează pe macOS: testează FinTrackCore, generează
proiectul cu XcodeGen, compilează aplicația și widgetul pentru dispozitive și
încarcă artefactul **FinTrack-iOS-unsigned**. În GitHub → Actions → FinTrack iOS
→ ultima rulare reușită → Artifacts se descarcă arhiva care conține:

- `FinTrack-unsigned.ipa`
- `FinTrack-unsigned.ipa.sha256`

Pentru compilare locală pe Mac cu Xcode și XcodeGen:

```sh
swift test --package-path native/FinTrackCore
native/scripts/build-ios.sh
```

Rezultatul este în `native/dist/`. Pentru Xcode, deschide proiectul generat
`native/ios/FinTrack.xcodeproj`. Alege echipa de semnare pentru aplicație și
extensia widgetului și schimbă identificatorii dacă sunt deja înregistrați.

## Instalare pe dispozitiv

**IPA-ul rezultat este nesemnat și nu poate fi instalat direct din Safari.**
Nu este un link OTA semnat și nu include certificat sau profil de distribuție.
Trebuie semnate atât aplicația, cât și extensia cu o metodă validă, de exemplu
un flux de instalare personală cu Windows. Profilul și drepturile de instalare
sunt cele oferite de contul/certificatul folosit; proiectul nu le poate prelungi.
Nu sunt cerute parola Apple sau chei de semnare în cod, în workflow ori în chat.
Nu sunt activate programul Enterprise sau certificate ale altor organizații.

Cu un cont Apple gratuit, semnarea personală are în mod normal valabilitate
limitată la 7 zile. Compilarea fără semnare nu elimină această cerință.

## Conectare la bugete și widget

1. Deschide aplicația și autentifică-te în FinTrack cu contul existent.
2. Creează o cheie în iPhone și scurtături → Widget cu bugetele tale.
3. În tabul nativ Bugete, lipește cheia și apasă Conectează.
4. Adaugă widgetul FinTrack din meniul iOS, apoi Editează widgetul și lipește
   cheia lui de citire. Numele categoriilor sunt separate prin virgulă.

Cheia `ft_wg_` nu poate crea cheltuieli sau venituri. Revocarea din FinTrack îi
oprește accesul. La erori de citire, ecranul și widgetul afișează mesajul erorii,
fără a prezenta valori vechi drept sume actuale. Ultima actualizare reușită este
vizibilă. Widgetul nu include date financiare inventate pentru previzualizare.
