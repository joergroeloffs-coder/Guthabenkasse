// Zusammenfassung für den Gastgeber: Zahlen, Druck über mehrere Seiten, CSV
import { start } from './pw2.mjs';
import { execFileSync } from 'node:child_process';
let ok = 0, bad = 0; const t = (n, c, extra = '') => { if (c) ok++; else { bad++; console.log('FAIL', n, extra); } };
const A = await start({ schnell: true }); const T = await A.seite('terminal', 'T', 'ka', 'Anna'); const V = await A.seite('verkauf', 'V', 'vk', 'Ben');
const w = (p, ms) => p.waitForTimeout(ms);
await T.evaluate(() => kartenBlatt(['T0001', 'T0002', 'T0003'])); await w(T, 700);
const codes = await T.evaluate(() => ['T0001', 'T0002', 'T0003'].map(n => db.karten[n].code));
for (const [i, nr] of ['T0001', 'T0002', 'T0003'].entries()) await T.evaluate(([n, c, b]) => { $("aufBetrag").value = String(b); letzteBuchung = { roh: '', zeit: 0, cent: 0, tab: '' }; buche('auf', 'GK-' + n + '-' + c); }, [nr, codes[i], [20, 10, 5][i]]);
await w(T, 1200); await V.evaluate(() => syncJetzt(5000));
const ab = async (nr, i, b) => { await V.evaluate(([n, c, b]) => { $("abBetrag").value = String(b); letzteBuchung = { roh: '', zeit: 0, cent: 0, tab: '' }; buche('ab', 'GK-' + n + '-' + c); }, [nr, codes[i], b]); await w(V, 1100); };
await ab('T0001', 0, 4); await ab('T0001', 0, 3); await ab('T0002', 1, 2.5);
// Auszahlung T0002 (rest 7,50) und Fundkarte T0003 (5,00)
await T.evaluate(() => syncJetzt(5000)); await w(T, 300);
await T.evaluate(c => auszahlungKarte('GK-T0002-' + c), codes[1]); await w(T, 900); await T.evaluate(() => document.getElementById('azZahlen').click()); await w(T, 1500);
await T.evaluate(() => { window.confirm = () => true; kartenAktion('einziehen', 'T0003'); }); await w(T, 2500);
await T.evaluate(() => syncJetzt(5000));
const d = await T.evaluate(() => gastgeberDaten());
const k = nr => d.karten.find(x => x.nr === nr);
t('T0001: geladen 20, verbraucht 7, rest 13', k('T0001').eingang === 2000 && k('T0001').verbrauch === 700 && k('T0001').rest === 1300, JSON.stringify(k('T0001')));
t('T0002: geladen 10, verbraucht 2,50, ausgezahlt 7,50, rest 0', k('T0002').eingang === 1000 && k('T0002').verbrauch === 250 && k('T0002').ausg === 750 && k('T0002').rest === 0, JSON.stringify(k('T0002')));
t('T0003: eingezogen 5', k('T0003').fund === 500 && k('T0003').rest === 0 && k('T0003').eingang === 500, JSON.stringify(k('T0003')));
t('Summen', d.summe.eingang === 3500 && d.summe.verbrauch === 950 && d.summe.ausg === 750 && d.summe.fund === 500 && d.summe.rest === 1300 && d.summe.minus === 0, JSON.stringify(d.summe));
t('Rechnung geht auf: Geladen = Verbraucht + Ausgezahlt + Eingezogen + Rest', d.summe.eingang === d.summe.verbrauch + d.summe.ausg + d.summe.fund + d.summe.rest);
// Rücknahme wirkt
await V.evaluate(() => syncJetzt(5000)); const lastId = await V.evaluate(() => db.buchungen.filter(b => b.art === 'ab').slice(-1)[0].id);
await T.evaluate(id => { window.confirm = () => true; nehmeZurueck(id); }, lastId); await w(T, 1500); await T.evaluate(() => syncJetzt(5000));
const d2 = await T.evaluate(() => gastgeberDaten()); t('Rücknahme wird abgezogen', d2.summe.verbrauch === 700, JSON.stringify(d2.summe));
// Seite: Knöpfe und Text
await T.evaluate(() => reiterZeigen('verwaltung')); await w(T, 300);
t('Knöpfe in der Verwaltung', await T.evaluate(() => !!document.getElementById('vGastgeber') && !!document.getElementById('vGastgeberCsv')));
const html = await T.evaluate(() => gastgeberHtml()); t('Seite enthält Summen', html.includes('Zusammenfassung') && html.includes('T0001') && html.includes('Rest auf Karten'));
// CSV
const [dl] = await Promise.all([T.waitForEvent('download'), T.evaluate(() => document.getElementById('vGastgeberCsv').click())]);
const csv = (await import('node:fs')).readFileSync(await dl.path(), 'utf8'); t('CSV mit Kopfzeile und Komma', csv.includes('Karte;Name;Geladen') && /T0001;.*20,00;/.test(csv), csv.slice(0, 200));
// Druck mit 150 Karten über mehrere Seiten
await T.evaluate(() => { var sim = []; for (var i = 1; i <= 150; i++) { var nr = 'S' + ('0000' + i).slice(-4); db.karten[nr] = { nr: nr, ts: 1, name: 'Gast Nummer ' + i }; db.buchungen.push({ id: 'x' + i, karte: nr, cent: 1500, art: 'auf', zeit: Date.now(), geraet: 'T', s: 1000 + i }); } });
await T.evaluate(() => { document.getElementById('bogen').innerHTML = gastgeberHtml(); });
await T.emulateMedia({ media: 'print' }); const pfad = '/tmp/gastgeber.pdf'; await T.pdf({ path: pfad, format: 'A4', printBackground: true });
const seiten = Number(/Pages:\s+(\d+)/.exec(execFileSync('pdfinfo', [pfad]).toString())[1]); t('150 Karten laufen über mehrere Seiten', seiten >= 4 && seiten <= 8, String(seiten));
const text = execFileSync('pdftotext', [pfad, '-']).toString(); t('Letzte Karte steht im Druck', text.includes('S0150') && text.includes('Rest auf Karten'));
console.log('Seitenfehler:', A.steuer.log.length ? A.steuer.log : 'keine'); console.log(ok + ' ok, ' + bad + ' Fehler'); await A.ende();
