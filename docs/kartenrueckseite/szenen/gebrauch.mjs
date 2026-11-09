// Rückseiten mit kurzer Gebrauchsanleitung (Deutsch/Englisch): oben ein schmales Bild mit dem Logo, unten drei Schritte.
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import { readFileSync, writeFileSync } from 'node:fs';
const HIER = new URL('./', import.meta.url).pathname;
const url = f => 'data:image/png;base64,' + readFileSync(HIER + f).toString('base64');
const NAVY = '#001D61', CREME = '#FBF6E6', GOLD = '#B98F2E', GOLDHELL = '#D9B35A';
const vogel = (x, y, s = 1, f = NAVY) => `<path d="M${x - 2 * s} ${y + .5 * s} Q${x - 1 * s} ${y - 1 * s} ${x} ${y} Q${x + 1 * s} ${y - 1 * s} ${x + 2 * s} ${y + .5 * s}" fill="none" stroke="${f}" stroke-width="${.32 * s}" stroke-linecap="round"/>`;
const ort = f => `<text x="71" y="14.05" font-family="Liberation Sans, Arial, sans-serif" font-weight="700" font-size="1.5" letter-spacing=".32" text-anchor="end" fill="${f}">OLDSUM / FÖHR</text>`;
const logo = (datei, f) => `<image href="${url(datei)}" x="17" y="5.6" width="54" height="6"/><text x="71" y="11.65" font-family="Liberation Sans, Arial, sans-serif" font-weight="700" font-size="1.5" letter-spacing=".32" text-anchor="end" fill="${f}">OLDSUM / FÖHR</text>`;
const typ = 'font-family="Liberation Sans, Arial, sans-serif"';
// Schritte: Zeilen je Schritt (Deutsch, evtl. umgebrochen) und Englisch; y = Grundlinie der ersten Zeile
const schritte = [
  { de: ['An der Kasse aufladen'], en: 'Top up at the till', y: 27.0 },
  { de: ['Zum Bezahlen – Karte scannen lassen'], en: 'To pay – have your card scanned', y: 35.4 },
  { de: ['Restguthaben wird an der Kasse', 'ausgezahlt'], en: 'Unspent balance is paid out at the till', y: 43.8 },
];
const panel = () => `<rect x="0" y="20.8" width="88" height="36.2" fill="${CREME}"/><rect x="0" y="20.8" width="88" height="0.5" fill="${GOLD}"/>
  ${schritte.map((st, i) => {
    const enY = st.y + 4.1 * (st.de.length - 1) + 3.4;
    return `<g><circle cx="8.8" cy="${st.y + 1.2}" r="2.6" fill="${NAVY}"/><text x="8.8" y="${st.y + 2.45}" ${typ} font-size="3.5" font-weight="700" text-anchor="middle" fill="${CREME}">${i + 1}</text>
    ${st.de.map((z, k) => `<text x="13" y="${st.y + 4.1 * k}" ${typ} font-size="3.7" font-weight="700" fill="${NAVY}">${z}</text>`).join('')}
    <text x="13" y="${enY}" ${typ} font-size="3.0" fill="#3b4a6b">${st.en}</text></g>`;
  }).join('')}`;
const kopfzeile = (f) => `<text x="44" y="16.9" ${typ} font-size="1.9" font-weight="700" letter-spacing=".3" text-anchor="middle" fill="${f}">GUTHABENKARTE · BALANCE CARD</text>`;
const szenen = {
  A: { name: 'Watt', svg: () => `<defs><linearGradient id="h" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9CC3DC"/><stop offset="1" stop-color="#FBEBCB"/></linearGradient></defs>
    <rect width="88" height="21.5" fill="url(#h)"/><circle cx="76" cy="18.4" r="2.6" fill="#F7D36F"/><circle cx="76" cy="18.4" r="4.4" fill="#F7D36F" opacity=".25"/>
    <rect x="0" y="18.4" width="88" height="1.4" fill="#86B7C2"/><path d="M0 19.8 Q22 19 44 19.8 T88 19.6 V21.5 H0Z" fill="#E4D3A6"/>
    <g stroke="#7A5A34" stroke-width=".3" stroke-linecap="round"><path d="M10 21V19.2M12 21V19.6M78 21V19.4"/></g>
    ${vogel(12, 13.4, .8)}${vogel(18, 11.6, .6)}${vogel(84, 11.8, .6)}${logo('logo-navy.png', NAVY)}${kopfzeile(NAVY)}` },
  B: { name: 'Reetdach', svg: () => `<defs><linearGradient id="h" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#A9CDE3"/><stop offset="1" stop-color="#F9E6C8"/></linearGradient></defs>
    <rect width="88" height="21.5" fill="url(#h)"/>
    <path d="M0 19 Q24 16.6 50 18.4 T88 17.6 V21.5 H0Z" fill="#86B06B"/><path d="M0 20.4 Q30 18.8 58 20 T88 19.4 V21.5 H0Z" fill="#5E9150"/>
    <g transform="translate(6,6.6) scale(.34)"><rect x="9.5" y="34" width="24.5" height="9.5" fill="#FBF8EE"/><path d="M6 35.2 L21.75 23.6 L37.5 35.2 L35.4 36.6 L21.75 26.6 L8.1 36.6Z" fill="#6F5130"/><path d="M6.6 36 L21.75 24.6 L36.9 36 L34.8 37.4 L21.75 27.7 L8.7 37.4Z" fill="#8F6B3E"/><rect x="27.4" y="24.6" width="2.8" height="4.6" fill="#8E3B2E"/><g fill="#3E6EA8"><rect x="12.2" y="36.6" width="4.4" height="3.6"/><rect x="26.6" y="36.6" width="4.4" height="3.6"/></g><rect x="19.4" y="37" width="4.2" height="6.4" fill="#2E6B4B"/></g>
    <ellipse cx="68" cy="19" rx="1.5" ry=".95" fill="#fff"/><circle cx="69.6" cy="18.5" r=".55" fill="#3a3a3a"/><ellipse cx="75" cy="19.8" rx="1.6" ry="1" fill="#fff"/><circle cx="76.7" cy="19.3" r=".56" fill="#3a3a3a"/>
    ${vogel(79, 12.6, .6)}${vogel(84, 11.4, .5)}${logo('logo-navy.png', NAVY)}${kopfzeile(NAVY)}` },
  C: { name: 'Abendrot', svg: () => `<defs><linearGradient id="h" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#10246B"/><stop offset=".65" stop-color="#5B4C8F"/><stop offset="1" stop-color="#E58A5B"/></linearGradient></defs>
    <rect width="88" height="21.5" fill="url(#h)"/><g fill="#FBF6E6"><circle cx="8" cy="4" r=".22"/><circle cx="82" cy="3.5" r=".22"/><circle cx="5" cy="12" r=".18"/><circle cx="84" cy="11" r=".18"/></g>
    <circle cx="11" cy="19.4" r="3.6" fill="#F7B65C" opacity=".3"/><path d="M8 19.4 A3 3 0 0 1 14 19.4Z" fill="#FFE39A"/><rect x="0" y="19.4" width="88" height="2.1" fill="#2E3F86"/>
    <path d="M64 19.4 L67 16 L67 19.4Z" fill="#14205C"/><path d="M64.3 19.4 L64.3 20.2 L68.4 20.2 L67.6 19.4Z" fill="#14205C"/>
    ${vogel(24, 14.4, .5, CREME)}${vogel(30, 12.6, .4, CREME)}${vogel(79, 13, .6, CREME)}${logo('logo-creme.png', CREME)}${kopfzeile(GOLDHELL)}` },
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
