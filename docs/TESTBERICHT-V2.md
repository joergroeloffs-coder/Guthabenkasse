# Testbericht Guthabenkasse 2.0

Getrennt nach **tatsächlich durchgeführt** (automatisch, wiederholbar: `tests/alle.sh`) und **nur theoretisch geprüft / nicht geprüft**.

Wichtig vorweg: Die Ablage lief in den Tests **nicht bei Google**, sondern in einer Nachbildung von Apps Script (`tests/gsh2.mjs`: DriveApp, LockService, MailApp nachgebaut). Die Geräte waren echte Chromium-Seiten (Playwright), die Anfragen an die Ablage wurden abgefangen und an diese Nachbildung weitergegeben. Das Verhalten von LockService, Drive-Kontingenten und Google-Weiterleitungen ist damit **nicht** erprobt.

## A. Tatsächlich durchgeführt

### Ablage (39 Prüfungen, alle grün) – `tests/test-server-v2.mjs`
| Situation aus dem Auftrag | Ergebnis |
|---|---|
| Aufbuchen am Terminal / Abbuchen am Verkaufsgerät | ok |
| Unberechtigtes Aufbuchen mit Verkaufswort (Ablage prüft) | abgelehnt (`recht`) |
| Karten anlegen / Karten mit Verkaufswort anlegen | ok / verweigert |
| Gleichzeitige Abbuchung derselben Karte von zwei Geräten (online) | die zweite wird abgelehnt (`guthaben`) |
| Offline gebuchte Abbuchung, die überzieht | angenommen, als Überziehung gekennzeichnet |
| Mehrfachübertragung derselben Buchung | zweimal gesendet, einmal wirksam (`doppelt`) |
| Verändertes Duplikat (gleiche ID, anderer Inhalt) | Original bleibt, Vermerk |
| Storno / Doppel-Storno / Storno von Storno / fremder Storno am Verkauf | einmal wirksam; die anderen abgelehnt |
| Karte ersetzen (inkl. Wiederholung), Guthaben übertragen | ok, einmalig |
| Gesperrte Karte | abgelehnt |
| Altkarte ohne Prüfnummer | funktioniert |
| Falsche Prüfnummer | abgelehnt |
| Viertes Gerät / zweites Gerät mit gleichem Buchstaben | abgewiesen |
| Verkauf sieht nur eigene Abrechnung; Terminal die Gesamtabrechnung | ok |
| Abschluss mit nicht übertragenen/ungeklärten Buchungen | nur „vorläufig“, endgültig verweigert |
| Kassenbuch (Anfang, Zählung, Doppeleintrag) | ok |
| Sicherung, Wiederherstellung (Verkauf/Kasse verweigert, Admin, Warnung bei neuerem Stand) | ok |
| Neues Fest nur Administrator | ok |
| Gerät mit Fassung 0.12 (`holen`/`legen`) gegen die neue Ablage | ok, keine Doppelten |

### Geräte (41 Prüfungen, alle grün) – `tests/test-app-v2.mjs`, `tests/test-app-v2b.mjs` (Chromium, Telefon-Fenster 390×780)
* Kartenerzeugung mit Prüfnummer, Anmeldung bei der Ablage; Aufbuchen am Terminal mit Bestätigung der Ablage.
* Abbuchen am Verkaufsgerät: Anzeige erst nach Bestätigung; Doppelscan wird blockiert (nur eine Buchung); falsche Prüfnummer; `buchen(…,"auf")` im Verkaufsprogramm wirft Fehler.
* **Verbindungsabbruch:** Offline-Abbuchung (Verkauf) und Offline-Aufbuchung (Terminal) werden als solche angezeigt, bleiben gespeichert und werden nach Rückkehr der Verbindung übertragen (Saldo stimmt).
* **Antwort geht verloren** (Ablage hat gebucht, Gerät erfährt es nicht): Gerät fragt mit derselben Kennung nach, zeigt Erfolg, **keine Doppelbuchung**.
* **Zwei Geräte buchen gleichzeitig** von derselben Karte: Saldo wird nie negativ.
* Storno per Doppelklick: genau eine Gegenbuchung.
* **Neustart:** Buchungen bleiben. **Lokaler Speicher fehlt oder ist beschädigt:** Bestand kommt aus IndexedDB zurück. **Speicherfehler** (localStorage wirft, IndexedDB aus): Buchung wird **nicht** gebucht, Ablage unverändert.
* Karte ersetzen über die Terminal-Oberfläche; alte Karte am Verkaufsgerät „gesperrt“, neue funktioniert.
* Anschreiben ist standardmäßig aus; Kein Minus am Verkauf.
* Verkaufsprogramm enthält die Bereiche Aufbuchen/Karten nicht.
* Manipulation: direkte Anfrage „Aufbuchen“ mit Verkaufswort wird von der Ablage abgelehnt.
* Gesamtabrechnung mit Kassensturz im Terminal.

### Bisherige Prüfreihen (27 aus Fassung 0.12) gegen das neue Terminal
Unverändert grün: **13 von 27** (3, 4, 5, 6 [Layout inkl. 320×568], 11, 13, 14, 16, 17, 18, 21, 22, 24) – das betrifft u. a. Kamera/Lesen, Ziffernblock, Layout ohne Scrollen, Trinkgeld, Aufrunden, Importformate xlsx/ods/csv, Übersetzungen.
Abweichend, **mit Absicht** (die Reihen prüfen altes Verhalten und wurden nicht angepasst): 1 (Doppelbuchungsschutz sperrt zweite gleiche Buchung innerhalb 5 s), 2/7/9 (altes Abgleichprotokoll holen→legen), 25/26 (Server-Reihen der alten Treuhand-Ablage), 10/12 (.xls entfernt), 19 (Anschreiben standardmäßig aus), 20/23 (neuer Reiter „Verwaltung“ war nicht übersetzt – inzwischen ergänzt, Reihen nicht erneut gelaufen), 8/15/27 (Schalter „Einklappen/Vollbild“ liegen nun unter „Weitere Geräteeinstellungen“ eingeklappt; die Reihen tippen darauf). **Nicht untersucht, ob dahinter noch weitere Unterschiede stecken.** Das sind Prüfreihen, die ersetzt oder angepasst werden müssten.

## B. Nur theoretisch geprüft / nicht geprüft
* Echte Google-Umgebung (Apps Script, LockService unter Last, Drive-Sicherungen, Mailversand).
* Echte Smartphones: Kamera, Blitz, schlechte Beleuchtung, QR-Lesen von gedruckten neuen Karten mit Prüfnummer (QR-Inhalt ist länger; Leseleistung nicht gemessen), Vollbild, Installation als Programm, Service Worker auf echtem Server (in den Tests nur `file://`, dort wird er nicht registriert).
* Kleine Smartphones: nur die bisherigen Layout-Reihen (320×568) liefen grün; die neuen Elemente (Bestätigungsreihe, Abrechnung, Statusanzeige) wurden mit 390×780 geprüft und angesehen.
* IndexedDB-Verhalten bei echtem Speicherplatzmangel/privatem Modus (nur das Wegfallen von localStorage wurde simuliert).
* Wiederherstellung der Ablage über die Oberfläche (nur serverseitig getestet).
* Mehrere Geräte über Stunden (Dauerbetrieb), echte Funklöcher.
* Neue Texte auf Türkisch/Englisch sind nur zum Teil übersetzt und nicht gegengelesen.
