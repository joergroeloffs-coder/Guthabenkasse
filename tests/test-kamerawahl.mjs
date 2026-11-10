// Kamera-Auswahl: Terminal/Verkauf (Optionen, ⟲-Knopf) und Anzeige
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
let ok = 0, bad = 0; const t = (n, c, extra = '') => { if (c) ok++; else { bad++; console.log('FAIL', n, extra); } };
const b = await chromium.launch();
const mock = () => {
  window.__gum = []; window.__rejectId = null;
  const geraete = [{ deviceId: 'id-intern', label: 'Integrierte Kamera', kind: 'videoinput' }, { deviceId: 'id-handy', label: 'Handy (DroidCam)', kind: 'videoinput' }, { deviceId: 'id-extern', label: 'USB-Kamera', kind: 'videoinput' }, { deviceId: 'mic', label: 'Mikrofon', kind: 'audioinput' }];
  navigator.mediaDevices.enumerateDevices = () => Promise.resolve(geraete);
  navigator.mediaDevices.getUserMedia = c => {
    window.__gum.push(JSON.parse(JSON.stringify(c)));
    const id = c.video && c.video.deviceId && c.video.deviceId.ideal;
    if (id && id === window.__rejectId) return Promise.reject(new Error('weg'));
    const cv = document.createElement('canvas'); cv.width = 64; cv.height = 48; cv.getContext('2d').fillRect(0, 0, 64, 48);
    return Promise.resolve(cv.captureStream(5));
  };
};
async function seite(datei, vor) {
  const ctx = await b.newContext({ viewport: { width: 700, height: 1000 } }); const p = await ctx.newPage();
  p.on('pageerror', e => console.log('Seitenfehler:', e.message));
  await p.addInitScript(mock); await p.goto('file:///home/user/guthabenkasse/' + datei); await p.waitForTimeout(400); if (vor) await vor(p); return p;
}
const letzte = p => p.evaluate(() => window.__gum[window.__gum.length - 1]);
// ---- Terminal
const T = await seite('guthabenkasse-terminal.html', p => p.evaluate(() => { db.geraet = 'T'; db.kompakt = false; sichern(); }));
await T.evaluate(() => { reiterZeigen('einstellungen'); });
await T.evaluate(() => kameraWahlZeichnen(true)); await T.waitForTimeout(300);
const optionen = await T.evaluate(() => [...document.getElementById('kameraWahl').options].map(o => o.textContent));
t('Auswahl nennt die drei Kameras (ohne Mikrofon)', optionen.length === 4 && optionen[2].includes('DroidCam') && !optionen.join().includes('Mikrofon'), JSON.stringify(optionen));
await T.evaluate(() => reiterZeigen('ab'));
await T.evaluate(() => document.getElementById('btnKamera2').click()); await T.waitForTimeout(400);
let g = await letzte(T); t('Ohne Wahl: hintere Kamera (facingMode)', g.video.facingMode === 'environment' && !g.video.deviceId, JSON.stringify(g));
await T.evaluate(() => { document.getElementById('btnKamera2').click(); });   // aus
await T.evaluate(() => { kameraSetzen('id-handy'); }); await T.waitForTimeout(200);
await T.evaluate(() => document.getElementById('btnKamera2').click()); await T.waitForTimeout(400);
g = await letzte(T); t('Mit Wahl: genau diese Kamera, kein facingMode', g.video.deviceId && g.video.deviceId.ideal === 'id-handy' && !g.video.facingMode, JSON.stringify(g));
t('Wahl wird gemerkt', await T.evaluate(() => JSON.parse(localStorage.getItem('guthabenkasse.v1')).kameraId) === 'id-handy');
// Wechseln-Knopf
t('⟲-Knopf neben jeder Kamera-Taste', await T.evaluate(() => !!document.getElementById('btnKamera2W') && !!document.getElementById('btnKamera3W') && !!document.getElementById('btnKameraW')));
await T.evaluate(() => document.getElementById('btnKamera2W').click()); await T.waitForTimeout(900);
t('Wechseln: nächste Kamera (USB-Kamera)', await T.evaluate(() => db.kameraId) === 'id-extern' && (await letzte(T)).video.deviceId.ideal === 'id-extern', await T.evaluate(() => db.kameraId));
await T.evaluate(() => document.getElementById('btnKamera2W').click()); await T.waitForTimeout(900);
t('Wechseln: danach wieder die erste (Integrierte)', await T.evaluate(() => db.kameraId) === 'id-intern');
// Kamera nicht mehr da: Rückfall
await T.evaluate(() => { window.__rejectId = 'id-intern'; kameraAus(); document.getElementById('btnKamera2').click(); }); await T.waitForTimeout(600);
t('Kamera fehlt: Rückfall auf Standard, Kamera läuft', await T.evaluate(() => liest === true), JSON.stringify(await T.evaluate(() => window.__gum.slice(-2))));
// ---- Verkauf
const V = await seite('guthabenkasse-verkauf.html', p => p.evaluate(() => { db.geraet = 'V'; db.kompakt = false; sichern(); }));
t('Verkauf: Auswahl und ⟲-Knopf vorhanden', await V.evaluate(() => !!document.getElementById('kameraWahl') && !!document.getElementById('btnKamera2W')));
// ---- Anzeige
const AZ = await seite('guthabenkasse-anzeige.html');
await AZ.waitForTimeout(500);
t('Anzeige: Start mit hinterer Kamera', (await letzte(AZ)).video.facingMode === 'environment');
await AZ.click('#kam'); await AZ.waitForTimeout(500);
t('Anzeige: ⟲ wählt die erste Kamera der Liste', (await letzte(AZ)).video.deviceId.ideal === 'id-intern', JSON.stringify(await letzte(AZ)));
await AZ.click('#kam'); await AZ.waitForTimeout(500); await AZ.click('#kam'); await AZ.waitForTimeout(500);
t('Anzeige: dritte Kamera', (await letzte(AZ)).video.deviceId.ideal === 'id-extern');
t('Anzeige: Wahl wird gemerkt', await AZ.evaluate(() => JSON.parse(localStorage.getItem('guthabenkasse.anzeige.v1')).kameraId) === 'id-extern');
console.log(ok + ' ok, ' + bad + ' Fehler'); await b.close();
