# Betrieb im Vereinsnetz

## Adressen

| | |
|---|---|
| HTTP | `http://10.12.103.170:5000` |
| HTTPS | `https://10.12.103.170:5443` |
| RTMP für OBS | `rtmp://10.12.103.170:1936/live` |

Die IP stammt aus dem laufenden PoC. Ändert sie sich, muss nichts angepasst
werden — der Server ermittelt seine Adressen beim Start selbst.

## TLS-Zertifikat

Beim ersten Start legt der Server ein selbstsigniertes Zertifikat unter
`server/certs/` an. Es enthält als `subjectAltName` alle lokalen Adressen der
Maschine, `localhost` und den Rechnernamen. Ändern sich die Adressen — etwa
nach einem DHCP-Wechsel —, wird beim nächsten Start neu ausgestellt.

Zusätzliche Namen, etwa ein DNS-Eintrag im Vereinsnetz:

```bash
SSL_EXTRA_NAMES=tv.vfl.local,10.12.103.170
```

> **Warum das zählt:** Chrome wertet den CommonName seit Version 58 nicht mehr
> aus. Ein Zertifikat ohne `subjectAltName` ist für jeden modernen Browser
> ungültig, egal was draufsteht. Genau das war vorher der Fall.

**Selbstsigniert heißt nicht vertrauenswürdig.** Zum Anschauen genügt es, die
Browserwarnung wegzuklicken. Für einen echten sicheren Kontext — den manche
Browser-Funktionen verlangen — muss `server/certs/server.crt` auf den Geräten
als vertrauenswürdig hinterlegt werden. Im Vereinsnetz ist das einmalige
Arbeit pro Gerät.

## Chromecast

Der Cast-Knopf erscheint nur, wenn drei Dinge zusammenkommen:

1. **Einwilligung erteilt.** Das SDK liegt bei Google; ohne Zustimmung wird es
   nicht geladen. Zu ändern über „Cookie-Einstellungen" in der Fußzeile.
2. **Das Video ist öffentlich.** Der Chromecast holt sich den Stream selbst und
   hat unser Medien-Cookie nicht — bei internen Videos liefe der Abruf in ein
   403 und der Fernseher bliebe schwarz. Deshalb wird der Knopf dort gar nicht
   erst angeboten.
3. **Die Seite läuft nicht über `localhost`.** Ein Chromecast kann diese
   Adresse nicht auflösen. Über die IP der NUC funktioniert es; die Meldung im
   Player sagt das auch so.

Ob Chrome zusätzlich HTTPS verlangt, hängt von der Version ab — falls der
Knopf über HTTP nichts tut, ist `https://10.12.103.170:5443` der Weg.

**AirPlay** braucht nichts davon: das steckt in Safari selbst, lädt nichts nach
und ist deshalb ohne Einwilligung verfügbar. Der Knopf erscheint nur auf
Apple-Geräten — Plyr blendet ihn aus, wo er nicht funktioniert.

## Erster Start

Es gibt noch kein Konto. Das erste legt sich selbst an und wird Verwaltung:

```bash
npm run server
```

Dann `/login` öffnen → **„Erstes Konto anlegen"**. Danach ist die Registrierung
geschlossen; weitere Konten vergibt die Verwaltung unter Profil → Team.

Für den Dauerbetrieb gehört ein fester `JWT_SECRET` in die Umgebung, sonst
liegt der Schlüssel als Datei im Volume (siehe `docker-compose.yml`).
