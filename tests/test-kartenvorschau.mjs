// Neue Karten: erst ansehen, dann anlegen und/oder drucken
import { start } from './pw2.mjs';
let ok = 0, bad = 0; const t = (n, c, extra = '') => { if (c) ok++; else { bad++; console.log('FAIL', n, extra); } };
const A = await start({ schnell: true }); const T = await A.seite('terminal', 'T', 'ka', 'Anna'); const w = ms => T.waitForTimeout(ms);
const holen = () => A.srv.post('ka', { aktion: 'holen' }).daten;
await T.evaluate(() => syncJetzt(5000)); await w(500);
await T.evaluate(() => { window.print = () => {}; window.__d = []; window.drucken = function (h) { window.__d.push(h); }; reiterZeigen('karten'); });
await T.evaluate(() => { document.getElementById('kNamen').value = 'Anna Müller\nTisch 5'; document.getElementById('kNamen').dispatchEvent(new Event('input')); });
await T.evaluate(() => document.getElementById('btnKartenDrucken').click()); await w(400);
t('Vorschau erscheint', await T.evaluate(() => !!document.getElementById('kartenModal')));
t('Vorschau zeigt Nummern und Namen', await T.evaluate(() => { const m = document.getElementById('kartenModal').textContent; return /T0001/.test(m) && /Anna Müller/.test(m) && /Tisch 5/.test(m); }));
t('Vorschau: noch nichts angelegt', await T.evaluate(() => !db.karten.T0001 && !db.karten.T0002 && db.ops.length === 0));
t('Vorschau: noch nicht gedruckt', await T.evaluate(() => window.__d.length === 0));
t('Vorschau enthält QR-Codes', await T.evaluate(() => document.querySelectorAll('#kartenModal .wertkarte .qr svg').length === 2));
await T.evaluate(() => document.getElementById('kmZu').click()); await w(200);
t('Zurück: Vorschau weg, nichts angelegt', await T.evaluate(() => !document.getElementById('kartenModal') && !db.karten.T0001) && !holen().karten.T0001);
t('Zurück: Namensfeld bleibt (nichts verloren)', await T.evaluate(() => document.getElementById('kNamen').value.includes('Anna')));
// Nur anlegen
await T.evaluate(() => document.getElementById('btnKartenDrucken').click()); await w(300);
await T.evaluate(() => document.getElementById('kmAnlegen').click()); await w(1500);
t('Nur anlegen: Karten da, nicht gedruckt', await T.evaluate(() => db.karten.T0001 && db.karten.T0002 && window.__d.length === 0));
t('Nur anlegen: mit Namen und Prüfnummer', await T.evaluate(() => db.karten.T0001.name === 'Anna Müller' && /^[A-Z0-9]{4}$/.test(db.karten.T0001.code)));
t('Nur anlegen: in der Ablage', holen().karten.T0001?.code === await T.evaluate(() => db.karten.T0001.code) && holen().karten.T0002?.name === 'Tisch 5');
t('Nur anlegen: Eingabefeld leer', await T.evaluate(() => document.getElementById('kNamen').value === ''));
// Anlegen und drucken: die gezeigte Prüfnummer ist die gedruckte
await T.evaluate(() => { document.getElementById('kAnzahl').value = '2'; document.getElementById('btnKartenDrucken').click(); }); await w(300);
const gezeigt = await T.evaluate(() => [...document.querySelectorAll('#kartenModal .wertkarte .nummer')].map(e => e.textContent.trim()));
const qrVorher = await T.evaluate(() => { const p = document.querySelector('#kartenModal .wertkarte .qr svg [d], #kartenModal .wertkarte .qr svg path'); return p ? p.getAttribute('d') : document.querySelector('#kartenModal .wertkarte .qr').innerHTML.length + ''; });
t('Nummern laufen weiter (T0003, T0004)', JSON.stringify(gezeigt) === JSON.stringify(['GK-T0003', 'GK-T0004']), JSON.stringify(gezeigt));
await T.evaluate(() => document.getElementById('kmAnlegenDrucken').click()); await w(1500);
t('Anlegen und drucken: gedruckt', await T.evaluate(() => window.__d.length === 1 && /T0003/.test(window.__d[0]) && /T0004/.test(window.__d[0])));
t('Gedruckter QR = gezeigter QR', await T.evaluate(q => window.__d[0].includes(q) || window.__d[0].includes(q.replace(/\s+/g, ' ')), qrVorher));
t('Angelegt und in der Ablage', !!holen().karten.T0003 && !!holen().karten.T0004);
console.log('Seitenfehler:', A.steuer.log.length ? A.steuer.log : 'keine'); console.log(ok + ' ok, ' + bad + ' Fehler'); await A.ende();
