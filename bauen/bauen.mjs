// Baut aus dem Kern (quelle/kern.html) und der Schicht (quelle/v2-schicht.js)
// die zwei Programme: guthabenkasse-terminal.html und guthabenkasse-verkauf.html
import { readFileSync, writeFileSync } from 'node:fs';
const wurzel = new URL('../', import.meta.url).pathname;
const lies = p => readFileSync(wurzel + p, 'utf8');
const VERSION = '2.0.0';
const kern = lies('quelle/kern.html');
const schicht = lies('quelle/v2-schicht.js');

const css = `
.syncChip{display:inline-block;font-size:12px;padding:3px 9px;border-radius:99px;background:rgba(255,255,255,.12);color:#fff;white-space:nowrap;font-weight:600}
.syncChip.s-ok{background:#2f6b44}.syncChip.s-warte{background:#8a6a12}.syncChip.s-offline{background:#8a4a12}.syncChip.s-fehler{background:#9a2b22}.syncChip.s-aus{background:#555}.syncChip.s-ok,.syncChip.s-warte,.syncChip.s-offline,.syncChip.s-fehler,.syncChip.s-aus{color:#fff}
.s-ok{color:#1f6b3f}.s-warte{color:#8a6a12}.s-offline{color:#a0560f}.s-fehler{color:#9a2b22}
div.rolle{overflow-x:auto}table.tab{width:100%;border-collapse:collapse;font-size:13px}table.tab td,table.tab th{padding:5px 6px;border-bottom:1px solid var(--linieFein);text-align:left;vertical-align:top}table.tab td.n{text-align:right;white-space:nowrap}
.schmalKopf .syncChip{font-size:11px;padding:2px 7px}
details.mehr{margin-top:14px}details.mehr>summary{cursor:pointer;font-weight:600;padding:8px 0}
@media print{#syncChip,#syncChip2{display:none}}
`;

