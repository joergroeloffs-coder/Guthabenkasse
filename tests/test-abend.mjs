// Abend abschließen (Karten und Guthaben bleiben) und Fundkarte einziehen
import { start } from './pw2.mjs';
let ok = 0, bad = 0; const t = (n, c, extra = '') => { if (c) ok++; else { bad++; console.log('FAIL', n, extra); } };
const A = await start({ schnell: true }); const T = await A.seite('terminal', 'T', 'ka', 'Anna'); const V = await A.seite('verkauf', 'V', 'vk', 'Ben');
const w = (p, ms) => p.waitForTimeout(ms);
const holen = () => A.srv.post('ka', { aktion: 'holen' }).daten;
const saldo = nr => holen().buchungen.filter(b => b.karte === nr).reduce((s, b) => s + b.cent, 0);
await T.evaluate(() => kartenBlatt(['T0001', 'T0002', 'T0003'])); await w(T, 700);
const codes = await T.evaluate(() => ['T0001', 'T0002', 'T0003'].map(n => db.karten[n].code));
for (const [i, nr] of ['T0001', 'T0002', 'T0003'].entries()) await T.evaluate(([n, c, b]) => { $("aufBetrag").value = String(b); letzteBuchung = { roh: '', zeit: 0, cent: 0, tab: '' }; buche('auf', 'GK-' + n + '-' + c); }, [nr, codes[i], [20, 10, 5][i]]);
await w(T, 1200); await T.evaluate(() => syncJetzt(5000)); await V.evaluate(() => syncJetzt(5000));
await V.evaluate(c => { $("abBetrag").value = "4"; letzteBuchung = { roh: '', zeit: 0, cent: 0, tab: '' }; buche('ab', 'GK-T0001-' + c); }, codes[0]); await w(V, 1500);
t('Vorher: T0001 16,00', saldo('T0001') === 1600, String(saldo('T0001')));
// Fundkarte T0003 einziehen
await T.evaluate(() => { window.confirm = () => true; window.prompt = () => 'ad'; kartenAktion('einziehen', 'T0003'); }); await w(T, 2500);
t('Fundkarte: Karte auf 0', saldo('T0003') === 0 && holen().buchungen.some(b => b.art === 'fundkarte' && b.cent === -500));
const rep = A.srv.post('ka', { aktion: 'bericht' }).bericht;
t('Fundkarte als Trinkgeld verteilt an Ben', rep.fundkarte.summe === 500 && rep.fundkarte.beteiligte.join() === 'Ben', JSON.stringify(rep.fundkarte));
await T.evaluate(() => { reiterZeigen('verwaltung'); }); await w(T, 300);
await T.evaluate(() => document.getElementById('vAuswerten').click()); await w(T, 1200);
t('Abrechnung zeigt Fundkarten', await T.evaluate(() => document.getElementById('vBericht').textContent.includes('Fundkarten')));
// Abend abschließen
await T.evaluate(() => { window.confirm = () => true; window.print = () => {}; window.prompt = m => /eintippen/.test(m) ? 'abend abschliessen' : 'ad'; abendAbschliessen(); }); await w(T, 3500);
const h = holen();
t('Karten bleiben', Object.keys(h.karten).length === 3);
t('Guthaben bleibt (T0001 16, T0002 10)', saldo('T0001') === 1600 && saldo('T0002') === 1000);
t('Nur Übertrag in neuer Abrechnung', h.buchungen.length === 2 && h.buchungen.every(b => b.art === 'uebertrag'), JSON.stringify(h.buchungen.map(b => b.art)));
t('Terminal: Karten behalten', await T.evaluate(() => Object.keys(db.karten).length === 3 && saldo('T0001') === 1600));
await V.evaluate(() => syncJetzt(5000)); await w(V, 500);
t('Verkauf: Karten und Guthaben bleiben', await V.evaluate(() => Object.keys(db.karten).length === 3 && saldo('T0001') === 1600));
// Danach weiter bezahlen
await V.evaluate(c => { $("abBetrag").value = "6"; letzteBuchung = { roh: '', zeit: 0, cent: 0, tab: '' }; buche('ab', 'GK-T0001-' + c); }, codes[0]); await w(V, 1500);
t('Weiterbuchen mit Übertrag', saldo('T0001') === 1000);
const rep2 = A.srv.post('ka', { aktion: 'bericht' }).bericht;
t('Neue Abrechnung: Umsatz nur der neue Abend', rep2.umsatz.netto === 600 && rep2.uebertrag === 2600, JSON.stringify(rep2.umsatz) + rep2.uebertrag);
// Offline gebuchte Nachzügler
A.steuer.offline = true; await V.evaluate(c => { $("abBetrag").value = "1"; letzteBuchung = { roh: '', zeit: 0, cent: 0, tab: '' }; buche('ab', 'GK-T0002-' + c); }, codes[1]); await w(V, 500);
await T.evaluate(() => { window.confirm = () => true; window.prompt = m => /eintippen/.test(m) ? 'ABEND ABSCHLIESSEN' : 'ad'; });
A.steuer.offline = false;
await T.evaluate(() => abendAbschliessen()); await w(T, 3500);
await V.evaluate(() => syncJetzt(8000)); await w(V, 1500);
const rep3 = A.srv.post('ka', { aktion: 'bericht' }).bericht;
t('Nachzügler: zugerechnet als nachgereicht', rep3.nachgereicht.anzahl === 1 && rep3.nachgereicht.summe === 100, JSON.stringify(rep3.nachgereicht));
t('Nachzügler: Guthaben stimmt (T0002 9,00)', saldo('T0002') === 900, String(saldo('T0002')));
// Falsche Bestätigung
const ep = holen().epoche;
await T.evaluate(() => { window.prompt = m => /eintippen/.test(m) ? 'nein' : 'ad'; abendAbschliessen(); }); await w(T, 1500);
t('Falscher Text: nichts passiert', holen().epoche === ep);
console.log('Seitenfehler:', A.steuer.log.length ? A.steuer.log : 'keine'); console.log(ok + ' ok, ' + bad + ' Fehler'); await A.ende();
