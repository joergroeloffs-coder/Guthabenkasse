// Schablone für die Rückseite der Guthabenkarten (A4, 8 Karten à 85 × 54 mm).
// Das Raster ist dasselbe wie auf der Vorderseite (aus der Kartenansicht des Terminals gemessen):
//   Spalten bei x = 16 mm und 109 mm, Zeilen bei y = 12, 72, 132, 192 mm; Karte 85 × 54 mm.
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import { writeFileSync } from 'node:fs';
const HIER = new URL('./', import.meta.url).pathname;
export const SPALTEN = [16, 109], ZEILEN = [12, 72, 132, 192], B = 85, H = 54, ANSCHNITT = 1.5, RAND = 4;
const slots = []; for (const y of ZEILEN) for (const x of SPALTEN) slots.push([x, y]);

const farbe = { schnitt: '#E5007D', rand: '#00A651', anschnitt: '#00A0E3', kreuz: '#9a9a9a' };
const kreuz = (cx, cy, f = farbe.kreuz, w = .15) => `<path d="M${cx - 4} ${cy}H${cx + 4}M${cx} ${cy - 4}V${cy + 4}" stroke="${f}" stroke-width="${w}" fill="none"/>`;
function slotHilfe(x, y, nr) {
  return `<g id="Hilfe-Karte-${nr}">
    <rect x="${x - ANSCHNITT}" y="${y - ANSCHNITT}" width="${B + 2 * ANSCHNITT}" height="${H + 2 * ANSCHNITT}" fill="none" stroke="${farbe.anschnitt}" stroke-width=".2" stroke-dasharray="1 .8"/>
    <rect x="${x}" y="${y}" width="${B}" height="${H}" fill="none" stroke="${farbe.schnitt}" stroke-width=".3"/>
    <rect x="${x + RAND}" y="${y + RAND}" width="${B - 2 * RAND}" height="${H - 2 * RAND}" fill="none" stroke="${farbe.rand}" stroke-width=".2" stroke-dasharray="1.5 1"/>
    ${kreuz(x + B / 2, y + H / 2)}
    <text x="${x + 2}" y="${y + 3.4}" font-size="2.2" font-family="Liberation Sans, Arial, sans-serif" fill="${farbe.schnitt}">Karte ${nr}</text>
  </g>`;
}
const legende = `<g font-family="Liberation Sans, Arial, sans-serif" font-size="2.6" fill="#333">
  <text x="16" y="5.2" font-weight="700">Guthabenkarten · Rückseite · A4 · 8 Karten à 85 × 54 mm</text>
  <text x="16" y="8.6" font-size="2.2">Hilfslinien nicht drucken. Wenden an der langen Kante. Ränder: die Rückseite hat dasselbe Raster wie die Vorderseite.</text>
</g>
<g font-family="Liberation Sans, Arial, sans-serif" font-size="2.3">
  <rect x="16" y="253" width="6" height="3" fill="none" stroke="${farbe.schnitt}" stroke-width=".3"/><text x="23.5" y="255.5">Schnittkante 85 × 54 mm (hier wird geschnitten)</text>
  <rect x="16" y="258" width="6" height="3" fill="none" stroke="${farbe.rand}" stroke-width=".2" stroke-dasharray="1.2 .8"/><text x="23.5" y="260.5">Sicherheitsrand 4 mm: Text, Logo und alles Wichtige bleibt innerhalb</text>
  <rect x="16" y="263" width="6" height="3" fill="none" stroke="${farbe.anschnitt}" stroke-width=".2" stroke-dasharray="1 .8"/><text x="23.5" y="265.5">Anschnitt 1,5 mm: Hintergrund bis hierher ziehen, damit beim Schneiden kein weißer Rand bleibt</text>
  <path d="M16 270H22M19 267V273" stroke="${farbe.kreuz}" stroke-width=".2" fill="none"/><text x="23.5" y="271">Mitte jeder Karte</text>
  <text x="16" y="277" font-size="2.1" fill="#555">Druckbereich der meisten Drucker: mindestens 4 mm Rand; alle Karten liegen weit innerhalb.</text>
</g>`;
const gestaltung = slots.map(([x, y], i) => `<g id="Karte-${i + 1}" inkscape:label="Karte ${i + 1} (hier gestalten)"/>`).join('\n    ');
const svgA4 = (mitHilfe = true, ohneDesign = false) => `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape" width="210mm" height="297mm" viewBox="0 0 210 297">
  <title>Guthabenkarten Rückseite – Schablone A4</title>
  ${ohneDesign ? '' : `<g id="Gestaltung" inkscape:groupmode="layer" inkscape:label="Gestaltung (hier arbeiten)">
    ${gestaltung}
  </g>`}
  ${mitHilfe ? `<g id="Hilfslinien" inkscape:groupmode="layer" inkscape:label="Hilfslinien (nicht drucken)">
    ${slots.map(([x, y], i) => slotHilfe(x, y, i + 1)).join('\n    ')}
    ${legende}
  </g>` : ''}
</svg>`;
const svgKarte = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape" width="${B + 2 * ANSCHNITT}mm" height="${H + 2 * ANSCHNITT}mm" viewBox="0 0 ${B + 2 * ANSCHNITT} ${H + 2 * ANSCHNITT}">
  <title>Guthabenkarte Rückseite – eine Karte mit Anschnitt (88 × 57 mm)</title>
  <g id="Gestaltung" inkscape:groupmode="layer" inkscape:label="Gestaltung (hier arbeiten)"/>
  <g id="Hilfslinien" inkscape:groupmode="layer" inkscape:label="Hilfslinien (nicht drucken)">
    <rect x="0" y="0" width="${B + 2 * ANSCHNITT}" height="${H + 2 * ANSCHNITT}" fill="none" stroke="${farbe.anschnitt}" stroke-width=".2" stroke-dasharray="1 .8"/>
    <rect x="${ANSCHNITT}" y="${ANSCHNITT}" width="${B}" height="${H}" fill="none" stroke="${farbe.schnitt}" stroke-width=".3"/>
    <rect x="${ANSCHNITT + RAND}" y="${ANSCHNITT + RAND}" width="${B - 2 * RAND}" height="${H - 2 * RAND}" fill="none" stroke="${farbe.rand}" stroke-width=".2" stroke-dasharray="1.5 1"/>
    ${kreuz(ANSCHNITT + B / 2, ANSCHNITT + H / 2)}
  </g>
