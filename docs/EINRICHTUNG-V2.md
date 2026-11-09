# Guthabenkasse 2.0 – Terminal und Verkauf

Stand: Fassung 2.0.0. Steuerliche und rechtliche Fragen sind ausdrücklich nicht Gegenstand dieser Überarbeitung.

## Was neu ist

Aus der einen Datei sind zwei Programme geworden, die denselben Bestand nutzen:

| Programm | Datei | Wofür |
|---|---|---|
| **Terminal** | `guthabenkasse-terminal.html` | Aufbuchen, Abbuchen, Abfrage, Karten erstellen/drucken, Gästelisten, Stapel, Suche, Verlauf, Sperren/Ersetzen, Rücknahme/Korrektur, Geräteübersicht, Abschluss, Kassensturz, Sicherungen, erweiterte Einstellungen |
| **Verkauf** | `guthabenkasse-verkauf.html` | Nur Abbuchen und Abfragen, Schnellbeträge, Trinkgeld/Aufrunden (wählbar), eigene Buchungen, eigene Verkaufsabrechnung, Verbindungsanzeige |

Die Ablage (`ablage.gs`, Google Apps Script) ist jetzt der Wächter über das Guthaben: Sie nimmt jede Buchung an oder lehnt sie ab. Die Geräte zeigen „gebucht“ erst nach Bestätigung der Ablage – oder, wenn die Verbindung fehlt, ausdrücklich als **Offline-Buchung**.

| **Anzeige** | `guthabenkasse-anzeige.html` | Ein Gerät ohne Personal: Der Gast hält seine Karte vor die Kamera und sieht sein Guthaben (Deutsch, Türkisch, English). Zeigt nur den Bestand, bucht nichts, zählt nicht zu den drei Geräten. |

Weitere Dateien: `quelle/` (Kern + gemeinsame Schicht), `bauen/bauen.mjs` (erzeugt die beiden Programme), `sw.js` (Service Worker, hält beide Programme offline bereit), `manifest-terminal.webmanifest`, `manifest-verkauf.webmanifest`, Symbole (`icon-*.png` für das Terminal, `icon-verkauf-*.png` für Verkauf), `index.html` (Startseite mit zwei Links), `tests/`.

Neu bauen nach einer Änderung in `quelle/`: `node bauen/bauen.mjs`.

## Wo was liegt

* **Zentraler Bestand:** Datei `guthabenkasse-ablage.json` im Google Drive des Skript-Besitzers (wie bisher). Sicherungen daneben: `guthabenkasse-sicherung-…json`.
* **Auf jedem Gerät:** Browserspeicher (localStorage) **und** IndexedDB (zweite Kopie). Das Terminal behält den Speicherort der bisherigen Guthabenkasse (`guthabenkasse.v1`), das Verkaufsgerät hat einen eigenen.

## Einrichtung

### 1. Ablage (einmalig)
1. `ablage.gs` in ein neues Apps-Script-Projekt kopieren (Anleitung steht oben in der Datei).
2. Drei **verschiedene** Zugangswörter eintragen: `WORT_VERKAUF`, `WORT_KASSE`, `WORT_ADMIN`. Optional `BERICHT_AN` (Mail), `OFFLINE_LIMIT`.
3. Bereitstellen als Web-App (Ausführen als: ich; Zugriff: Jeder). Adresse (`…/exec`) merken.
4. **Wichtig bei Änderungen:** „Neue Version“ veröffentlichen, sonst läuft die alte weiter.

### 2. Terminal
1. `guthabenkasse-terminal.html` über die Internetadresse öffnen und „Zum Startbildschirm hinzufügen“.
2. Optionen → Ablage: Adresse und **Kassenwort** (`WORT_KASSE`) eintragen. Gerätezeichen (ein Buchstabe, z. B. `T`) und Name der Bedienung eintragen.
3. Verwaltung → Erweitert: Verwaltungs-PIN setzen (schützt am Gerät die Reiter Karten, Verwaltung, Optionen).

### 3. Verkaufsgerät
1. `guthabenkasse-verkauf.html` öffnen, installieren.
2. Optionen → Ablage: Adresse und **Verkaufswort** eintragen. Eigenes Gerätezeichen (z. B. `V`), Vorname der Bedienung.
3. Das Gerät lädt beim ersten Abgleich die Kartenliste. Ab dann: Betrag, scannen, fertig.

### 4. Zweites Verkaufsgerät
Wie 3, mit **anderem** Gerätezeichen (z. B. `W`). Insgesamt sind höchstens drei Geräte zugelassen (1 Terminal + 2 Verkauf). Ein viertes Gerät oder ein zweites mit demselben Buchstaben wird von der Ablage abgewiesen. Ein Gerät lässt sich unter Verwaltung → Erweitert (Administrator-Wort) aus der Liste entfernen.

