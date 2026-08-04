import React from 'react';
import { Link } from 'react-router-dom';

/**
 * Rechtsseiten.
 *
 * Was die Plattform technisch verarbeitet, steht hier vollständig und geprüft —
 * das lässt sich aus dem Quelltext belegen. Was rechtsverbindliche Angaben des
 * Vereins sind (Anschrift, Registereintrag, Vertretungsberechtigte,
 * Datenschutzbeauftragter, Vertragsbedingungen), steht bewusst NICHT hier:
 * erfundene Pflichtangaben wären schlimmer als gar keine. Diese Stellen sind
 * unten sichtbar markiert und müssen vor dem Livegang gefüllt und anwaltlich
 * geprüft werden.
 */

function Ausfuellen({ children }) {
  return (
    <div className="b-notice b-notice--info" style={{ marginBlock: 'var(--space-2xs)' }}>
      <strong>Noch auszufüllen:</strong> {children}
    </div>
  );
}

function LegalLayout({ title, intro, children }) {
  return (
    <article className="b-section" style={{ maxWidth: 'var(--max-width-type)' }}>
      <h1 className="b-heading b-heading--600">{title}</h1>
      {intro && <p className="b-copy" style={{ marginBlock: 'var(--space-s)' }}>{intro}</p>}
      <div className="b-prose">{children}</div>
    </article>
  );
}

// ── Impressum ─────────────────────────────────────────────────────────────────

export function Impressum() {
  return (
    <LegalLayout
      title="Impressum"
      intro="Angaben gemäß § 5 DDG und § 18 Abs. 2 MStV."
    >
      <h2>Anbieter</h2>
      <Ausfuellen>
        Vollständiger Vereinsname, Anschrift, Telefonnummer und E-Mail-Adresse;
        Vertretungsberechtigte; Registergericht und Vereinsregisternummer;
        Umsatzsteuer-Identifikationsnummer.
      </Ausfuellen>
      <p>
        Diese Angaben stehen bereits im{' '}
        <a href="https://www.vfl-bochum.de/impressum" target="_blank" rel="noopener noreferrer">
          Impressum auf vfl-bochum.de
        </a>{' '}
        und sind von dort zu übernehmen — 1848TV ist ein Angebot desselben Anbieters.
      </p>

      <h2>Verantwortlich für den Inhalt</h2>
      <Ausfuellen>
        Name und Anschrift der nach § 18 Abs. 2 MStV verantwortlichen Person.
      </Ausfuellen>

      <h2>Kontakt</h2>
      <p>
        Für Fragen zu diesem Portal: <a href="mailto:support@vfl-bochum.de">support@vfl-bochum.de</a>
      </p>

      <h2>Streitbeilegung</h2>
      <p>
        Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung bereit:{' '}
        <a href="https://ec.europa.eu/consumers/odr/" target="_blank" rel="noopener noreferrer">
          ec.europa.eu/consumers/odr
        </a>
      </p>
      <Ausfuellen>
        Ob der Verein zur Teilnahme an einem Streitbeilegungsverfahren vor einer
        Verbraucherschlichtungsstelle bereit oder verpflichtet ist.
      </Ausfuellen>
    </LegalLayout>
  );
}

// ── Datenschutz ───────────────────────────────────────────────────────────────

