# Guthabenkasse 2 – Bestandsaufnahme und Konzept

Stand der Vorlage: Fassung 0.12.0 (`index.html`, eine Datei, ~430 KB, davon ~270 KB die QR-Lesebibliothek jsQR).
Gilt für: ein Hauptterminal, höchstens zwei Verkaufsgeräte.

## 1. Bestandsaufnahme (Befunde)

| Bereich | Befund | Folge |
| --- | --- | --- |
| Speicher | `localStorage`, ein JSON mit allem (inkl. aller Buchungen); `sichern()` ist synchron, Fehler werden nur als Warnband gezeigt | Buchungen wachsen gegen die 5-MB-Grenze; Erfolg wird angezeigt, bevor die Speicherung bestätigt ist |
| Abgleich | holen → alles zusammenführen → ganzen Stand zurücklegen (`holen`/`legen`); jedes Gerät schickt bei jedem Abgleich **alle** Buchungen | wächst mit dem Abend; keine Prüfung des Guthabens beim Abbuchen auf dem Server |
| Gleichzeitig abbuchen | Zwei Geräte prüfen das Guthaben nur lokal; beide dürfen dasselbe Guthaben ausgeben, der Abgleich zeigt dann Minus | kein atomarer Schutz |
| Doppelbuchung | Buchungen haben eindeutige IDs, Zusammenführen ist idempotent. Aber: schnelles Doppeltippen/zweimal Scannen wird nur durch eine 5-Sekunden-Sperre im Scanner gebremst, nicht durch die Buchung selbst | muss auf Buchungsebene abgesichert werden |
| `nehmeZurueck()` | Prüft **nicht**, ob die Buchung schon zurückgenommen wurde; die Schaltfläche wird nur ausgeblendet. Die Gegenbuchung bekommt eine zufällige ID. Nehmen zwei Geräte dieselbe Buchung zurück (oder ein Gerät, bevor der Abgleich lief), entstehen **zwei wirksame Gegenbuchungen**. Auch eine Rücknahme einer Rücknahme ist nicht gesperrt | Fehler; wird durch deterministische Rücknahme-ID und Serverprüfung behoben |
| Rechte | Es gibt keine. „Nur Abbuchen“ ist ein Schalter im Gerät (`db.rolle`), der Server kennt nur ein Zugangswort | Verkaufsgerät könnte aufbuchen, wer die Adresse+Wort hat, alles |
| Kartenkennung | `GK-A0001`: Gerätebuchstabe + laufende Nummer, **erratbar**; unbekannte Nummer = neue leere Karte | muss geschützt werden; Altkarten müssen weiter gelten |
| Sperren/Ersetzen | gibt es nicht (nur „löschen“, wenn Guthaben 0) | neu |
| Gerätekennung | ein Buchstabe, vom Menschen eingestellt; zwei Geräte mit demselben Buchstaben sind möglich | muss eindeutig und geprüft sein |
| Service Worker | keiner. Offline-Start nur, solange der Browser die Seite im Zwischenspeicher hat | neu: Service Worker je App |
| Kassensturz | gibt es nicht | neu |
| Geräteübersicht | gibt es nicht (nur Abgleichszeile) | neu |
| QR | Inhalt `GK-A0001`; Leser: `BarcodeDetector`, sonst jsQR; 5-s-Sperre gegen Mehrfachlesung | Format bleibt lesbar |
| Ablage (Google Apps Script) | `ablage.gs` vorhanden und geprüft (Fassung 0.11: nur anhängen, Prüfkette, Bericht). Aktionen: `holen`, `legen`, `neubeginn`, `bericht` | wird zu Version 2 erweitert, alte Aktionen bleiben für die alte App |

## 2. Konzept (die einfachste zuverlässige Architektur)

**Zwei Programme, eine Ablage.**
`guthabenkasse-terminal.html` (Kasse + Verwaltung) und `guthabenkasse-verkauf.html` (nur Abbuchen) werden aus **denselben Quellteilen** gebaut (`quelle/`, `bauen/bauen.mjs`): gemeinsamer Kern (Daten, Buchungslogik, Abgleich, Kamera, Ziffernblock, Sprachen) plus je eine eigene Oberfläche. Jede Datei ist in sich vollständig (Kern eingebaut), startet allein und hat eigenes Manifest, eigenen Service Worker und eigene Symbole.

