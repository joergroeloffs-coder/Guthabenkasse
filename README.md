# Guthabenkasse

Wertkarten mit QR-Code für Feste: Eine laminierte Karte trägt nur eine
Nummer, an einem Gerät wird Guthaben **aufgebucht**, an einem zweiten wieder
**abgebucht**. Eine einzige HTML-Datei, läuft offline im Browser, Aussehen
und Bausteine wie die Ticketkasse des Vereins.

> Vorläufig ohne jede Sicherheit: Karten tragen keine Unterschrift, die
> Geräterolle ist umstellbar, die Ablage schützt nur ein Zugangswort.

## Gedanke

Auf der Karte steht kein Betrag, nur `GK-A0007`. Das Guthaben ist die Summe
aller Buchungen zu dieser Nummer und wird nirgends gespeichert. Buchungen
werden nie überschrieben, nur hinzugefügt; zwei Geräte legen ihre Listen
beim Abgleich zusammen und haben danach dasselbe Guthaben. Auch eine
Rücknahme oder Korrektur ist eine Gegenbuchung, keine Löschung.

## Bedienung

| Reiter | wozu |
| --- | --- |
| **Aufbuchen** | Betrag tippen oder Taste (5/10/20/50 €), dann Karte scannen. Der Betrag bleibt stehen. |
| **Abbuchen** | Betrag tippen, dann scannen. Der Betrag wird nach jeder Buchung geleert. Reicht das Guthaben nicht: rot, nichts wird gebucht, „es fehlen 3,50 €". |
| **Karten** | Neue Karten drucken (8 je A4, 85 × 54 mm), **Karten vorab aufladen** (Von/Bis/Betrag, etwa Karten 1–20 je 50 €), Liste aller Karten. Nummer antippen klappt die Karte auf: Guthaben direkt auf einen Betrag setzen, Verlauf, einzelne Buchungen zurücknehmen, Restguthaben auszahlen. Abschluss drucken. |
| **Einstellungen** | Rolle des Geräts (beides / nur Aufbuchen / nur Abbuchen), Gerätezeichen, Anlass, Ablage, Sicherung. |

Jedes Gerät braucht ein eigenes **Gerätezeichen** (ein Buchstabe). Es steht
in der Kartennummer und bei jeder Buchung.

## Zwei Geräte abgleichen

Beide Geräte gleichen sich über eine gemeinsame Ablage ab (ein Apps Script
im Google-Konto). Einrichtung steht im Kopf von [`ablage.gs`](ablage.gs).
Adresse und Zugangswort kommen auf beiden Geräten unter
*Einstellungen → Ablage* hinein und gehören nur auf Geräte des Vereins.

Fällt das Netz aus, arbeiten beide Geräte weiter und gleichen später ab.
Buchen zwei Geräte ohne Netz gleichzeitig von derselben Karte ab, geht deren
Guthaben nach dem Abgleich ins Minus; die Kartenliste markiert das rot.

## Veröffentlichen

Alle Dateien nebeneinander auf einen Webserver legen, etwa GitHub Pages. Die
Kamera funktioniert nur über eine `https`-Adresse, nicht aus einer
geöffneten Datei; Eintippen und Drucken gehen auch so.

## Dateien

| Datei | |
| --- | --- |
| `index.html` | die ganze Anwendung |
| `ablage.gs` | Apps Script für den Abgleich (nicht auf den Webserver, sondern zu Google) |
| `manifest.webmanifest`, `favicon.svg`, `*.png` | Symbole, damit sie sich als Programm einrichten lässt |

jsQR 1.4.0 (Apache-2.0, <https://github.com/cozmo/jsQR>) steckt unverändert
in der `index.html`.

## Fassungen

| | |
| --- | --- |
| 0.1 | Aufbuchen, Abbuchen, Karten drucken, Stapel vorab aufladen, Korrektur je Karte, Abgleich über Ablage |
