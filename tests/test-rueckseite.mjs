// Rückseite: gleiches Raster wie die Vorderseite (aus echten PDFs gemessen), Versatz, Drehung, Bild laden
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import { execFileSync } from 'node:child_process'; import { readFileSync, writeFileSync } from 'node:fs';
let ok = 0, bad = 0; const t = (n, c, extra = '') => { if (c) ok++; else { bad++; console.log('FAIL', n, extra); } };
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 794, height: 1123 } });
await p.goto('file:///home/user/guthabenkasse/guthabenkasse-terminal.html'); await p.waitForTimeout(300);
await p.evaluate(() => { window.print = () => {}; });
function messen(pdf) {   // Umrisse der Karten (Quadrate/Linien) in mm: Spalten und Zeilen
  execFileSync('pdftoppm', ['-r', '200', '-gray', '-f', '1', '-l', '1', pdf, pdf.replace('.pdf', '')]);
  const d = readFileSync(pdf.replace('.pdf', '') + '-1.pgm'); const m = /P5\s+(\d+)\s+(\d+)\s+255\s/.exec(d.subarray(0, 30).toString('latin1'));
  const w = +m[1], h = +m[2], px = d.subarray(m[0].length), pm = 200 / 25.4, rows = new Array(h).fill(false), cols = new Array(w).fill(false);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (px[y * w + x] < 110) { rows[y] = true; cols[x] = true; }
  const runs = (a, gap) => { const o = []; let s = null, l = null; a.forEach((v, i) => { if (v) { if (s === null) s = i; l = i; } else if (s !== null && i - l > gap) { o.push([s, l]); s = null; } }); if (s !== null) o.push([s, l]); return o; };
  const g = Math.round(2.5 * pm); return { cols: runs(cols, g).map(([a, z]) => [+(a / pm).toFixed(1), +((z + 1) / pm).toFixed(1)]), rows: runs(rows, g).map(([a, z]) => [+(a / pm).toFixed(1), +((z + 1) / pm).toFixed(1)]) };
}
async function pdfVon(html, name) {
  await p.evaluate(h => { document.getElementById('bogen').className = ''; document.getElementById('bogen').innerHTML = h; }, html);
  await p.emulateMedia({ media: 'print' });
  const f = '/tmp/' + name + '.pdf'; await p.pdf({ path: f, preferCSSPageSize: true, printBackground: true, margin: { top: 0, bottom: 0, left: 0, right: 0 } });
  await p.emulateMedia({ media: 'screen' }); return f;
}
const nah = (a, z, tol = 0.4) => Math.abs(a - z) <= tol;
// Vorderseite als Maßstab
const vorn = messen(await pdfVon(await p.evaluate(() => { var n = []; for (var i = 1; i <= 8; i++) { var k = 'T' + ('0000' + i).slice(-4); db.karten[k] = { nr: k, ts: 1, code: 'ABCD' }; n.push(k); } return kartenBlatt(n); }), 'vorn'));
t('Vorderseite: Spalten 16 und 109 mm', nah(vorn.cols[0][0], 16, .5) && nah(vorn.cols[1][0], 109, .5), JSON.stringify(vorn.cols));
t('Vorderseite: Zeilen 12, 72, 132, 192 mm', [12, 72, 132, 192].every((y, i) => nah(vorn.rows[i][0], y, .5)), JSON.stringify(vorn.rows));
// Rückseite (Passprobe) im selben Raster
const probe = messen(await pdfVon(await p.evaluate(() => rueckSeite(true)), 'probe'));
t('Passprobe: Spalten gleich wie vorn', nah(probe.cols[0][0], vorn.cols[0][0]) && nah(probe.cols[1][0], vorn.cols[1][0]) && nah(probe.cols[0][1], vorn.cols[0][1]) && nah(probe.cols[1][1], vorn.cols[1][1]), JSON.stringify(probe.cols));
t('Passprobe: Zeilen gleich wie vorn', probe.rows.length >= 4 && [0, 1, 2, 3].every(i => nah(probe.rows[i][0], vorn.rows[i][0], .5) && nah(probe.rows[i][1], vorn.rows[i][1], .5)), JSON.stringify(probe.rows));
// Versatz wirkt
await p.evaluate(() => { rueck.x = 1.5; rueck.y = -1; });
const probeV = messen(await pdfVon(await p.evaluate(() => rueckSeite(true)), 'probeV'));
t('Versatz X +1,5 mm', nah(probeV.cols[1][0] - probe.cols[1][0], 1.5, .5) && nah(probeV.cols[0][1] - probe.cols[0][1], 1.5, .5), JSON.stringify([probeV.cols, probe.cols]));
t('Versatz Y −1 mm', nah(probeV.rows[1][0] - probe.rows[1][0], -1, .5), JSON.stringify([probeV.rows, probe.rows]));
// Drehung um 180°: Raster liegt unten gespiegelt (297 − 246 = 51 mm)
await p.evaluate(() => { rueck.x = 0; rueck.y = 0; rueck.dreh = true; });
const probeD = messen(await pdfVon(await p.evaluate(() => rueckSeite(true)), 'probeD'));
t('Gedreht: erste Zeile bei 51 mm', nah(probeD.rows[0][0], 51, .6) && nah(probeD.rows[3][1], 285, .6), JSON.stringify(probeD.rows));
await p.evaluate(() => { rueck.dreh = false; });
// Bild laden und drucken
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
writeFileSync('/tmp/logo.png', png);
await p.evaluate(() => reiterZeigen('karten')); await p.waitForTimeout(200);
await p.setInputFiles('#rBild', '/tmp/logo.png'); await p.waitForTimeout(500);
t('Bild geladen und als JPEG gemerkt', await p.evaluate(() => /^data:image\/jpeg/.test(rueck.bild)));
t('Vorschau sichtbar', await p.evaluate(() => !!document.querySelector('#rVorschau img')));
t('Bild bleibt nach Neustart erhalten', await p.evaluate(() => /jpeg/.test(JSON.parse(localStorage.getItem(RUECK_KEY)).bild)));
const seitenHtml = await p.evaluate(() => { rueck.blaetter = 3; rueckEinlesen(); return rueckSeite(false); });
t('Bild achtmal auf der Seite, mit Anschnitt', (seitenHtml.match(/<img /g) || []).length === 8 && /left:-1.5mm;top:-1.5mm;width:88mm;height:57mm/.test(seitenHtml));
await p.evaluate(() => { window.__d = null; window.drucken = function (h) { window.__d = h; }; document.getElementById('rBlaetter').value = '3'; document.getElementById('rDruck').click(); });
t('Drucken: drei Blätter', (await p.evaluate(() => (window.__d.match(/break-after:page/g) || []).length)) === 3);
await p.evaluate(() => { document.getElementById('rWeg').click(); window.__d = null; document.getElementById('rBlaetter').value = '1'; document.getElementById('rDruck').click(); });
t('Ohne eigenes Bild: Standard (Anleitung) wird gedruckt', await p.evaluate(() => !rueck.bild && window.__d && (window.__d.match(/<img /g) || []).length === 8 && window.__d.includes(RUECK_STANDARD.slice(0, 80))));
t('Standard ist ein PNG mit Inhalt', await p.evaluate(() => /^data:image\/png;base64,/.test(RUECK_STANDARD) && RUECK_STANDARD.length > 5000));
t('Vorschau zeigt den Standard', await p.evaluate(() => document.querySelector('#rVorschau img').src.startsWith('data:image/png')));
await b.close(); console.log(ok + ' ok, ' + bad + ' Fehler');