export function Datenschutz() {
  return (
    <LegalLayout
      title="Datenschutz"
      intro="Was 1848TV verarbeitet, wofür, und wie lange. Der technische Teil beschreibt den tatsächlichen Stand der Plattform."
    >
      <h2>Verantwortlicher</h2>
      <Ausfuellen>
        Verantwortliche Stelle im Sinne der DSGVO und Kontaktdaten des
        Datenschutzbeauftragten.
      </Ausfuellen>

      <h2>Beim Aufruf der Seite</h2>
      <p>
        Der Server verarbeitet die technisch erforderlichen Verbindungsdaten —
        IP-Adresse, Zeitpunkt, abgerufene Adresse. Das ist für den Betrieb
        unvermeidbar. Rechtsgrundlage ist das berechtigte Interesse am sicheren
        Betrieb (Art. 6 Abs. 1 lit. f DSGVO).
      </p>
      <p>
        <strong>Es sind keine Dienste Dritter eingebunden.</strong> Schriftarten,
        Skripte und Videos werden ausschließlich vom eigenen Server ausgeliefert.
        Es gibt keine Reichweitenmessung, keine Werbenetzwerke und keine
        eingebetteten Inhalte fremder Anbieter.
      </p>

      <h2>Cookies und lokale Speicherung</h2>
      <table className="b-table">
        <thead>
          <tr><th>Name</th><th>Zweck</th><th>Dauer</th></tr>
        </thead>
        <tbody>
          <tr>
            <td><code>media_session</code></td>
            <td>Zugriff auf interne Videos nach der Anmeldung. Cookie, für Skripte nicht lesbar.</td>
            <td>7 Tage</td>
          </tr>
          <tr>
            <td><code>streamhub_token</code></td>
            <td>Hält die Anmeldung. Liegt im lokalen Speicher des Browsers, wird nicht mitgesendet.</td>
            <td>bis zur Abmeldung</td>
          </tr>
          <tr>
            <td><code>vfl_consent</code></td>
            <td>Merkt sich, dass der Cookie-Hinweis gelesen wurde.</td>
            <td>bis zum Löschen</td>
          </tr>
        </tbody>
      </table>
      <p>
        Alle drei sind technisch notwendig; eine Einwilligung ist dafür nicht
        erforderlich (§ 25 Abs. 2 TTDSG). Kämen später Reichweitenmessung oder
        eingebettete Inhalte hinzu, würde vorher gefragt.
      </p>

      <h2>Konten</h2>
      <p>
        Konten vergibt die Redaktion. Gespeichert werden Benutzername,
        E-Mail-Adresse, ein Passwort-Hash (bcrypt — das Passwort selbst wird
        nicht gespeichert), optional Anzeigename und Kurzbeschreibung sowie ein
        Schlüssel für den Streamversand. Die Daten bleiben, bis das Konto
        gelöscht wird.
      </p>

      <h2>Aufrufzahlen</h2>
      <p>
        Startet eine Wiedergabe, erhöht sich ein Zähler am Video. Damit derselbe
        Aufruf nicht mehrfach zählt, wird für sechs Stunden ein Kennzeichen aus
        der IP-Adresse im Arbeitsspeicher gehalten — nicht gespeichert, nicht mit
        einem Konto verknüpft, und nach Ablauf verworfen. Gespeichert wird
        ausschließlich die Gesamtzahl, ohne Personenbezug.
      </p>

      <h2>Live-Chat</h2>
      <p>
        Nachrichten im Live-Chat werden nur an die gerade Zuschauenden verteilt
        und nicht gespeichert. Nach dem Ende des Streams sind sie fort.
      </p>

      <h2>Hochgeladene Inhalte</h2>
      <p>
        Videos, Vorschaubilder und die dazugehörigen Angaben liegen auf dem
        Server des Vereins. Sie werden nicht an Dritte weitergegeben.
      </p>

      <h2>Deine Rechte</h2>
      <p>
        Auskunft, Berichtigung, Löschung, Einschränkung der Verarbeitung,
        Datenübertragbarkeit und Widerspruch — dazu genügt eine Nachricht an{' '}
        <a href="mailto:support@vfl-bochum.de">support@vfl-bochum.de</a>. Zudem
        besteht ein Beschwerderecht bei einer Datenschutz-Aufsichtsbehörde.
      </p>

      <Ausfuellen>
        Zuständige Aufsichtsbehörde (für Nordrhein-Westfalen: LDI NRW) mit
        Anschrift, sowie Aufbewahrungsfristen für Server-Protokolle nach
        Rücksprache mit der IT.
      </Ausfuellen>
    </LegalLayout>
  );
}

// ── Nutzungsbedingungen ───────────────────────────────────────────────────────

export function Nutzungsbedingungen() {
  return (
    <LegalLayout
      title="Nutzungsbedingungen"
      intro="Regeln für die Nutzung von 1848TV."
    >
      <h2>Angebot</h2>
      <p>
        1848TV ist das Medienportal des VfL Bochum 1848. Es zeigt Aufzeichnungen
        und Live-Übertragungen rund um den Verein. Ein Anspruch auf ständige
        Verfügbarkeit besteht nicht — Wartung, Störungen und Ausfälle im
        Stadionnetz können den Betrieb unterbrechen.
      </p>

      <h2>Inhalte</h2>
      <p>
        Alle Videos, Bilder und Texte sind urheberrechtlich geschützt. Sie dürfen
        privat angesehen, aber nicht heruntergeladen, vervielfältigt, öffentlich
        gezeigt oder weiterverbreitet werden, soweit das Gesetz es nicht
        ausdrücklich erlaubt. Mitschnitte und Weiterverbreitung von
        Live-Übertragungen sind nicht gestattet.
      </p>

      <h2>Konten</h2>
      <p>
        Konten vergibt die Redaktion. Zugangsdaten und Stream-Schlüssel sind
        persönlich und nicht weiterzugeben. Wer ein Konto nutzt, ist für die
        damit veröffentlichten Inhalte verantwortlich. Bei Missbrauch kann der
        Zugang gesperrt werden.
      </p>

      <h2>Abonnement</h2>
      <Ausfuellen>
        Dieser Abschnitt bleibt leer, solange es kein kostenpflichtiges
        Abonnement gibt. Sobald die Abrechnung über die VfL.ID angebunden ist,
        gehören hierher: Laufzeiten und Preise, automatische Verlängerung,
        Kündigungsfrist, Widerrufsrecht und Zahlungsbedingungen — anwaltlich
        geprüft. Bis dahin sind alle Inhalte ohne Bezahlung zugänglich.
      </Ausfuellen>

      <h2>Haftung</h2>
      <p>
        Für Schäden haftet der Verein nach den gesetzlichen Bestimmungen. Für
        Inhalte verlinkter fremder Seiten wird keine Haftung übernommen; für
        diese sind allein deren Betreiber verantwortlich.
      </p>

      <h2>Änderungen</h2>
      <p>
        Diese Bedingungen können angepasst werden. Über wesentliche Änderungen
        wird auf dieser Seite informiert.
      </p>

      <p style={{ marginTop: 'var(--space-m)' }}>
        Fragen? <a href="mailto:support@vfl-bochum.de">support@vfl-bochum.de</a> —
        siehe auch <Link to="/datenschutz">Datenschutz</Link> und{' '}
        <Link to="/impressum">Impressum</Link>.
      </p>
    </LegalLayout>
  );
}
