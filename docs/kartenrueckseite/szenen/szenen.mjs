// Drei Rückseiten-Szenen für die Guthabenkarten des Ual Fering Wiartshüs (Oldsum / Föhr).
// Je Szene: PNG der Einzelkarte (88 × 57 mm mit 1,5 mm Anschnitt, 300 dpi) und ein druckfertiger A4-Bogen (8 Karten, Raster wie die Vorderseite).
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import { readFileSync, writeFileSync } from 'node:fs';
const HIER = new URL('./', import.meta.url).pathname;
const url = f => 'data:image/png;base64,' + readFileSync(HIER + f).toString('base64');
const NAVY = '#001D61', CREME = '#FBF6E6', GOLD = '#C9A24A';

const vogel = (x, y, s = 1, f = NAVY) => `<path d="M${x - 2.2 * s} ${y + .6 * s} Q${x - 1.1 * s} ${y - 1.2 * s} ${x} ${y} Q${x + 1.1 * s} ${y - 1.2 * s} ${x + 2.2 * s} ${y + .6 * s}" fill="none" stroke="${f}" stroke-width="${.35 * s}" stroke-linecap="round"/>`;
const ornament = (y, f) => `<g stroke="${f}" stroke-width=".25" fill="${f}"><path d="M27 ${y}H41M47 ${y}H61"/><path d="M44 ${y - 1.2}L45.2 ${y}L44 ${y + 1.2}L42.8 ${y}Z"/><circle cx="41.9" cy="${y}" r=".35"/><circle cx="46.1" cy="${y}" r=".35"/></g>`;
const fuss = (f1, f2) => `<rect x="0" y="45.2" width="88" height="11.8" fill="${NAVY}" opacity=".82"/>
  <g font-family="Liberation Sans, Arial, sans-serif" text-anchor="middle" fill="${f1}">
    <text x="44" y="48.6" font-size="2.05" font-weight="700" letter-spacing=".25">GUTHABENKARTE · GIFT CARD</text>
    <text x="44" y="51.1" font-size="1.75" fill="${f2}">Restguthaben wird am Ende des Abends an der Kasse zurückgezahlt.</text>
    <text x="44" y="53.2" font-size="1.75" fill="${f2}">Any remaining balance is refunded at the till at the end of the evening.</text>
  </g>`;

// Das kleine „OLDSUM / FÖHR“ im Original ist zu klein aufgelöst; es wird sauber nachgesetzt.
const ort = f => `<text x="71" y="14.05" font-family="Liberation Sans, Arial, sans-serif" font-weight="700" font-size="1.5" letter-spacing=".32" text-anchor="end" fill="${f}">OLDSUM / FÖHR</text>`;
const logoNavy = `<image href="${url('logo-navy.png')}" x="17" y="8" width="54" height="6"/>${ort(NAVY)}`;
const logoCreme = `<image href="${url('logo-creme.png')}" x="17" y="8" width="54" height="6"/>${ort(CREME)}`;