function bau(modus) {
  let h = kern;
  const ersetze = (a, b, alle = false) => {
    if (!h.includes(a)) throw new Error('Anker fehlt (' + modus + '): ' + a.slice(0, 60));
    h = alle ? h.split(a).join(b) : h.replace(a, () => b);
  };
  const name = modus === 'terminal' ? 'Guthabenkasse Terminal' : 'Guthabenkasse Verkauf';
  ersetze('var VERSION = "0.12.0";', 'var VERSION = "' + VERSION + '";');
  ersetze('<title>Guthabenkasse · Fering Vereinsmanager</title>', '<title>' + name + ' · Fering Vereinsmanager</title>');
  ersetze('href="manifest.webmanifest"', 'href="manifest-' + modus + '.webmanifest"');
  ersetze('content="Guthabenkasse"', 'content="' + (modus === 'terminal' ? 'GK Terminal' : 'GK Verkauf') + '"');
  ersetze('qrSvg(kartenCode(nr))', 'qrSvg(qrText(nr))');
  ersetze('</style>\n</head>', css + '</style>\n</head>');
  // Statusanzeige in Kopf und schmaler Leiste
  ersetze('<span class="schmalFassung" id="schmalFassung"></span>', '<span class="schmalFassung" id="schmalFassung"></span><span class="syncChip" id="syncChip2"></span>');
  ersetze('<span class="version" id="version"></span>', '<span class="version" id="version"></span> <span class="syncChip" id="syncChip"></span>');
  ersetze('<div class="marke">Fering Vereinsmanager · Guthabenkasse', '<div class="marke">Fering Vereinsmanager · ' + (modus === 'terminal' ? 'Guthabenkasse Terminal' : 'Guthabenkasse Verkauf'));

  // Reiter
  if (modus === 'terminal') {
    ersetze('<button data-reiter="einstellungen">', '<button data-reiter="verwaltung">Verwaltung</button>\n    <button data-reiter="einstellungen">');
    ersetze('</main>', '<section id="reiter-verwaltung" class="hide"><div id="verwaltungInhalt"></div></section>\n</main>');
  } else {
    ersetze(/* nav */ '<button data-reiter="auf" aria-current="true">Aufbuchen</button>\n    <button data-reiter="ab">Abbuchen</button>\n    <button data-reiter="karten">Karten</button>',
      '<button data-reiter="ab" aria-current="true">Abbuchen</button>\n    <button data-reiter="meine">Abrechnung</button>');
    // Aufbuchen- und Karten-Bereiche gibt es hier nicht
    const a1 = h.indexOf('<!-- =========================== AUFBUCHEN');
    const a2 = h.indexOf('<!-- =========================== ABBUCHEN');
    h = h.slice(0, a1) + h.slice(a2);
    const k1 = h.indexOf('<!-- ============================ KARTEN');
    const k2 = h.indexOf('<section id="reiter-einstellungen"');
    h = h.slice(0, k1) + '<section id="reiter-meine" class="hide"><div class="karte"><div class="titel"><h2>Meine Abrechnung</h2></div><div class="inhalt" id="meineInhalt"></div></div></section>\n\n' + h.slice(k2);
    h = h.replace('id="reiter-ab" class="schirm breit phase-eingabe hide"', 'id="reiter-ab" class="schirm breit phase-eingabe"');
    // Einstellungen: Anlass und Neubeginn entfallen
    cutKarte('Anlass'); cutKarte('Sicherung und Neubeginn');
  }
  function cutKarte(titel) {
    const s = h.indexOf('<div class="karte"><div class="titel"><h2>' + titel + '</h2>');
    if (s < 0) throw new Error('Karte fehlt ' + titel);
    const e = h.indexOf('\n  <div class="karte"><div class="titel">', s + 10);
    const ende = e < 0 ? h.indexOf('</section>', s) : e;
    h = h.slice(0, s) + h.slice(ende);
  }

  // Einstellungen: Geräteeinstellungen reduzieren
  const rolle1 = h.indexOf('<div class="feldTitel" style="margin-top:14px">Wofür dieses Gerät da ist</div>');
  const rolle2 = h.indexOf('<div class="reihe" style="margin-top:14px">\n        <label class="feld" style="width:120px">');
  if (rolle1 < 0 || rolle2 < 0) throw new Error('Rollenblock nicht gefunden');
  h = h.slice(0, rolle1) + h.slice(rolle2);
  // "Weitere Einstellungen" einklappen: von Licht bis vor Trinkgeld
  ersetze('<div class="reihe" style="margin-top:14px">\n        <label class="feld grow"><span>Licht beim Scannen', '<details class="mehr"><summary>Weitere Geräteeinstellungen (Licht, Ton, Vollbild)</summary>\n      <div class="reihe" style="margin-top:14px">\n        <label class="feld grow"><span>Licht beim Scannen');
  const t1 = h.indexOf('<div class="reihe" style="margin-top:14px">\n        <label class="feld grow"><span>Trinkgeld-Tasten nach dem Abbuchen');
  const t2 = h.indexOf('<div class="reihe" style="margin-top:14px">\n        <label class="feld grow"><span>Anschreiben: höchstens');
  const t3 = h.indexOf('<div class="reihe" style="margin-top:14px">\n        <label class="feld grow"><span>Trinkgeld-Tasten rechnen in');
  if (t1 < 0 || t2 < 0 || t3 < 0) throw new Error('Trinkgeldblock nicht gefunden');
  const neuTrink = '</details>\n      <div class="reihe" style="margin-top:14px">\n        <label class="feld grow"><span>Trinkgeld</span>\n          <div class="wahl" id="wahlTrinkModus"><button data-tm="aus">Aus</button><button data-tm="tasten">Tasten</button><button data-tm="beides">Tasten + Aufrunden</button></div></label>\n      </div>\n      ';
  h = h.slice(0, t1) + neuTrink + h.slice(t3); // Anschreiben-Zeile + Hinweis entfallen (jetzt unter Verwaltung → Erweitert)
  // Ablage: manuelle Bedienung in „Erweitert“
  ersetze('<div class="reihe" style="margin-top:10px">\n        <label class="feld grow"><span>Abgleich</span>', '<details class="mehr"><summary>Erweitert: von Hand abgleichen</summary>\n      <div class="reihe" style="margin-top:10px">\n        <label class="feld grow"><span>Abgleich</span>');
  ersetze('<button class="knopf" id="btnWolkePruefen">Verbindung prüfen</button>\n      </div>', '<button class="knopf" id="btnWolkePruefen">Verbindung prüfen</button>\n      </div></details>');
  if (modus === 'verkauf') {
    ersetze('</style>\n</head>', '.kopfZahl b,.kopfZahl .fassung{display:none}.kopfZahl>span:not(.syncChip){display:none}</style>\n</head>');
    // Name der Bedienung ist hier wichtig (steht in der Abrechnung); Karten-Dinge gibt es nicht
  }
  ersetze('Einrichtung steht oben in der Datei\n        <span class="mono">ablage.gs</span>.', 'Einrichtung: Datei <span class="mono">ablage.gs</span>.');

  // Schicht einsetzen
  const s = schicht.replace('"__MODUS__"', JSON.stringify(modus));
  ersetze('\nstart();\n\n</script>', '\n' + s + '\n\nstart();\nv2Start();\n\n</script>');
  return h;
}

