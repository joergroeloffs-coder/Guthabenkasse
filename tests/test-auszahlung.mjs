// Fest-Ende: Auszahlung des Restguthabens am Terminal
import { start } from './pw2.mjs';
let ok = 0, bad = 0; const t = (n, c, extra = '') => { if (c) ok++; else { bad++; console.log('FAIL', n, extra); } };
const A = await start({ schnell: true }); const T = await A.seite('terminal', 'T', 'ka', 'Anna'); const V = await A.seite('verkauf', 'V', 'vk', 'Ben');
const w = (p, ms) => p.waitForTimeout(ms);
const holen = () => A.srv.post('ka', { aktion: 'holen' }).daten;
const saldo = nr => holen().buchungen.filter(b => b.karte === nr).reduce((s, b) => s + b.cent, 0);
const feld = (p, id) => p.evaluate(i => document.getElementById(i).textContent.replace(/\s+/g, ' '), id);
// Karten mit Guthaben
await T.evaluate(() => kartenBlatt(['T0001', 'T0002', 'T0003'])); await w(T, 700);
const codes = await T.evaluate(() => ['T0001', 'T0002', 'T0003'].map(n => db.karten[n].code));
for (const [i, nr] of ['T0001', 'T0002', 'T0003'].entries()) await T.evaluate(([n, c, b]) => { $("aufBetrag").value = String(b); letzteBuchung = { roh: '', zeit: 0, cent: 0, tab: '' }; buche('auf', 'GK-' + n + '-' + c); }, [nr, codes[i], [20, 12.5, 5][i]]).then(() => w(T, 500));
A.srv.post('ka', { aktion: 'karten', was: 'name', nr: 'T0002', name: 'Anna Müller', zusatz: '' });
await T.evaluate(() => syncJetzt(5000));
await V.evaluate(() => syncJetzt(5000));
await T.evaluate(() => reiterZeigen('auszahlung')); await w(T, 300);
t('Reiter Auszahlung sichtbar', await T.evaluate(() => !document.getElementById('reiter-auszahlung').classList.contains('hide')));
t('Summe: 37,50 € auf 3 Karten', (await feld(T, 'azSumme')).includes('37,50') && (await feld(T, 'azSumme')).includes('3'), await feld(T, 'azSumme'));
t('Liste zeigt alle drei', await T.evaluate(() => document.querySelectorAll('#azListe .zeile').length === 3));
// Scannen → Betrag und Knopf
await T.evaluate(c => auszahlungKarte('GK-T0002-' + c), codes[1]); await w(T, 900);
t('Karte gezeigt mit Betrag und Name', (await feld(T, 'azKarte')).includes('12,50') && (await feld(T, 'azKarte')).includes('Anna Müller'), await feld(T, 'azKarte'));
t('Noch nichts gebucht', saldo('T0002') === 1250);
// Doppelter Tipp: nur eine Auszahlung
await T.evaluate(() => { const k = document.getElementById('azZahlen'); k.click(); k.click(); }); await w(T, 1500);
t('Ausgezahlt gezeigt', (await feld(T, 'azKarte')).includes('Ausgezahlt') && (await feld(T, 'azKarte')).includes('12,50'), await feld(T, 'azKarte'));
t('Genau eine Auszahlung in der Ablage', holen().buchungen.filter(b => b.art === 'auszahlung' && b.karte === 'T0002').length === 1 && saldo('T0002') === 0);
t('Summe sinkt, Ausgezahlt steigt', (await feld(T, 'azSumme')).includes('25,00') && (await feld(T, 'azSumme')).includes('12,50'), await feld(T, 'azSumme'));
t('Karte nicht mehr in der Liste', await T.evaluate(() => !document.getElementById('azListe').textContent.includes('T0002')));
// Dieselbe Karte nochmal: nichts auszuzahlen
await T.evaluate(c => auszahlungKarte('GK-T0002-' + c), codes[1]); await w(T, 700);
t('Zweites Mal: nichts auszuzahlen', (await feld(T, 'azKarte')).includes('Nichts auszuzahlen') && !(await T.evaluate(() => !!document.getElementById('azZahlen'))));
// Stand ändert sich zwischen Anzeige und Auszahlung (Abbuchung am Verkaufsgerät)
await T.evaluate(c => auszahlungKarte('GK-T0001-' + c), codes[0]); await w(T, 800);
await V.evaluate(c => { $("abBetrag").value = "3"; letzteBuchung = { roh: '', zeit: 0, cent: 0, tab: '' }; buche('ab', 'GK-T0001-' + c); }, codes[0]); await w(V, 1500);
await T.evaluate(() => document.getElementById('azZahlen').click()); await w(T, 1800);
t('Geänderter Stand: nicht ausgezahlt, neuer Betrag gezeigt', holen().buchungen.filter(b => b.art === 'auszahlung' && b.karte === 'T0001').length === 0 && (await feld(T, 'azKarte')).includes('17,00'), await feld(T, 'azKarte'));
await T.evaluate(() => document.getElementById('azZahlen').click()); await w(T, 1800);
t('Danach 17,00 € ausgezahlt', saldo('T0001') === 0 && holen().buchungen.some(b => b.art === 'auszahlung' && b.karte === 'T0001' && b.cent === -1700));
// Eintippen: nur Nummer
await T.evaluate(() => { document.getElementById('azCode').value = 'T0003'; document.getElementById('azSuchen').click(); }); await w(T, 800);
t('Nummer eintippen findet die Karte', (await feld(T, 'azKarte')).includes('5,00'), await feld(T, 'azKarte'));
// Kamera-Weg: Treffer im Reiter Auszahlung
await T.evaluate(c => { kameraTab = 'aus'; letzterCode = ''; treffer('GK-T0003-' + c); }, codes[2]); await w(T, 800);
t('Scan-Treffer wird zur Auszahlung geleitet (nicht gebucht)', (await feld(T, 'azKarte')).includes('5,00') && saldo('T0003') === 500);
// Offline: auszahlen geht, Hinweis sichtbar, später übertragen
A.steuer.offline = true; await T.evaluate(() => syncJetzt(2000)); await w(T, 500);
await T.evaluate(c => auszahlungKarte('GK-T0003-' + c), codes[2]); await w(T, 900);
t('Offline: Hinweis auf alten Stand', (await feld(T, 'azKarte')).includes('Ohne Verbindung'), await feld(T, 'azKarte'));
await T.evaluate(() => document.getElementById('azZahlen').click()); await w(T, 1200);
t('Offline ausgezahlt (vorgemerkt)', (await feld(T, 'azKarte')).includes('Ausgezahlt') && await T.evaluate(() => ausstehende().length) >= 1);
A.steuer.offline = false; await T.evaluate(() => syncJetzt(5000)); await w(T, 600);
t('Nach Verbindung übertragen, Ablage 0', saldo('T0003') === 0 && await T.evaluate(() => ausstehende().length) === 0);
// Abrechnung zeigt die Auszahlungen, Umsatz bleibt
const rep = A.srv.post('ka', { aktion: 'bericht' }).bericht;
t('Abrechnung: ausgezahlt 34,50 €', rep.ausgezahlt === 3450, String(rep.ausgezahlt));
t('Verkaufsgerät hat keinen Auszahlungs-Reiter', await V.evaluate(() => !document.getElementById('reiter-auszahlung')));
const hack = await V.evaluate(() => { const b = { id: 'hackaz', karte: 'T0001', cent: -100, art: 'auszahlung', zeit: Date.now(), geraet: 'V', n: 9999, k: 'x' }; return { b, schluessel: db.schluessel }; });
const rh = A.srv.post('vk', { aktion: 'sync', geraet: { id: 'V', schluessel: hack.schluessel }, cursor: 0, kv: 0, neu: [hack.b] });
t('Verkaufsgerät darf nicht auszahlen (Ablage lehnt ab)', rh.ergebnisse.hackaz && rh.ergebnisse.hackaz.st === 'abgelehnt' && rh.ergebnisse.hackaz.code === 'recht', JSON.stringify(rh.ergebnisse));
console.log('Seitenfehler:', A.steuer.log.length ? A.steuer.log : 'keine'); console.log(ok + ' ok, ' + bad + ' Fehler'); await A.ende();
