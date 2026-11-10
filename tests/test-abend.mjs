// Abend abschließen: Guthaben und Buchungen beginnen bei null, die Karten bleiben
import { start } from './pw2.mjs';
let ok = 0, bad = 0; const t = (n, c, extra = '') => { if (c) ok++; else { bad++; console.log('FAIL', n, extra); } };
const A = await start({ schnell: true }); const T = await A.seite('terminal', 'T', 'ka', 'Anna'); const V = await A.seite('verkauf', 'V', 'vk', 'Ben');
const w = (p, ms) => p.waitForTimeout(ms);
const holen = () => A.srv.post('ka', { aktion: 'holen' }).daten;
await T.evaluate(() => kartenBlatt(['T0001', 'T0002'])); await w(T, 700);
const codes = await T.evaluate(() => ['T0001', 'T0002'].map(n => db.karten[n].code));
A.srv.post('ka', { aktion: 'karten', was: 'name', nr: 'T0001', name: 'Anna Müller', zusatz: '' });
for (const [i, nr] of ['T0001', 'T0002'].entries()) await T.evaluate(([n, c, b]) => { $("aufBetrag").value = String(b); letzteBuchung = { roh: '', zeit: 0, cent: 0, tab: '' }; buche('auf', 'GK-' + n + '-' + c); }, [nr, codes[i], [20, 7.5][i]]).then(() => w(T, 400));
await T.evaluate(() => syncJetzt(5000)); await V.evaluate(() => syncJetzt(5000)); await w(V, 400);
// Abschluss mit Rückfrage (Text + Bestätigungswort + Administrator-Wort)
await T.evaluate(() => { window.__p = []; const antw = ['ABEND ABSCHLIESSEN', 'ad']; window.prompt = t => { window.__p.push(t); return antw.shift(); }; reiterZeigen('einstellungen'); });
await T.evaluate(() => document.getElementById('btnAbend').click()); await w(T, 2500);
const frage = await T.evaluate(() => window.__p[0]);
t('Rückfrage warnt vor verfallendem Guthaben (27,50 €, 2 Karten)', /ACHTUNG/.test(frage) && frage.includes('27,50') && frage.includes('2 Karten'), frage);
t('Ablage: Buchungen leer', holen().buchungen.length === 0);
t('Ablage: Karten, Prüfnummern und Namen bleiben', holen().karten.T0001.code === codes[0] && holen().karten.T0001.name === 'Anna Müller' && !!holen().karten.T0002);
t('Archiv liegt vor', A.srv.dateien.some(f => /-abend\.json$/.test(f.name)));
t('Terminal: Buchungen leer, Karten da', await T.evaluate(() => db.buchungen.length === 0 && !!db.karten.T0001 && !!db.karten.T0002));
t('Terminal: Guthaben 0 überall', await T.evaluate(() => Object.keys(salden()).every(k => salden()[k] === 0)));
t('Anlass bleibt (kein leeres Fest)', await T.evaluate(() => typeof db.anlass === 'object'));
// Verkaufsgerät übernimmt den Abend
await V.evaluate(() => syncJetzt(5000)); await w(V, 600);
t('Verkauf: Buchungen leer, Karten bleiben', await V.evaluate(() => db.buchungen.length === 0 && !!db.karten.T0001));
await V.evaluate(([c]) => { $("abBetrag").value = "1"; letzteBuchung = { roh: '', zeit: 0, cent: 0, tab: '' }; buche('ab', 'GK-T0001-' + c); }, [codes[0]]); await w(V, 1500);
t('Verkauf: Abbuchung von der leeren Karte abgelehnt (Guthaben 0)', holen().buchungen.length === 0);
// Dieselbe Karte am nächsten Abend wieder aufladen und abbuchen
await T.evaluate(([c]) => { reiterZeigen('auf'); $("aufBetrag").value = "10"; letzteBuchung = { roh: '', zeit: 0, cent: 0, tab: '' }; buche('auf', 'GK-T0001-' + c); }, [codes[0]]); await w(T, 1500);
await V.evaluate(() => syncJetzt(5000));
await V.evaluate(([c]) => { $("abBetrag").value = "4"; letzteBuchung = { roh: '', zeit: 0, cent: 0, tab: '' }; buche('ab', 'GK-T0001-' + c); }, [codes[0]]); await w(V, 1500);
t('Nächster Abend: dieselbe Karte lädt auf und bucht ab', holen().buchungen.length === 2 && holen().buchungen.reduce((s, b) => s + b.cent, 0) === 600);
// Falsche Bestätigung ändert nichts
const n0 = holen().buchungen.length;
await T.evaluate(() => { const antw = ['abend', 'ad']; window.prompt = () => antw.shift(); document.getElementById('btnAbend').click(); }); await w(T, 800);
t('Falsches Bestätigungswort: nichts geändert', holen().buchungen.length === n0);
// Neues Fest löscht weiter alles
await T.evaluate(() => { window.confirm = () => true; const antw = ['ad']; window.prompt = () => antw.shift(); document.getElementById('btnLeer').click(); }); await w(T, 2500);
t('Neues Fest: Karten weg', Object.keys(holen().karten).length === 0);
console.log('Seitenfehler:', A.steuer.log.length ? A.steuer.log : 'keine'); console.log(ok + ' ok, ' + bad + ' Fehler'); await A.ende();
