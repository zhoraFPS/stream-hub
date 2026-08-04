# Aufbereitung hochgeladener Videos

## Warum

Vorher lieferte der Server die hochgeladene Datei unverändert aus. Ein
90-Minuten-Testspiel in 1080p sind mehrere Gigabyte am Stück — auf dem Handy im
Mobilfunknetz unbrauchbar, weil der Player weder früh startet noch die Qualität
an die Verbindung anpassen kann.

Nach dem Upload zerlegt ffmpeg die Datei deshalb in Segmente und legt mehrere
Bitraten nebeneinander. Der Player wählt selbst, welche er nimmt, und wechselt
während der Wiedergabe. Das ist dieselbe Technik, die vfl1848.tv einsetzt
(dort mit fünf Stufen von 628 bis 6256 kbit/s).

## Ablauf

```
Upload  →  Warteschlange  →  ffprobe  →  ffmpeg  →  DB-Eintrag  →  Ereignis an offene Seiten
```

1. `/api/upload` legt das Video mit `transcode_status = 'pending'` an.
2. Die Warteschlange in [server/transcode.js](../server/transcode.js) arbeitet
   **einen** Auftrag gleichzeitig ab. Encoding sättigt alle Kerne — parallele
   Läufe machen alles langsamer statt schneller.
3. `ffprobe` liefert Dauer, Auflösung und ob es überhaupt eine Tonspur gibt.
4. `ffmpeg` schreibt die Bitratenleiter nach
   `server/data/uploads/hls/<videoId>/`.
5. Ein Standbild wird beim ersten Zehntel der Laufzeit gezogen — nicht bei
   Sekunde 0, wo meist noch Schwarzbild liegt.
6. `transcode_status` wird `ready`, ein `videos`-Ereignis geht an alle offenen
   Seiten, die Kachel aktualisiert sich von selbst.

## Bitratenleiter

Gerendert wird nur, was die Quelle hergibt — aus einem 720p-Upload entstehen
drei Stufen, kein hochskaliertes 1080p.

| Stufe | Videobitrate | Ton |
|---|---|---|
| 360p | 800 kbit/s | 96 kbit/s |
| 540p | 1400 kbit/s | 128 kbit/s |
| 720p | 2800 kbit/s | 128 kbit/s |
| 1080p | 5000 kbit/s | 192 kbit/s |

Segmentlänge 4 s, feste Keyframe-Abstände (`-g 48`), sonst kann der Player
nicht sauber zwischen den Stufen umschalten.

## Wiedergabe

Der Player entscheidet in dieser Reihenfolge:

1. `transcode_status = 'ready'` **und** MediaSource vorhanden → **hls.js**
2. kein MediaSource (iPhone) und nativer HLS-Support → **direkt**
3. sonst → **Originaldatei** über `/api/videos/:id/stream`

Schritt 3 ist der Notnagel und greift auch, solange die Aufbereitung noch
läuft oder fehlgeschlagen ist. Ein Video ist damit **immer** abspielbar, auch
ohne ffmpeg auf dem Rechner.

hls.js hat bewusst Vorrang vor nativer Wiedergabe: manche Chromium-Browser
melden HLS-Unterstützung, spielen es aber unzuverlässig ab. Auf dem iPhone gibt
es kein MediaSource, dort wird die Bibliothek gar nicht erst geladen.

## Einstellungen

| Variable | Bedeutung |
|---|---|
| `FFMPEG_PATH` | Pfad zum Binary, sonst `ffmpeg` aus dem Suchpfad |
| `FFPROBE_PATH` | dito für `ffprobe` |
| `TRANSCODE_PRESET` | x264-Voreinstellung, Standard `veryfast` |
| `TRANSCODE_HWACCEL` | `vaapi` schaltet auf Intel-GPU-Encoding um |
| `VAAPI_DEVICE` | Standard `/dev/dri/renderD128` |

### Hardware-Encoding

Die NUC reicht `/dev/dri` bereits in den Container, das ist also nur ein
Schalter. Es bleibt trotzdem aus, bis es jemand bewusst einschaltet: fehlt der
passende Treiber, schlägt jeder Auftrag fehl, und die Ursache ist schwer zu
sehen. Software-Encoding läuft überall.

Zum Ausprobieren `TRANSCODE_HWACCEL=vaapi` in der `docker-compose.yml` setzen,
einen Testupload durchlaufen lassen und ins Log schauen.

## Wenn ffmpeg fehlt

Beim Start wird nicht nur geprüft, ob ffmpeg startet, sondern ob es
`-var_stream_map` kennt — das kam erst mit ffmpeg 4. Manche Python- und
Tool-Pakete legen uralte Builds in den Suchpfad; eine reine `-version`-Prüfung
würde die durchwinken und dann mitten im ersten Auftrag scheitern.

Fehlt ffmpeg oder ist es zu alt, meldet das Log es beim Start und alle Videos
werden unverändert ausgeliefert. Nichts bricht, es fehlt nur die Anpassung an
die Verbindung.

## Neustart

Was beim Beenden `pending` oder `processing` war, wird beim nächsten Start
erneut eingereiht. `processing` zählt mit — wer mittendrin war, ist es nach dem
Neustart nicht mehr.

## Live-Mitschnitte

Beginnt eine OBS-Übertragung, meldet MediaMTX das an `/api/internal/obs-start`.
Von dort startet ein `ffmpeg`, das den Datenstrom von MediaMTX zurückliest und
**ohne Neukodierung** (`-c copy`) mitschreibt — das kostet kaum Rechenzeit,
was während einer Übertragung zählt.

Geschrieben wird fragmentiertes MP4. Bricht der Server mitten im Spiel ab,
bleibt die Datei trotzdem abspielbar; ein gewöhnliches MP4 wäre ohne den
abschließenden Index unbrauchbar.

Drei Wege führen aus einem Mitschnitt in die Mediathek:

1. **Regulärer Schluss** — MediaMTX ruft `obs-stop`, ffmpeg bekommt ein „q"
   und schreibt zu Ende.
2. **Abriss der Übertragung** — endet die Quelle von selbst, gibt es kein
   `obs-stop` mehr. Der Mitschnitt wird dann direkt beim Beenden übernommen.
3. **Serverabsturz** — beim nächsten Start werden liegengebliebene
   `live-u<id>-<zeit>.mp4` ohne Datenbankeintrag eingesammelt.

Jeder Mitschnitt landet als **internes** Video: Rohmaterial ist noch nichts
Veröffentlichtes. Die Redaktion gibt ihm über „Bearbeiten" einen Titel und
schaltet es dann öffentlich. Länge und Standbild trägt die Aufbereitung nach.

> **Auf der NUC prüfen:** MediaMTX ist mit `authMethod: http` konfiguriert und
> fragt auch beim *Lesen* eines Pfades bei uns nach. `/api/internal/stream-auth`
> erkennt den Stream-Key aus dem Pfad und lässt ihn durch — verifiziert ist das
> bisher nur anhand des Codes, nicht an einer laufenden Übertragung.

## Platzbedarf

Die Segmente kommen **zusätzlich** zur Originaldatei auf die Platte, grob in
der Größenordnung der Quelle. Beim Löschen eines Videos wird der HLS-Ordner
mit entfernt. Die Originaldatei bleibt bewusst liegen: sie ist der Notnagel und
das, was der Download-Knopf ausliefert.