const szenen = {
  A: { name: 'Watt', svg: () => `
  <defs><linearGradient id="himmel" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9CC3DC"/><stop offset=".55" stop-color="#E9F0EA"/><stop offset="1" stop-color="#FBE9C6"/></linearGradient>
    <linearGradient id="watt" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#E4D3A6"/><stop offset="1" stop-color="#C2AA74"/></linearGradient>
    <radialGradient id="sonne"><stop offset="0" stop-color="#FFF4C8"/><stop offset=".45" stop-color="#F7D36F"/><stop offset="1" stop-color="#F7D36F" stop-opacity="0"/></radialGradient></defs>
  <rect width="88" height="57" fill="url(#himmel)"/>
  <circle cx="63" cy="31" r="11" fill="url(#sonne)"/><circle cx="63" cy="31" r="3.6" fill="#FBE18A"/>
  <g fill="#fff" opacity=".7"><ellipse cx="15" cy="21" rx="9" ry="1.6"/><ellipse cx="23" cy="19.8" rx="6" ry="1.3"/><ellipse cx="74" cy="20" rx="8" ry="1.4"/></g>
  <rect x="0" y="31.5" width="88" height="5.5" fill="#86B7C2"/><g stroke="#C7E2E6" stroke-width=".25" opacity=".8"><path d="M4 33H20M30 34.2H52M60 32.8H80M10 35.6H34M46 35.8H70"/></g>
  <path d="M0 37 Q22 35.4 44 37 T88 36.6 V57 H0Z" fill="url(#watt)"/>
  <g fill="#9ECACF"><path d="M-2 44 C14 39.5 26 44 40 41.5 S68 38.5 90 42 V45.4 C70 42.6 52 46 38 46.4 S12 48.6 -2 47Z"/><path d="M8 54 C22 49.5 36 52 48 50 S72 47 90 50.5 V57 H8Z" opacity=".9"/></g>
  <g stroke="#E8F4F4" stroke-width=".3" fill="none" opacity=".9"><path d="M6 45 C16 42.6 24 45.6 36 43.6"/><path d="M46 49 C56 47.6 64 49.6 78 48"/></g>
  <g stroke="#7A5A34" stroke-width=".45" stroke-linecap="round"><path d="M15 40.4V37M16.6 41V37.6M30 43V38.8M72 40.6V37.2M80 42V38.4"/></g>
  <g fill="#4F8049"><path d="M15 37 l-1.6 -2.2 M15 37 l1.2 -2.4 M15 37 l.1 -2.8" stroke="#4F8049" stroke-width=".3" fill="none"/><path d="M30 38.8 l-1.6 -2.2 M30 38.8 l1.2 -2.4" stroke="#4F8049" stroke-width=".3" fill="none"/></g>
  ${vogel(12, 27, 1.1)}${vogel(19, 24, .8)}${vogel(78, 26, 1)}${vogel(70, 23.5, .7)}
  ${logoNavy}${ornament(17.6, NAVY)}${fuss(CREME, '#E8DFC2')}` },

  B: { name: 'Reetdach', svg: () => `
  <defs><linearGradient id="himmel" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#A9CDE3"/><stop offset=".6" stop-color="#F5E9D2"/><stop offset="1" stop-color="#F9DDB8"/></linearGradient></defs>
  <rect width="88" height="57" fill="url(#himmel)"/>
  <g fill="#fff" opacity=".85"><ellipse cx="14" cy="22" rx="8" ry="1.7"/><ellipse cx="20" cy="20.8" rx="5.5" ry="1.5"/><ellipse cx="72" cy="23" rx="9" ry="1.7"/><ellipse cx="78" cy="21.7" rx="5" ry="1.4"/></g>
  <path d="M0 37 Q24 31 50 35 T88 32.5 V57 H0Z" fill="#86B06B"/><path d="M0 42 Q30 36.5 58 40.5 T88 38.5 V57 H0Z" fill="#5E9150"/>
  <g stroke="#4B7E41" stroke-width=".25" opacity=".7"><path d="M5 46H20M30 44.5H46M56 43H78M12 50H34M48 48.6H70"/></g>
  <!-- Friesenhaus mit Reetdach -->
  <g>
    <rect x="9.5" y="34" width="24.5" height="9.5" fill="#FBF8EE"/><rect x="9.5" y="42.4" width="24.5" height="1.1" fill="#CBBF9E"/>
    <path d="M6 35.2 L21.75 23.6 L37.5 35.2 L35.4 36.6 L21.75 26.6 L8.1 36.6Z" fill="#6F5130"/>
    <path d="M6.6 36 L21.75 24.6 L36.9 36 L34.8 37.4 L21.75 27.7 L8.7 37.4Z" fill="#8F6B3E"/>
    <g stroke="#A98250" stroke-width=".22" opacity=".9"><path d="M9.6 34.2L33.9 34.2M11.6 32.6L31.9 32.6M13.9 30.9L29.6 30.9M16.2 29.2L27.3 29.2M18.4 27.5L25.1 27.5"/></g>
    <rect x="27.4" y="24.6" width="2.8" height="4.6" fill="#8E3B2E"/><rect x="27" y="24.2" width="3.6" height=".8" fill="#6E2B21"/>
    <g fill="#3E6EA8" stroke="#fff" stroke-width=".4"><rect x="12.2" y="36.6" width="4.4" height="3.6"/><rect x="26.6" y="36.6" width="4.4" height="3.6"/></g>
    <g stroke="#fff" stroke-width=".25"><path d="M14.4 36.6V40.2M12.2 38.4H16.6M28.8 36.6V40.2M26.6 38.4H31"/></g>
    <rect x="19.4" y="37" width="4.2" height="6.4" fill="#2E6B4B"/><circle cx="22.8" cy="40.3" r=".3" fill="#E8C96A"/>
    <g fill="#E58AA3"><circle cx="9" cy="42" r=".7"/><circle cx="10.2" cy="40.6" r=".7"/><circle cx="35" cy="41.6" r=".7"/><circle cx="36" cy="40" r=".7"/></g>
  </g>
  <g><ellipse cx="62" cy="41.4" rx="3" ry="1.9" fill="#fff"/><ellipse cx="65.2" cy="40.2" rx="1.1" ry="1.2" fill="#3a3a3a"/><path d="M60 43V44.8M63.6 43V44.8" stroke="#3a3a3a" stroke-width=".35"/>
    <ellipse cx="73" cy="43.8" rx="3.2" ry="2" fill="#fff"/><ellipse cx="76.4" cy="42.5" rx="1.15" ry="1.25" fill="#3a3a3a"/><path d="M71 45.6V47.4M74.8 45.6V47.4" stroke="#3a3a3a" stroke-width=".35"/></g>
  ${vogel(48, 27, 1)}${vogel(55, 25, .75)}${vogel(40, 29, .6)}
  ${logoNavy}${ornament(17.6, NAVY)}${fuss(CREME, '#E8DFC2')}` },

  C: { name: 'Abendrot', svg: () => `
  <defs><linearGradient id="himmel" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#10246B"/><stop offset=".5" stop-color="#5B4C8F"/><stop offset=".8" stop-color="#E58A5B"/><stop offset="1" stop-color="#F7C26B"/></linearGradient>
    <radialGradient id="sonne"><stop offset="0" stop-color="#FFE9A8"/><stop offset=".5" stop-color="#F7B65C"/><stop offset="1" stop-color="#F7B65C" stop-opacity="0"/></radialGradient></defs>
  <rect width="88" height="57" fill="url(#himmel)"/>
  <g fill="#FBF6E6" opacity=".9"><circle cx="9" cy="7" r=".28"/><circle cx="14" cy="14" r=".2"/><circle cx="78" cy="6" r=".28"/><circle cx="83" cy="13" r=".2"/><circle cx="5" cy="22" r=".18"/><circle cx="82" cy="22" r=".2"/></g>
  <circle cx="44" cy="36" r="13" fill="url(#sonne)"/><path d="M39 36 A5 5 0 0 1 49 36Z" fill="#FFE39A"/>
  <rect x="0" y="36" width="88" height="21" fill="#2E3F86"/><g stroke="#F7B65C" stroke-linecap="round" opacity=".85"><path d="M38 37.4H50" stroke-width=".5"/><path d="M36 39.2H52" stroke-width=".42"/><path d="M34 41H54" stroke-width=".36"/><path d="M32 43H56" stroke-width=".3"/></g>
  <path d="M60 36 L66.2 28.5 L66.2 36Z" fill="#14205C"/><path d="M60.6 36 L60.6 37.4 L68.4 37.4 L67 36Z" fill="#14205C"/><path d="M65.6 36V26.2" stroke="#14205C" stroke-width=".3"/>
  <path d="M0 50 Q16 44 34 48 T66 47 T88 45 V57 H0Z" fill="#17306A"/><path d="M0 54 Q22 50 44 53 T88 51.5 V57 H0Z" fill="#0F2252"/>
  <g stroke="#0F2252" stroke-width=".35" stroke-linecap="round" fill="none"><path d="M6 52 q-.6 -3 -1.8 -4.6M7 52 q.2 -3.2 1.4 -5M8 52 q1 -2.6 2.6 -3.8"/><path d="M79 51.4 q-.6 -3 -1.8 -4.6M80 51.4 q.2 -3.2 1.4 -5M81 51.4 q1 -2.6 2.6 -3.8"/></g>
  ${vogel(18, 29, 1, CREME)}${vogel(25, 26.6, .75, CREME)}${vogel(73, 30, .9, CREME)}
  ${logoCreme}${ornament(17.6, GOLD)}${fuss(CREME, '#E8DFC2')}` },
};