for (const m of ['terminal', 'verkauf']) {
  writeFileSync(wurzel + 'guthabenkasse-' + m + '.html', bau(m));
  const mf = JSON.parse(lies('manifest.webmanifest'));
  mf.name = m === 'terminal' ? 'Guthabenkasse Terminal' : 'Guthabenkasse Verkauf';
  mf.short_name = m === 'terminal' ? 'GK Terminal' : 'GK Verkauf';
  mf.start_url = './guthabenkasse-' + m + '.html'; mf.id = './guthabenkasse-' + m + '.html';
  mf.icons = mf.icons.map(i => ({ ...i, src: m === 'verkauf' ? i.src.replace('icon-', 'icon-verkauf-') : i.src }));
  mf.description = m === 'terminal' ? 'Aufbuchen, Abbuchen, Karten und Verwaltung' : 'Nur Abbuchen und Abfragen';
  writeFileSync(wurzel + 'manifest-' + m + '.webmanifest', JSON.stringify(mf, null, 2) + '\n');
}
// Anzeigegerät für Gäste (eigenständige kleine Seite, nur Bestand)
{
  const a = kern.indexOf('<script>\n(function(y,g)'); const e = kern.indexOf('</script>', a);
  const jsqr = kern.slice(a + 9, e);
  writeFileSync(wurzel + 'guthabenkasse-anzeige.html', lies('quelle/anzeige.html').replace('/*JSQR*/', () => jsqr));
  const mf = JSON.parse(lies('manifest.webmanifest'));
  mf.name = 'Guthaben abfragen'; mf.short_name = 'Guthaben'; mf.start_url = './guthabenkasse-anzeige.html'; mf.id = './guthabenkasse-anzeige.html';
  mf.description = 'Anzeigegerät für Gäste: Karte vorhalten, Guthaben sehen'; mf.orientation = 'any';
  writeFileSync(wurzel + 'manifest-anzeige.webmanifest', JSON.stringify(mf, null, 2) + '\n');
}
const sw = `// Service Worker: hält die zwei Programme offline bereit. Seiten: erst Netz, sonst Zwischenspeicher.
const NAME = 'guthabenkasse-${VERSION}';
const DATEIEN = ['guthabenkasse-terminal.html','guthabenkasse-verkauf.html','guthabenkasse-anzeige.html','manifest-anzeige.webmanifest','manifest-terminal.webmanifest','manifest-verkauf.webmanifest','icon-192.png','icon-512.png','icon-verkauf-192.png','icon-verkauf-512.png','favicon.svg'];
self.addEventListener('install', e => { e.waitUntil(caches.open(NAME).then(c => c.addAll(DATEIEN).catch(() => {})).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== NAME).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin) return;   // Ablage (Google) nie zwischenspeichern
  e.respondWith(fetch(e.request).then(r => { if (r.ok) { const k = r.clone(); caches.open(NAME).then(c => c.put(e.request, k)); } return r; })
    .catch(() => caches.match(e.request, { ignoreSearch: true })));
});
`;
writeFileSync(wurzel + 'sw.js', sw);
console.log('gebaut', VERSION);
