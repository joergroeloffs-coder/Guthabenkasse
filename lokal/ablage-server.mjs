#!/usr/bin/env node
// Lokale Ablage für die Guthabenkasse: dieselbe Ablage wie in Google Apps Script (ablage.gs),
// aber auf einem eigenen Rechner. Keine Abhängigkeiten, nur Node.js ab Version 18.
//   Start:  node ablage-server.mjs        (beim ersten Start entsteht config.json mit Zugangswörtern)
//   Hilfe:  siehe docs/LOKALE-ABLAGE.md
import vm from 'node:vm';
import http from 'node:http';
import https from 'node:https';
import net from 'node:net';
import tls from 'node:tls';
import os from 'node:os';
import { execFileSync } from 'node:child_process';
import { randomInt } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync, renameSync, statSync, openSync, writeSync, fsyncSync, closeSync } from 'node:fs';
import { dirname, join, resolve, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const HIER = dirname(fileURLToPath(import.meta.url));
const arg = n => { const i = process.argv.indexOf('--' + n); return i >= 0 ? process.argv[i + 1] : undefined; };
const CONFIG_PFAD = resolve(arg('config') || process.env.GK_CONFIG || join(HIER, 'config.json'));
const log = (...a) => console.log(new Date().toLocaleTimeString('de-DE'), ...a);

/* ---------- Einstellungen ---------- */
function zufallswort() {
  const z = 'abcdefghjkmnpqrstuvwxyz23456789';   // ohne Zeichen, die man verwechselt (l, i, o, 0, 1)
  let w = ''; for (let i = 0; i < 7; i++) w += z[randomInt(z.length)];
  return w;
}
function konfigLaden() {
  const std = {
    port_https: 8443, port_http: 8080, https: true,
    datenordner: 'daten', dateiname: 'guthabenkasse-ablage.json',
    wort_verkauf: '', wort_kasse: '', wort_admin: '', wort_anzeige: '',
    bericht_an: '', smtp: { host: '', port: 587, benutzer: '', passwort: '', von: '' },
    konstanten: {}   // zum Beispiel { "OFFLINE_LIMIT": 2000, "MAX_GERAETE": 4, "GEBUEHR_PROZENT": 0 }
  };
  let neu = false, c = {};
  if (existsSync(CONFIG_PFAD)) c = JSON.parse(readFileSync(CONFIG_PFAD, 'utf8'));
  else neu = true;
  const k = Object.assign({}, std, c, { smtp: Object.assign({}, std.smtp, c.smtp || {}) });
  for (const w of ['wort_verkauf', 'wort_kasse', 'wort_admin', 'wort_anzeige']) if (!k[w]) { k[w] = zufallswort(); neu = true; }
  if (neu) writeFileSync(CONFIG_PFAD, JSON.stringify(k, null, 2) + '\n');
  return { k, neu };
}
const { k: KONF, neu: ERSTER_START } = konfigLaden();
const BASIS = dirname(CONFIG_PFAD);
const DATEN = resolve(BASIS, KONF.datenordner);
const PAPIERKORB = join(DATEN, 'papierkorb');
const MAILS = join(DATEN, 'abrechnungen');
for (const d of [DATEN, PAPIERKORB, MAILS]) mkdirSync(d, { recursive: true });

/* ---------- ablage.gs finden und mit eigenen Werten laden ---------- */
const gsPfad = [join(HIER, 'ablage.gs'), join(HIER, '..', 'ablage.gs')].find(existsSync);
if (!gsPfad) { console.error('ablage.gs nicht gefunden (muss neben diesem Programm liegen).'); process.exit(1); }
let code = readFileSync(gsPfad, 'utf8');
const setze = (n, w) => {
  const re = new RegExp('var ' + n + '\\s*=\\s*[^;]*;');
  if (!re.test(code)) throw new Error('ablage.gs: ' + n + ' nicht gefunden');
  code = code.replace(re, () => 'var ' + n + ' = ' + JSON.stringify(w) + ';');
};
setze('WORT_VERKAUF', KONF.wort_verkauf); setze('WORT_KASSE', KONF.wort_kasse); setze('WORT_ADMIN', KONF.wort_admin);
setze('WORT_ANZEIGE', KONF.wort_anzeige); setze('ZUGANGSWORT', ''); setze('DATEINAME', basename(KONF.dateiname)); setze('BERICHT_AN', KONF.bericht_an);
for (const [n, w] of Object.entries(KONF.konstanten || {})) setze(n, w);

/* ---------- Ersatz für die Google-Dienste, auf Dateien im Datenordner ---------- */
function schreibeSicher(pfad, text) {
  // erst in eine Nebendatei, auf den Datenträger zwingen, dann umbenennen: ein Stromausfall lässt immer eine ganze Datei zurück
  const tmp = pfad + '.neu';
  const fd = openSync(tmp, 'w'); writeSync(fd, text); fsyncSync(fd); closeSync(fd);
  renameSync(tmp, pfad);
}
function dateiObj(name) {
  const p = join(DATEN, basename(name));
  return {
    getName: () => name,
    getBlob: () => ({ getDataAsString: () => readFileSync(p, 'utf8') }),
    setContent: s => schreibeSicher(p, s),
    isTrashed: () => false,
    setTrashed: b => { if (b && existsSync(p)) renameSync(p, join(PAPIERKORB, name + '.' + Date.now())); },
    getDateCreated: () => { const s = statSync(p); return new Date(s.birthtimeMs || s.mtimeMs); },
    getSize: () => statSync(p).size
  };
}
const liste = namen => { let i = 0; return { hasNext: () => i < namen.length, next: () => dateiObj(namen[i++]) }; };
const alleDateien = () => readdirSync(DATEN, { withFileTypes: true }).filter(e => e.isFile() && !e.name.endsWith('.neu')).map(e => e.name);
const cache = new Map();
const mailHandler = { senden: null };
const sandbox = {
  console, JSON, Math, Date, String, Number, Object, Array, isFinite, parseInt, parseFloat,
  ContentService: { MimeType: { JSON: 'json', TEXT: 'text' }, createTextOutput: s => ({ text: s, typ: 'text', setMimeType(t) { this.typ = t; return this; } }) },
  LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },   // Node verarbeitet immer nur eine Anfrage zugleich
  MimeType: { PLAIN_TEXT: 'text/plain' },
  DriveApp: {
    getFilesByName: n => liste(alleDateien().filter(x => x === basename(n))),
    createFile: (n, c) => { schreibeSicher(join(DATEN, basename(n)), c); return dateiObj(n); },
    searchFiles: () => liste(alleDateien().filter(x => /^guthabenkasse-sicherung-/.test(x)))
  },
  CacheService: { getScriptCache: () => ({
    put: (k, v, s) => { cache.set(k, { v, bis: Date.now() + (s || 600) * 1000 }); },
    get: k => { const e = cache.get(k); if (!e || e.bis < Date.now()) { cache.delete(k); return null; } return e.v; } }) },
  MailApp: { sendEmail: m => mailHandler.senden(m) }
};
vm.createContext(sandbox); vm.runInContext(code, sandbox, { filename: 'ablage.gs' });

