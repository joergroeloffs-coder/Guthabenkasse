// Reiter Karten: jede Überschrift klappt ihren Bereich auf und zu
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
let ok = 0, bad = 0; const t = (n, c, extra = '') => { if (c) ok++; else { bad++; console.log('FAIL', n, extra); } };
const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 390, height: 900 } }); const p = await ctx.newPage();
p.on('pageerror', e => console.log('Seitenfehler:', e.message));
await p.goto('file:///home/user/guthabenkasse/guthabenkasse-terminal.html'); await p.waitForTimeout(400);
await p.evaluate(() => { db.kompakt = false; sichern(); reiterZeigen('karten'); }); await p.waitForTimeout(200);
const zustand = () => p.evaluate(() => [...document.querySelectorAll('#reiter-karten > .karte')].map(k => ({ name: k.querySelector('h2').textContent.trim(), sichtbar: getComputedStyle(k.querySelector(':scope > .inhalt')).display !== 'none', aria: k.querySelector(':scope > .titel').getAttribute('aria-expanded') })));
let z = await zustand();
t('Sieben Bereiche', z.length === 7, JSON.stringify(z.map(x => x.name)));
t('Alles zu Beginn zugeklappt', z.every(x => !x.sichtbar && x.aria === 'false'));
// Antippen öffnet genau diesen Bereich
await p.click('#reiter-karten > .karte:nth-of-type(2) > .titel'); await p.waitForTimeout(150);
z = await zustand(); t('Neue Karten drucken geöffnet, die anderen zu', z[1].sichtbar && z.filter(x => x.sichtbar).length === 1 && z[1].aria === 'true', JSON.stringify(z));
t('Inhalt wirklich sichtbar (Eingabefeld Anzahl)', await p.isVisible('#kAnzahl'));
await p.click('#reiter-karten > .karte:nth-of-type(2) > .titel'); await p.waitForTimeout(150);
t('Zweiter Tipp klappt wieder zu', !(await zustand())[1].sichtbar);
// Mehrere gleichzeitig offen
await p.click('#reiter-karten > .karte:nth-of-type(5) > .titel'); await p.click('#reiter-karten > .karte:nth-of-type(7) > .titel'); await p.waitForTimeout(150);
z = await zustand(); t('Mehrere können offen sein', z[4].sichtbar && z[6].sichtbar);
// Tastatur
await p.focus('#reiter-karten > .karte:nth-of-type(3) > .titel'); await p.keyboard.press('Enter'); await p.waitForTimeout(100);
t('Enter öffnet', (await zustand())[2].sichtbar);
// Knopf in der Überschrift (Abschluss drucken) schaltet nicht um
await p.click('#reiter-karten > .karte:nth-of-type(1) > .titel'); await p.waitForTimeout(100);
const vorher = (await zustand())[0].sichtbar;
await p.evaluate(() => { window.__a = 0; window.abschlussStart = function () { window.__a++; }; document.getElementById('btnAbschluss').addEventListener('click', () => { window.__a++; }); });
await p.click('#btnAbschluss'); await p.waitForTimeout(100);
t('Knopf in der Überschrift löst nur seine Aktion aus, klappt nicht um', (await zustand())[0].sichtbar === vorher && await p.evaluate(() => window.__a) >= 1);
// Gemerkt nach Neustart
await p.reload(); await p.waitForTimeout(400); await p.evaluate(() => reiterZeigen('karten')); await p.waitForTimeout(150);
z = await zustand(); t('Geöffnete Bereiche bleiben nach dem Neuladen offen', z[4].sichtbar && z[6].sichtbar && z[2].sichtbar && !z[1].sichtbar, JSON.stringify(z.map(x => x.sichtbar)));
// Datei auf „Neue Karten“ ziehen öffnet den Bereich
await p.evaluate(() => { akkSetzen(document.getElementById('kartenDrucken'), false); });
t('(zu)', !(await zustand())[1].sichtbar);
await p.evaluate(() => document.getElementById('kartenDrucken').dispatchEvent(new Event('dragenter', { bubbles: true })));
t('Ziehen einer Datei öffnet Neue Karten', (await zustand())[1].sichtbar);
// Gästeliste geladen → Bereich offen
await p.evaluate(() => { akkSetzen(document.getElementById('kartenDrucken'), false); gaesteSetzen('liste.csv', [{ name: 'Blatt', zeilen: [['Name'], ['Anna'], ['Ben']] }]); });
t('Gästeliste geladen öffnet Neue Karten', (await zustand())[1].sichtbar);
// Skripte erreichen Inhalte auch im geschlossenen Zustand
await p.evaluate(() => { akkSetzen(document.getElementById('kartenDrucken'), false); document.getElementById('kAnzahl').value = '5'; });
t('Felder in geschlossenen Bereichen bleiben ansprechbar', await p.evaluate(() => document.getElementById('kAnzahl').value === '5'));
await p.screenshot({ path: '/tmp/akk.png' });
console.log(ok + ' ok, ' + bad + ' Fehler'); await b.close();