**Die Ablage entscheidet.** Der Server (Apps Script) ist die einzige Instanz, die Guthaben prüft und Buchungen annimmt:
- Jede Buchung hat eine eindeutige ID; dieselbe ID wird nie zweimal wirksam (Idempotenz).
- Der Server vergibt eine laufende Nummer `s`; Geräte holen nur, was nach ihrer letzten Nummer kam (kein Übertragen des ganzen Bestands mehr).
- Eine Abbuchung wird **atomar** (unter Sperre) gegen das Serverguthaben geprüft und abgelehnt, wenn es nicht reicht.
- **Rollen werden am Server geprüft** über drei getrennte Zugangswörter: *Verkauf*, *Kasse*, *Administrator*. Das Verkaufswort kann nur abbuchen, abfragen und die eigene letzte Buchung zurücknehmen. Aufbuchen, Karten, Rücknahmen fremder Buchungen, Sicherungen, Neubeginn werden vom Server abgewiesen – auch wenn jemand die App verändert.
- Höchstens **3 Geräte**; jedes hat eine eindeutige Kennung (Buchstabe + zufälliger Schlüssel); ein zweites Gerät mit demselben Buchstaben wird abgewiesen.

**Offline-Strategie (begründet).** Gewählt: *begrenzte Offline-Abbuchung.* Eine Abbuchung ohne Verbindung ist nur erlaubt, wenn (a) das zuletzt bekannte Guthaben der Karte den Betrag deckt und (b) die Offline-Abbuchungen dieses Geräts für diese Karte zusammen höchstens das **Offline-Limit** (voreingestellt 20,00 €) betragen. Sie wird als „OFFLINE – vorläufig“ gezeigt und beim Abgleich geprüft; reicht das Guthaben dann nicht, wird sie als **Überziehung** gekennzeichnet (nicht stillschweigend verworfen) und taucht im Abschluss auf. Begründung: bei höchstens drei Geräten ist das größte mögliche Minus je Karte klein und bekannt (Limit × Zahl der anderen Geräte); eine völlige Sperre würde bei schwachem Funk den Verkauf anhalten, unbegrenzte Offline-Abbuchung wäre eine vorgetäuschte Sicherheit. Aufbuchen und Abfragen sind offline möglich, aber vorläufig.

**Speicherung.** Buchungen im Gerät in **IndexedDB** (Buchung wird erst als gebucht gezeigt, wenn die Transaktion bestätigt ist), Einstellungen weiter in `localStorage`; Migration beim ersten Start.

**Stornos.** Gegenbuchung mit fester ID `st-<ID der Buchung>`: wiederholtes Stornieren trifft immer dieselbe Buchung und wirkt höchstens einmal; Stornieren einer Stornierung ist gesperrt. Verkauf darf nur die **eigene letzte** Abbuchung der letzten 2 Minuten zurücknehmen, vom Server geprüft.

**Karten.** Neue Karten tragen eine zufällige Prüfnummer (`GK-A0042-K7Q2`), die der Server kennt; Altkarten (`GK-A0042`) gelten weiter, solange sie nicht ersetzt wurden. Sperren und Ersetzen am Terminal (Kasse), vom Server durchgesetzt.

## 3. Was bleibt, was wird verschoben, was entfällt

Bleibt: Scanner, manuelle Eingabe, Schnellbeträge, Historie, Kartendruck 85×54 mm, Gästelisten-Import, Stapel, Sprachen, Trinkgeld, Treuhand-/Berichtsfunktion der Ablage, Abgleich.
Verschoben in die geschützte Verwaltung (Terminal): Karten, Stapel, Import, Druck, Korrekturen, Abschluss, Sicherungen, Geräte, erweiterte Einstellungen, manueller Abgleich.
Zusammengefasst: Trinkgeld und Aufrunden (eine Gruppe „Trinkgeld“ mit zwei Wegen).
Standardmäßig aus: Anschreiben (negatives Guthaben).
Nicht mehr vorgesehen: das Bearbeiten des Datenbestands vom Verkaufsgerät aus.
