// Bilder für die Anleitungen: echte Ansichten von Terminal und Verkauf (Musterdaten, Ablage nachgebildet).
import { start } from '../../tests/pw2.mjs';
import { writeFileSync } from 'node:fs';
const aus = new URL('./bild/', import.meta.url).pathname;
const w = (p, ms = 500) => p.waitForTimeout(ms);
const NAMEN = { T0001: 'Anna Müller', T0002: 'Familie Petersen', T0003: 'Tisch 5', T0004: 'Heinrich Jessen' };
for (const lang of ['de', 'tr', 'en']) {
  const A = await start({ schnell: true, start: Date.now(), viewport: { width: 390, height: 780 } });
  const T = await A.seite('terminal', 'T', 'ka', 'Anna'); const V = await A.seite('verkauf', 'V', 'vk', 'Ben');
  for (const p of [T, V]) { await p.addStyleTag({ content: '#meldung{display:none !important}' }); await p.evaluate(l => { window.print = () => {}; navigator.mediaDevices.getUserMedia = () => Promise.reject({ name: 'NotAllowedError' }); db.kompakt = false; db.anlass = { name: 'Sommerfest', verein: 'Fering Ferian e.V.', zusatz: 'Heimatpflege auf Föhr', ts: Date.now() }; sichern(); spracheSetzen(l); }, lang); }
  const nrs = Object.keys(NAMEN);
  await T.evaluate(n => { kartenBlatt(n); }, nrs); await w(T, 800);
  const codes = await T.evaluate(n => n.map(k => db.karten[k].code), nrs);
  for (const [i, nr] of nrs.entries()) { A.srv.post('ka', { aktion: 'karten', was: 'name', nr, name: NAMEN[nr], zusatz: '' }); }
  for (const [i, nr] of nrs.entries()) await T.evaluate(([n, c, b]) => { $("aufBetrag").value = String(b); letzteBuchung = { roh: '', zeit: 0, cent: 0, tab: '' }; buche('auf', 'GK-' + n + '-' + c); }, [nr, codes[i], [50, 20, 30, 40][i]]).then(() => w(T, 400));
  await T.evaluate(() => syncJetzt(5000)); await V.evaluate(() => syncJetzt(5000)); await w(V, 600);
  // Terminal
  await T.evaluate(([n, c]) => { $("aufBetrag").value = "20"; letzteBuchung = { roh: '', zeit: 0, cent: 0, tab: '' }; buche('auf', 'GK-' + n + '-' + c); }, [nrs[0], codes[0]]); await w(T, 900);
  await T.screenshot({ path: aus + `t-aufbuchen-${lang}.png` });
  await T.evaluate(([n, c]) => { reiterZeigen('ab'); $("abBetrag").value = "3,5"; letzteBuchung = { roh: '', zeit: 0, cent: 0, tab: '' }; buche('ab', 'GK-' + n + '-' + c); }, [nrs[1], codes[1]]); await w(T, 900);
  await T.screenshot({ path: aus + `t-abbuchen-${lang}.png` });
  await T.evaluate(() => { reiterZeigen('karten'); }); await w(T, 400);
  await T.evaluate(() => document.getElementById('kartenListe') && document.getElementById('kartenListe').scrollIntoView()); await T.screenshot({ path: aus + `t-karten-${lang}.png`, fullPage: false });
  await T.evaluate(n => { offeneKarte = n; zeichneAlles(); }, nrs[0]); await w(T, 500);
  await T.locator('#detailInhalt').screenshot({ path: aus + `t-detail-${lang}.png` });
  await T.evaluate(() => { reiterZeigen('verwaltung'); }); await w(T, 400);
  await T.evaluate(() => document.getElementById('vAuswerten').click()); await w(T, 1200);
  await T.locator('#verwaltungInhalt .karte').nth(0).screenshot({ path: aus + `t-verwaltung-${lang}.png` });
  await T.locator('#verwaltungInhalt .karte').nth(1).screenshot({ path: aus + `t-abrechnung-${lang}.png` });
  await T.locator('#verwaltungInhalt .karte').nth(3).screenshot({ path: aus + `t-erweitert-${lang}.png` });
  await T.evaluate(() => window.scrollTo(0, 0)); await T.evaluate(() => reiterZeigen('einstellungen')); await w(T, 400); await T.screenshot({ path: aus + `t-optionen-${lang}.png` });
  await T.evaluate(() => { reiterZeigen('karten'); window.scrollTo(0, 0); }); await w(T, 300); await T.screenshot({ path: aus + `t-kartenseite-${lang}.png` });
  // Verkauf
  await V.evaluate(() => { reiterZeigen('einstellungen'); }); await w(V, 400); await V.screenshot({ path: aus + `v-optionen-${lang}.png` });
  await V.evaluate(() => { reiterZeigen('ab'); $("abBetrag").value = "7,5"; }); await w(V, 300); await V.screenshot({ path: aus + `v-eingabe-${lang}.png` });
  await V.evaluate(([n, c]) => { buche('ab', 'GK-' + n + '-' + c); }, [nrs[0], codes[0]]); await w(V, 1200); await V.screenshot({ path: aus + `v-ergebnis-${lang}.png` });
  await V.evaluate(() => { db.modus = 'sicher'; letzteBuchung = { roh: '', zeit: 0, cent: 0, tab: '' }; $("abBetrag").value = "4"; }); 
  await V.evaluate(([n, c]) => { buche('ab', 'GK-' + n + '-' + c); }, [nrs[2], codes[2]]); await w(V, 600); await V.screenshot({ path: aus + `v-sicher-${lang}.png` });
  await V.evaluate(() => { db.modus = 'schnell'; reiterZeigen('meine'); }); await w(V, 500); await V.screenshot({ path: aus + `v-abrechnung-${lang}.png` });
  console.log(lang, A.steuer.log); await A.ende();
}