## Karten und Guthaben der bisherigen Fassung
* Das Terminal liest den Bestand der bisherigen Guthabenkasse (0.12) am selben Browser sofort weiter: Karten, Namen, Buchungen, Prüfkette. Bestehende Buchungen werden beim ersten Abgleich der Ablage gemeldet (bereits bekannte erkennt sie an der Kennung und zählt sie nicht doppelt).
* Die vorhandene Ablagedatei wird beim ersten Zugriff von Version 2 automatisch übernommen (die Buchungen bekommen laufende Nummern der Ablage; nichts wird verändert).
* **Alte Karten** (`GK-A0007`) funktionieren weiter. **Neue Karten** tragen im QR-Code zusätzlich eine Prüfnummer (`GK-A0042-K7Q2`), die auf der Karte nicht ausgeschrieben steht. Das Verkaufsgerät bekommt die Prüfnummern von der Ablage nie zu sehen und kann deshalb nur gescannte Karten abbuchen, nicht erratene.
* Altgeräte mit Fassung 0.12 können weiter die alten Anweisungen (`holen`/`legen`) benutzen; empfohlen ist, alle Geräte umzustellen.

## Buchen
* **Schnellmodus:** Betrag eintippen, Karte scannen, Buchung läuft automatisch.
* **Sicherheitsmodus:** Karte scannen, Guthaben wird gezeigt, dann „Buchen“. Einstellung „Automatisch“: neue Bediener beginnen im Sicherheitsmodus und wechseln nach 10 Buchungen auf schnell.
* **Doppelbuchungsschutz:** Dieselbe Karte mit demselben Betrag innerhalb von 5 Sekunden wird nicht noch einmal gebucht; während einer laufenden Buchung sind weitere gesperrt.
* **Schneller Weg (Standard):** Das Ergebnis erscheint sofort; die Buchung ist auf dem Gerät gesichert und geht gleich danach an die Ablage. Lehnt die Ablage sie später ab (zum Beispiel Karte inzwischen gesperrt), erscheint eine Meldung, und die Buchung wird entfernt. Wer lieber erst die Bestätigung der Ablage sehen will, schaltet unter Verwaltung → Erweitert „Ergebnis erst zeigen, wenn die Ablage bestätigt hat“ ein (Verkaufsgerät: Einstellung am Terminal nicht verfügbar, dort gilt der schnelle Weg).
* **Ohne Verbindung (Offline-Strategie):** Das Verkaufsgerät darf je Karte bis zu einem Limit (Standard 20 €, einstellbar) offline abbuchen, sofern sein letzter Stand reicht. Begründung: Ein Fest ohne Netz soll weiterlaufen; das Risiko ist begrenzt. Die Ablage nimmt solche Buchungen später an; reicht das Guthaben dann nicht mehr (zwei Geräte), wird die Karte als **Überziehung** gekennzeichnet und im Abschluss rot ausgewiesen, nicht stillschweigend verworfen. Aufbuchen geht nur am Terminal.
* **Unklare Übertragung:** Bleibt die Antwort aus, fragt das Gerät mit derselben Buchungskennung noch einmal an (kein Risiko einer Doppelbuchung) und zeigt erst dann ein Ergebnis. Notfalls steht „Unklar – nicht noch einmal buchen“.

## Rücknahme (Storno)
Die Historie wird nie verändert: Eine Rücknahme ist eine Gegenbuchung mit fester Kennung `st-<Buchung>`, sie wirkt höchstens einmal (auch bei Doppelklick oder zwei Geräten). Eine Rücknahme lässt sich nicht zurücknehmen. Gerät, Bediener und Zeit stehen dabei. Das Verkaufsgerät darf nur seine **eigene letzte** Abbuchung innerhalb von 2 Minuten zurücknehmen. (Die frühere Funktion `nehmeZurueck()` konnte dieselbe Buchung mehrfach zurücknehmen; das ist behoben.)

## Karte ersetzen / sperren
Am Terminal: Karten → Karte antippen → „Karte ersetzen“ (neue Nummer + Prüfnummer, Guthaben wird übertragen, alte Karte gesperrt, neue wird gedruckt) oder „Sperren“. Gesperrte Karten lehnt die Ablage bei jedem Gerät ab. Das Ersetzen braucht Verbindung.