/* ---------- Mail (einfaches SMTP; ohne Einstellungen wird die Abrechnung nur als Datei abgelegt) ---------- */
function smtpSenden(cfg, m) {
  return new Promise((ok, nein) => {
    const an = String(m.to).split(',').map(s => s.trim()).filter(Boolean);
    const von = cfg.von || cfg.benutzer;
    const grenze = 'gk' + Date.now();
    const b64 = s => Buffer.from(s, 'utf8').toString('base64').replace(/(.{76})/g, '$1\r\n');
    const text = [
      'From: ' + von, 'To: ' + an.join(', '), 'Subject: =?UTF-8?B?' + Buffer.from(m.subject, 'utf8').toString('base64') + '?=', 'MIME-Version: 1.0',
      'Content-Type: multipart/alternative; boundary="' + grenze + '"', '',
      '--' + grenze, 'Content-Type: text/plain; charset=UTF-8', 'Content-Transfer-Encoding: base64', '', b64(m.body),
      '--' + grenze, 'Content-Type: text/html; charset=UTF-8', 'Content-Transfer-Encoding: base64', '', b64(m.htmlBody || m.body),
      '--' + grenze + '--', ''
    ].join('\r\n');
    let sock, puffer = '', schritt = 0, fertig = false, starttls = false;
    const ende = (f) => { if (fertig) return; fertig = true; clearTimeout(frist); try { sock.destroy(); } catch (e) {} f ? nein(f) : ok(); };
    const frist = setTimeout(() => ende(new Error('SMTP: Zeitüberschreitung')), 20000);
    const sende = z => sock.write(z + '\r\n');
    let zustand = 'gruss';
    const verarbeite = (code, zeilen) => {
      const eh = zeilen.join(' ');
      const fehler = (w) => ende(new Error('SMTP ' + w + ': ' + zeilen.join(' | ')));
      switch (zustand) {
        case 'gruss': if (code !== '220') return fehler('Gruß'); zustand = 'ehlo'; return sende('EHLO guthabenkasse');
        case 'ehlo':
          if (code !== '250') return fehler('EHLO');
          if (cfg.port != 465 && !starttls && /STARTTLS/i.test(eh)) { zustand = 'starttls'; return sende('STARTTLS'); }
          if (cfg.benutzer) { zustand = 'auth'; return sende('AUTH PLAIN ' + Buffer.from('\0' + cfg.benutzer + '\0' + cfg.passwort).toString('base64')); }
          zustand = 'von'; return sende('MAIL FROM:<' + von.replace(/.*<|>.*/g, '') + '>');
        case 'starttls':
          if (code !== '220') return fehler('STARTTLS');
          starttls = true; sock.removeAllListeners('data');
          sock = tls.connect({ socket: sock, servername: cfg.host }, () => { zustand = 'ehlo'; sende('EHLO guthabenkasse'); });
          sock.on('data', daten); sock.on('error', f => ende(f)); return;
        case 'auth': if (code !== '235') return fehler('Anmeldung'); zustand = 'von'; return sende('MAIL FROM:<' + von.replace(/.*<|>.*/g, '') + '>');
        case 'von': if (code !== '250') return fehler('Absender'); zustand = 'an'; schritt = 0; return sende('RCPT TO:<' + an[schritt] + '>');
        case 'an':
          if (code !== '250' && code !== '251') return fehler('Empfänger');
          if (++schritt < an.length) return sende('RCPT TO:<' + an[schritt] + '>');
          zustand = 'daten'; return sende('DATA');
        case 'daten': if (code !== '354') return fehler('DATA'); zustand = 'inhalt'; return sock.write(text.replace(/^\./gm, '..') + '\r\n.\r\n');
        case 'inhalt': if (code !== '250') return fehler('Senden'); zustand = 'quit'; return sende('QUIT');
        default: return ende(null);
      }
    };
    const daten = d => {
      puffer += d.toString('utf8');
      let i;
      let zeilen = [];
      while ((i = puffer.indexOf('\r\n')) >= 0) {
        const z = puffer.slice(0, i); puffer = puffer.slice(i + 2); zeilen.push(z);
        if (/^\d{3} /.test(z) || /^\d{3}$/.test(z)) { const c = z.slice(0, 3); const sammel = zeilen; zeilen = []; verarbeite(c, sammel); }
      }
    };
    const verbunden = () => { sock.on('data', daten); sock.on('error', f => ende(f)); };
    if (cfg.port == 465) sock = tls.connect({ host: cfg.host, port: 465, servername: cfg.host }, verbunden);
    else { sock = net.connect({ host: cfg.host, port: cfg.port || 587 }, verbunden); }
  });
}
mailHandler.senden = m => {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  writeFileSync(join(MAILS, 'abrechnung-' + stamp + '.html'), m.htmlBody || m.body);
  writeFileSync(join(MAILS, 'abrechnung-' + stamp + '.txt'), m.body);
  if (!KONF.smtp.host) throw new Error('Mail ist in der lokalen Ablage nicht eingerichtet (config.json → smtp). Die Abrechnung liegt als Datei im Ordner ' + MAILS);
  // Apps Script wartet auf das Senden; hier läuft es im Hintergrund, das Ergebnis steht im Protokoll
  smtpSenden(KONF.smtp, m).then(() => log('Abrechnung per Mail gesendet an', m.to), f => log('Mail NICHT gesendet:', String(f.message || f)));
};
export { smtpSenden };

