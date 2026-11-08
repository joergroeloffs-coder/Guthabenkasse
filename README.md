# Guthabenkasse

Wertkarten mit QR-Code für Feste: Eine laminierte Karte trägt nur eine
Nummer, an einem Gerät wird Guthaben **aufgebucht**, an einem zweiten wieder
**abgebucht**. Eine einzige HTML-Datei, läuft offline im Browser, Aussehen
und Bausteine wie die Ticketkasse des Vereins.

> Vorläufig ohne jede Sicherheit: Karten tragen keine Unterschrift, die
> Geräterolle ist umstellbar, die Ablage schützt nur ein Zugangswort.

**Für den ersten Abend:** [`Bedienungsanleitung.pdf`](Bedienungsanleitung.pdf)
(8 Seiten, mit Bildern; als [`HTML`](Bedienungsanleitung.html) zum Nachlesen im Browser).

## Gedanke

Auf der Karte steht kein Betrag, nur `GK-A0007`. Das Guthaben ist die Summe
aller Buchungen zu dieser Nummer und wird nirgends gespeichert. Buchungen
werden nie überschrieben, nur hinzugefügt; zwei Geräte legen ihre Listen
beim Abgleich zusammen und haben danach dasselbe Guthaben. Auch eine
Rücknahme oder Korrektur ist eine Gegenbuchung, keine Löschung.

## Bedienung

| Reiter | wozu |
| --- | --- |
| **Aufbuchen** | Betrag mit dem Ziffernblock tippen (oder eine der Tasten 5/10/20/50 €), dann die Karte scannen. Das Urteil zeigt groß das **neue Guthaben**, klein was aufgebucht wurde. Der Betrag wird nach der Buchung geleert, damit eine zweite Lesung nichts ein zweites Mal bucht; die Tasten (5/10/20/50 €) bringen den nächsten Zehner schnell zurück. |
| **Abbuchen** | Betrag mit dem Ziffernblock tippen, groß auf dem Schirm, dann die Karte scannen. Das Urteil zeigt groß das **Guthaben, das noch auf der Karte ist**. Der Betrag wird nach jeder Buchung geleert. Reicht das Guthaben nicht: rot, nichts wird gebucht, „es fehlen 3,50 €". |
| **Karten** | Neue Karten drucken (8 je A4, 85 × 54 mm), wahlweise **mit Namen** (ein Name je Zeile) oder aus einer **Gästeliste** (Excel/CSV in den Kasten ziehen, Spalten ankreuzen). **Karten vorab aufladen** (Von/Bis/Betrag, etwa Karten 1–20 je 50 €). **Karten löschen** (Von/Bis, alle unbenutzten, oder einzeln). Liste aller Karten mit Suche nach Nummer und Name. Nummer antippen klappt die Karte auf: Guthaben direkt auf einen Betrag setzen, Namen ändern, Verlauf, einzelne Buchungen zurücknehmen, Restguthaben auszahlen, Karte nochmal drucken oder löschen. Abschluss drucken. |
| **Einstellungen** | Rolle des Geräts (beides / nur Aufbuchen / nur Abbuchen), Gerätezeichen, Anlass, Ablage, Sicherung. |

Auf dem **Handy** geht es in drei Schritten, jeder mit dem ganzen Schirm:
Betrag eintippen → Karte scannen (der Betrag steht groß da) → Ergebnis. Nach
dem Ergebnis ruht die Kamera, bis „Nächster Gast" (oder „Nächste Karte")
gedrückt oder das Urteil angetippt wird; sonst würde die nächste Karte, die
zufällig ins Bild kommt, ungefragt gebucht. Auf **Tablet und Laptop** steht
alles zugleich nebeneinander. Im Querformat am Handy ist der Schirm zu
niedrig; dort rollt die Seite.

**Löschen:** Gelöscht wird nur, was kein Guthaben mehr trägt (erst auszahlen).
Eine gelöschte Karte ist danach **nirgends mehr zu sehen**: nicht in der Liste,
nicht in der Suche, nicht in der Stapelliste, nicht im Abschluss; es gibt
keine Liste gelöschter Karten und kein Wiederherstellen. Ihre Buchungen bleiben
in den Summen des Abschlusses mitgezählt (das Geld ist ja geflossen), und die
Nummer wird nicht neu vergeben. Technisch behält jedes Gerät einen unsichtbaren
Vermerk mit der Zeit, statt die Karte zu entfernen; sonst brächte der nächste
Abgleich sie vom anderen Gerät zurück. Eine gelöschte Karte wird an Aufbuchen
und Abbuchen abgewiesen.

**Gästeliste:** Eine Datei wird in den Kasten *Neue Karten drucken* gezogen, über
*Datei wählen* geöffnet oder als Zellen aus Excel eingefügt (Strg+V). Jede Zeile
wird eine Karte. Über jeder Spalte steht ein Häkchen: was angekreuzt ist, steht
auf der Karte. Spalten, deren Überschrift „name" oder „gast" enthält (Vorname,
Nachname), ergeben den Namen, die übrigen angekreuzten stehen klein darunter
(*Tisch 5 · vegetarisch*). Hat die Datei mehrere Tabellenblätter, wählt man das
richtige aus; leere Blätter fallen weg.

Gelesen wird ohne Bibliothek, und nach dem Anfang der Datei, nicht nach der
Endung (eine „.xls" ist oft eine HTML-Seite, eine „.csv" oft UTF-16):