const rahmen = (inhalt) => `<svg xmlns="http://www.w3.org/2000/svg" width="88mm" height="57mm" viewBox="0 0 88 57">${inhalt}</svg>`;
const b = await chromium.launch();
for (const [k, s] of Object.entries(szenen)) {
  const svg = rahmen(s.svg());
  writeFileSync(HIER + `Szene-${k}-${s.name}.svg`, svg);
  const p = await b.newPage({ viewport: { width: 1039, height: 673 }, deviceScaleFactor: 1 });
  await p.setContent(`<html><body style="margin:0">${svg.replace('width="88mm" height="57mm"', 'width="1039" height="673"')}</body></html>`);
  await p.screenshot({ path: HIER + `Szene-${k}-${s.name}.png` });
  await p.close();
  // A4-Bogen: 8 Karten im Raster der Vorderseite, Bild mit 1,5 mm Anschnitt
  const bild = 'data:image/png;base64,' + readFileSync(HIER + `Szene-${k}-${s.name}.png`).toString('base64');
  const platz = `<div style="width:85mm;height:54mm;position:relative"><img src="${bild}" style="position:absolute;left:-1.5mm;top:-1.5mm;width:88mm;height:57mm"></div>`;
  const q = await b.newPage();
  await q.setContent(`<html><head><style>@page{size:210mm 297mm;margin:0}html,body{margin:0}.bogen{padding:12mm 10mm;display:grid;grid-template-columns:repeat(2,85mm);gap:6mm 8mm;justify-content:center}</style></head><body><div class="bogen">${platz.repeat(8)}</div></body></html>`);
  await q.pdf({ path: HIER + `Szene-${k}-${s.name}-Rueckseite-A4.pdf`, preferCSSPageSize: true, printBackground: true, margin: { top: 0, bottom: 0, left: 0, right: 0 } });
  await q.close();
}
await b.close(); console.log('fertig');
