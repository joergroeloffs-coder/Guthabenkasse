# Rückseite der Guthabenkarten – Schablone

A4, 8 Karten à **85 × 54 mm**, im **selben Raster wie die Vorderseite** (aus dem Druck gemessen):
Spalten bei x = 16 mm und 109 mm, Zeilen bei y = 12, 72, 132 und 192 mm.

| Datei | wofür |
|---|---|
| `Rueckseite-Schablone-A4.svg` | Ebenen: **Hilfslinien** (nicht drucken) und **Gestaltung** mit acht Karten-Gruppen. In Inkscape, Affinity, Illustrator, Figma, Canva (Import) nutzbar. |
| `Rueckseite-Schablone-A4.pdf` / `.png` (2480 × 3508 px, 300 dpi) | dieselbe Schablone zum Betrachten oder als Vorlage unter einem Bild. |
| `Rueckseite-Hilfslinien-A4-transparent.png` | nur die Linien, transparent: als oberste Ebene über die eigene Gestaltung legen, vor dem Export ausblenden. |
| `Karte-Rueckseite-85x54-mit-Anschnitt.svg` / `.png` (1039 × 673 px) | **eine** Karte mit 1,5 mm Anschnitt: Bild gestalten und im Terminal hochladen. |
| `Passprobe-A4.pdf` / `.svg` / `.png` | Umrisse und Kreuze zum Prüfen der Ausrichtung. |

## Linien und Maße
* **Magenta, durchgezogen** – Schnittkante, 85 × 54 mm.
* **Grün, gestrichelt** – Sicherheitsrand 4 mm: Logo, Text, alles Wichtige bleibt innerhalb. (Das ist derselbe Rand, den die Vorderseite benutzt.)
* **Blau, gestrichelt** – Anschnitt 1,5 mm: Hintergrund bis hierher ziehen, damit beim Schneiden oder Laminieren kein weißer Rand bleibt.
* **Graues Kreuz** – Mitte der Karte.

Die Karten liegen weit innerhalb des druckbaren Bereichs (mindestens 10 mm Rand). Zwischen den Karten bleiben 6 mm (senkrecht) und 8 mm (waagerecht).

## Zwei Wege
**A) Im Terminal (einfach).** Eine Karte gestalten (88 × 57 mm, 300 dpi = 1039 × 673 Pixel, Schablone `Karte-Rueckseite-…`), als PNG/JPG speichern, im Terminal unter **Karten → Rückseite der Karten** wählen und drucken. Das Terminal setzt das Bild achtmal in das Raster; mehrere Blätter möglich.

**B) Das ganze Blatt selbst gestalten.** `Rueckseite-Schablone-A4.svg` öffnen, in der Ebene **Gestaltung** arbeiten (acht Gruppen *Karte 1–8*), vor dem Druck die Ebene **Hilfslinien** ausblenden, als PDF exportieren (A4, 100 %, **kein „Einpassen“**).

## Beidseitig drucken
1. **Vorderseiten drucken** (Terminal → Karten drucken, A4, **100 %**, nicht „an Seite anpassen“, Ränder: keine).
2. Blätter wieder einlegen und die **Rückseite** auf dieselben Blätter drucken, **Wenden an der langen Kante** (wie bei einem Buch). Vorne und hinten ist das Raster dasselbe, es kommt also jede Rückseite genau hinter ihre Vorderseite.
3. **Passprobe zuerst:** Terminal → Karten → Rückseite → **Passprobe drucken** (oder `Passprobe-A4.pdf`) auf die Rückseite eines bereits bedruckten Blattes. Gegen das Licht halten: Die Linien der Rückseite müssen die gestrichelten Ränder der Vorderseite decken. Weicht es ab, **Versatz** eintragen (X nach rechts, Y nach unten, in mm) und noch einmal probieren.
4. Steht die Rückseite auf dem Kopf, entweder „Blatt steht auf dem Kopf“ ankreuzen oder das Blatt anders herum einlegen.

## Hinweise
* Bei Druckdialogen immer **„Tatsächliche Größe“ / 100 %** und **A4** wählen. Wer „An Seite anpassen“ lässt, verkleinert alles um ein bis drei Prozent, und die Rückseite sitzt nicht mehr passgenau.
* Die meisten Drucker haben ein paar Zehntel Millimeter Einzugstoleranz. Für eine Rückseite mit Vollflächenhintergrund deshalb den Anschnitt nutzen.
* Das Bild wird im Gerätespeicher des Terminals gemerkt (nicht in der Ablage und nicht auf den anderen Geräten).
* Neu erzeugen: `node docs/kartenrueckseite/bauen.mjs`.

## Fertige Rückseiten mit dem Logo (Ordner `szenen/`)
Drei Szenen mit dem Logo des Ual Fering Wiartshüs, Oldsum / Föhr, Unterzeile „Guthabenkarte · Gift Card“ und dem Hinweis zur Rückzahlung des Restguthabens (deutsch/englisch):
* **Szene A „Watt“** – Wattenmeer bei Ebbe mit Prickenreihe und Sonne.
* **Szene B „Reetdach“** – Friesenhaus mit Reetdach am Deich, Schafe.
* **Szene C „Abendrot“** – Sonnenuntergang mit Segelboot (Logo in Creme).

Je Szene: `Szene-X-….png` (88 × 57 mm mit Anschnitt, 1039 × 673 px – im Terminal unter Karten → Rückseite der Karten wählen), `.svg` und `Szene-X-…-Rueckseite-A4.pdf` (druckfertiger A4-Bogen, 8 Karten im Raster der Vorderseite). Neu erzeugen: `node docs/kartenrueckseite/szenen/szenen.mjs`.

**Logo:** Die Vorlage (`logo-original-234x26.png`) hat nur 234 × 26 Pixel. Sie wird weich hochgerechnet; die Schrift wirkt deshalb bei 300 dpi leicht pixelig. „OLDSUM / FÖHR“ ist neu als Text gesetzt. Für beste Druckqualität bitte das Logo als **SVG, PDF oder PNG ab 2000 Pixel Breite** nachliefern; dann wird es ausgetauscht.
