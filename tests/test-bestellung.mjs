// App „Bestellung“: aufnehmen am Handy, anzeigen an Theke/Küche, Rückmeldung
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import { server2 } from './gsh2.mjs';
let ok = 0, bad = 0; const t = (n, c, extra = '') => { if (c) ok++; else { bad++; console.log('FAIL', n, extra); } };
const srv = server2(); const URL = 'https://script.google.com/macros/s/TEST/exec';
srv.post('ka', { aktion: 'artikel', artikel: [{ n: 'Bier 0,3 l', p: 380, g: 'G' }, { n: 'Cola', p: 300, g: 'G' }, { n: 'Schnitzel', p: 1450, g: 'S' }, { n: 'Pommes', p: 400, g: 'S' }] });
const browser = await chromium.launch(); const steuer = { offline: false, log: [] };
async function seite(breite, hoehe) {
  const ctx = await browser.newContext({ viewport: { width: breite, height: hoehe } }); const page = await ctx.newPage();
  page.on('pageerror', e => steuer.log.push(e.message));
  await ctx.route(URL, route => { if (steuer.offline) return route.abort('failed'); const q = JSON.parse(route.request().postData()); route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(srv.post(q.wort, q)) }); });
  await page.goto('file:///home/user/guthabenkasse/guthabenkasse-bestellung.html'); return page;
}
const w = (p, ms) => p.waitForTimeout(ms);
const B = await seite(390, 780), K = await seite(1024, 700);
t('Nicht eingerichtet: Hinweis', (await B.textContent('#haupt')).includes('Noch nicht eingerichtet'));
// Einrichtung über die Maske; falsches Wort für die Funktion
for (let i = 0; i < 5; i++) await B.click('#titel');
await B.fill('#eAdresse', URL); await B.fill('#eWort', 'ku'); await B.fill('#eName', 'Anna'); await B.click('#einrichtForm button[type=submit]'); await w(B, 600);
t('Bestellanzeige-Wort für Aufnehmen wird abgelehnt', (await B.textContent('#einrichtMeldung')).includes('nur ansehen und abhaken'), await B.textContent('#einrichtMeldung'));
await B.fill('#eWort', 'falsch'); await B.click('#einrichtForm button[type=submit]'); await w(B, 600);
t('Falsches Wort wird erklärt', (await B.textContent('#einrichtMeldung')).includes('Zugangswort stimmt nicht'));
await B.fill('#eWort', 'or'); await B.click('#einrichtForm button[type=submit]'); await w(B, 800);
t('Bedienung eingerichtet', await B.evaluate(() => cfg.funktion === 'aufnehmen' && cfg.name === 'Anna' && !document.getElementById('einricht').classList.contains('zeigt')));
t('Artikel kommen von der Ablage (Getränke zuerst)', await B.evaluate(() => document.querySelectorAll('.raster button').length === 2 && document.querySelector('.raster button').textContent.includes('Bier')));
// Anzeige einrichten
for (let i = 0; i < 5; i++) await K.click('#titel');
await K.fill('#eAdresse', URL); await K.check('input[value=anzeige]'); await K.fill('#eWort', 'or'); await K.click('#einrichtForm button[type=submit]'); await w(K, 600);
t('Aufnahme-Wort für die Anzeige wird abgelehnt', (await K.textContent('#einrichtMeldung')).includes('nur aufnehmen'));
await K.fill('#eWort', 'ku'); await K.click('#einrichtForm button[type=submit]'); await w(K, 800);
t('Anzeige eingerichtet, leer', await K.evaluate(() => cfg.funktion === 'anzeige' && document.getElementById('haupt').textContent.includes('Keine offenen')));
await K.evaluate(() => { window.__piep = []; var o = piep; piep = function (a) { window.__piep.push(a); }; });
await B.evaluate(() => { window.__piep = []; piep = function (a) { window.__piep.push(a); }; });
// Bestellung aufnehmen
await B.click('[data-art="Bier 0,3 l"]'); await B.click('[data-art="Bier 0,3 l"]'); await B.click('[data-gr="S"]'); await B.click('[data-art="Schnitzel"]');
t('Korb zeigt 3 Positionen', (await B.textContent('#sendenKnopf')).includes('(3)'), await B.textContent('#sendenKnopf'));
await B.evaluate(() => { window.prompt = () => 'ohne Zwiebeln'; }); await B.click('[data-wunsch="1"]');
t('Wunsch am Schnitzel', (await B.textContent('#korb')).includes('ohne Zwiebeln'));
await B.click('#sendenKnopf'); await w(B, 200);
t('Ohne Bezeichnung: nichts gesendet, Hinweis', (await B.textContent('#meldung')).includes('Tisch') && srv.post('ka', { aktion: 'bestellung', was: 'liste', cursor: 0 }).bestellungen.length === 0);
await B.fill('#tischFeld', 'Tisch 12'); await B.fill('#notizFeld', 'Geburtstagskind'); await B.click('#sendenKnopf'); await w(B, 1800);
let L = srv.post('ka', { aktion: 'bestellung', was: 'liste', cursor: 0 }).bestellungen;
t('Bestellung in der Ablage', L.length === 1 && L[0].tisch === 'Tisch 12' && L[0].pos.length === 2 && L[0].pos[0].a === 2 && L[0].pos[1].w === 'ohne Zwiebeln' && L[0].wer === 'Anna' && L[0].notiz === 'Geburtstagskind', JSON.stringify(L));
t('Meldung „angekommen“', (await B.textContent('#meldung')).includes('angekommen'), await B.textContent('#meldung'));
t('Eingabe ist zurückgesetzt', await B.evaluate(() => korb.length === 0 && document.getElementById('tischFeld').value === ''));
// Anzeige sieht sie
await K.evaluate(() => abgleichen()); await w(K, 800);
t('Anzeige zeigt das Ticket mit Tisch, Nummer und Positionen', await K.evaluate(() => { const x = document.getElementById('tickets'); return !!x && x.textContent.includes('Tisch 12') && x.textContent.includes('#1') && x.textContent.includes('2×') && x.textContent.includes('ohne Zwiebeln') && x.textContent.includes('Geburtstagskind'); }));
t('Anzeige piept bei neuer Bestellung', await K.evaluate(() => window.__piep.includes('neu')));
await K.screenshot({ path: '/tmp/best-anzeige.png' });
// Filter Getränke
await K.click('[data-filter="G"]');
t('Filter Getränke: kein Schnitzel', await K.evaluate(() => { const x = document.getElementById('tickets').textContent; return x.includes('Bier') && !x.includes('Schnitzel'); }));
await K.click('.aktion'); await w(K, 600);
L = srv.post('ka', { aktion: 'bestellung', was: 'liste', cursor: 0 }).bestellungen;
t('Getränke in Arbeit, Speisen noch neu', L[0].st.G === 'arbeit' && L[0].st.S === 'neu', JSON.stringify(L[0].st));
await K.click('.aktion'); await w(K, 600);
t('Getränke fertig', srv.post('ka', { aktion: 'bestellung', was: 'liste', cursor: 0 }).bestellungen[0].st.G === 'fertig');
// Bedienung bekommt Rückmeldung
await B.evaluate(() => { reiter = 'liste'; modusSetzen(); abgleichen(); }); await w(B, 900);
t('Bedienung hört „fertig“', await B.evaluate(() => window.__piep.includes('fertig')));
t('Bedienung sieht Status und „Serviert“-Knopf', await B.evaluate(() => { const x = document.getElementById('haupt').textContent; return x.includes('Tisch 12') && x.includes('fertig') && !!document.querySelector('[data-st="serviert"]'); }));
await B.screenshot({ path: '/tmp/best-liste.png' });
await B.click('[data-st="serviert"]'); await w(B, 700);
t('Serviert gesetzt', srv.post('ka', { aktion: 'bestellung', was: 'liste', cursor: 0 }).bestellungen[0].st.G === 'serviert');
// Speisen fertigstellen auf Filter Alle, Ticket verschwindet nach Abholen
await K.click('[data-filter="alle"]'); await K.evaluate(() => abgleichen()); await w(K, 700); await K.click('.aktion'); await w(K, 900); await K.click('.aktion'); await w(K, 900); await K.click('.aktion'); await w(K, 900);
t('Alles abgeholt: Anzeige leer', await K.evaluate(() => document.getElementById('haupt').textContent.includes('Keine offenen')), await K.textContent('#haupt'));
// Offline aufnehmen, später senden
steuer.offline = true; await B.evaluate(() => { reiter = 'neu'; gruppeZeigen = 'G'; modusSetzen(); });
await B.click('[data-art="Cola"]'); await B.fill('#tischFeld', 'Bar'); await B.click('#sendenKnopf'); await w(B, 1800);
t('Offline: Bestellung wartet', await B.evaluate(() => ausgang.length === 1) && (await B.textContent('#haupt')).includes('warten auf die Verbindung'));
steuer.offline = false; await B.evaluate(() => abgleichen()); await w(B, 1200);
t('Verbindung da: Bestellung kommt an', await B.evaluate(() => ausgang.length === 0) && srv.post('ka', { aktion: 'bestellung', was: 'liste', cursor: 0 }).bestellungen.length === 2);
// Stornieren
await B.evaluate(() => { reiter = 'liste'; modusSetzen(); abgleichen(); }); await w(B, 700); await B.evaluate(() => { window.confirm = () => true; }); await B.click('[data-storno]'); await w(B, 1200);
t('Stornierte Bestellung verschwindet beim Bedienen und Anzeigen', srv.post('ka', { aktion: 'bestellung', was: 'liste', cursor: 0 }).bestellungen.find(o => o.tisch === 'Bar').x > 0);
await K.evaluate(() => abgleichen()); await w(K, 600); t('Anzeige zeigt stornierte nicht', await K.evaluate(() => !document.getElementById('haupt').textContent.includes('Bar')));
// Neuer Abend leert
srv.post('ad', { aktion: 'neubeginn', behalten: true, geraet: { id: 'T' } }); await B.evaluate(() => abgleichen()); await w(B, 700);
t('Nach Abendabschluss: Liste leer', await B.evaluate(() => Object.keys(daten.orders).length === 0));
console.log('Seitenfehler:', steuer.log.length ? steuer.log : 'keine'); console.log(ok + ' ok, ' + bad + ' Fehler'); await browser.close();