/* ---------- Webserver ---------- */
const APP_DATEIEN = new Set(['index.html', 'guthabenkasse-terminal.html', 'guthabenkasse-verkauf.html', 'guthabenkasse-anzeige.html',
  'manifest-terminal.webmanifest', 'manifest-verkauf.webmanifest', 'manifest-anzeige.webmanifest', 'manifest.webmanifest', 'sw.js',
  'favicon.svg', 'apple-touch-icon.png', 'icon-192.png', 'icon-512.png', 'icon-verkauf-192.png', 'icon-verkauf-512.png', 'icon-32.png', 'icon-maskable-512.png', 'icon-verkauf-maskable-512.png']);
const TYPEN = { html: 'text/html; charset=utf-8', js: 'text/javascript; charset=utf-8', webmanifest: 'application/manifest+json', svg: 'image/svg+xml', png: 'image/png' };
const appOrdner = [join(HIER, 'app'), join(HIER, '..')].find(o => existsSync(join(o, 'guthabenkasse-terminal.html')));
const CORS = {
  'access-control-allow-origin': '*', 'access-control-allow-methods': 'POST, GET, OPTIONS', 'access-control-allow-headers': 'content-type',
  'access-control-allow-private-network': 'true', 'access-control-max-age': '600'
};
function antworten(res, status, typ, body, extra = {}) {
  res.writeHead(status, Object.assign({ 'content-type': typ, 'cache-control': 'no-store' }, CORS, extra));
  res.end(body);
}
function verarbeiteAnfrage(req, res, istHttps) {
  const pfad = new URL(req.url, 'http://x').pathname;
  if (req.method === 'OPTIONS') return antworten(res, 204, 'text/plain', '');
  if (req.method === 'POST') {
    const teile = []; let groesse = 0;
    req.on('data', d => { groesse += d.length; if (groesse > 8e6) { res.writeHead(413); res.end(); req.destroy(); } else teile.push(d); });
    req.on('end', () => {
      if (res.writableEnded) return;
      let aus;
      try { aus = sandbox.doPost({ postData: { contents: Buffer.concat(teile).toString('utf8') } }).text; }
      catch (f) { aus = JSON.stringify({ fehler: 'Die Ablage hat sich verschluckt: ' + f }); }
      antworten(res, 200, 'application/json; charset=utf-8', aus);
    });
    return;
  }
  if (req.method !== 'GET' && req.method !== 'HEAD') return antworten(res, 405, 'text/plain', 'Nicht erlaubt');
  if (pfad === '/api' || pfad === '/ablage' || pfad === '/exec') {
    return antworten(res, 200, 'text/plain; charset=utf-8', sandbox.doGet().text + '\nLokale Ablage, Daten: ' + DATEN + '\n');
  }
  const name = pfad === '/' ? 'index.html' : pfad.slice(1);
  if (!appOrdner || !APP_DATEIEN.has(name) || !existsSync(join(appOrdner, name))) return antworten(res, 404, 'text/plain; charset=utf-8', 'Nicht gefunden');
  let inhalt = readFileSync(join(appOrdner, name));
  const endung = name.split('.').pop();
  if (endung === 'html') {
    const host = req.headers.host || ('localhost:' + (istHttps ? KONF.port_https : KONF.port_http));
    const adresse = (istHttps ? 'https://' : 'http://') + host + '/api';
    inhalt = Buffer.from(inhalt.toString('utf8').replace('</head>', '<script>window.GK_ABLAGE=' + JSON.stringify(adresse) + ';</script></head>'), 'utf8');
  }
  antworten(res, 200, TYPEN[endung] || 'application/octet-stream', req.method === 'HEAD' ? '' : inhalt);
}

