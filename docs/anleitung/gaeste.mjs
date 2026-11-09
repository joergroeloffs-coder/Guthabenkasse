// Blatt für die Gäste: so funktioniert die Guthabenkarte, und das Restguthaben gibt es am Ende des Abends zurück.
// Aufruf: node docs/anleitung/gaeste.mjs ["Ort der Rückgabe"] ["Zeit der Rückgabe"]   (leer = Schreiblinie zum Ausfüllen)
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import { readFileSync, writeFileSync } from 'node:fs';
const HIER = new URL('./', import.meta.url).pathname, WURZEL = HIER + '../../';
const ORT = process.argv[2] ?? '', ZEIT = process.argv[3] ?? '';
const stil = readFileSync(HIER + 'stil-anleitung.css', 'utf8') + `
@page{margin:12mm 14mm}
body{font-size:11pt}
.kopf{display:flex;gap:12pt;align-items:center;margin-bottom:8pt}
.kopf img{width:20mm;height:20mm}
.kopf h1{font-size:27pt;line-height:1.05}
.kopf .u{font-size:11.5pt;color:var(--tinteWeich)}
.gross{background:var(--watt);color:#fff;border-radius:6pt;padding:11pt 14pt;margin:6pt 0 10pt}
.gross b{display:block;font-family:'Newsreader','Bitstream Charter',Georgia,serif;font-weight:400;font-size:19pt;line-height:1.15}
.gross p{margin:4pt 0 0;font-size:11pt}
.gross .zeile{display:flex;gap:14pt;margin-top:7pt;font-size:10.5pt}
.gross .zeile span{flex:1;border-bottom:1pt solid #cfe3d6;min-height:15pt;padding-bottom:1pt}
.gross .zeile i{font-style:normal;color:#cfe3d6;font-size:8.5pt;margin-right:5pt;text-transform:uppercase;letter-spacing:.08em}
.zw{display:flex;gap:12pt}.zw>div:first-child{flex:1.35}.zw>div:last-child{flex:.65}
.schritt{margin-bottom:8pt}.schritt .zahl{width:22pt;height:22pt;border-radius:11pt;font-size:11pt}
.schritt .was>b:first-child{font-size:12pt}.schritt .was p{font-size:10.5pt}
.bildkasten img{width:100%;border:.5pt solid var(--linieFein);border-radius:3pt;height:105mm;object-fit:cover;object-position:top}
.bildkasten figcaption{font-size:8.5pt}
.gut{display:flex;gap:8pt;margin-top:6pt}.gut>div{flex:1;border-radius:3pt;padding:6pt 8pt;font-size:9.4pt}
.gut b{display:block;font-size:10pt;margin-bottom:2pt}
.fuss2{margin-top:7pt;font-size:8.5pt;color:var(--tinteWeich);text-align:center}
`;
const T = {
 de: {
  titel: 'Ihre Guthabenkarte', unter: 'So funktioniert es – und so bekommen Sie Ihr Restgeld zurück',
  gross: 'Was Sie nicht ausgeben, bekommen Sie am Ende des Abends zurück.', gross2: 'Bringen Sie dazu Ihre Karte zur Kasse am Tresen: Das Restguthaben wird Ihnen ausgezahlt.',
  ort: 'Rückgabe', ortStandard: 'An der Kasse am Tresen', zeit: 'Zeit',
  schritte: [
   ['Karte holen und aufladen', 'An der Kasse zahlen Sie einen Betrag Ihrer Wahl. Er wird auf Ihre Karte gebucht, und Sie sehen sofort Ihr Guthaben. Aufladen können Sie jederzeit wieder.'],
   ['Mit der Karte bezahlen', 'Bestellen Sie wie gewohnt und halten Sie die Karte an der Theke hin. Das Personal scannt den QR-Code, und auf dem Bildschirm sehen Sie oben, was abgebucht wurde, und unten, was noch auf der Karte ist.'],
   ['Guthaben ansehen', 'Fragen Sie jederzeit an der Theke nach Ihrem Stand. Das Scannen allein kostet nichts; es wird nichts gebucht.'],
   ['Trinkgeld – freiwillig', 'Nach dem Bezahlen kann das Personal auf Wunsch ein Trinkgeld von der Karte abbuchen (zum Beispiel 5 % oder 10 %, auf 0,50 € gerundet).'],
   ['Restgeld zurück', 'Am Ende des Abends geben Sie Ihre Karte an der Kasse am Tresen ab. Was noch darauf ist, wird Ihnen ausgezahlt.'],
  ],
  bildunterschrift: 'So sieht es an der Theke aus: oben abgebucht, unten noch auf der Karte.',
  gut: [
   ['Gut aufbewahren', 'Die Karte ist wie Bargeld: Wer sie hat, kann sie benutzen. Bitte nicht aus der Hand geben und den QR-Code nicht fotografieren.'],
   ['Verloren?', 'Sagen Sie es sofort an der Kasse. Wir sperren die Karte; was mit dem Guthaben geschehen kann, klärt das Team mit Ihnen.'],
   ['Etwas stimmt nicht?', 'Falsche Buchung? Sofort melden – Buchungen lassen sich zurücknehmen. Reicht das Guthaben nicht, laden Sie einfach nach.'],
  ],
  fuss: 'Bitte halten Sie den QR-Code sauber und ungeknickt, damit er gelesen werden kann.',
 },
 tr: {
  titel: 'Bakiye Kartınız', unter: 'Nasıl çalışır – ve kalan paranızı nasıl geri alırsınız',
  gross: 'Harcamadığınız para akşamın sonunda size iade edilir.', gross2: 'Bunun için kartınızı tezgâhtaki kasaya getirin: Kartta kalan bakiye size ödenir.',
  ort: 'İade yeri', ortStandard: 'Tezgâhtaki kasada', zeit: 'Saat',
  schritte: [
   ['Kartı alın ve yükleyin', 'Kasada istediğiniz tutarı ödersiniz. Tutar kartınıza yüklenir ve bakiyenizi hemen görürsünüz. İstediğiniz zaman tekrar yükleyebilirsiniz.'],
   ['Kartla ödeyin', 'Her zamanki gibi sipariş verin ve kartı tezgâhta gösterin. Görevli QR kodu okutur; ekranda üstte düşülen tutarı, altta kartta kalanı görürsünüz.'],
   ['Bakiyenize bakın', 'Tezgâhta istediğiniz zaman bakiyenizi sorabilirsiniz. Yalnızca okutmak hiçbir şey düşmez; işlem yapılmaz.'],
   ['Bahşiş – isteğe bağlı', 'Ödemeden sonra isterseniz görevli karttan bahşiş düşebilir (örneğin %5 veya %10, 0,50 €’ya yuvarlanır).'],
   ['Kalan paranız iade edilir', 'Akşamın sonunda kartınızı tezgâhtaki kasaya verirsiniz. Üzerinde kalan tutar size ödenir.'],
  ],
  bildunterschrift: 'Tezgâhta böyle görünür: üstte düşülen, altta kartta kalan.',
  gut: [
   ['İyi saklayın', 'Kart nakit para gibidir: kimin elindeyse kullanabilir. Lütfen elden çıkarmayın ve QR kodunu fotoğraflamayın.'],
   ['Kaybolursa?', 'Hemen kasaya söyleyin. Kartı engelleriz; bakiyeyle ne yapılabileceğini ekip sizinle birlikte netleştirir.'],
   ['Bir şey yanlışsa?', 'Yanlış bir işlem mi var? Hemen söyleyin – işlemler geri alınabilir. Bakiye yetmezse kolayca tekrar yükleyin.'],
  ],
  fuss: 'Lütfen QR kodu temiz ve kırışıksız tutun, böylece okunabilir.',
 },
};
function seite(l) {
  const t = T[l];
  const bild = 'data:image/png;base64,' + readFileSync(HIER + `bild/v-ergebnis-${l}.png`).toString('base64');
  const icon = 'data:image/png;base64,' + readFileSync(WURZEL + 'icon-512.png').toString('base64');
  return `<section class="blatt">
   <div class="kopf"><img src="${icon}" alt=""><div><h1>${t.titel}</h1><div class="u">${t.unter}</div></div></div>
   <div class="gross"><b>${t.gross}</b><p>${t.gross2}</p>
     <div class="zeile"><span><i>${t.ort}</i>${ORT || t.ortStandard}</span><span><i>${t.zeit}</i>${ZEIT}</span></div></div>
   <div class="zw"><div><div class="schritte">${t.schritte.map(([a, b]) => `<div class="schritt"><div class="zahl"></div><div class="was"><b>${a}</b><p>${b}</p></div></div>`).join('')}</div></div>
     <div class="bildkasten"><figure><img src="${bild}" alt=""><figcaption>${t.bildunterschrift}</figcaption></figure></div></div>
   <div class="gut">${t.gut.map(([a, b], i) => `<div class="${['f-gruen', 'f-ziegel', 'f-sand'][i]}"><b>${a}</b>${b}</div>`).join('')}</div>
   <div class="fuss2">${t.fuss}</div></section>`;
}
const browser = await chromium.launch();
const teile = {};
for (const l of ['de', 'tr']) {
  const html = `<!doctype html><html lang="${l}"><head><meta charset="utf-8"><title>${T[l].titel}</title><style>${stil}</style></head><body>${seite(l)}</body></html>`;
  teile[l] = seite(l);
  const f = HIER + `Gaeste-Info-${l}`; writeFileSync(f + '.html', html);
  const p = await browser.newPage({ viewport: { width: 700, height: 1050 } });
  await p.goto('file://' + f + '.html', { waitUntil: 'networkidle' }); await p.emulateMedia({ media: 'print' });
  const h = await p.evaluate(() => Math.round(document.querySelector('section.blatt').getBoundingClientRect().height / 3.7795));
  await p.pdf({ path: f + '.pdf', format: 'A4', printBackground: true, margin: { top: '12mm', bottom: '12mm', left: '14mm', right: '14mm' } });
  console.log(l, h + ' mm (Fläche 273 mm)', h <= 273 ? 'passt' : 'ZU LANG'); await p.close();
}
// beide Sprachen auf zwei Seiten
const both = `<!doctype html><html><head><meta charset="utf-8"><style>${stil}</style></head><body>${teile.de}${teile.tr}</body></html>`;
writeFileSync(HIER + 'Gaeste-Info-de-tr.html', both);
const p = await browser.newPage({ viewport: { width: 700, height: 1050 } });
await p.goto('file://' + HIER + 'Gaeste-Info-de-tr.html', { waitUntil: 'networkidle' }); await p.emulateMedia({ media: 'print' });
await p.pdf({ path: HIER + 'Gaeste-Info-de-tr.pdf', format: 'A4', printBackground: true, margin: { top: '12mm', bottom: '12mm', left: '14mm', right: '14mm' } });
await browser.close();
