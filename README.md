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
| **Aufbuchen** | Betrag mit dem Ziffernblock tippen (oder eine der Tasten 5/10/20/50 €), dann die Karte scannen. Das Urteil zeigt groß das **neue Guthaben**, klein was aufgebucht wurde. Der Betrag bleibt stehen, es geht mit der nächsten Karte weiter. |
| **Abbuchen** | Betrag mit dem Ziffernblock tippen, groß auf dem Schirm, dann die Karte scannen. Das Urteil zeigt groß das **Guthaben, das noch auf der Karte ist**. Der Betrag wird nach jeder Buchung geleert. Reicht das Guthaben nicht: rot, nichts wird gebucht, „es fehlen 3,50 €". |
| **Karten** | Neue Karten drucken (8 je A4, 85 × 54 mm), wahlweise **mit Namen** (ein Name je Zeile, jede Zeile eine Karte). **Karten vorab aufladen** (Von/Bis/Betrag, etwa Karten 1–20 je 50 €). **Karten löschen** (Von/Bis, alle unbenutzten, oder einzeln). Liste aller Karten mit Suche nach Nummer und Name. Nummer antippen klappt die Karte auf: Guthaben direkt auf einen Betrag setzen, Namen ändern, Verlauf, einzelne Buchungen zurücknehmen, Restguthaben auszahlen, Karte nochmal drucken oder löschen. Abschluss drucken. |
| **Einstellungen** | Rolle des Geräts (beides / nur Aufbuchen / nur Abbuchen), Gerätezeichen, Anlass, Ablage, Sicherung. |

Auf dem **Handy** geht es in drei Schritten, jeder mit dem ganzen Schirm:
Betrag eintippen → Karte scannen (der Betrag steht groß da) → Ergebnis. Nach
dem Ergebnis ruht die Kamera, bis „Nächster Gast" (oder „Nächste Karte")
gedrückt oder das Urteil angetippt wird; sonst würde die nächste Karte, die
zufällig ins Bild kommt, ungefragt gebucht. Auf **Tablet und Laptop** steht
alles zugleich nebeneinander. Im Querformat am Handy ist der Schirm zu
niedrig; dort rollt die Seite.

**Löschen:** Gelöscht wird nur, was kein Guthaben mehr trägt (erst auszahlen).
Die Buchungen bleiben im Abschluss stehen, die Nummer wird nicht neu
vergeben, und eine gelöschte Karte lässt sich wiederherstellen. Technisch
bekommt die Karte einen Vermerk mit der Zeit, statt entfernt zu werden;
sonst brächte der nächste Abgleich sie vom anderen Gerät zurück. Beim
Abgleich gilt der neuere Vermerk, ob gelöscht oder wiederhergestellt. Eine
gelöschte Karte wird an Aufbuchen und Abbuchen abgewiesen.

**Namen** stehen auf der gedruckten Karte (je länger, desto kleiner die
Schrift, bis 40 Zeichen), in der Liste und im Urteil nach dem Scannen. Beim
Abgleich gilt der neuere Name.

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
| **0.3** | Karten löschen (einzeln, nach Bereich, alle unbenutzten, wiederherstellbar), Karten mit Namen |
| 0.2 | Ziffernblock für den Betrag, Betrag und neues Guthaben groß; auf dem Handy in drei Schritten |
| 0.1 | Aufbuchen, Abbuchen, Karten drucken, Stapel vorab aufladen, Korrektur je Karte, Abgleich über Ablage |