</svg>`;
// Passprobe: schwarze Umrisse und Kreuze, zum Gegenlicht-Vergleich mit der Vorderseite
const svgPassprobe = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="210mm" height="297mm" viewBox="0 0 210 297">
  <title>Passprobe Rückseite</title>
  ${slots.map(([x, y]) => `<rect x="${x}" y="${y}" width="${B}" height="${H}" fill="none" stroke="#000" stroke-width=".25"/>
  <path d="M${x - 3} ${y}h2M${x} ${y - 3}v2M${x + B + 1} ${y}h2M${x + B} ${y - 3}v2M${x - 3} ${y + H}h2M${x} ${y + H + 1}v2M${x + B + 1} ${y + H}h2M${x + B} ${y + H + 1}v2" stroke="#000" stroke-width=".2"/>
  ${kreuz(x + B / 2, y + H / 2, '#000', .2)}`).join('\n  ')}
  <g font-family="Liberation Sans, Arial, sans-serif" font-size="2.6" fill="#000">
    <text x="16" y="6" font-weight="700">Passprobe Rückseite – auf die Rückseite eines Blattes mit gedruckten Vorderseiten drucken</text>
    <text x="16" y="9.4" font-size="2.2">Gegen das Licht halten: die Linien der Rückseite müssen die gestrichelten Ränder der Vorderseite decken. Abweichung ausmessen → in „Versatz“ eintragen.</text>
    <text x="16" y="270" font-size="2.2">oben ▲ · Wenden an der langen Kante · ein Strich = 1 mm: ├──┤ <tspan dx="2">${'|'.repeat(0)}</tspan></text>
    <path d="M60 268h10M60 267v2M61 267.6v1.4M62 267.6v1.4M63 267.6v1.4M64 267.6v1.4M65 267.4v1.6M66 267.6v1.4M67 267.6v1.4M68 267.6v1.4M69 267.6v1.4M70 267v2" stroke="#000" stroke-width=".15" fill="none"/>
  </g>
</svg>`;
writeFileSync(HIER + 'Rueckseite-Schablone-A4.svg', svgA4());
writeFileSync(HIER + 'Karte-Rueckseite-85x54-mit-Anschnitt.svg', svgKarte);
writeFileSync(HIER + 'Passprobe-A4.svg', svgPassprobe);

const b = await chromium.launch();
async function render(svg, name, wmm, hmm, dpi, transparent) {
  // PNG: genau 300 dpi (A4 = 2480 × 3508 Pixel; Karte mit Anschnitt = 1039 × 673 Pixel)
  const wpx = Math.round(wmm / 25.4 * dpi), hpx = Math.round(hmm / 25.4 * dpi);
  const faktor = wpx > 2000 ? 2 : 1, cw = wpx / faktor, ch = hpx / faktor;
  const inhalt = svg.replace('<?xml version="1.0" encoding="UTF-8"?>', '').replace(/ width="[\d.]+mm" height="[\d.]+mm"/, ` width="${cw}" height="${ch}"`);
  const p = await b.newPage({ viewport: { width: cw, height: ch }, deviceScaleFactor: faktor });
  await p.setContent(`<html><body style="margin:0;background:${transparent ? 'transparent' : '#fff'}">${inhalt}</body></html>`);
  await p.screenshot({ path: HIER + name + '.png', omitBackground: !!transparent });
  await p.close();
  if (name.includes('A4') && !name.includes('transparent')) {   // PDF in Originalgröße für die A4-Bögen
    const q = await b.newPage();
    await q.setContent(`<html><head><style>@page{size:210mm 297mm;margin:0}html,body{margin:0;overflow:hidden}svg{display:block}</style></head><body>${svg.replace('<?xml version="1.0" encoding="UTF-8"?>', '')}</body></html>`);
    await q.pdf({ path: HIER + name + '.pdf', preferCSSPageSize: true, printBackground: true, margin: { top: 0, bottom: 0, left: 0, right: 0 } });
    await q.close();
  }
}
await render(svgA4(), 'Rueckseite-Schablone-A4', 210, 297, 300, false);
await render(svgA4(true, true), 'Rueckseite-Hilfslinien-A4-transparent', 210, 297, 300, true);
await render(svgKarte, 'Karte-Rueckseite-85x54-mit-Anschnitt', B + 2 * ANSCHNITT, H + 2 * ANSCHNITT, 300, false);
await render(svgPassprobe, 'Passprobe-A4', 210, 297, 300, false);
await b.close();
console.log('fertig');
