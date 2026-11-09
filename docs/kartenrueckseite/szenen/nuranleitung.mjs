// Rückseite nur mit der Gebrauchsanleitung (für jede Veranstaltung nutzbar: kein Anlass, kein Bild).
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import { writeFileSync, readFileSync } from 'node:fs';
const HIER = new URL('./', import.meta.url).pathname;
const NAVY = '#001D61', CREME = '#FBF6E6', GOLD = '#B98F2E';
const typ = 'font-family="Liberation Sans, Arial, sans-serif"';
const schritte = [
  { de: ['An der Kasse aufladen'], en: 'Top up at the till', y: 15.6 },
  { de: ['Zum Bezahlen –', 'Karte scannen lassen'], en: 'To pay – have your card scanned', y: 26.0 },
  { de: ['Restguthaben wird an der Kasse', 'ausgezahlt'], en: 'Unspent balance is paid out at the till', y: 40.4 },
];
const DE = 4.2, EN = 3.4, PITCH = 4.85;
const inhalt = `<rect width="88" height="57" fill="${CREME}"/>
  <text x="44" y="8.4" ${typ} font-size="2.1" font-weight="700" letter-spacing=".32" text-anchor="middle" fill="${GOLD}">GUTHABENKARTE · BALANCE CARD</text>
  <path d="M30 10.2H58" stroke="${GOLD}" stroke-width=".25"/>
  ${schritte.map((st, i) => {
    const enY = st.y + PITCH * (st.de.length - 1) + 4.0;
    return `<g><circle cx="9" cy="${st.y - 1.1}" r="3" fill="${NAVY}"/><text x="9" y="${st.y + .2}" ${typ} font-size="4" font-weight="700" text-anchor="middle" fill="${CREME}">${i + 1}</text>
    ${st.de.map((z, k) => `<text x="14.2" y="${st.y + PITCH * k}" ${typ} font-size="${DE}" font-weight="700" fill="${NAVY}">${z}</text>`).join('')}
    <text x="14.2" y="${enY}" ${typ} font-size="${EN}" fill="#3b4a6b">${st.en}</text></g>`;
  }).join('')}`;
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="88mm" height="57mm" viewBox="0 0 88 57">${inhalt}</svg>`;
writeFileSync(HIER + 'Rueckseite-Nur-Anleitung.svg', svg);
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1039, height: 673 }, deviceScaleFactor: 1 });
await p.setContent(`<html><body style="margin:0">${svg.replace('width="88mm" height="57mm"', 'width="1039" height="673"')}</body></html>`);
await p.screenshot({ path: HIER + 'Rueckseite-Nur-Anleitung.png' }); await p.close();
const bild = 'data:image/png;base64,' + readFileSync(HIER + 'Rueckseite-Nur-Anleitung.png').toString('base64');
const platz = `<div style="width:85mm;height:54mm;position:relative"><img src="${bild}" style="position:absolute;left:-1.5mm;top:-1.5mm;width:88mm;height:57mm"></div>`;
const q = await b.newPage();
await q.setContent(`<html><head><style>@page{size:210mm 297mm;margin:0}html,body{margin:0}.bogen{padding:12mm 10mm;display:grid;grid-template-columns:repeat(2,85mm);gap:6mm 8mm;justify-content:center}</style></head><body><div class="bogen">${platz.repeat(8)}</div></body></html>`);
await q.pdf({ path: HIER + 'Rueckseite-Nur-Anleitung-A4.pdf', preferCSSPageSize: true, printBackground: true, margin: { top: 0, bottom: 0, left: 0, right: 0 } });
await b.close(); console.log('fertig');
