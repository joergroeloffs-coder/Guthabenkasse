// Baut den Probefest-Plan (A4, drei Seiten) als HTML und PDF.   Aufruf: node docs/probefest/bauen.mjs
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import { writeFileSync } from 'node:fs';
const HIER = new URL('./', import.meta.url).pathname;
const pk = l => '<ul class="pk">' + l.map(x => '<li>' + x + '</li>').join('') + '</ul>';
const zeile = (nr, was, erwartet) => `<tr><td class="n">${nr}</td><td>${was}</td><td>${erwartet}</td><td class="k">☐</td></tr>`;
const szenen = [
  ['Karte nicht lesbar', 'Karte verdecken, dann Nummer samt Prüfnummer eintippen', 'Buchung klappt'],
  ['Verbindung weg', 'Router oder WLAN am Verkaufsgerät 1 Minute aus, 2 Karten abbuchen, WLAN wieder an', '„Offline gebucht“, danach erscheinen beide Buchungen in der Abrechnung'],
  ['Über dem Offline-Limit', 'Offline mehr als 20 € auf einer Karte abbuchen', '„Unklar – nicht noch einmal buchen“, kein Doppelbuchen'],
  ['Gleiche Karte, zwei Geräte', 'Karte mit 10 € Guthaben: beide Verkaufsgeräte buchen gleichzeitig je 8 €', 'Genau eine Buchung klappt, die zweite wird abgelehnt (Guthaben)'],
  ['Falsche Buchung', 'Am Verkaufsgerät zurücknehmen (unter 2 Min.), dann am Terminal eine ältere Buchung', 'Guthaben wieder da, Abrechnung zeigt „Zurückgenommen“'],
  ['Karte sperren und ersetzen', 'Karte sperren, andere ersetzen (Guthaben zieht um)', 'Gesperrte Karte wird überall abgelehnt'],
  ['Anzeige für Gäste', 'Gast hält Karte vor die Anzeige, mit Schlange (3 Gäste kurz hintereinander)', 'Animation, dann Betrag; Gäste verstehen es ohne Erklärung'],
  ['Gerät fällt aus', 'Handy ausschalten, Ersatzgerät einrichten, weiterbuchen', 'Keine Buchung fehlt, nichts doppelt'],
  ['Auszahlung', 'Restguthaben einer Karte auszahlen, Karte nochmal scannen', '„Nichts auszuzahlen“'],
  ['Abend abschließen', 'Am Ende „Abend abschließen“ ausführen, danach Karte abfragen', 'Guthaben bleibt, Abrechnung beginnt neu'],
].map((s, i) => zeile(i + 1, s[0] + ': ' + s[1], s[2])).join('');
const html = `<!doctype html><html lang="de"><head><meta charset="utf-8"><title>Probefest-Plan Guthabenkasse</title><style>
@page{size:A4;margin:0}*{box-sizing:border-box}
body{margin:0;font-family:'Liberation Sans',Arial,sans-serif;color:#10251A;font-size:10pt;line-height:1.35}
.seite{width:210mm;height:297mm;padding:13mm 15mm;page-break-after:always;overflow:hidden;position:relative}
h1{font-family:Georgia,serif;font-size:21pt;margin:0 0 2mm}h1 small{display:block;font-size:10pt;font-family:'Liberation Sans',Arial,sans-serif;color:#57685C;font-weight:400;margin-top:1mm}
h2{font-size:12.5pt;margin:4mm 0 1.5mm;border-bottom:2px solid #1E5C3E;padding-bottom:.5mm}
.pk{list-style:none;margin:0;padding:0}.pk li{padding:0.9mm 0 0.9mm 6mm;position:relative}.pk li::before{content:"☐";position:absolute;left:0}
table{width:100%;border-collapse:collapse;margin-top:1mm;font-size:9.3pt}th{background:#F5EEDC;text-align:left;padding:1.6mm;border:1px solid #8a7a52}td{border:1px solid #8a7a52;padding:1.5mm;vertical-align:top}td.n{width:7mm;text-align:center}td.k{width:9mm;text-align:center;font-size:12pt}
.box{background:#F5EEDC;border-left:4mm solid #B08D3C;padding:2.5mm 4mm;margin:3mm 0;border-radius:2mm}.box p{margin:0}
.fuss{position:absolute;left:15mm;right:15mm;bottom:10mm;display:flex;justify-content:space-between;font-size:9pt;color:#57685C;border-top:1px solid #CDB77E;padding-top:2mm}
.mess td{height:8mm}
</style></head><body>
<section class="seite"><h1>Probefest-Plan Guthabenkasse<small>Zum Abhaken. Gedacht für ein Fest mit etwa 150 Karten und zwei Bedienungen. Auch als Probelauf zu Hause möglich (siehe Seite 3).</small></h1>
<h2>A · Eine Woche vorher</h2>${pk([
 'Ablage prüfen: Adresse im Browser öffnen, die Infoseite mit der Skriptfassung erscheint. Zugangswörter notiert und sicher aufbewahrt.',
 'Geräte festlegen: <b>1 Terminal, 2 Verkauf, 1 Anzeige</b>, dazu 1 Ersatzgerät. Alle laden und mit der Startseite einrichten.',
 'Alle Geräte neu laden, Version prüfen (gleiche Nummer auf allen).',
 'Karten drucken: Anzahl der Gäste plus etwa <b>10 Reserve</b>. Ein Druckprobe-Blatt zuerst, Schneide- und Scan-Probe.',
 'Gästeliste einlesen (falls Namen auf die Karten sollen).',
 'Notfallplan und Papierliste ausdrucken (je 1 Stück je Gerät und am Terminal).',
 'Powerbanks, Kabel, Ersatznetzteil, Stativ oder Ständer für die Anzeige, Stifte für die Papierliste.',
 'Wenn ein eigener Router genutzt wird: Probe mit allen Geräten, auch im Saal, nicht nur im Büro.'])}
<h2>B · Aufbau, 1–2 Stunden vorher</h2>${pk([
 'Router und Ablage laufen, alle Geräte zeigen „Online“ und sind in der Geräteliste sichtbar.',
 'Kamera-Probe <b>im abgedunkelten Saal</b>: mit „Licht“ und ohne. Wo steht die Anzeige so, dass sie niemand blendet?',
 '3 Testkarten aufbuchen und abbuchen. Danach einmal alles zurücknehmen oder auszahlen, damit die Abrechnung sauber startet.',
 'Zugang zu Verwaltung und Abrechnung am Terminal geprüft (PIN, Administrator-Wort).',
 'Bedienungen kurz eingewiesen: Abbuchen, Zurücknehmen (2 Minuten), Notfallplan.'])}
<div class="box"><p><b>Zeitnehmer:</b> Eine Person stoppt während des Festes bei zehn Gästen die Dauer vom „Karte hinhalten“ bis „gebucht“ (Verkauf) und vom Aufbuchen (Terminal). Die Werte kommen auf Seite 3.</p></div>
<div class="fuss"><span>Guthabenkasse · Probefest-Plan</span><span>Seite 1 von 3</span></div></section>

<section class="seite"><h1>C · Während des Festes<small>Diese Fälle gezielt auslösen. Nicht alle auf einmal, verteilt auf den Abend. Einträge: ☐ geklappt, sonst Notiz.</small></h1>
<table><tr><th>#</th><th>Was tun</th><th>Das soll passieren</th><th>✔</th></tr>${szenen}</table>
<h2>Laufend beobachten</h2>${pk([
 'Zeigen alle Geräte durchgehend „Online“? Wie oft „Offline“ oder „Unklar“?',
 'Fragen die Gäste, wie man die Karte benutzt? Welche Frage kommt am häufigsten?',
 'Wartet jemand an der Theke länger als 1 Minute? Warum (Kamera, Betrag tippen, Verbindung)?',
 'Karten, die nicht lesbar sind: Nummern notieren (Druck oder Material?).',
 'Hat jemand eine Buchung nicht verstanden (Trinkgeld, Aufrunden)? Was war unklar?'])}
<div class="fuss"><span>Guthabenkasse · Probefest-Plan</span><span>Seite 2 von 3</span></div></section>

<section class="seite"><h1>D · Danach<small>Auswerten, solange alles frisch ist.</small></h1>
<h2>Abrechnung prüfen</h2>${pk([
 'Am Terminal in der Verwaltung <b>Auswerten</b>. Alle Geräte ohne offene Buchungen? Papierliste vollständig nachgebucht?',
 'Rechenprobe: <b>Aufgebucht − Umsatz − Trinkgeld − Ausgezahlt = Noch auf Karten</b>. Stimmt das auf den Cent? (Bei Korrekturen, Übertrag oder Fundkarten die entsprechenden Zeilen berücksichtigen.)',
 'Stichprobe: 5 Karten aus dem Verlauf mit den Aufbuchungsbelegen des Gastgebers vergleichen.',
 'Restguthaben ausgezahlt oder mit dem Gastgeber geklärt. Sicherung der Ablage vorhanden (Verwaltung → Sicherungen).'])}
<h2>Messwerte</h2>
<table class="mess"><tr><th style="width:62mm">Was</th><th>Wert</th><th>Ziel</th></tr>
<tr><td>Dauer pro Abbuchung (Median)</td><td></td><td>unter 5 Sekunden</td></tr>
<tr><td>Dauer pro Aufbuchung</td><td></td><td>unter 10 Sekunden</td></tr>
<tr><td>Doppelbuchungen</td><td></td><td>0</td></tr>
<tr><td>Offline- und „Unklar“-Fälle</td><td></td><td>selten, alle geklärt</td></tr>
<tr><td>Unleserliche Karten</td><td></td><td>unter 2 von 100</td></tr>
<tr><td>Abrechnung stimmt auf den Cent</td><td></td><td>ja</td></tr></table>
<h2>Rückmeldungen</h2>
<table class="mess"><tr><th style="width:62mm">Wer</th><th>Was war gut, was hat gestört?</th></tr><tr><td>Bedienung 1</td><td></td></tr><tr><td>Bedienung 2</td><td></td></tr><tr><td>Gastgeber</td><td></td></tr><tr><td>Gäste (3 Stimmen)</td><td></td></tr></table>
<div class="box"><p><b>Kleiner Probelauf ohne Fest (45 Minuten, zu Hause):</b> 4 Geräte, 20 Karten, Router wie später. Spielt Abschnitt C durch, einer als Gast, einer an der Theke. Das zeigt die meisten Fehler schon vorher und kostet nur einen Abend.</p></div>
<div class="fuss"><span>Datum: ____________ · Ort: ____________</span><span>Seite 3 von 3</span></div></section></body></html>`;
writeFileSync(HIER + 'Probefest-Plan.html', html);
const b = await chromium.launch(); const p = await b.newPage();
await p.goto('file://' + HIER + 'Probefest-Plan.html');
await p.pdf({ path: HIER + 'Probefest-Plan.pdf', format: 'A4', printBackground: true, preferCSSPageSize: true });
console.log('Seiten laufen über:', (await p.evaluate(() => [...document.querySelectorAll('.seite')].map(s => s.scrollHeight > s.clientHeight + 1))).join(', '));
await b.close();