| Format | |
| --- | --- |
| `.xlsx`, `.xlsm` | ZIP mit XML; Zahlen, Prozent, Datum und Uhrzeit (auch im 1904-System), Formelergebnisse, formatierter Text |
| `.xls` | Excel 97–2003 (Compound File, BIFF8): Textliste über mehrere Fortsetzungen, komprimierte und Gleitkommazahlen, Formelergebnisse, Datum, Prozent |
| `.ods`, `.fods` | OpenDocument (LibreOffice, Google Tabellen) |
| `.xml` | Excel-2003-XML |
| `.html`, `.htm`, auch als `.xls` | Tabellen aus einer Internetseite, Windows-1252 oder UTF-8 |
| `.csv`, `.tsv`, `.txt` | Semikolon, Komma, Tabulator oder senkrechter Strich, Zeile `sep=;`; UTF-8, UTF-16 (Excels „Unicode-Text") oder Windows-1252 |
| Zwischenablage | Zellen aus Excel (Tabulator-getrennt) |

Nicht gelesen werden `.xlsb`, Numbers-Dateien, Excel vor Version 97 und Dateien
mit Kennwort; die Kasse sagt, was zu tun ist (als `.xlsx` oder CSV speichern).
Datums- und Prozentzellen kommen so heraus, wie man sie liest (`17.05.1980`,
`25%`), nicht als Zahl. Name und Angaben lassen sich später in der Kartenliste
ändern; beim Abgleich gilt der neuere Stand.

**Kamera und Licht:** Beim Scannen nimmt das Kamerabild auf dem Handy den
größten Teil des Schirms ein; „Licht" und „Betrag ändern" liegen über dem
Bild. Wo der Browser den Blitz freigibt (Chrome auf Android), geht das Licht
an, solange die Kamera sucht, und aus, sobald gebucht ist. Einstellung unter
*Dieses Gerät*: *Automatisch* oder *Aus*. Auf dem iPhone gibt es das nicht.

**Neue Fassung erkennen:** Eine Verknüpfung auf dem Startbildschirm zeigt gern die
zuletzt gespeicherte Seite, und GitHub Pages erlaubt ohnehin zehn Minuten
Zwischenspeicher. Deshalb holt die Kasse beim Öffnen (und beim Zurückkehren,
höchstens alle fünf Minuten) die Seite noch einmal unter einer Adresse, die nicht
im Zwischenspeicher liegt, liest die Fassungsnummer heraus und zeigt oben einen
gelben Streifen, wenn sie sich unterscheidet. *Jetzt laden* ersetzt den
gespeicherten Eintrag und lädt neu. Unter *Einstellungen → Fassung* steht die
laufende Nummer, dazu ein Knopf zum Nachsehen. Das gibt es erst ab 0.4.1 und
geht nur mit Netz und über die Internetadresse.

**Betrieb auf Null setzen** (*Einstellungen → Sicherung und Neubeginn*): löscht
alle Karten, Buchungen und Summen, **auf allen Geräten und in der Ablage**.
Bleiben: Gerätezeichen, Rolle, Anlass, Adresse und Zugangswort der Ablage.
Die Kasse fragt zweimal (mit den Zahlen, dann muss `NULL` getippt werden) und
speichert vorher selbst eine Sicherung. Technisch trägt der Neubeginn eine Zeit
(„Epoche"); beim Abgleich übernimmt das Gerät mit der früheren Zeit den
Neubeginn und wirft sein Altes weg, und Daten aus der Zeit davor werden nicht
mehr angenommen. Was ein Gerät nach dem Neubeginn eines anderen noch ohne Netz
bucht, geht deshalb beim nächsten Abgleich verloren: vorher auf allen Geräten
abgleichen. Die Kartennummern zählen danach weiter, damit eine alte Karte nicht
zufällig wieder gilt; mit dem Häkchen *Kartennummern wieder bei 1 beginnen*
fangen sie neu an. Eine Sicherungsdatei lässt sich trotzdem einspielen; so
lässt sich ein Neubeginn zurücknehmen.

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
| `Bedienungsanleitung.pdf`, `.html` | die Anleitung für den ersten Abend |
| `ablage.gs` | Apps Script für den Abgleich (nicht auf den Webserver, sondern zu Google) |
| `manifest.webmanifest`, `favicon.svg`, `*.png` | Symbole, damit sie sich als Programm einrichten lässt |

jsQR 1.4.0 (Apache-2.0, <https://github.com/cozmo/jsQR>) steckt unverändert
in der `index.html`.

## Fassungen

| | |
| --- | --- |
| **0.5.1** | der Betrag wird auch beim Aufbuchen nach der Buchung geleert (kein zweites Buchen aus Versehen) |
| 0.5 | Gästelisten in allen gängigen Formaten (.xls, .xlsx, .ods, Excel-2003-XML, HTML, CSV/UTF-16, Zwischenablage), Blattauswahl; gelöschte Karten verschwinden vollständig aus der Anzeige |
| 0.4.1 | erkennt eine neuere Fassung selbst und meldet es (Verknüpfung auf dem Startbildschirm) |
| 0.4 | Gästeliste aus Excel/CSV mit Spaltenauswahl; Betrieb auf Null setzen (auch über den Abgleich); großes Kamerabild; Licht beim Scannen |
| 0.3.1 | Bedienungsanleitung als PDF; Vorschau und Rollenwahl auf schmalen Handys besser lesbar |
| 0.3 | Karten löschen (einzeln, nach Bereich, alle unbenutzten, wiederherstellbar), Karten mit Namen |
| 0.2 | Ziffernblock für den Betrag, Betrag und neues Guthaben groß; auf dem Handy in drei Schritten |
| 0.1 | Aufbuchen, Abbuchen, Karten drucken, Stapel vorab aufladen, Korrektur je Karte, Abgleich über Ablage |
