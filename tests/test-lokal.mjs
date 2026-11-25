// Lokale Ablage: Server starten, Anfragen, Neustart (Daten bleiben), HTTPS, Mail, Browser mit Terminal und Verkauf
import { spawn, execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, readdirSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os'; import { join } from 'node:path'; import net from 'node:net'; import https from 'node:https';
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
let ok = 0, bad = 0; const t = (n, c, extra = '') => { if (c) ok++; else { bad++; console.log('FAIL', n, extra); } };
const ORDNER = mkdtempSync(join(process.env.GK_TESTTMP || tmpdir(), 'gk-lokal-'));
const HTTP = 18080, HTTPS = 18443, SMTP = 18025;
const konf = { port_http: HTTP, port_https: HTTPS, https: true, wort_verkauf: 'vk1', wort_kasse: 'ka1', wort_admin: 'ad1', wort_anzeige: 'an1',
  bericht_an: 'gast@example.org', smtp: { host: '127.0.0.1', port: SMTP, benutzer: 'u', passwort: 'p', von: 'kasse@example.org' } };
writeFileSync(join(ORDNER, 'config.json'), JSON.stringify(konf));
let proc;
const starte = () => new Promise((ok2, nein) => {
  proc = spawn('node', ['/home/user/guthabenkasse/lokal/ablage-server.mjs', '--config', join(ORDNER, 'config.json')], { stdio: ['ignore', 'pipe', 'pipe'] });
  let aus = ''; proc.stdout.on('data', d => { aus += d; if (/Beenden mit Strg/.test(aus)) ok2(aus); }); proc.stderr.on('data', d => aus += d);
  proc.on('exit', c => nein(new Error('beendet ' + c + ' ' + aus))); setTimeout(() => nein(new Error('Start dauert: ' + aus)), 8000);
});
const stoppe = () => new Promise(r => { proc.removeAllListeners('exit'); proc.on('exit', r); proc.kill(); });
const post = (wort, o, basis = 'http://127.0.0.1:' + HTTP) => fetch(basis + '/api', { method: 'POST', headers: { 'content-type': 'text/plain;charset=utf-8' }, body: JSON.stringify(Object.assign({ wort }, o)) }).then(r => r.json());
// kleiner SMTP-Server
const mails = [];
const smtp = net.createServer(s => {
  let daten = '', inData = false; s.write('220 test\r\n');
  s.on('data', d => { const text = d.toString(); if (inData) { daten += text; if (/\r\n\.\r\n$/.test(daten)) { mails.push(daten); inData = false; s.write('250 ok\r\n'); } return; }
    for (const z of text.split('\r\n').filter(Boolean)) {
      if (/^EHLO/.test(z)) s.write('250-test\r\n250 AUTH PLAIN\r\n'); else if (/^AUTH/.test(z)) s.write('235 ok\r\n'); else if (/^(MAIL|RCPT)/.test(z)) s.write('250 ok\r\n');
      else if (/^DATA/.test(z)) { inData = true; daten = ''; s.write('354 go\r\n'); } else if (/^QUIT/.test(z)) { s.write('221 bye\r\n'); s.end(); } } }); });
await new Promise(r => smtp.listen(SMTP, '127.0.0.1', r));
const ausgabe = await starte();
t('Start meldet Adressen und Wörter', /https:\/\/.*:18443/.test(ausgabe) && ausgabe.includes('ka1') && /Skriptfassung/.test(ausgabe), ausgabe);
// Info-Seite, Karten, Buchungen
let r = await fetch('http://127.0.0.1:' + HTTP + '/api').then(x => x.text()); t('Infoseite nennt Skriptfassung', /Skriptfassung/.test(r) && !r.includes('ka1'));
t('falsches Wort', (await post('falsch', { aktion: 'holen' })).fehler);
r = await post('ka1', { aktion: 'karten', was: 'anlegen', karten: [{ nr: 'A0001', code: 'K7Q2' }] }); t('Karte anlegen', r.ok && r.neu === 1, JSON.stringify(r));
const geraet = { id: 'T', schluessel: 'kt', name: 'Terminal', bediener: 'Anna' };
r = await post('ka1', { aktion: 'sync', geraet, cursor: 0, kv: 0, neu: [{ id: 'bT1', karte: 'A0001', cent: 2500, art: 'auf', zeit: Date.now(), geraet: 'T', kc: 'K7Q2', n: 1, k: 'x' }] });
t('Aufbuchen über HTTP', r.ok && r.ergebnisse.bT1 && r.ergebnisse.bT1.st === 'ok', JSON.stringify(r).slice(0, 300));
r = await post('vk1', { aktion: 'sync', geraet: { id: 'V', schluessel: 'kv', name: 'V', bediener: 'Ben' }, cursor: 0, kv: 0, neu: [{ id: 'bV1', karte: 'A0001', cent: -400, art: 'ab', zeit: Date.now(), geraet: 'V', kc: 'K7Q2', n: 1, k: 'y' }] });
t('Abbuchen mit Verkaufswort', r.ergebnisse.bV1.st === 'ok' && r.ergebnisse.bV1.saldo === 2100, JSON.stringify(r.ergebnisse));
t('Verkauf darf nicht aufbuchen', (await post('vk1', { aktion: 'sync', geraet: { id: 'V', schluessel: 'kv' }, cursor: 0, kv: 0, neu: [{ id: 'bV2', karte: 'A0001', cent: 100, art: 'auf', zeit: Date.now(), geraet: 'V', n: 2, k: 'z' }] })).ergebnisse.bV2.code === 'recht');
r = await post('an1', { aktion: 'bestand', karte: 'GK-A0001-K7Q2' }); t('Anzeige: Bestand', r.st === 'ok' && r.cent === 2100, JSON.stringify(r));
// CORS / Vorabfrage
const opt = await fetch('http://127.0.0.1:' + HTTP + '/api', { method: 'OPTIONS' }); t('Vorabfrage erlaubt, auch Privatnetz', opt.status === 204 && opt.headers.get('access-control-allow-private-network') === 'true');
// Dateien
const th = await fetch('http://127.0.0.1:' + HTTP + '/guthabenkasse-terminal.html').then(x => x.text()); t('Terminal ausgeliefert mit Ablage-Adresse', th.includes('window.GK_ABLAGE="http://127.0.0.1:18080/api"') && th.includes('Guthabenkasse'));
t('Pfadtricks gesperrt', (await fetch('http://127.0.0.1:' + HTTP + '/..%2fablage.gs')).status === 404 && (await fetch('http://127.0.0.1:' + HTTP + '/config.json')).status === 404);
// HTTPS (Zertifikat selbst signiert)
const hs = await new Promise(res => https.get({ host: '127.0.0.1', port: HTTPS, path: '/api', rejectUnauthorized: false }, x => { let d = ''; x.on('data', c => d += c); x.on('end', () => res(d)); }).on('error', e => res('FEHLER ' + e.message)));
t('HTTPS erreichbar', /Skriptfassung/.test(hs), hs);
// Sicherung und Neustart
r = await post('ka1', { aktion: 'sicherung', was: 'erstellen' }); t('Sicherung angelegt', r.ok && existsSync(join(ORDNER, 'daten', r.name)));
await stoppe(); await starte();
r = await post('ka1', { aktion: 'holen' }); t('Daten nach Neustart da', r.ok && r.daten.buchungen.length === 2 && Object.keys(r.daten.karten).length === 1, JSON.stringify(r).slice(0, 200));
t('Keine halben Dateien', !readdirSync(join(ORDNER, 'daten')).some(n => n.endsWith('.neu')));
// Mail
r = await post('ka1', { aktion: 'bericht', mailen: true }); await new Promise(x => setTimeout(x, 800));
t('Bericht mit Mail', r.ok && r.mail.gesendet === true && mails.length === 1 && /Subject: =\?UTF-8\?B\?/.test(mails[0]) && mails[0].includes('RCPT') === false, JSON.stringify(r.mail));
t('Abrechnung auch als Datei', readdirSync(join(ORDNER, 'daten', 'abrechnungen')).length >= 2);
// Abend abschließen über HTTP
r = await post('ad1', { aktion: 'neubeginn', behalten: true, geraet: { id: 'T' } }); t('Abend abschließen lokal', r.ok && r.uebertrag.karten === 1);
// Browser: Terminal und Verkauf gegen die lokale Ablage
const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 390, height: 780 } });
const fehler = [];
const T = await ctx.newPage(); T.on('pageerror', e => fehler.push('T ' + e.message));
await T.goto('http://127.0.0.1:' + HTTP + '/guthabenkasse-terminal.html'); await T.waitForTimeout(500);
t('Adresse ist vorbelegt', await T.evaluate(() => db.ablage && db.ablage.adresse === 'http://127.0.0.1:18080/api'));
await T.evaluate(() => { db.geraet = 'T'; db.schluessel = 'kt'; db.ablage.wort = 'ka1'; db.bediener = 'Anna'; db.modus = 'schnell'; db.ton = false; sichern(); });
await T.evaluate(() => syncJetzt(5000)); await T.waitForTimeout(500);
t('Terminal abgeglichen, Karte A0001 mit 21,00 €', await T.evaluate(() => db.karten['A0001'] && saldo('A0001') === 2100), await T.evaluate(() => JSON.stringify(Object.keys(db.karten)) + saldo('A0001')));
const V = await ctx.newPage(); V.on('pageerror', e => fehler.push('V ' + e.message));
await V.goto('http://127.0.0.1:' + HTTP + '/guthabenkasse-verkauf.html'); await V.waitForTimeout(400);
await V.evaluate(() => { db.geraet = 'V'; db.schluessel = 'kv'; db.ablage.wort = 'vk1'; db.bediener = 'Ben'; db.modus = 'schnell'; db.ton = false; sichern(); });
await V.evaluate(() => syncJetzt(5000)); await V.waitForTimeout(400);
await V.evaluate(() => { $("abBetrag").value = "3"; letzteBuchung = { roh: '', zeit: 0, cent: 0, tab: '' }; buche('ab', 'GK-A0001-K7Q2'); }); await V.waitForTimeout(1200);
const h = await post('ka1', { aktion: 'holen' });
t('Verkauf bucht über die lokale Ablage', h.daten.buchungen.some(x => x.art === 'ab' && x.cent === -300 && x.geraet === 'V'));
t('Keine Seitenfehler', fehler.length === 0, fehler.join('|'));
await b.close(); await stoppe(); smtp.close();
console.log(ok + ' ok, ' + bad + ' Fehler'); process.exit(bad ? 1 : 0);
