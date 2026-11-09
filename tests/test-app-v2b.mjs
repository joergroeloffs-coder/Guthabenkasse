import { start } from './pw2.mjs';
let ok = 0, bad = 0; const t = (n, c, extra = '') => { if (c) ok++; else { bad++; console.log('FAIL', n, extra); } };
const A = await start();
const T = await A.seite('terminal', 'T', 'ka', 'Anna');
const V = await A.seite('verkauf', 'V', 'vk', 'Ben');
const w = (p, ms) => p.waitForTimeout(ms);
const erg = p => p.evaluate(() => ['befund2', 'befund'].map(i => document.getElementById(i)).filter(Boolean).map(x => x.innerText).join('|'));
const holen = () => A.srv.post('ka', { aktion: 'holen' }).daten;
const saldo = nr => holen().buchungen.filter(b => b.karte === nr).reduce((s, b) => s + b.cent, 0);
const letzteBuchungLoeschen = p => p.evaluate(() => { letzteBuchung = { roh: '', zeit: 0, cent: 0, tab: '' }; });

// Altkarte (ohne Prüfnummer): am Terminal aufbuchen, am Verkauf abbuchen
await T.evaluate(() => { $("aufBetrag").value = "20"; buche("auf", "GK-A0100"); }); await w(T, 1200);
t('Altkarte aufgebucht', saldo('A0100') === 2000);
await V.evaluate(() => syncJetzt(5000));
await V.evaluate(() => { $("abBetrag").value = "4"; buche("ab", "GK-A0100"); }); await w(V, 1200);
t('Altkarte abgebucht am Verkauf', saldo('A0100') === 1600 && (await erg(V)).includes('16,00'), await erg(V));

// Neue Karte, Terminal ohne Verbindung aufbuchen → später übertragen
await T.evaluate(() => kartenBlatt(['T0002'])); await w(T, 700);
const c2 = await T.evaluate(() => db.karten.T0002.code);
A.steuer.offline = true;
await T.evaluate(c => { $("aufBetrag").value = "10"; buche("auf", "GK-T0002-" + c); }, c2); await w(T, 14000);
t('Terminal offline: Aufbuchung vorgemerkt angezeigt', (await erg(T)).includes('10,00'), await erg(T));
t('Terminal offline: wartet', await T.evaluate(() => ausstehende().length) >= 1);
A.steuer.offline = false; await T.evaluate(() => syncJetzt(5000)); await w(T, 600);
t('Terminal: übertragen', saldo('T0002') === 1000 && await T.evaluate(() => ausstehende().length) === 0);

// Karte ersetzen (über die Terminal-Funktion), alte Karte danach gesperrt
await T.evaluate(() => { window.confirm = () => true; window.print = () => {}; kartenAktion('ersetzen', 'T0002'); }); await w(T, 2500);
const neu = Object.keys(holen().karten).filter(n => holen().karten[n].ersetztAlt === 'T0002')[0];
t('Ersatzkarte angelegt', !!neu, JSON.stringify(Object.keys(holen().karten)));
t('Guthaben übertragen', saldo('T0002') === 0 && saldo(neu) === 1000);
await V.evaluate(() => syncJetzt(5000));
await V.evaluate(([c]) => { $("abBetrag").value = "1"; letzteBuchung = { roh: '', zeit: 0, cent: 0, tab: '' }; buche("ab", "GK-T0002-" + c); }, [c2]); await w(V, 1200);
t('Alte Karte am Verkauf gesperrt', (await erg(V)).includes('gesperrt'), await erg(V));
const cN = await T.evaluate(n => db.karten[n].code, neu);
await V.evaluate(([n, c]) => { $("abBetrag").value = "1"; buche("ab", "GK-" + n + "-" + c); }, [neu, cN]); await w(V, 1200);
t('Neue Karte funktioniert', saldo(neu) === 900);

// Anschreiben ist aus (Standard) – Verkauf kann nicht ins Minus
await V.evaluate(([n, c]) => { $("abBetrag").value = "50"; letzteBuchung = { roh: '', zeit: 0, cent: 0, tab: '' }; buche("ab", "GK-" + n + "-" + c); }, [neu, cN]); await w(V, 1500);
t('Kein Minus', saldo(neu) === 900 && (await erg(V)).includes('Zu wenig'), await erg(V));
t('Anschreiben standardmäßig aus', await T.evaluate(() => deckelCent()) === 0);

// Beschädigter lokaler Speicher: Daten kommen aus IndexedDB zurück
const n0 = await V.evaluate(() => db.buchungen.length);
await V.evaluate(() => { localStorage.setItem(KEY, '{kaputt'); localStorage.removeItem(KEY + '.b'); });
await V.reload(); await w(V, 1500);
t('Beschädigte Daten: aus IndexedDB gerettet', await V.evaluate(() => db.buchungen.length) === n0, String(await V.evaluate(() => db.buchungen.length)));

// Terminal: Gesamtauswertung mit Kassenbuch
await T.evaluate(() => { for (const [a, id, v] of [['anfang', 'kbAnfang', '100'], ['zaehlung', 'kbZaehl', '150']]) { document.getElementById(id) ; } });
for (const [art, c] of [['anfang', 10000], ['zaehlung', 15000]]) A.srv.post('ka', { aktion: 'kassenbuch', eintrag: { id: 'k' + art, art, cent: c } });
await T.evaluate(() => reiterZeigen('verwaltung')); await w(T, 200);
await T.evaluate(() => document.getElementById('vAuswerten').click()); await w(T, 1200);
const rep = await T.evaluate(() => verwaltungStand.bericht);
t('Bericht vorhanden', !!rep && rep.proGeraet.length >= 2);
t('Kassen-Soll = Anfang + Aufladungen', rep.kasse.soll === 10000 + rep.kasse.aufladungen, JSON.stringify(rep.kasse));
t('Verkauf sieht nur eigene Abrechnung', await (async () => { const r = A.srv.post('vk', { aktion: 'bericht', geraet: { id: 'V' } }); return r.ok && r.bericht === undefined && r.geraet === 'V'; })());
// Verkauf-Ansicht: keine Aufbuch-/Karten-Bereiche
t('Verkauf ohne Aufbuchen-Reiter', await V.evaluate(() => !document.getElementById('reiter-auf') && !document.getElementById('reiter-karten')));
// Direktes Aufbuchen an der Ablage mit Verkaufswort (Manipulation der App)
const manip = A.srv.post('vk', { aktion: 'sync', geraet: { id: 'V', schluessel: await V.evaluate(() => db.schluessel) }, cursor: 0, kv: 0, neu: [{ id: 'hack1', karte: 'A0100', cent: 99900, art: 'auf', zeit: Date.now(), geraet: 'V', n: 999, k: 'x' }] });
t('Manipulation: Aufbuchen mit Verkaufswort abgelehnt', manip.ergebnisse.hack1.st === 'abgelehnt' && saldo('A0100') === 1600);
console.log('Seitenfehler:', A.steuer.log.length ? A.steuer.log : 'keine'); console.log(ok + ' ok, ' + bad + ' Fehler'); await A.ende();