function lanAdressen() {
  const a = [];
  for (const l of Object.values(os.networkInterfaces())) for (const i of l || []) if (i.family === 'IPv4' && !i.internal) a.push(i.address);
  return a;
}
function zertifikat() {
  const ordner = join(DATEN, 'zertifikat'); mkdirSync(ordner, { recursive: true });
  const c = join(ordner, 'cert.pem'), k = join(ordner, 'key.pem'), ipsDatei = join(ordner, 'adressen.txt');
  const ips = ['127.0.0.1', ...lanAdressen()];
  const bisher = existsSync(ipsDatei) ? readFileSync(ipsDatei, 'utf8').split('\n') : [];
  if (!(existsSync(c) && existsSync(k) && ips.every(i => bisher.includes(i)))) {
    const san = 'subjectAltName=DNS:localhost,' + ips.map(i => 'IP:' + i).join(',');
    const openssl = ['openssl', 'C:\\Program Files\\Git\\usr\\bin\\openssl.exe', 'C:\\Program Files (x86)\\Git\\usr\\bin\\openssl.exe'].find(o => { try { execFileSync(o, ['version'], { stdio: 'ignore' }); return true; } catch (e) { return false; } });
    if (!openssl) { const f = new Error('openssl nicht gefunden'); f.code = 'ENOENT'; throw f; }
    execFileSync(openssl, ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-days', '1800', '-keyout', k, '-out', c, '-subj', '/CN=Guthabenkasse', '-addext', san], { stdio: 'ignore' });
    writeFileSync(ipsDatei, ips.join('\n'));
    log('Neues Zertifikat angelegt für', ips.join(', '));
  }
  return { cert: readFileSync(c), key: readFileSync(k) };
}

export function starten() {
  const meldungen = [];
  const httpServer = http.createServer((q, s) => verarbeiteAnfrage(q, s, false));
  const bereit = [];
  bereit.push(new Promise(ok => httpServer.listen(KONF.port_http, '0.0.0.0', ok)));
  let httpsServer = null, httpsHinweis = '';
  if (KONF.https) {
    try {
      httpsServer = https.createServer(zertifikat(), (q, s) => verarbeiteAnfrage(q, s, true));
      bereit.push(new Promise(ok => httpsServer.listen(KONF.port_https, '0.0.0.0', ok)));
    } catch (f) { httpsHinweis = 'HTTPS nicht möglich (' + (f.code === 'ENOENT' ? 'openssl nicht gefunden' : f.message) + '). Es läuft nur HTTP: die Kamera geht dann nur am Rechner selbst.'; }
  }
  return Promise.all(bereit).then(() => {
    const ips = lanAdressen();
    meldungen.push('', '=== Guthabenkasse – lokale Ablage bereit ===', 'Skriptfassung: ' + sandbox.SKRIPT_VERSION, 'Daten: ' + DATEN, '');
    meldungen.push('Diese Adressen auf den Geräten öffnen:');
    for (const ip of ips.length ? ips : ['localhost']) {
      if (httpsServer) meldungen.push('  https://' + ip + ':' + KONF.port_https + '/    (empfohlen, Kamera funktioniert)');
      meldungen.push('  http://' + ip + ':' + KONF.port_http + '/' + (httpsServer ? '' : '    (Kamera nur am Rechner selbst)'));
    }
    if (httpsHinweis) meldungen.push('', 'ACHTUNG: ' + httpsHinweis);
    meldungen.push('', 'Zugangswörter (stehen auch in config.json):',
      '  Verkauf: ' + KONF.wort_verkauf, '  Kasse:   ' + KONF.wort_kasse, '  Admin:   ' + KONF.wort_admin, '  Anzeige: ' + KONF.wort_anzeige);
    if (ERSTER_START) meldungen.push('', 'Erster Start: Die Wörter wurden eben zufällig vergeben. Bitte notieren oder in config.json ändern.');
    meldungen.push('', 'Beenden mit Strg+C.');
    console.log(meldungen.join('\n'));
    return { httpServer, httpsServer, schliessen: () => { httpServer.close(); if (httpsServer) httpsServer.close(); } };
  });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  starten().catch(f => { console.error('Start fehlgeschlagen:', f.message); process.exit(1); });
}
