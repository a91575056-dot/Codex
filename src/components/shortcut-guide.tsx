"use client";
import { useState, useSyncExternalStore } from "react";
import { Button } from "./ui/button";
const subscribe = () => () => {};
export function ShortcutGuide({
  token,
  dismiss,
}: {
  token?: string;
  dismiss?: () => void;
}) {
  const origin = useSyncExternalStore(
    subscribe,
    () => window.location.origin,
    () => "",
  );
  const [status, setStatus] = useState("");
  async function copy(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setStatus("Copiat. Lipește în scurtătura ta privată.");
    } catch {
      setStatus(
        "Copierea automată nu este disponibilă. Selectează și copiază manual textul.",
      );
    }
  }
  return (
    <div className="form-grid shortcut-guide">
      {token && (
        <div className="demo-banner">
          <p>
            <strong>
              Token privat pentru acest telefon — afișat o singură dată
            </strong>
          </p>
          <p>
            Permite inițial doar cheltuieli și categoriile lor. Veniturile se
            activează separat pentru telefon din această pagină. Expiră după 90
            de zile. Nu îl publica și nu distribui scurtătura cu tokenul inclus.
          </p>
          <label>
            Tokenul telefonului
            <input
              aria-label="Tokenul telefonului"
              readOnly
              type="password"
              value={token}
              onFocus={(e) => e.target.select()}
            />
          </label>
          <Button type="button" onClick={() => copy(token)}>
            Copiază tokenul
          </Button>
          <Button type="button" variant="outline" onClick={dismiss}>
            Am copiat — ascunde tokenul
          </Button>
        </div>
      )}
      <section className="demo-banner">
        <h3>Împrumut dat sau primit din aceeași scurtătură</h3>
        <p>
          Activează separat împrumuturile pentru telefon. Șablonul complet
          adaugă „Împrumut dat” la Cheltuială și „Împrumut primit” la Venit,
          apoi cere persoana, suma în MDL și Cash/Card. Soldul se actualizează,
          iar datoria apare în registrul împrumuturilor; principalul nu intră în
          bugete sau în salariu.
        </p>
        <p>
          Rambursările integrale se confirmă din pagina Datorii și împrumuturi,
          cu alegerea contului.
        </p>
        <a
          className="text-link"
          href="/shortcuts/fintrack-mdl.cherri.txt"
          download
        >
          Descarcă tot codul pentru Cherri
        </a>
        <p>
          Acesta este cod sursă, fără token. Necesită compilare și semnare
          înainte de import în Scurtături. Introdu cheia numai la import pe
          telefon, nu în editorul web.
        </p>
      </section>
      <section className="demo-banner">
        <h3>O singură scurtătură: Cheltuială sau Venit</h3>
        <p>
          Poți modifica scurtătura FinTrack existentă. Întâi activează
          veniturile la telefonul tău, în lista de mai jos. Activarea adaugă
          doar categoriile lipsă Salariu, Bonus și Alte venituri; nu
          înregistrează bani.
        </p>
        <ol className="install-steps">
          <li>
            Păstrează primul <strong>Text</strong> cu tokenul. În primul bloc{" "}
            <strong>Obține conținutul de la</strong>, schimbă doar adresa în{" "}
            <code>{origin}/api/shortcut/finance-options</code>. Păstrează POST
            și Authorization: Bearer urmat de spațiu și token.
          </li>
          <li>
            După <strong>Obține dicționarul din intrare</strong>, salvează
            dicționarul în variabila <code>Opțiuni</code>. Adaugă{" "}
            <strong>Alege din meniu</strong>, cu întrebarea „Ce înregistrezi?”
            și opțiunile <strong>Cheltuială</strong> și <strong>Venit</strong>.
          </li>
          <li>
            În ramura Cheltuială: Text <code>expense</code> → Configurează
            variabila <code>Tip</code>; apoi obține valoarea cheii{" "}
            <code>categories</code> din <code>Opțiuni</code> → Configurează
            variabila <code>Categorii</code>.
          </li>
          <li>
            În ramura Venit: Text <code>income</code> → Configurează aceeași
            variabilă <code>Tip</code>; apoi obține cheia{" "}
            <code>income_categories</code> din <code>Opțiuni</code> →
            Configurează aceeași variabilă <code>Categorii</code>. Dacă
            dicționarul nu are valori, afișează „Activează veniturile pentru
            telefon în FinTrack” și oprește scurtătura.
          </li>
          <li>
            După <strong>Sfârșit meniu</strong>, folosește{" "}
            <strong>Alege din listă</strong> cu dicționarul{" "}
            <code>Categorii</code>. Alegerea directă din dicționar afișează
            numele și returnează codul categoriei; salvează rezultatul ca{" "}
            <code>CategorieID</code>. Nu aplica „Toate cheile” rezultatului
            selectat.
          </li>
          <li>
            Păstrează pașii existenți pentru sumă, cash/card, detalii și
            CerereID. Schimbă întrebările în „Ce sumă în MDL?” și „Cash sau
            card?”. Pentru un venit, card înseamnă încasare în contul ales
            pentru card; cash înseamnă încasare în contul cash.
          </li>
          <li>
            În ultimul bloc <strong>Obține conținutul de la</strong>, schimbă
            adresa în <code>{origin}/api/shortcut/transactions</code>. Păstrează
            POST, Authorization și cele cinci câmpuri JSON existente. Adaugă al
            șaselea câmp, tip Text: <code>kind</code>, cu variabila{" "}
            <code>Tip</code> (valoarea exactă expense sau income).
          </li>
          <li>
            Șterge ultima <strong>Privire rapidă</strong>. Din rezultatul
            ultimului bloc URL obține dicționarul, apoi cheia <code>error</code>
            . <strong>Dacă</strong> error are o valoare, afișeaz-o prin{" "}
            <strong>Afișează alertă</strong>. Altfel încheie scurtătura, fără
            afișarea JSON-ului. Opțional poți afișa cheia <code>message</code>{" "}
            printr-o notificare.
          </li>
        </ol>
        <p>
          La o eroare de conexiune verifică Tranzacții înainte de o nouă rulare.
          O reîncercare trebuie să folosească același CerereID și același
          conținut. Back Tap și automatizarea NFC pot continua să pornească
          aceeași scurtătură FinTrack.
        </p>
      </section>
      <p>
        Configurarea se face o singură dată în aplicația Apple{" "}
        <strong>Scurtături / Shortcuts</strong>. După aceea, suma și selecțiile
        apar în dialogurile iPhone-ului, fără să deschidă browserul. Necesită
        internet și un iPhone compatibil cu Atingere spate.
      </p>
      <h3>Varianta simplă existentă: doar cheltuieli</h3>
      <ol className="install-steps">
        <li>
          Creează scurtătura <strong>FinTrack — Cheltuială</strong>. Adaugă o
          acțiune <strong>Text</strong> cu tokenul privat, apoi{" "}
          <strong>Setează variabila</strong> cu numele <code>Token</code>.
        </li>
        <li>
          Adaugă{" "}
          <strong>Obțineți conținutul URL-ului / Get Contents of URL</strong> cu
          adresa pentru categorii de mai jos, metoda <strong>POST</strong>,
          antetul <code>Authorization</code> cu valoarea{" "}
          <code>Bearer [Token]</code>. Înlocuiește [Token] cu variabila, fără
          paranteze. Salvează răspunsul ca variabila <code>Opțiuni</code>.
        </li>
        <li>
          Adaugă întâi{" "}
          <strong>
            Obține dicționarul din intrare / Get Dictionary from Input
          </strong>{" "}
          cu rezultatul cererii URL. Apoi folosește{" "}
          <strong>Obține valoarea din dicționar</strong> pentru cheia{" "}
          <code>categories</code> din dicționarul obținut. Tastează cheia
          manual, fără spații sau Enter. Salvează dicționarul ca{" "}
          <code>Categorii</code>. Obține{" "}
          <strong>Toate cheile / All Keys</strong> și folosește{" "}
          <strong>Alege din listă</strong> pentru întrebarea „Pe ce ai
          cheltuit?”. Obține valoarea cheii selectate din Categorii și salveaz-o
          ca <code>CategorieID</code>.
        </li>
        <li>
          Adaugă <strong>Solicită introducere / Ask for Input</strong>, tip{" "}
          <strong>Număr</strong>, întrebarea „Cât ai cheltuit în MDL?”. Salvează
          răspunsul ca <code>Sumă</code>. Adaugă o <strong>Listă</strong> cu
          elementele <code>cash</code> și <code>card</code>, apoi{" "}
          <strong>Alege din listă</strong> cu întrebarea „Cum ai plătit?”.
          Salvează rezultatul ca <code>Metodă</code>.
        </li>
        <li>
          Adaugă <strong>Solicită introducere</strong>, tip Text, întrebarea
          „Detalii (opțional)”. Salvează ca <code>Detalii</code>. Creează un
          identificator prin <strong>Data curentă → Formatați data</strong> cu
          format personalizat <code>yyyyMMddHHmmss</code>, apoi{" "}
          <strong>Număr aleator</strong> între 100000 și 999999. Într-o acțiune
          Text combină <code>[DataFormatată]-[NumărAleator]</code> și salvează
          ca <code>CerereID</code>.
        </li>
        <li>
          Adaugă <strong>Obțineți conținutul URL-ului</strong> cu adresa de
          salvare de mai jos, metoda <strong>POST</strong>, antetul{" "}
          <code>Authorization: Bearer [Token]</code> și corpul cererii{" "}
          <strong>JSON</strong>. Adaugă cele cinci câmpuri din tabel folosind
          variabilele, nu textul dintre paranteze.
        </li>
        <li>
          Din răspuns obține cheia <code>message</code>. Dacă există, afișeaz-o
          prin <strong>Afișează notificare</strong>. Altfel afișează cheia{" "}
          <code>error</code> cu <strong>Afișează alertă</strong>. La eroare de
          rețea, verifică Tranzacții înainte să rulezi o cheltuială nouă. Dacă
          adaugi o reîncercare în scurtătură, reutilizează corpul JSON și
          același CerereID.
        </li>
        <li>
          În{" "}
          <strong>
            Configurări → Accesibilitate → Atingere → Atingere spate → Atingere
            triplă
          </strong>
          , selectează scurtătura. Poate fi necesar să deblochezi telefonul.
          Poți rula aceeași scurtătură și din widgetul Shortcuts sau prin Siri.
        </li>
      </ol>
      <label>
        Adresa pentru categorii
        <input
          readOnly
          value={origin ? origin + "/api/shortcut/options" : ""}
          onFocus={(e) => e.target.select()}
        />
      </label>
      <label>
        Adresa de salvare
        <input
          readOnly
          value={origin ? origin + "/api/shortcut/expenses" : ""}
          onFocus={(e) => e.target.select()}
        />
      </label>
      <div className="table-wrap">
        <table>
          <caption>Corpul JSON al cererii de salvare</caption>
          <thead>
            <tr>
              <th>Câmp</th>
              <th>Tip în Shortcuts</th>
              <th>Valoare</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <code>request_id</code>
              </td>
              <td>Text</td>
              <td>Variabila CerereID</td>
            </tr>
            <tr>
              <td>
                <code>amount</code>
              </td>
              <td>Număr</td>
              <td>Variabila Sumă</td>
            </tr>
            <tr>
              <td>
                <code>payment_method</code>
              </td>
              <td>Text</td>
              <td>Variabila Metodă: cash sau card</td>
            </tr>
            <tr>
              <td>
                <code>category_id</code>
              </td>
              <td>Text</td>
              <td>Variabila CategorieID</td>
            </tr>
            <tr>
              <td>
                <code>description</code>
              </td>
              <td>Text</td>
              <td>Variabila Detalii, poate fi goală</td>
            </tr>
          </tbody>
        </table>
      </div>
      {token && (
        <Button
          type="button"
          variant="outline"
          onClick={() =>
            copy(
              JSON.stringify(
                {
                  options_url: origin + "/api/shortcut/options",
                  expenses_url: origin + "/api/shortcut/expenses",
                  headers: {
                    Authorization: "Bearer " + token,
                    "Content-Type": "application/json",
                  },
                },
                null,
                2,
              ),
            )
          }
        >
          Copiază configurarea privată JSON
        </Button>
      )}
      {status && <p role="status">{status}</p>}
      <p className="lab-help">
        Configurarea JSON este o referință pentru completarea acțiunilor, nu un
        fișier .shortcut instalabil. Nu citește automat plățile Apple Pay.
        Schimbarea parolei contului nu revocă tokenurile telefoanelor; revocă-le
        din lista de pe această pagină.
      </p>
      <p>
        <a
          className="text-link"
          href="https://support.apple.com/en-lamr/guide/shortcuts/apd58d46713f/ios"
          target="_blank"
          rel="noreferrer"
        >
          Ghid Apple: cereri API din Shortcuts
        </a>{" "}
        ·{" "}
        <a
          className="text-link"
          href="https://support.apple.com/en-ie/guide/shortcuts/apd897693606/ios"
          target="_blank"
          rel="noreferrer"
        >
          Ghid Apple: Back Tap
        </a>
      </p>
    </div>
  );
}
