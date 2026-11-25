# Lokale Ablage (ohne Google)

Die lokale Ablage ist **dieselbe Ablage wie `ablage.gs`**, nur läuft sie auf einem Laptop im eigenen WLAN. Die Apps (Terminal, Verkauf, Anzeige) bleiben gleich. Die Geräte öffnen die Seite vom Laptop, die Adresse der Ablage ist dort schon eingetragen.

Vorteile: keine Google-Wartezeiten, kein Internet nötig, kein Google-Konto, keine „Neue Version“-Veröffentlichung.
Nachteil: Der Laptop ist die einzige Stelle mit dem Bestand. Er muss laufen, Strom haben und gesichert werden.

## Was du brauchst
- Einen Laptop (Windows, Mac oder Linux) mit **Node.js ab Version 18** (https://nodejs.org, „LTS“).
- Für HTTPS (Kamera auf Handys und Tablets): das Programm **openssl**. Auf Mac und Linux ist es dabei. Unter Windows steckt es in **Git für Windows** (https://git-scm.com), das genügt.
- Ein WLAN ohne Internetzwang (zum Beispiel ein kleiner Reise-Router) mit ausgeschalteter Geräteisolierung („AP/Client Isolation“).
- Eine **feste Adresse für den Laptop** (im Router „DHCP-Reservierung“). Ändert sich die Adresse, müssen die Geräte neu eingerichtet werden.

## Einrichten (einmal)
1. Den Ordner `paket` (oder das entpackte ZIP) auf den Laptop kopieren.
2. Windows: `start.bat` doppelklicken. Mac/Linux: im Ordner `./start.sh`.
3. Beim ersten Start entsteht `config.json` mit **zufälligen Zugangswörtern** für Verkauf, Kasse, Admin, Anzeige sowie Bestellung aufnehmen und Bestellanzeige (App „Bestellung“). Sie stehen im Fenster und in `config.json`. Notieren, oder in `config.json` ändern und neu starten.
4. Das Fenster zeigt die Adressen, zum Beispiel `https://192.168.8.20:8443/`. Diese auf jedem Gerät im Browser öffnen.
5. **Zertifikat bestätigen** (einmal je Gerät): Der Browser warnt, weil das Zertifikat selbst erstellt ist. „Erweitert“ → „Weiter zu … (unsicher)“ (iPhone: „Details“ → „Diese Website besuchen“). Der Verkehr bleibt im eigenen WLAN.
6. Auf der Startseite die Aufgabe wählen (Terminal, Verkauf, Anzeige), das passende Zugangswort eintragen. Die Adresse der Ablage ist schon eingesetzt.

Ohne openssl läuft nur HTTP (`http://…:8080/`). Dann geht die Kamera nur am Laptop selbst, nicht auf den anderen Geräten.

## Im Betrieb
- Das Fenster des Programms offen lassen. Es zeigt kurz, was passiert. Beenden mit Strg+C.
- **Die Daten** liegen im Ordner `daten`: `guthabenkasse-ablage.json` ist der Bestand. Die Ablage legt dort automatisch Sicherungen an (`guthabenkasse-sicherung-…`, alle 20 Minuten bei Änderungen, die letzten zwölf bleiben). Der ganze Ordner `daten` lässt sich auf einen Stick kopieren.
- **Sicherung außerhalb des Laptops:** am Ende des Abends den Ordner `daten` auf einen Stick kopieren.
- **Notfall (Laptop fällt aus):** Geräte buchen offline weiter. Programm auf einem anderen Rechner starten, den Ordner `daten` dorthin kopieren, die neue Adresse in den Geräten eintragen.
- Energiesparen des Laptops ausschalten (Ruhezustand, Bildschirmschoner mit Sperre), und den Laptop ans Netz.

## Mail mit der Abrechnung
Ohne Einstellung speichert die Ablage jede Abrechnung als Datei in `daten/abrechnungen`. Für den Versand per Mail in `config.json` unter `smtp` den Mailserver eintragen (`host`, `port` 587 oder 465, `benutzer`, `passwort`, `von`) und unter `bericht_an` die Empfänger. Die Meldung „Mail gesendet“ kommt, sobald der Versand angestoßen ist. Ob er gelang, steht im Fenster des Programms.

## Weitere Einstellungen (`config.json`)
- `port_http`, `port_https`: die Ports (Standard 8080 und 8443).
- `konstanten`: Werte aus `ablage.gs`, zum Beispiel `{ "OFFLINE_LIMIT": 2000, "MAX_GERAETE": 4 }`.
- `https: false` schaltet HTTPS ab.

## Grenzen
- Selbst erstelltes Zertifikat: Jedes Gerät muss es einmal bestätigen. Auf manchen Geräten (vor allem iPhones) erscheint die Warnung nach einiger Zeit wieder.
- Erreichbar ist die Ablage nur im selben WLAN. Von außen geht nichts.
- Die Technik ist mit Tests geprüft, auf echten Geräten im Saal aber noch nicht. Vor dem ersten Einsatz einen Probelauf machen (siehe Probefest-Plan).
