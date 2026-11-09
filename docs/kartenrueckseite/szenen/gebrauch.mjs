// Rückseiten mit kurzer Gebrauchsanleitung (Deutsch/Englisch): oben ein schmales Bild mit dem Logo, unten drei Schritte.
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import { readFileSync, writeFileSync } from 'node:fs';
const HIER = new URL('./', import.meta.url).pathname;
const url = f => 'data:image/png;base64,' + readFileSync(HIER + f).toString('base64');
const NAVY = '#001D61', CREME = '#FBF6E6', GOLD = '#B98F2E', GOLDHELL = '#D9B35A';
const vogel = (x, y, s = 1, f = NAVY) => `<path d="M${x - 2 * s} ${y + .5 * s} Q${x - 1 * s} ${y - 1 * s} ${x} ${y} Q${x + 1 * s} ${y - 1 * s} ${x + 2 * s} ${y + .5 * s}" fill="none" stroke="${f}" stroke-width="${.32 * s}" stroke-linecap="round"/>`;
const ort = f => `<text x="71" y="14.05" font-family="Liberation Sans, Arial, sans-serif" font-weight="700" font-size="1.5" letter-spacing=".32" text-anchor="end" fill="${f}">OLDSUM / FÖHR</text>`;
const logo = (datei, f) => `<image href="${url(datei)}" x="17" y="7" width="54" height="6"/><text x="71" y="13.05" font-family="Liberation Sans, Arial, sans-serif" font-weight="700" font-size="1.5" letter-spacing=".32" text-anchor="end" fill="${f}">OLDSUM / FÖHR</text>`;
const typ = 'font-family="Liberation Sans, Arial, sans-serif"';
const schritte = [
  ['An der Kasse aufladen', 'Top up at the till'],
  ['Karte zeigen – der QR-Code wird gescannt', 'Show your card – the QR code is scanned'],
  ['Restguthaben wird an der Kasse ausgezahlt', 'Unspent balance is paid out at the till'],
];
const panel = () => {
  const ys = [32.6, 39.9, 47.2];
  return `<rect x="0" y="27.5" width="88" height="29.5" fill="${CREME}"/><rect x="0" y="27.5" width="88" height="0.5" fill="${GOLD}"/>
  ${schritte.map(([de, en], i) => `<g>
    <circle cx="9.6" cy="${ys[i] + 0.9}" r="2.4" fill="${NAVY}"/><text x="9.6" y="${ys[i] + 1.95}" ${typ} font-size="3.1" font-weight="700" text-anchor="middle" fill="${CREME}">${i + 1}</text>
    <text x="14.6" y="${ys[i]}" ${typ} font-size="3.0" font-weight="700" fill="${NAVY}">${de}</text>
    <text x="14.6" y="${ys[i] + 3.1}" ${typ} font-size="2.6" fill="#3b4a6b">${en}</text></g>`).join('')}`;
};
const kopfzeile = (f) => `<text x="44" y="19.7" ${typ} font-size="1.9" font-weight="700" letter-spacing=".3" text-anchor="middle" fill="${f}">GUTHABENKARTE · BALANCE CARD</text>`;
const szenen = {
  A: { name: 'Watt', svg: () => `<defs><linearGradient id="h" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9CC3DC"/><stop offset="1" stop-color="#FBEBCB"/></linearGradient></defs>
    <rect width="88" height="28" fill="url(#h)"/><circle cx="66" cy="22.2" r="3.4" fill="#F7D36F"/><circle cx="66" cy="22.2" r="6" fill="#F7D36F" opacity=".25"/>
    <rect x="0" y="22.2" width="88" height="2.4" fill="#86B7C2"/><path d="M0 24.6 Q22 23.6 44 24.6 T88 24.4 V28 H0Z" fill="#E4D3A6"/><path d="M-2 27 C20 25 36 27.4 60 25.6 S80 26 90 25.4 V28 H-2Z" fill="#9ECACF"/>
    <g stroke="#7A5A34" stroke-width=".35" stroke-linecap="round"><path d="M12 26V23.4M14 26.4V24M80 26V23.6"/></g>
    ${vogel(14, 17.6, .9)}${vogel(21, 16, .65)}${vogel(78, 16.6, .8)}${logo('logo-navy.png', NAVY)}${kopfzeile(NAVY)}` },
  B: { name: 'Reetdach', svg: () => `<defs><linearGradient id="h" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#A9CDE3"/><stop offset="1" stop-color="#F9E6C8"/></linearGradient></defs>
    <rect width="88" height="28" fill="url(#h)"/>
    <path d="M0 24 Q24 20.8 50 23.2 T88 22.2 V28 H0Z" fill="#86B06B"/><path d="M0 26 Q30 23.6 58 25.4 T88 24.6 V28 H0Z" fill="#5E9150"/>
    <g transform="translate(5,4.4) scale(.5)"><rect x="9.5" y="34" width="24.5" height="9.5" fill="#FBF8EE"/><path d="M6 35.2 L21.75 23.6 L37.5 35.2 L35.4 36.6 L21.75 26.6 L8.1 36.6Z" fill="#6F5130"/><path d="M6.6 36 L21.75 24.6 L36.9 36 L34.8 37.4 L21.75 27.7 L8.7 37.4Z" fill="#8F6B3E"/><rect x="27.4" y="24.6" width="2.8" height="4.6" fill="#8E3B2E"/><g fill="#3E6EA8"><rect x="12.2" y="36.6" width="4.4" height="3.6"/><rect x="26.6" y="36.6" width="4.4" height="3.6"/></g><rect x="19.4" y="37" width="4.2" height="6.4" fill="#2E6B4B"/></g>
    <ellipse cx="66" cy="24.4" rx="1.9" ry="1.2" fill="#fff"/><circle cx="68" cy="23.8" r=".7" fill="#3a3a3a"/><ellipse cx="74" cy="25.2" rx="2" ry="1.25" fill="#fff"/><circle cx="76.1" cy="24.5" r=".72" fill="#3a3a3a"/>
    ${vogel(76, 17, .8)}${vogel(83, 15.6, .6)}${logo('logo-navy.png', NAVY)}${kopfzeile(NAVY)}` },
  C: { name: 'Abendrot', svg: () => `<defs><linearGradient id="h" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#10246B"/><stop offset=".6" stop-color="#5B4C8F"/><stop offset="1" stop-color="#E58A5B"/></linearGradient></defs>
    <rect width="88" height="28" fill="url(#h)"/><g fill="#FBF6E6"><circle cx="8" cy="5" r=".25"/><circle cx="82" cy="4" r=".25"/><circle cx="5" cy="14" r=".2"/><circle cx="84" cy="13" r=".2"/></g>
    <circle cx="44" cy="24" r="4.6" fill="#F7B65C" opacity=".3"/><path d="M40 24 A4 4 0 0 1 48 24Z" fill="#FFE39A"/><rect x="0" y="24" width="88" height="4" fill="#2E3F86"/><g stroke="#F7B65C" stroke-linecap="round"><path d="M40 25H48M38 26.2H50M36 27.2H52" stroke-width=".3"/></g>
    <path d="M63 24 L67 19 L67 24Z" fill="#14205C"/><path d="M63.4 24 L63.4 25 L69 25 L68 24Z" fill="#14205C"/>
    ${vogel(15, 17.6, .8, CREME)}${vogel(22, 16, .6, CREME)}${vogel(77, 18, .75, CREME)}${logo('logo-creme.png', CREME)}${kopfzeile(GOLDHELL)}` },
};
const rahmen = i => `<svg xmlns="http://www.w3.org/2000/svg" width="88mm" height="57mm" viewBox="0 0 88 57">${i}${panel()}</svg>`;
const b = await chromium.launch();
for (const [k, s] of Object.entries(szenen)) {
  const svg = rahmen(s.svg()); const base = `Gebrauch-${k}-${s.name}`;
  writeFileSync(HIER + base + '.svg', svg);
  const p = await b.newPage({ viewport: { width: 1039, height: 673 }, deviceScaleFactor: 1 });
  await p.setContent(`<html><body style="margin:0">${svg.replace('width="88mm" height="57mm"', 'width="1039" height="673"')}</body></html>`);
  await p.screenshot({ path: HIER + base + '.png' }); await p.close();
}
const bild = k => 'data:image/png;base64,' + readFileSync(HIER + `Gebrauch-${k}-${szenen[k].name}.png`).toString('base64');
const platz = k => `<div style="width:85mm;height:54mm;position:relative"><img src="${bild(k)}" style="position:absolute;left:-1.5mm;top:-1.5mm;width:88mm;height:57mm"></div>`;
async function bogen(datei, reihe) {
  const q = await b.newPage();
  await q.setContent(`<html><head><style>@page{size:210mm 297mm;margin:0}html,body{margin:0}.bogen{padding:12mm 10mm;display:grid;grid-template-columns:repeat(2,85mm);gap:6mm 8mm;justify-content:center}</style></head><body><div class="bogen">${reihe.map(platz).join('')}</div></body></html>`);
  await q.pdf({ path: HIER + datei, preferCSSPageSize: true, printBackground: true, margin: { top: 0, bottom: 0, left: 0, right: 0 } }); await q.close();
}
for (const k of Object.keys(szenen)) await bogen(`Gebrauch-${k}-${szenen[k].name}-Rueckseite-A4.pdf`, Array(8).fill(k));
await bogen('Gebrauch-Mix-Rueckseite-A4.pdf', ['A', 'B', 'C', 'A', 'B', 'C', 'A', 'B']);
await b.close(); console.log('fertig');
