import { start } from './pw2.mjs';
let ok = 0, bad = 0; const t = (n, c, extra = '') => { if (c) ok++; else { bad++; console.log('FAIL', n, extra); } };
const A = await start();
const T = await A.seite('terminal', 'T', 'ka', 'Anna');
const V = await A.seite('verkauf', 'V', 'vk', 'Ben');
const V2 = await A.seite('verkauf', 'W', 'vk', 'Cem');
const warte = (p, ms) => p.waitForTimeout(ms);
const ergebnis = p => p.evaluate(() => ['befund2','befund'].map(i=>document.getElementById(i)).filter(Boolean).map(x=>x.innerText).join('|'));

// 1. Karte drucken (Code entsteht), an die Ablage melden
const nr = 'T0001';
await T.evaluate(n => { kartenBlatt([n]); }, nr);
await warte(T, 800);
const code = await T.evaluate(n => db.karten[n].code, nr);
t('Code erzeugt', /^[A-Z0-9]{4}$/.test(code));
t('Karte in der Ablage', A.srv.post('ka', { aktion: 'holen' }).daten.karten[nr]?.code === code);
// 2. Aufbuchen am Terminal
await T.evaluate(([n, c]) => { $("aufBetrag").value = "20"; buche("auf", "GK-" + n + "-" + c); }, [nr, code]);
await warte(T, 1500);
t('Aufbuchen bestätigt', (await ergebnis(T)).includes('20,00'), await ergebnis(T));
t('Ablage hat Aufbuchung', A.srv.post('ka', { aktion: 'holen' }).daten.buchungen.length === 1);
// 3. Verkauf: Karte lernen, abbuchen
await V.evaluate(() => syncJetzt(5000)); await warte(V, 500);
t('Verkauf kennt Karte ohne Code', await V.evaluate(n => db.karten[n] && !db.karten[n].code, nr));
await V.evaluate(([n, c]) => { $("abBetrag").value = "5"; buche("ab", "GK-" + n + "-" + c); }, [nr, code]);
await warte(V, 1500);
let e = await ergebnis(V); t('Abbuchen bestätigt', e.includes('5,00') && e.includes('15,00'), e);
t('Ablage Saldo 15', A.srv.post('ka', { aktion: 'holen' }).daten.buchungen.reduce((s, b) => s + b.cent, 0) === 1500);
// 4. Doppelscan
await V.evaluate(([n, c]) => { $("abBetrag").value = "5"; buche("ab", "GK-" + n + "-" + c); }, [nr, code]);
await warte(V, 800);
t('Doppelscan blockiert', (await ergebnis(V)).includes('Gerade erst'), await ergebnis(V));
t('nur eine Abbuchung mehr', A.srv.post('ka', { aktion: 'holen' }).daten.buchungen.length === 2);
// 5. Falsche Prüfnummer / ohne Code am Verkauf
await V.evaluate(([n]) => { $("abBetrag").value = "2"; letzteBuchung = {roh:"",zeit:0,cent:0,tab:""}; buche("ab", "GK-" + n + "-ZZZZ"); }, [nr]);
await warte(V, 1500); e = await ergebnis(V); t('falsche Prüfnummer', e.includes('Prüfnummer'), e);
// 6. Verkauf kann nicht aufbuchen
const thr = await V.evaluate(n => { try { buchen(n, 500, "auf"); return false; } catch (x) { return true; } }, nr); t('Verkauf: buchen(auf) verboten', thr);
// 7. Offline-Abbuchung
A.steuer.offline = true;
await V.evaluate(([n, c]) => { $("abBetrag").value = "3"; letzteBuchung = {roh:"",zeit:0,cent:0,tab:""}; buche("ab", "GK-" + n + "-" + c); }, [nr, code]);
await warte(V, 14000); e = await ergebnis(V); t('Offline gebucht', e.includes('Offline gebucht') , e);
t('Eine Buchung wartet', await V.evaluate(() => ausstehende().length) === 1);
t('Chip offline', (await V.evaluate(() => document.getElementById('syncChip').className)).includes('s-offline'));
A.steuer.offline = false;
await V.evaluate(() => syncJetzt(5000)); await warte(V, 500);
t('Nach Verbindung übertragen', await V.evaluate(() => ausstehende().length) === 0);
t('Ablage Saldo 12', A.srv.post('ka', { aktion: 'holen' }).daten.buchungen.reduce((s, b) => s + b.cent, 0) === 1200);
// 8. Antwort geht verloren (Server hat gebucht, Client weiß es nicht) → keine Doppelbuchung
A.steuer.nurAntwortVerlieren = true;
await V.evaluate(([n, c]) => { $("abBetrag").value = "1"; letzteBuchung = {roh:"",zeit:0,cent:0,tab:""}; buche("ab", "GK-" + n + "-" + c); }, [nr, code]);
await warte(V, 3000); e = await ergebnis(V); t('Verlorene Antwort geklärt', e.includes('1,00') && !e.includes('Unklar'), e);
t('genau eine Buchung mehr', A.srv.post('ka', { aktion: 'holen' }).daten.buchungen.length === 4 + 0 || A.srv.post('ka', { aktion: 'holen' }).daten.buchungen.length === 4, String(A.srv.post('ka', { aktion: 'holen' }).daten.buchungen.length));
// 9. Gleichzeitig: Rest 11 €; beide buchen 8 € 
await V.evaluate(() => syncJetzt(5000)); await V2.evaluate(() => syncJetzt(5000));
const rest = A.srv.post('ka', { aktion: 'holen' }).daten.buchungen.reduce((s, b) => s + b.cent, 0);
await Promise.all([V, V2].map(p => p.evaluate(([n, c, r]) => { $("abBetrag").value = String((r - 300) / 100); letzteBuchung = {roh:"",zeit:0,cent:0,tab:""}; buche("ab", "GK-" + n + "-" + c); }, [nr, code, rest])));
await warte(V, 3000);
const nach = A.srv.post('ka', { aktion: 'holen' }).daten.buchungen.reduce((s, b) => s + b.cent, 0);
t('gleichzeitig: nie negativ', nach >= 0, String(nach));
// 10. Storno einmalig
const letzte = await V.evaluate(() => db.buchungen.filter(b => b.geraet === 'V' && b.art === 'ab').slice(-1)[0]?.id);
if (letzte) {
  await V.evaluate(id => { nehmeZurueck(id); nehmeZurueck(id); }, letzte); await warte(V, 2500);
  const st = A.srv.post('ka', { aktion: 'holen' }).daten.buchungen.filter(b => b.art === 'storno' && b.ref === letzte);
  t('Doppelklick-Storno nur einmal', st.length <= 1, String(st.length));
}
// 11. Neustart: Daten bleiben (localStorage + IndexedDB)
const vorher = await V.evaluate(() => db.buchungen.length);
await V.reload(); await warte(V, 800);
t('Neustart behält Buchungen', await V.evaluate(() => db.buchungen.length) === vorher);
// 12. localStorage defekt → IndexedDB rettet
await V.evaluate(() => { localStorage.removeItem(KEY); localStorage.removeItem(KEY + ".b"); });
await V.reload(); await warte(V, 1200);
t('IndexedDB stellt wieder her', await V.evaluate(() => db.buchungen.length) === vorher, String(await V.evaluate(() => db.buchungen.length)));
// 13. Speicherfehler → nicht gebucht
await V.evaluate(() => { Storage.prototype.setItem = function () { throw new Error('voll'); }; idbRef = null; letzteBuchung = {roh:"",zeit:0,cent:0,tab:""}; });
const nVor = A.srv.post('ka', { aktion: 'holen' }).daten.buchungen.length;
await V.evaluate(([n, c]) => { $("abBetrag").value = "0,10"; buche("ab", "GK-" + n + "-" + c); }, [nr, code]); await warte(V, 1500);
e = await ergebnis(V); t('Speicherfehler: nicht gebucht', e.includes('nicht speichern') || e.includes('Nicht gebucht'), e);
t('Ablage unverändert', A.srv.post('ka', { aktion: 'holen' }).daten.buchungen.length === nVor);
console.log('Seitenfehler:', A.steuer.log.length ? A.steuer.log : 'keine');
console.log(ok + ' ok, ' + bad + ' Fehler');
await A.ende();