## Abrechnung
Bewusst einfach: **Terminal → Verwaltung → Auswerten** zeigt die aktuellen Zahlen aus der Ablage (Umsatz netto, Trinkgeld, noch auf Karten, aufgebucht, abgebucht, zurückgenommen, Auszahlungen, Korrekturen, je Gerät und je Bediener) und, falls Geräte noch Buchungen nicht übertragen haben, einen Hinweis. Dazu **Drucken** und **Per Mail senden**. Es gibt keinen Abschluss mit Freigabe, keinen Kassensturz und keine Quittierungen; was in der Kasse liegt, wird nicht gegengerechnet. (Die Ablage kann das technisch noch – Kassenbuch, Geräte-Meldungen, Prüfung –, die Oberfläche bietet es nicht mehr an.)
**Verkauf → Abrechnung:** Anzahl, Betrag, Rücknahmen, Trinkgeld des eigenen Geräts, Verbindungsstatus, drucken.

## Rollen
Die Rolle ergibt sich aus dem Zugangswort und wird **in der Ablage** geprüft, nicht nur in den Menüs: Verkauf darf abbuchen/abfragen/eigene letzte Buchung zurücknehmen; Kasse zusätzlich aufbuchen, Karten verwalten, Kassenbuch, Abschluss, Sicherung; Administrator zusätzlich Geräte, Einstellungen (Anschreiben, Offline-Limit), Wiederherstellen, neues Fest.

## Sicherungen
Die Ablage sichert sich automatisch (höchstens alle 20 Minuten bei Änderungen, die letzten 12 bleiben) und auf Knopfdruck. Wiederherstellen (Administrator): zuerst wird der jetzige Stand gesichert; ist die Ablage neuer als die Sicherung, fragt das Terminal ausdrücklich nach. Auf den Geräten: zwei Speicher + eine rotierende Kopie; beschädigte Daten werden erkannt und aus der Kopie geladen. Die bisherige Sicherungsdatei („Datei auf dieses Gerät speichern“) bleibt.

## Aufgeräumt
* Trinkgeld-Tasten und Aufrunden: eine Einstellung („Aus / Tasten / Tasten + Aufrunden“).
* Rolle „Nur Aufbuchen/Nur Abbuchen“ entfällt (jedes Programm hat seine Rolle).
* Licht/Ton/Vollbild unter „Weitere Geräteeinstellungen“ eingeklappt; manuelles Abgleichen unter „Erweitert“; der Abgleich läuft automatisch (alle 15 s, nach jeder Buchung, bei „wieder online“).
* Anschreiben (Minus) ist **standardmäßig aus**; Einschalten nur mit Administrator-Wort (Verwaltung → Erweitert).
* Tabellenimport: .xls, .xml (Excel 2003) und .html werden nicht mehr gelesen; .xlsx, .ods, .csv und Einfügen aus Excel bleiben.
* Das Verkaufsprogramm blendet Karten-, Druck- und Verwaltungsbereiche aus.

## Bekannte Einschränkungen
Siehe `docs/TESTBERICHT-V2.md` (ehrlich getrennt: tatsächlich getestet / nur theoretisch geprüft).
* Neue Bedienelemente sind nur auf Deutsch (Türkisch/Englisch kennen sie noch nicht; die bisherigen Texte bleiben übersetzt). Die Bedienungsanleitung (Stand 0.11) ist nicht auf 2.0 aktualisiert.
* Der Programmcode des Verkaufsgeräts enthält noch den gesamten Kern; gesperrt sind die Bedienelemente und – maßgeblich – die Rechte in der Ablage.
* Die PIN schützt nur die Oberfläche eines Geräts. Das Wort steht im Gerät gespeichert.
* Gerätekennung: Die Ablage bindet einen Buchstaben beim ersten Kontakt an einen Schlüssel; wer den Gerätespeicher löscht, braucht den Eintrag in der Geräteliste „entfernen“.

## Anzeigegerät für Gäste
1. Im Skript `WORT_ANZEIGE` eintragen (ein viertes, eigenes Wort), neue Version veröffentlichen.
2. Ein Tablet oder Handy am Tresen aufstellen (Kamera zum Gast), `guthabenkasse-anzeige.html` über https öffnen und installieren, Kamera erlauben.
3. **Fünf schnelle Tipps auf die Überschrift** öffnen die Einrichtung: Adresse der Ablage, Anzeige-Wort, Standardsprache, Kamera (vorn/hinten), Hinweis zur Rückgabe.
4. Der Gast hält die Karte vor, sieht das Guthaben 9 Sekunden lang und kann die Sprache wechseln (springt nach 45 Sekunden zurück).
Die Ablage erlaubt diesem Wort nur die Abfrage `bestand`: Nichts wird geschrieben, nichts anderes erlaubt, höchstens 30 Abfragen je Minute. Karten mit Prüfnummer lassen sich nur mit vollständigem QR-Inhalt abfragen. **Grenze:** Alte Karten ohne Prüfnummer fragt die Ablage allein über die Nummer ab; jemand, der das Anzeigegerät aufbricht und das Wort ausliest, könnte so (langsam) Nummern durchprobieren.
