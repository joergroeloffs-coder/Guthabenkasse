// Artikel-Tasten: Liste am Terminal pflegen, am Verkaufsgerät tippen, buchen, auswerten
import { start } from './pw2.mjs';
let ok = 0, bad = 0; const t = (n, c, extra = '') => { if (c) ok++; else { bad++; console.log('FAIL', n, extra); } };
const A = await start({ schnell: true }); const T = await A.seite('terminal', 'T', 'ka', 'Anna'); const V = await A.seite('verkauf', 'V', 'vk', 'Ben');
const w = (p, ms) => p.waitForTimeout(ms);
const holen = () => A.srv.post('ka', { aktion: 'holen' }).daten;
await T.evaluate(() => kartenBlatt(['T0001'])); await w(T, 600);
const code = await T.evaluate(() => db.karten['T0001'].code);
await T.evaluate(c => { $("aufBetrag").value = "50"; letzteBuchung = { roh: '', zeit: 0, cent: 0, tab: '' }; buche('auf', 'GK-T0001-' + c); }, code); await w(T, 1200);
await V.evaluate(() => syncJetzt(5000)); await w(V, 300);
t('Ohne Liste: keine Artikel-Tasten', await V.evaluate(() => { artikelZeichnen(); const p = document.getElementById('artikelPanel'); return !p || p.style.display === 'none'; }));
// Terminal: Liste pflegen
await T.evaluate(() => reiterZeigen('verwaltung')); await w(T, 300);
t('Terminal hat die Artikelkarte', await T.evaluate(() => !!document.getElementById('artikelText')));
t('Verkauf hat sie nicht', await V.evaluate(() => { reiterZeigen('meine'); return !document.getElementById('artikelText'); }));
await T.fill('#artikelText', 'Bier 0,3 l; 3,80\nCola; 3\nSchnitzel 14,50');
await T.click('#artikelSpeichern'); await w(T, 800);
t('Speichern meldet Anzahl', (await T.textContent('#artikelMeldung')).includes('3 Artikel'), await T.textContent('#artikelMeldung'));
t('Ablage hat die Liste', A.srv.post('ka', { aktion: 'holen' }).ok);
await T.fill('#artikelText', 'Bier; 3,80\nkaputt'); await T.click('#artikelSpeichern');
t('Fehlerhafte Zeile wird erklärt', (await T.textContent('#artikelMeldung')).includes('Zeile 2'));
await T.evaluate(() => { document.getElementById('artikelText').value = 'Bier 0,3 l; 3,80\nCola; 3\nSchnitzel 14,50'; }); await T.click('#artikelSpeichern'); await w(T, 600);
// Verkauf bekommt die Liste
await V.evaluate(() => syncJetzt(5000)); await w(V, 400);
await V.evaluate(() => reiterZeigen('ab')); await w(V, 300);
t('Verkauf zeigt drei Tasten', await V.evaluate(() => document.querySelectorAll('#artikelPanel [data-art]').length === 3));
t('Ziffernblock ist zunächst verborgen', await V.evaluate(() => getComputedStyle(document.querySelector('#reiter-ab .tasten')).display === 'none'));
// Tippen
await V.click('[data-art="0"]'); await V.click('[data-art="0"]'); await V.click('[data-art="1"]');
t('Betrag = 2 × Bier + Cola = 10,60', await V.inputValue('#abBetrag') === '10,60', await V.inputValue('#abBetrag'));
t('Zähler an der Taste', await V.evaluate(() => document.querySelector('[data-art="0"] .zahl').textContent === '2'));
await V.click('[data-artzurueck]'); t('Zurück nimmt das Letzte weg (Cola)', await V.inputValue('#abBetrag') === '7,60');
await V.click('[data-art="1"]');
// Buchen
await V.evaluate(c => { letzteBuchung = { roh: '', zeit: 0, cent: 0, tab: '' }; buche('ab', 'GK-T0001-' + c); }, code); await w(V, 1500);
let b = holen().buchungen.filter(x => x.art === 'ab').slice(-1)[0];
t('Buchung mit Artikeln in der Ablage', b && b.cent === -1060 && b.pos && b.pos.length === 2 && b.pos[0].n === 'Bier 0,3 l' && b.pos[0].a === 2, JSON.stringify(b));
t('Warenkorb nach Buchung leer', await V.evaluate(() => wk.length === 0 && document.getElementById('abBetrag').value === ''));
// Von Hand geändert: keine Artikel
await V.evaluate(() => setPhase('ab', 'eingabe')); await w(V, 200);
await V.click('[data-art="2"]'); await V.click('[data-artziffern]');
t('Ziffernblock lässt sich einblenden', await V.evaluate(() => getComputedStyle(document.querySelector('#reiter-ab .tasten')).display !== 'none'));
await V.click('#reiter-ab [data-taste="zurueck"]'); await V.click('#reiter-ab [data-taste="zurueck"]'); await w(V, 100);
t('Eingriff von Hand leert den Warenkorb', await V.evaluate(() => wk.length === 0));
await V.evaluate(c => { $("abBetrag").value = "2"; letzteBuchung = { roh: '', zeit: 0, cent: 0, tab: '' }; buche('ab', 'GK-T0001-' + c); }, code); await w(V, 1500);
b = holen().buchungen.filter(x => x.art === 'ab').slice(-1)[0]; t('Betrag von Hand: Buchung ohne Artikel', b.cent === -200 && !b.pos, JSON.stringify(b));
// Leeren
await V.evaluate(() => setPhase('ab', 'eingabe')); await w(V, 200);
await V.click('[data-artziffern]'); await V.click('[data-art="2"]'); await V.click('#abNull'); await w(V, 100); t('Leeren räumt auch den Warenkorb', await V.evaluate(() => wk.length === 0));
// Auswertung
await T.evaluate(() => syncJetzt(5000)); await w(T, 300);
await T.evaluate(() => reiterZeigen('verwaltung')); await T.click('#vAuswerten'); await w(T, 1200);
const rb = await T.textContent('#vBericht'); t('Abrechnung zeigt Verkauf nach Artikel', rb.includes('Verkauf nach Artikel') && rb.includes('Bier 0,3 l') && rb.includes('7,60'), rb.slice(0, 400));
const gh = await T.evaluate(() => gastgeberHtml()); t('Gastgeber-Zusammenfassung zeigt Artikel', gh.includes('Verbrauch nach Artikel') && gh.includes('2 × Bier 0,3 l'));
// Artikel einer Karte sichtbar
await T.evaluate(() => syncJetzt(5000)); await w(T, 300);
const dh = await T.evaluate(() => detailHtml('T0001'));
t('Kartendetail: Artikel dieser Karte (ausklappbar)', dh.includes('Artikel dieser Karte') && dh.includes('<details') && dh.includes('2 × Bier 0,3 l'), dh.slice(0, 200));
t('Kartendetail: Artikel unter der Abbuchung im Verlauf', dh.includes('2× Bier 0,3 l, 1× Schnitzel') || dh.includes('2× Bier 0,3 l'));
await V.evaluate(() => syncJetzt(5000)); await V.evaluate(() => setPhase('ab', 'eingabe'));
await V.evaluate(c => { $("abBetrag").value = ""; letzteBuchung = { roh: '', zeit: 0, cent: 0, tab: '' }; buche('ab', 'GK-T0001-' + c); }, code); await w(V, 600);
t('Guthaben-Anzeige am Verkaufsgerät: Artikel auswählbar', await V.evaluate(() => { const e = document.getElementById('kartenArtikel-ab'); return !!e && e.textContent.includes('Bier 0,3 l') && !!e.querySelector('summary'); }));
await V.evaluate(() => setPhase('ab', 'eingabe')); await V.click('[data-art="1"]');
await V.evaluate(c => { letzteBuchung = { roh: '', zeit: 0, cent: 0, tab: '' }; buche('ab', 'GK-T0001-' + c); }, code); await w(V, 1200);
t('Nach der nächsten Buchung ist das Feld weg', await V.evaluate(() => !document.getElementById('kartenArtikel-ab')));
// Offline: Liste bleibt, Artikel buchen
A.steuer.offline = true; await V.evaluate(() => { syncJetzt(1500); setPhase('ab', 'eingabe'); }); await w(V, 400);
await V.click('[data-art="1"]');
await V.evaluate(c => { letzteBuchung = { roh: '', zeit: 0, cent: 0, tab: '' }; buche('ab', 'GK-T0001-' + c); }, code); await w(V, 1500);
t('Offline gebucht mit Artikeln', await V.evaluate(() => db.buchungen.some(x => x.pos && x.pos[0].n === 'Cola' && x.off)));
A.steuer.offline = false; await V.evaluate(() => syncJetzt(5000)); await w(V, 500);
t('Nachträglich übertragen, Artikel erhalten', holen().buchungen.some(x => x.pos && x.pos[0].n === 'Cola'));
console.log('Seitenfehler:', A.steuer.log.length ? A.steuer.log : 'keine'); console.log(ok + ' ok, ' + bad + ' Fehler'); await A.ende();
