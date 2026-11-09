/* ======================================================================
   Schicht Version 2: Terminal und Verkauf

   Diese Schicht steht hinter dem Kern der Guthabenkasse (0.12) und ersetzt
   oder umhüllt einzelne Funktionen. Der Kern bleibt wie er war: dieselben
   Buchungen, dieselbe Prüfkette, dieselben Karten. Neu ist, wer entscheidet:
   die Ablage (ablage.gs, Version 2) nimmt jede Buchung an oder lehnt sie ab,
   und ein Gerät zeigt „gebucht“ erst, wenn die Ablage es bestätigt hat oder
   die Buchung ausdrücklich als Offline-Buchung gekennzeichnet ist.

   MODUS ist "terminal" oder "verkauf" und wird beim Bauen eingesetzt.
   ====================================================================== */
var MODUS = "__MODUS__";
var OFFLINE_STANDARD = 2000;

/* Übersetzung der neuen Texte (Türkisch bitte gegenlesen) */
(function(){
  var W={"tr": {"S": {"Verwaltung": "Yönetim", "Abrechnung": "Hesap", "Buchen": "Onayla", "Abbrechen": "İptal", "Meine Abrechnung": "Hesabım"}, "J": {"Online": "Çevrimiçi", "Offline": "Çevrimdışı", "Keine Ablage": "Depo yok", "Gleicht ab …": "Eşitleniyor …", "offen": "açık", "Bucht …": "Kaydediliyor …", "Nicht gebucht": "Kaydedilmedi", "Karte gesperrt": "Kart engellendi", "Gerade erst gebucht": "Az önce işlendi", "Dieselbe Karte, derselbe Betrag – nicht noch einmal gebucht.": "Aynı kart, aynı tutar – tekrar işlenmedi.", "Guthaben ": "Bakiye ", " abbuchen?": " harcansın mı?", "Offline gebucht – wird übertragen, sobald Verbindung da ist": "Çevrimdışı işlendi – bağlantı gelince aktarılacak", "Unklar – nicht noch einmal buchen": "Belirsiz – tekrar işlem yapmayın", "Einen Moment, die letzte Buchung läuft noch.": "Bir saniye, son işlem sürüyor.", "Zurückgenommen": "Geri alındı", "Diese Buchung ist schon zurückgenommen": "Bu işlem zaten geri alındı", "Eine Rücknahme lässt sich nicht zurücknehmen": "Geri alma geri alınamaz"}}, "en": {"S": {"Verwaltung": "Admin", "Abrechnung": "Report", "Buchen": "Book", "Abbrechen": "Cancel", "Meine Abrechnung": "My report"}, "J": {"Online": "Online", "Offline": "Offline", "Keine Ablage": "No storage", "Gleicht ab …": "Syncing …", "offen": "pending", "Bucht …": "Booking …", "Nicht gebucht": "Not booked", "Karte gesperrt": "Card blocked", "Gerade erst gebucht": "Just booked", "Dieselbe Karte, derselbe Betrag – nicht noch einmal gebucht.": "Same card, same amount – not booked again.", "Guthaben ": "Balance ", " abbuchen?": " charge?", "Offline gebucht – wird übertragen, sobald Verbindung da ist": "Booked offline – will be sent when connected", "Unklar – nicht noch einmal buchen": "Unclear – do not book again", "Einen Moment, die letzte Buchung läuft noch.": "One moment, the last booking is still running.", "Zurückgenommen": "Reversed", "Diese Buchung ist schon zurückgenommen": "Already reversed", "Eine Rücknahme lässt sich nicht zurücknehmen": "A reversal cannot be reversed"}}};
  ["tr","en"].forEach(function(l){ for(var k in W[l]) for(var de in W[l][k]) if(SPRACHEN[l][k]) SPRACHEN[l][k][de]=W[l][k][de]; });
})();

/* ---- Fehlende Elemente (in der Verkaufs-App fehlen ganze Bereiche) ---- */
var _stumm = {};
$ = function (id) {
  var e = document.getElementById(id);
  if (e) return e;
  return _stumm[id] || (_stumm[id] = document.createElement("input"));
};

/* ---- Kartenform: GK-A0042 oder GK-A0042-K7Q2 (mit Prüfnummer) ---- */
KARTENFORM = /^(?:GK-?)?([A-Z])(\d{4,6})(?:-([A-Z0-9]{4}))?$/;
function kartenPruef(roh) {
  var m = KARTENFORM.exec(String(roh || "").trim().toUpperCase().replace(/\s+/g, ""));
  return m && m[3] ? m[3] : "";
}
function qrText(nr) {
  var k = db.karten[nr];
  return "GK-" + nr + (k && k.code ? "-" + k.code : "");
}
function zufallsText(n, alphabet) {
  var s = "", a = new Uint32Array(n);
  (window.crypto || window.msCrypto).getRandomValues(a);
  for (var i = 0; i < n; i++) s += alphabet.charAt(a[i] % alphabet.length);
  return s;
}
function pruefCodeNeu() { return zufallsText(4, "23456789ABCDEFGHJKLMNPQRSTUVWXYZ"); }
neueId = function () {
  return Date.now().toString(36) + (db.geraet || "?") + zufallsText(6, "0123456789abcdefghijklmnopqrstuvwxyz");
};

/* ======================= Speichern: Browser + IndexedDB =======================
   Zwei Orte, damit ein Fehler an einem nicht alles kostet. Eine Buchung gilt
   als gespeichert, wenn mindestens einer bestätigt hat. */
var idbRef = null, idbEinmal = 0;
var speicherZustand = { ls: true, idb: null };
var KEY_ALT = "guthabenkasse.v1";
/* Das Terminal behält den Speicherort der bisherigen Guthabenkasse: Karten und Guthaben sind sofort da. */
KEY = MODUS === "terminal" ? "guthabenkasse.v1" : "guthabenkasse.verkauf.v2";

function idbOeffnen(fertig) {
  try {
    if (!window.indexedDB) { fertig(); return; }
    var r = indexedDB.open("guthabenkasse-" + MODUS, 1);
    r.onupgradeneeded = function () { r.result.createObjectStore("kv"); };
    r.onsuccess = function () { idbRef = r.result; fertig(); };
    r.onerror = r.onblocked = function () { fertig(); };
  } catch (e) { fertig(); }
}
function idbSchreiben(json, fertig) {
  if (!idbRef) { fertig(false); return; }
  try {
    var t = idbRef.transaction("kv", "readwrite");
    t.objectStore("kv").put(json, "db");
    t.oncomplete = function () { fertig(true); };
    t.onerror = t.onabort = function () { fertig(false); };
  } catch (e) { fertig(false); }
}
function idbLesen(fertig) {
  if (!idbRef) { fertig(null); return; }
  try {
    var q = idbRef.transaction("kv", "readonly").objectStore("kv").get("db");
    q.onsuccess = function () { fertig(q.result || null); };
    q.onerror = function () { fertig(null); };
  } catch (e) { fertig(null); }
}

var sichernZaehler = 0;
sichern = function () {
  standZaehler++; db.rev = (db.rev || 0) + 1;
  var json = JSON.stringify(db), ok = true;
  try { localStorage.setItem(KEY, json); } catch (e) { ok = false; nurImSpeicher = true; }
  speicherZustand.ls = ok;
  if (ok && (++sichernZaehler % 25) === 0) { try { localStorage.setItem(KEY + ".b", json); } catch (e) {} }
  var warte = { ls: ok, idb: null, fertig: [] };
  idbSchreiben(json, function (g) {
    speicherZustand.idb = g; warte.idb = g;
    if (!ok && !g) speicherWarnung();
    warte.fertig.forEach(function (f) { f(); });
  });
  sichern.letzter = warte;
  return ok;
};
/* Antwort erst, wenn gespeichert ist (oder klar ist, dass es nicht geht). */
function sichernBestaetigt() {
  var ok = sichern(), w = sichern.letzter;
  return new Promise(function (resolve) {
    if (ok || !idbRef) { resolve(ok); return; }   /* der Browserspeicher hat bestätigt: gespeichert */
    if (w.idb !== null) { resolve(ok || w.idb); return; }
    var fertig = false, t = setTimeout(function () { if (!fertig) { fertig = true; resolve(ok); } }, 2000);
    w.fertig.push(function () { if (fertig) return; fertig = true; clearTimeout(t); resolve(ok || w.idb); });
  });
}

function v2Felder(d) {
  if (!d.schluessel) d.schluessel = zufallsText(20, "abcdefghijklmnopqrstuvwxyz0123456789");
  if (typeof d.cursor !== "number") d.cursor = 0;
  if (typeof d.kv !== "number") d.kv = 0;
  if (!d.einst) d.einst = { offlineLimit: OFFLINE_STANDARD, anschreiben: false, anschreibenGrenze: 5000 };
  if (!Array.isArray(d.abgelehnt)) d.abgelehnt = [];
  if (!Array.isArray(d.ops)) d.ops = [];
  if (!d.modus) d.modus = "auto";
  if (!d.erfahren) d.erfahren = {};
  if (!d.geraeteListe) d.geraeteListe = [];
  if (d.v2Start === undefined) {
    d.v2Start = Date.now();
    /* Bestehende Buchungen ohne Nummer der Ablage gelten als übernommen: sie dürfen nicht an
       der Guthabenprüfung scheitern (frühere Fassungen kannten das Anschreiben). */
    d.buchungen.forEach(function (b) { if (!b.s) b.mig = 1; });
    if (!d.migriert) d.deckel = d.deckel > 0 && d.buchungen.length ? d.deckel : 0;
  }
  if (MODUS === "verkauf") d.rolle = "ab";
  else d.rolle = "beide";
  return d;
}

laden = function () {
  var roh = null;
  try { roh = localStorage.getItem(KEY); } catch (e) { nurImSpeicher = true; }
  var von = "";
  var d = null;
  if (roh) {
    try { d = JSON.parse(roh); } catch (e) { d = null; }
    if (!d) {
      try { var b = localStorage.getItem(KEY + ".b"); if (b) { d = JSON.parse(b); v2Meldung = "Beschädigte Daten: die letzte Sicherungskopie im Gerät wurde geladen."; } } catch (e) {}
    }
  }
  db = d ? migriere(d) : leereDaten();
  if (d && d.v2Start === undefined && d.buchungen && d.buchungen.length) { db.migriert = true; v2Meldung = "Bestand aus der bisherigen Guthabenkasse übernommen: " + d.buchungen.length + " Buchungen, " + Object.keys(d.karten || {}).length + " Karten."; }
  v2Felder(db);
};
var v2Meldung = "";

/* ======================= Rechte dieses Geräts ======================= */
function darfAufbuchen() { return MODUS === "terminal"; }

/* Anschreiben ist standardmäßig aus; die Ablage schaltet es für alle ein. */
deckelCent = function () {
  if (MODUS === "verkauf") return 0;
  if (wolkeBereit()) return db.einst && db.einst.anschreiben ? Math.max(0, Number(db.einst.anschreibenGrenze) || 0) : 0;
  return Math.max(0, Number(db.deckel) || 0);
};

/* ======================= Verbindung und Abgleich ======================= */
var sync = { kette: Promise.resolve(), laeuft: false, letzter: 0, fehler: "", online: null, serverFehler: "" };

function ausstehende() { return db.buchungen.filter(function (b) { return !b.s; }); }
function geraetInfo() {
  return { id: db.geraet, schluessel: db.schluessel, name: db.geraetName || ("Gerät " + db.geraet), bediener: db.bediener || "",
           ausstehend: ausstehende().length, version: VERSION, fehler: (sync.fehler || sync.serverFehler || "").slice(0, 100), offline: sync.online === false };
}
function nachZeit(ms) {
  return new Promise(function (_, nein) { setTimeout(function () { nein(new Error("Zeitüberschreitung")); }, ms); });
}
wolkeBereit = function () { return !!(db.ablage && db.ablage.adresse && db.ablage.wort); };

function syncJetzt(ms) {
  sync.kette = sync.kette.then(function () { return syncSchleife(ms); }, function () { return syncSchleife(ms); });
  return sync.kette;
}
function syncSchleife(ms) {
  var runde = 0, letzte = null;
  function nochmal() {
    return syncEinmal(ms).then(function (a) {
      letzte = a; runde++;
      if (a && a.ok && runde < 10 && ausstehende().length && a.angenommen > 0) return nochmal();
      return letzte;
    });
  }
  return nochmal();
}
function syncEinmal(ms) {
  if (!wolkeBereit()) return Promise.resolve({ keine: true, ergebnisse: {} });
  var neu = ausstehende().slice(0, 150).map(function (b) { var c = {}; for (var k in b) c[k] = b[k]; return c; });
  var kz = (db.kette && db.kette[db.geraet]) || { n: 0, k: "" };
  var req = { aktion: "sync", wort: db.ablage.wort, geraet: geraetInfo(), neu: neu, cursor: db.cursor || 0, kv: db.kv || 0, meldung: { n: kz.n, k: kz.k } };
  sync.laeuft = true; zeichneStatus();
  return Promise.race([wolkeRufen(req), nachZeit(ms || 15000)]).then(function (a) {
    sync.laeuft = false; sync.online = true;
    if (a.fehler) {
      sync.serverFehler = a.fehler; zeichneStatus();
      return { fehler: a.fehler, server: true, ergebnisse: {} };
    }
    sync.serverFehler = ""; sync.fehler = "";
    sync.letzter = Date.now(); db.letzterAbgleich = sync.letzter;
    var n = verarbeiteSync(a, neu);
    a.angenommen = n; a.ok = true;
    return sichernBestaetigt().then(function () {
      zeichneAlles(); zeichneStatus(); opsSenden();
      /* Waren Buchungen dabei und ist nun nichts mehr offen, die Ablage das gleich wissen lassen */
      if (neu.length && !ausstehende().length) setTimeout(function () { syncJetzt(10000); }, 400);
      return a;
    });
  }).catch(function (f) {
    sync.laeuft = false; sync.online = false; sync.fehler = String(f && f.message || f);
    zeichneStatus();
    return { netz: true, fehler: sync.fehler, ergebnisse: {} };
  });
}

function verarbeiteSync(a, gesendet) {
  var angenommen = 0, idx = {};
  /* neues Fest von einem anderen Gerät */
  if ((a.epoche || 0) > (db.epoche || 0)) {
    var verloren = db.buchungen.filter(function (b) { return !b.s; });
    verloren.forEach(function (b) { db.abgelehnt.push({ id: b.id, karte: b.karte, cent: b.cent, art: b.art, zeit: b.zeit, grund: "aus einem früheren Fest", gesehen: false }); });
    db.buchungen = []; db.cursor = 0; db.kv = 0; db.epoche = a.epoche; db.karten = {}; db.geloescht = {};
    if (a.cursor && a.buchungen && a.buchungen.length === 0) db.cursor = 0;
    melden("Neues Fest übernommen");
  }
  db.buchungen.forEach(function (b) { idx[b.id] = b; });
  var res = a.ergebnisse || {};
  Object.keys(res).forEach(function (id) {
    var r = res[id], b = idx[id]; if (!b) return;
    if (r.st === "ok" || r.st === "doppelt") {
      b.s = r.s; if (r.ueber) b.ueber = true; delete b.kc; if (r.st === "ok") angenommen++;
    } else if (r.st === "abgelehnt") {
      db.abgelehnt.push({ id: b.id, karte: b.karte, cent: b.cent, art: b.art, zeit: b.zeit, grund: r.grund || "abgelehnt", code: r.code || "", gesehen: false });
      db.buchungen = db.buchungen.filter(function (x) { return x.id !== id && !(x.zu === id && !x.s); });
      delete idx[id];
    }
  });
  (a.buchungen || []).forEach(function (sb) {
    var l = idx[sb.id];
    if (l) { l.s = sb.s; if (sb.ueber) l.ueber = true; delete l.kc; }
    else if (!db.abgelehnt.some(function (x) { return x.id === sb.id; })) { db.buchungen.push(sb); idx[sb.id] = sb; }
  });
  if (a.zurueckgesetzt) {
    db.buchungen = db.buchungen.filter(function (b) { return !b.s || (a.buchungen || []).some(function (x) { return x.id === b.id; }); });
  }
  db.buchungen.sort(function (x, y) { return x.zeit - y.zeit; });
  db.cursor = a.cursor || db.cursor;
  if (a.karten) {
    var wartend = {};
    db.ops.forEach(function (o) { if (o.nr) wartend[o.nr] = 1; if (o.neu) wartend[o.neu] = 1; (o.karten || []).forEach(function (k) { wartend[k.nr] = 1; }); });
    Object.keys(a.karten).forEach(function (nr) { if (!wartend[nr]) db.karten[nr] = a.karten[nr]; else { var l = db.karten[nr] || {}; var s = a.karten[nr]; for (var f in s) if (f !== "name" && f !== "zusatz" && f !== "nts") l[f] = s[f]; db.karten[nr] = l; } });
    if (a.geloescht) Object.keys(a.geloescht).forEach(function (nr) { if (Math.abs(a.geloescht[nr]) > Math.abs(db.geloescht[nr] || 0)) db.geloescht[nr] = a.geloescht[nr]; });
    if (a.anlass && (a.anlass.ts || 0) >= ((db.anlass && db.anlass.ts) || 0) && (a.anlass.name || a.anlass.verein)) db.anlass = a.anlass;
  }
  db.kv = typeof a.kv === "number" ? a.kv : db.kv;
  if (a.einst) db.einst = a.einst;
  if (a.geraete) db.geraeteListe = a.geraete;
  if (a.nummernNeu !== undefined) db.nummernNeu = a.nummernNeu;
  return angenommen;
}

/* Hintergrund-Abgleich: nach Buchungen, alle 15 s, bei „wieder online“ */
wolkeAbgleichen = function () { return syncJetzt(15000); };
wolkeVormerken = function () {
  if (!wolkeBereit()) return;
  clearTimeout(wolkeMerker);
  wolkeMerker = setTimeout(function () { syncJetzt(15000); }, 800);
};
wolkeUhrStellen = function () {
  clearInterval(wolkeUhr); wolkeUhr = null;
  if (!wolkeBereit()) return;
  wolkeUhr = setInterval(function () { if (!document.hidden) syncJetzt(15000); }, 15000);
};
zeichneWolke = function () {
  var an = wolkeBereit();
  $("wolkeStand").textContent = an ? statusText() : "Keine Ablage eingetragen.";
  $("btnWolkeJetzt").disabled = !an || sync.laeuft;
};
wolkeSagen = function () { zeichneWolke(); };

function statusText() {
  var n = ausstehende().length;
  if (!wolkeBereit()) return "Keine Ablage eingetragen.";
  if (sync.serverFehler) return "Die Ablage lehnt ab: " + sync.serverFehler;
  var z = db.letzterAbgleich ? "Letzter Abgleich " + uhrzeit(db.letzterAbgleich) + " Uhr" : "Noch nicht abgeglichen";
  if (sync.online === false) return "Keine Verbindung · " + z + (n ? " · " + n + " Buchung(en) warten" : "");
  return z + (n ? " · " + n + " noch nicht übertragen" : " · alles übertragen");
}
function statusKlasse() {
  if (!wolkeBereit()) return "s-aus";
  if (sync.serverFehler) return "s-fehler";
  if (sync.online === false) return "s-offline";
  if (ausstehende().length || sync.laeuft) return "s-warte";
  if (db.abgelehnt.some(function (x) { return !x.gesehen; })) return "s-fehler";
  return "s-ok";
}
function zeichneStatus() {
  var n = ausstehende().length, k = statusKlasse(), t;
  if (k === "s-aus") t = _t("Keine Ablage");
  else if (k === "s-fehler") t = sync.serverFehler ? "!" : "! " + db.abgelehnt.filter(function (x) { return !x.gesehen; }).length;
  else if (k === "s-offline") t = _t("Offline") + (n ? " · " + n + " " + _t("offen") : "");
  else if (k === "s-warte") t = sync.laeuft ? _t("Gleicht ab …") : n + " " + _t("offen");
  else t = _t("Online");
  ["syncChip", "syncChip2"].forEach(function (id) {
    var e = document.getElementById(id); if (!e) return;
    e.className = "syncChip " + k; e.textContent = "● " + t; e.title = statusText();
  });
  var s = document.getElementById("statusZeile"); if (s) s.textContent = statusText();
}

/* ======================= Offene Aufträge (Karten anlegen, sperren, ersetzen) ======================= */
var opsLaeuft = false;
function opsSenden() {
  if (opsLaeuft || !wolkeBereit() || !db.ops.length) return Promise.resolve();
  opsLaeuft = true;
  function eins() {
    var o = db.ops[0];
    if (!o) { opsLaeuft = false; return Promise.resolve(); }
    var q = {}; for (var k in o) q[k] = o[k];
    q.aktion = "karten"; q.wort = (o.admin ? o.admin : db.ablage.wort); delete q.admin;
    q.geraet = { id: db.geraet };
    return Promise.race([wolkeRufen(q), nachZeit(12000)]).then(function (a) {
      if (a && (a.ok || a.schon)) { db.ops.shift(); sichern(); return eins(); }
      db.opsFehler = (a && a.fehler) || "abgelehnt";
      if (a && a.konflikte) db.opsFehler += " (" + a.konflikte.map(function (c) { return c.nr + ": " + c.grund; }).join(", ") + ")";
      if (a && a.verweigert) { opsLaeuft = false; return; }
      db.ops.shift(); sichern(); return eins();
    }).catch(function () { opsLaeuft = false; });
  }
  return eins().then(function () { opsLaeuft = false; zeichneAlles(); });
}
function opAnlegen(op) { db.ops.push(op); sichern(); return opsSenden(); }

function codeSichern(nr) {
  var k = db.karten[nr] || (db.karten[nr] = { nr: nr, ts: Date.now() });
  if (!k.code && MODUS === "terminal") {
    k.code = pruefCodeNeu(); k.status = "aktiv";
    var e = { nr: nr, code: k.code };
    if (k.name) { e.name = k.name; e.zusatz = k.zusatz || ""; }
    db.ops.push({ was: "anlegen", karten: [e] });
  }
}
var _kartenBlatt = kartenBlatt;
kartenBlatt = function (nrs) {
  nrs.forEach(codeSichern);
  sichern(); opsSenden();
  return _kartenBlatt(nrs);
};
var _namen = nameSetzen;
nameSetzen = function (nr, text) {
  _namen(nr, text);
  if (wolkeBereit()) opAnlegen({ was: "name", nr: nr, name: kartenName(nr), zusatz: kartenZusatz(nr) });
};
var _zusatz = zusatzSetzen;
zusatzSetzen = function (nr, text) {
  _zusatz(nr, text);
  if (wolkeBereit()) opAnlegen({ was: "name", nr: nr, name: kartenName(nr), zusatz: kartenZusatz(nr) });
};

/* ======================= Buchen ======================= */
var kcMerker = {};
buchen = function (nr, cent, art, ref, stapel, spaeter, festeId) {
  if (MODUS === "verkauf" && (art === "auf" || art === "auszahlung" || art === "korrektur"))
    throw new Error("Dieses Gerät darf nicht aufbuchen.");
  if (!db.karten[nr]) db.karten[nr] = { nr: nr, ts: Date.now() };
  var b = { id: festeId || neueId(), karte: nr, cent: cent, art: art, zeit: Date.now(), geraet: db.geraet || "?" };
  if (db.bediener) b.wer = db.bediener;
  if (ref) b.ref = ref;
  if (stapel) b.stapel = stapel;
  if (kcMerker[nr]) b.kc = kcMerker[nr];
  if (!db.kette) db.kette = {};
  var kz = db.kette[b.geraet] || (db.kette[b.geraet] = { n: 0, k: "" });
  kz.n++; b.n = kz.n; b.k = kettenHash(kettenText(b, kz.k)); kz.k = b.k;
  db.buchungen.push(b);
  if (!spaeter) sichern();
  return b;
};

function offlineSumme(nr) {
  var s = 0;
  db.buchungen.forEach(function (b) { if (!b.s && b.karte === nr && b.cent < 0 && b.off) s += -b.cent; });
  return s;
}
function offlineErlaubt(nr, cent) {
  var grenze = db.einst && typeof db.einst.offlineLimit === "number" ? db.einst.offlineLimit : OFFLINE_STANDARD;
  var schon = offlineSumme(nr);
  return cent + schon <= grenze && saldo(nr) >= cent;
}

var buchtGerade = false, letzteBuchung = { roh: "", zeit: 0, cent: 0, tab: "" }, wartendeBestaetigung = null;

function aktuellerModus() {
  if (db.modus === "schnell" || db.modus === "sicher") return db.modus;
  if (ohneAblage()) return "schnell";
  var n = db.erfahren[db.bediener || "-"] || 0;
  return n >= 10 ? "schnell" : "sicher";
}
function erfahrungZaehlen() { var w = db.bediener || "-"; db.erfahren[w] = (db.erfahren[w] || 0) + 1; }

function bestaetigReihe() {
  var r = document.getElementById("bestaetigReihe");
  if (r) return r;
  r = document.createElement("div"); r.id = "bestaetigReihe"; r.className = "trinkReihe hide";
  var ref = document.getElementById("trinkReihe"); ref.parentNode.insertBefore(r, ref);
  return r;
}
function bestaetigAus() { var r = bestaetigReihe(); r.classList.add("hide"); r.innerHTML = ""; wartendeBestaetigung = null; }

buche = function (tab, roh) {
  var nr = kartenNummer(roh);
  if (MODUS === "verkauf" && tab === "auf") return;
  if (!nr) {
    urteil(tab, "b-nein", _t("Keine Guthabenkarte"), _t("Gelesen: ") + String(roh || "").slice(0, 40) + (String(roh || "").length > 40 ? " …" : ""));
    klingen("nein"); return;
  }
  if (istGeloescht(nr)) {
    urteil(tab, "b-nein", _t("Karte gelöscht"), kartenCode(nr) + _t(" gilt nicht mehr. Eine neue Karte nehmen."));
    klingen("nein"); return;
  }
  var kartenInfo = db.karten[nr];
  if (kartenInfo && kartenInfo.status === "gesperrt") {
    urteil(tab, "b-nein", _t("Karte gesperrt"), kartenCode(nr) + (kartenInfo.ersetztDurch ? " · ersetzt durch " + kartenInfo.ersetztDurch : "") + " – bitte am Terminal klären.");
    klingen("nein"); return;
  }
  if (MODUS === "verkauf" && !wolkeBereit()) {
    urteil(tab, "b-nein", "Keine Ablage", "Dieses Gerät braucht die Verbindung zur Ablage. Einstellungen → Ablage.");
    klingen("nein"); return;
  }
  var feldId = tab === "ab" ? "abBetrag" : "aufBetrag";
  if (tab === "ab") trinkVerbergen(); else $("begleichReihe").classList.add("hide");
  bestaetigAus();
  var cent = centAus($(feldId).value);
  if (isNaN(cent) && String($(feldId).value || "").trim() === "") cent = 0;
  if (cent === 0) { bestandZeigen(tab, nr); return; }
  if (!(cent > 0)) {
    urteil(tab, "b-nein", _t("Erst den Betrag"), _t("Mit dem Ziffernblock eintippen, dann scannen."));
    klingen("nein"); return;
  }
  if (cent > 50000 && !confirm(euro(cent) + " " + (tab === "ab" ? _t("abbuchen") : _t("aufbuchen")) + _t(" — stimmt das?"))) {
    urteil(tab, "b-nein", _t("Nicht gebucht"), _t("Betrag nicht bestätigt.")); klingen("nein"); return;
  }
  if (buchtGerade) { melden(_t("Einen Moment, die letzte Buchung läuft noch.")); return; }
  /* Doppelbuchungsschutz: dieselbe Karte, derselbe Betrag, wenige Sekunden später */
  var norm = String(roh || "").trim().toUpperCase();
  if (letzteBuchung.roh === norm && letzteBuchung.tab === tab && letzteBuchung.cent === cent && Date.now() - letzteBuchung.zeit < 5000) {
    urteil(tab, "b-offen", _t("Gerade erst gebucht"), _t("Dieselbe Karte, derselbe Betrag – nicht noch einmal gebucht."));
    klingen("nein"); if (istHandy()) { setPhase(tab, "ergebnis"); kameraAus(); } return;
  }
  kcMerker[nr] = kartenPruef(roh) || (MODUS === "terminal" ? "" : "");
  if (!kcMerker[nr]) delete kcMerker[nr];

  /* Sicherheitsmodus: erst Guthaben zeigen, dann bestätigen */
  if (tab === "ab" && aktuellerModus() === "sicher") {
    wartendeBestaetigung = { tab: tab, nr: nr, cent: cent, roh: norm, kc: kcMerker[nr] || "" };
    urteil(tab, "b-bestand", _t("Guthaben ") + euro(saldo(nr)), _t("Karte ") + kartenLabel(nr) + " · " + euro(cent) + _t(" abbuchen?"));
    var r = bestaetigReihe();
    r.innerHTML = '<span class="trinkTitel">Abbuchen ' + esc(euro(cent)) + '?</span>' +
      '<button data-bestaetigen="1"><b>' + _t("Buchen") + '</b></button><button data-bestaetigen="0"><b>' + _t("Abbrechen") + '</b></button>';
    r.classList.remove("hide");
    if (istHandy()) { setPhase("ab", "ergebnis"); kameraAus(); }
    return;
  }
  ausfuehren(tab, nr, cent, norm, kcMerker[nr] || "");
};

function ausfuehren(tab, nr, cent, norm, kc) {
  buchtGerade = true;
  if (kc) kcMerker[nr] = kc; else delete kcMerker[nr];
  var fertig = function () { buchtGerade = false; };
  var weiter = tab === "ab" ? abbuchenAusfuehren : aufbuchenAusfuehren;
  weiter(nr, cent).then(function (ok) {
    if (ok) letzteBuchung = { roh: norm, zeit: Date.now(), cent: cent, tab: tab };
    fertig();
  }, function (f) {
    fertig(); console.error(f);
    urteil(tab, "b-nein", _t("Nicht gebucht"), "Fehler: " + (f && f.message || f)); klingen("nein");
  });
}

/* Läuft die Ablage nicht: Terminal arbeitet wie in 0.12 rein lokal. */
function ohneAblage() { return !wolkeBereit() && MODUS === "terminal"; }

function ergebnisAbschluss(tab) {
  if (istHandy()) kameraAus();
  zeichneAlles();
  if (navigator.vibrate) navigator.vibrate(60);
}

function abbuchenAusfuehren(nr, cent) {
  /* Ist das Guthaben hier zu knapp, zuerst nachsehen, ob die Ablage mehr weiß (z. B. gerade aufgebucht). */
  var vorbereitung = Promise.resolve();
  if (saldo(nr) < cent && wolkeBereit()) {
    urteil("ab", "b-offen", "Prüft …", "Aktueller Stand wird geholt");
    vorbereitung = syncJetzt(5000);
  }
  return vorbereitung.then(function () {
    var vorher = saldo(nr);
    var erlaubt = vorher < cent ? minusErlaubt(nr, vorher - cent) : { ok: true };
    if (vorher < cent && !erlaubt.ok && erlaubt.titel) { urteil("ab", "b-nein", erlaubt.titel, erlaubt.text); klingen("nein"); return false; }
    if (vorher < cent && !erlaubt.ok) {
      var offlineHinweis = sync.online === false ? " · Stand von " + (db.letzterAbgleich ? uhrzeit(db.letzterAbgleich) : "?") + " (offline)" : "";
      urteil("ab", "b-nein", _t("Zu wenig Guthaben"), _t("Es fehlen ") + euro(cent - vorher) + _t(" · Guthaben ") + euro(vorher) + _t(" · Karte ") + kartenLabel(nr) + offlineHinweis);
      klingen("nein"); return false;
    }
    var tip = aufrundenTrinkgeld(cent), nichtGereicht = false;
    if (tip > 0 && vorher < cent + tip && !minusErlaubt(nr, vorher - cent - tip).ok) { tip = 0; nichtGereicht = true; }
    var verkauf = buchen(nr, -cent, "ab", null, null, true), tb = null;
    if (anschreibenAn && vorher - cent < 0) verkauf.an = 1;
    if (tip > 0) { tb = buchen(nr, -tip, "trinkgeld", null, null, true); tb.zu = verkauf.id; if (verkauf.an) tb.an = 1; }
    return sichernBestaetigt().then(function (gespeichert) {
      if (!gespeichert) {
        db.buchungen = db.buchungen.filter(function (b) { return b !== verkauf && b !== tb; });
        urteil("ab", "b-nein", _t("Nicht gebucht"), "Das Gerät kann gerade nicht speichern."); klingen("nein"); return false;
      }
      var zeigen = function (notiz) {
        if (istHandy()) setPhase("ab", "ergebnis");
        trinkAnbieten(nr, verkauf.id, tip > 0, cent);
        if (saldo(nr) < 0) begleichAnbieten("ab", nr);
        ergebnisAb(nr, cent, tip, notiz || (nichtGereicht ? _t("zum Aufrunden reichte das Guthaben nicht") : ""));
        klingen("ab"); erfahrungZaehlen();
        $("abBetrag").value = ""; anschreibenAn = false; schreibHinweisZeigen(); rundeHinweisZeigen();
        ergebnisAbschluss("ab");
      };
      if (ohneAblage()) { zeigen(""); return true; }
      urteil("ab", "b-offen", _t("Bucht …"), euro(cent) + " · Karte " + kartenLabel(nr));
      if (istHandy()) setPhase("ab", "ergebnis");
      return bestaetigen(verkauf.id, 8000).then(function (st) {
        if (st.st === "ok" || st.st === "doppelt") { zeigen(st.ueber ? "Offline-Buchung überzieht die Karte" : ""); return true; }
        if (st.st === "abgelehnt") {
          var gr = st.code === "guthaben" ? "Zu wenig Guthaben" : st.grund;
          urteil("ab", "b-nein", st.code === "guthaben" ? _t("Zu wenig Guthaben") : "Nicht gebucht",
            (st.code === "guthaben" ? "Guthaben " + euro(st.saldo || 0) + " · " : "") + st.grund + " · Karte " + kartenLabel(nr));
          klingen("nein"); ergebnisAbschluss("ab");
          var a = db.abgelehnt[db.abgelehnt.length - 1]; if (a && a.id === verkauf.id) a.gesehen = true;
          zeichneStatus(); return false;
        }
        /* Ablage nicht erreichbar oder Antwort unklar */
        var summe = cent + tip;
        if (offlineErlaubt(nr, summe)) {
          verkauf.off = 1; if (tb) tb.off = 1; sichern();
          zeigen(_t("Offline gebucht – wird übertragen, sobald Verbindung da ist"));
          return true;
        }
        urteil("ab", "b-offen", _t("Unklar – nicht noch einmal buchen"),
          euro(cent) + " ist vorgemerkt, die Ablage antwortet nicht. Das Ergebnis wird geklärt, sobald die Verbindung wieder da ist. Karte " + kartenLabel(nr));
        klingen("nein"); ergebnisAbschluss("ab"); return false;
      });
    });
  });
}

/* Ergebnis genau dieser Buchung: erst abgleichen, bei Schweigen noch einmal (dieselbe ID, deshalb ungefährlich). */
function bestaetigen(id, ms) {
  function pruefe(a) {
    var r = a && a.ergebnisse && a.ergebnisse[id];
    if (r) return r;
    var b = db.buchungen.filter(function (x) { return x.id === id; })[0];
    if (b && b.s) return { st: "ok", s: b.s };
    var ab = db.abgelehnt.filter(function (x) { return x.id === id; })[0];
    if (ab) return { st: "abgelehnt", grund: ab.grund, code: ab.code, saldo: saldo(ab.karte) };
    return null;
  }
  return syncJetzt(ms).then(function (a) {
    var r = pruefe(a); if (r) return r;
    if (a && a.server) return { st: "unklar", grund: a.fehler };
    return syncJetzt(4000).then(function (a2) { return pruefe(a2) || { st: "unklar" }; });
  });
}

function aufbuchenAusfuehren(nr, cent) {
  var neu = !db.karten[nr];
  var b = buchen(nr, cent, "auf", null, null, true);
  return sichernBestaetigt().then(function (gespeichert) {
    if (!gespeichert) {
      db.buchungen = db.buchungen.filter(function (x) { return x !== b; });
      urteil("auf", "b-nein", "Nicht gebucht", "Das Gerät kann gerade nicht speichern."); klingen("nein"); return false;
    }
    var zeigen = function (notiz) {
      if (istHandy()) setPhase("auf", "ergebnis");
      urteil("auf", notiz ? "b-offen" : "b-auf", _t("Guthaben ") + euro(saldo(nr)),
        _t("Aufgebucht ") + euro(cent) + _t(" · Karte ") + kartenLabel(nr) + (neu ? _t(" · neu angelegt") : "") + (notiz ? " · " + notiz : ""));
      klingen("auf"); $("aufBetrag").value = ""; db.aufBetrag = ""; sichern(); ergebnisAbschluss("auf");
    };
    if (ohneAblage()) { zeigen(""); return true; }
    urteil("auf", "b-offen", _t("Bucht …"), euro(cent) + " · Karte " + kartenLabel(nr));
    if (istHandy()) setPhase("auf", "ergebnis");
    return bestaetigen(b.id, 8000).then(function (st) {
      if (st.st === "ok" || st.st === "doppelt") { zeigen(""); return true; }
      if (st.st === "abgelehnt") {
        urteil("auf", "b-nein", "Nicht gebucht", st.grund + " · Karte " + kartenLabel(nr)); klingen("nein");
        var a = db.abgelehnt[db.abgelehnt.length - 1]; if (a && a.id === b.id) a.gesehen = true;
        ergebnisAbschluss("auf"); return false;
      }
      zeigen("noch nicht in der Ablage – wird übertragen");
      return true;
    });
  });
}

/* Trinkgeld und Begleichen: lokal sofort gesichert, der Abgleich folgt */
var _trinkgeldBuchen = trinkgeldBuchen;
trinkgeldBuchen = function (cent) {
  var v = letzterVerkauf; if (!v || !(cent > 0)) return;
  if (saldo(v.nr) < cent) { melden(_t("Dafür reicht das Guthaben nicht")); return; }
  var t = buchen(v.nr, -cent, "trinkgeld", null, null, true); t.zu = v.id;
  sichernBestaetigt().then(function (ok) {
    if (!ok) { db.buchungen = db.buchungen.filter(function (x) { return x !== t; }); melden("Nicht gespeichert"); return; }
    trinkVerbergen(); ergebnisAb(v.nr, v.cent, cent, ""); klingen("ab"); zeichneAlles(); wolkeVormerken();
    if (navigator.vibrate) navigator.vibrate(40);
  });
};

/* Bestätigungsknöpfe des Sicherheitsmodus */
function v2Klick(e) {
  var t = e.target.closest ? e.target.closest("[data-bestaetigen]") : null;
  if (!t) return;
  var w = wartendeBestaetigung; if (!w) return;
  if (t.getAttribute("data-bestaetigen") === "1") {
    bestaetigAus(); klangWecken();
    ausfuehren(w.tab, w.nr, w.cent, w.roh, w.kc);
  } else {
    bestaetigAus(); urteilBereit(w.tab, "Abgebrochen – nichts gebucht."); setPhase(w.tab, "eingabe");
  }
}

/* ======================= Rücknahme (Storno) ======================= */
var stornoLaeuft = {};
nehmeZurueck = function (id) {
  var b = db.buchungen.filter(function (x) { return x.id === id; })[0];
  if (!b) return;
  if (b.art === "storno") { melden(_t("Eine Rücknahme lässt sich nicht zurücknehmen")); return; }
  if (db.buchungen.some(function (x) { return x.art === "storno" && x.ref === id; })) { melden(_t("Diese Buchung ist schon zurückgenommen")); return; }
  if (stornoLaeuft[id]) return;
  var wirkung = saldo(b.karte) - b.cent, erzwingen = false;
  if (wirkung < 0) {
    if (MODUS === "verkauf" || !confirm(_t("Das lässt die Karte mit ") + eur(wirkung) + _t(" € im Minus zurück. Trotzdem?"))) { melden("Das Guthaben reicht für die Rücknahme nicht"); return; }
    erzwingen = true;
  }
  stornoLaeuft[id] = 1;
  var s = buchen(b.karte, -b.cent, "storno", b.id, null, true, "st-" + b.id);
  if (erzwingen) s.erzwingen = true;
  sichernBestaetigt().then(function (ok) {
    if (!ok) { db.buchungen = db.buchungen.filter(function (x) { return x !== s; }); delete stornoLaeuft[id]; melden("Nicht gespeichert"); return; }
    zeichneAlles();
    if (ohneAblage()) { delete stornoLaeuft[id]; melden(_t("Zurückgenommen")); return; }
    bestaetigen(s.id, 8000).then(function (st) {
      delete stornoLaeuft[id];
      if (st.st === "ok" || st.st === "doppelt") melden(_t("Zurückgenommen"));
      else if (st.st === "abgelehnt") melden("Nicht zurückgenommen: " + st.grund);
      else melden("Rücknahme vorgemerkt – wird übertragen");
      zeichneAlles();
    });
  });
};

/* ======================= Rollen, Reiter, Sprache der Oberfläche ======================= */
var pinFrei = false;
function pinPruefen() {
  if (MODUS !== "terminal" || !db.pin || pinFrei) return true;
  var e = prompt("Verwaltung – PIN eingeben:");
  if (e === null) return false;
  if (kettenHash("pin|" + e) === db.pin) { pinFrei = true; setTimeout(function () { pinFrei = false; }, 600000); return true; }
  melden("PIN stimmt nicht"); return false;
}
var _reiterZeigen = reiterZeigen;
reiterZeigen = function (name) {
  if (MODUS === "terminal" && (name === "karten" || name === "verwaltung" || name === "einstellungen") && !pinPruefen()) return;
  _reiterZeigen(name);
  ["verwaltung", "meine"].forEach(function (r) {
    var e = document.getElementById("reiter-" + r); if (e) e.classList.toggle("hide", r !== name);
  });
  if (name === "verwaltung") zeichneVerwaltung();
  if (name === "meine") zeichneMeine();
};
rolleAnwenden = function () {
  var zeigen = MODUS === "verkauf" ? { ab: true, meine: true, einstellungen: true }
                                   : { auf: true, ab: true, karten: true, verwaltung: true, einstellungen: true };
  document.querySelectorAll("nav button").forEach(function (b) { b.classList.toggle("hide", !zeigen[b.getAttribute("data-reiter")]); });
  var jetzt = document.querySelector('nav button[aria-current="true"]');
  var name = jetzt && jetzt.getAttribute("data-reiter");
  if (!name || !zeigen[name]) reiterZeigen(MODUS === "verkauf" ? "ab" : "auf");
};
var _kompakt = kompaktAnwenden;
kompaktAnwenden = function () {
  var an = db.kompakt !== false && istHandy() && (aktiverReiter === "auf" || aktiverReiter === "ab");
  _kompakt();
  zeichneStatus();
};

/* Trinkgeld und Aufrunden in einer Einstellung */
function trinkModus() { return db.trink === false ? "aus" : (db.aufrunden ? "beides" : "tasten"); }
function trinkModusSetzen(m) {
  db.trink = m !== "aus"; db.aufrunden = m === "beides"; sichern(); zeichneEinstellungen(); rundeHinweisZeigen();
}
var _zeichneEinst = zeichneEinstellungen;
zeichneEinstellungen = function () {
  _zeichneEinst();
  document.querySelectorAll("#wahlTrinkModus button").forEach(function (b) {
    b.setAttribute("aria-pressed", b.getAttribute("data-tm") === trinkModus() ? "true" : "false");
  });
  document.querySelectorAll("#wahlModus button").forEach(function (b) {
    b.setAttribute("aria-pressed", b.getAttribute("data-modus") === (db.modus || "auto") ? "true" : "false");
  });
  var gn = document.getElementById("geraetName"); if (gn && document.activeElement !== gn) gn.value = db.geraetName || "";
  var mi = document.getElementById("modusInfo");
  if (mi) mi.textContent = "Jetzt gilt: " + (aktuellerModus() === "schnell" ? "Schnellmodus" : "Sicherheitsmodus") +
    ((db.modus || "auto") === "auto" ? " (Automatik: neue Bediener beginnen im Sicherheitsmodus, nach 10 Buchungen schnell)" : "");
};

/* ======================= Verkauf: eigene Abrechnung ======================= */
function eigeneZahlen() {
  var idx = {}, z = { anzahl: 0, abgebucht: 0, zurueck: 0, trinkgeld: 0, stornos: 0 };
  db.buchungen.forEach(function (b) { idx[b.id] = b; });
  db.buchungen.forEach(function (b) {
    if (b.geraet !== db.geraet) return;
    if (b.art === "ab") { z.anzahl++; z.abgebucht += -b.cent; }
    else if (b.art === "trinkgeld") z.trinkgeld += -b.cent;
    else if (b.art === "storno") { z.stornos++; var o = idx[b.ref]; if (o && o.art === "ab") z.zurueck += b.cent; else if (o && o.art === "trinkgeld") z.trinkgeld -= b.cent; }
  });
  z.netto = z.abgebucht - z.zurueck;
  return z;
}
function zeichneMeine() {
  var e = document.getElementById("meineInhalt"); if (!e) return;
  var z = eigeneZahlen(), zurueck = {};
  db.buchungen.forEach(function (b) { if (b.art === "storno") zurueck[b.ref] = true; });
  var eigene = db.buchungen.filter(function (b) { return b.geraet === db.geraet && b.art !== "storno"; }).sort(function (a, b) { return b.zeit - a.zeit; });
  var letzte = eigene[0];
  var zeilen = eigene.slice(0, 12).map(function (b) {
    var kann = letzte && b.id === letzte.id && !zurueck[b.id] && (b.art === "ab" || b.art === "trinkgeld") && Date.now() - b.zeit < 110000;
    return '<div class="zeile"><span class="zeit">' + uhrzeit(b.zeit) + '</span><span>' + esc(namenText(b.art)) + (zurueck[b.id] ? ' <span class="muted">(zurückgenommen)</span>' : '') +
      ' <span class="muted">· ' + esc(b.karte) + (b.s ? '' : ' · wartet') + '</span></span><span class="betrag">' + euro(b.cent) + '</span>' +
      (kann ? '<button class="knopf klein" data-zurueck="' + esc(b.id) + '">zurücknehmen</button>' : '') + '</div>';
  }).join("");
  var abgel = db.abgelehnt.filter(function (x) { return !x.gesehen; });
  e.innerHTML =
    '<div class="zahlen"><div><b>' + eur(z.netto) + '</b><span>abgebucht (netto)</span></div><div><b>' + z.anzahl + '</b><span>Buchungen</span></div><div><b>' + eur(z.trinkgeld) + '</b><span>Trinkgeld</span></div></div>' +
    '<p class="muted" style="margin:8px 0">' + esc(db.bediener ? db.bediener + " · " : "") + 'Gerät ' + esc(db.geraet) + ' · ' + z.stornos + ' zurückgenommen (' + eur(z.zurueck) + ' €) · ' + esc(statusText()) + '</p>' +
    (abgel.length ? '<div class="hinweis">' + abgel.length + ' Buchung(en) wurden von der Ablage abgelehnt:<br>' + abgel.map(function (x) { return esc(uhrzeit(x.zeit) + " " + x.karte + " " + euro(x.cent) + " – " + x.grund); }).join("<br>") + '<br><button class="knopf klein" data-gesehen="1">Gelesen</button></div>' : '') +
    '<div class="verlauf">' + (zeilen || '<p class="muted">Noch keine Buchungen.</p>') + '</div>' +
    '<div class="reihe umbruch" style="margin-top:12px"><button class="knopf" id="btnMeineDrucken">Abrechnung drucken</button><button class="knopf" id="btnMeineHolen">Von der Ablage prüfen</button></div>' +
    '<p class="muted" id="meineServer"></p>';
}
function meineDrucken() {
  var z = eigeneZahlen();
  $("bogen").className = "";
  $("bogen").innerHTML = '<div style="font-family:Georgia,serif;padding:20mm"><h1>Verkaufsabrechnung</h1><p>' + esc((db.anlass && db.anlass.name) || "") +
    '<br>Gerät ' + esc(db.geraet) + (db.bediener ? ' · ' + esc(db.bediener) : '') + '<br>' + esc(zeitpunkt(Date.now())) + '</p>' +
    '<table style="font-size:16px"><tr><td>Abbuchungen</td><td align=right>' + z.anzahl + '</td></tr><tr><td>Betrag</td><td align=right>' + euro(z.abgebucht) + '</td></tr>' +
    '<tr><td>zurückgenommen</td><td align=right>' + euro(z.zurueck) + '</td></tr><tr><td><b>Netto</b></td><td align=right><b>' + euro(z.netto) + '</b></td></tr>' +
    '<tr><td>Trinkgeld</td><td align=right>' + euro(z.trinkgeld) + '</td></tr></table><p>' + esc(statusText()) + '</p></div>';
  setTimeout(function () { window.print(); }, 80);
}
function meineHolen() {
  if (!wolkeBereit()) return;
  wolkeRufen({ aktion: "bericht", wort: db.ablage.wort, geraet: { id: db.geraet } }).then(function (a) {
    var e = document.getElementById("meineServer");
    if (!e) return;
    if (a.ok) e.textContent = "Ablage: " + a.anzahl + " Buchungen, netto " + euro(a.netto) + ", Trinkgeld " + euro(a.trinkgeld) + (a.ausstehend ? " · " + a.ausstehend + " warten noch" : "");
    else e.textContent = a.fehler || "keine Antwort";
  }).catch(function (f) { var e = document.getElementById("meineServer"); if (e) e.textContent = "Keine Verbindung"; });
}

/* ======================= Terminal: Verwaltung ======================= */
var verwaltungStand = { bericht: null, sicherungen: null, meldung: "" };
function adminWort(grund) {
  var w = prompt(grund + "\nAdministrator-Zugangswort:");
  return w || null;
}
function rufeAblage(q, wort) {
  q.wort = wort || db.ablage.wort; q.geraet = { id: db.geraet, schluessel: db.schluessel, name: db.geraetName || ("Gerät " + db.geraet), bediener: db.bediener || "" };
  return Promise.race([wolkeRufen(q), nachZeit(20000)]);
}
function vMeld(t) { verwaltungStand.meldung = t; var e = document.getElementById("vMeldung"); if (e) e.textContent = t; melden(t); }

function geraeteTabelle() {
  var liste = (db.geraeteListe || []).slice();
  var mich = liste.filter(function (g) { return g.id === db.geraet; })[0];
  if (!mich) liste.push({ id: db.geraet, name: db.geraetName || ("Gerät " + db.geraet), bediener: db.bediener, aufgabe: "Terminal", zuletzt: null, online: sync.online === true, ausstehend: ausstehende().length, fehler: "" });
  return '<div class="rolle"><table class="tab"><tr><th>Gerät</th><th>Bediener</th><th>Aufgabe</th><th>Zuletzt verbunden</th><th>Offen</th><th>Fehler</th></tr>' +
    liste.map(function (g) {
      var mir = g.id === db.geraet;
      var on = mir ? sync.online === true : g.online;
      return '<tr><td><b>' + esc(g.id) + '</b> ' + esc(g.name || "") + (mir ? ' (dieses)' : '') + '</td><td>' + esc(g.bediener || "–") + '</td><td>' + esc(g.aufgabe || "") + '</td><td>' +
        (g.zuletzt ? esc(zeitpunkt(Date.parse(g.zuletzt))) : "–") + ' <span class="' + (on ? "s-ok" : "s-offline") + '">' + (on ? "● online" : "○ zuletzt") + '</span></td><td>' + (mir ? ausstehende().length : g.ausstehend) +
        '</td><td>' + esc(mir ? (sync.fehler || sync.serverFehler || "") : g.fehler || "") + '</td></tr>';
    }).join("") + '</table></div>';
}

function zeichneVerwaltung() {
  var e = document.getElementById("verwaltungInhalt"); if (!e) return;
  var b = verwaltungStand.bericht;
  var geh = b ? berichtHtmlV2(b) : '<p class="muted">Noch nicht geladen. „Auswerten“ holt den Stand der Ablage.</p>';
  var abg = db.abgelehnt.filter(function (x) { return !x.gesehen; });
  e.innerHTML =
    '<div class="karte"><div class="titel"><h2>Abgleich und Geräte</h2></div><div class="inhalt">' +
      '<p id="statusZeile" class="muted" style="margin-top:0">' + esc(statusText()) + '</p>' + geraeteTabelle() +
      (abg.length ? '<div class="hinweis" style="margin-top:10px">Von der Ablage abgelehnt:<br>' + abg.map(function (x) { return esc(zeitpunkt(x.zeit) + " · " + x.karte + " · " + euro(x.cent) + " · " + x.grund); }).join("<br>") + '<br><button class="knopf klein" data-gesehen="1">Gelesen</button></div>' : '') +
      (db.ops.length ? '<p class="hinweis">' + db.ops.length + ' Kartenänderung(en) warten auf die Ablage' + (db.opsFehler ? ': ' + esc(db.opsFehler) : '') + '</p>' : '') +
      '<div class="reihe umbruch" style="margin-top:10px"><button class="knopf voll" id="vJetzt">Jetzt abgleichen</button><button class="knopf" id="vPruefen">Verbindung prüfen</button></div>' +
      '<div id="vMeldung" class="muted" style="margin-top:8px">' + esc(verwaltungStand.meldung) + '</div></div></div>' +

    '<div class="karte"><div class="titel"><h2>Abschluss und Kassensturz</h2></div><div class="inhalt">' +
      '<div class="reihe umbruch"><button class="knopf voll" id="vAuswerten">Auswerten</button><button class="knopf" id="vAbschlussFest">Abschluss festhalten</button><button class="knopf" id="vAbschlussDruck">Drucken</button><button class="knopf" id="vAbschlussMail">Per Mail senden</button></div>' +
      '<div id="vBericht" style="margin-top:12px">' + geh + '</div>' +
      '<div class="feldTitel" style="margin-top:16px">Kassensturz (Bargeld in der Kasse)</div>' +
      '<div class="reihe umbruch" style="align-items:flex-end">' +
        '<label class="feld" style="width:130px"><span>Anfangsbestand €</span><input id="kbAnfang" inputmode="decimal" class="mono"></label>' +
        '<button class="knopf" id="kbAnfangBtn">Eintragen</button>' +
        '<label class="feld" style="width:130px"><span>Einzahlung €</span><input id="kbEin" inputmode="decimal" class="mono"></label><button class="knopf" id="kbEinBtn">Eintragen</button>' +
        '<label class="feld" style="width:130px"><span>Auszahlung €</span><input id="kbAus" inputmode="decimal" class="mono"></label><button class="knopf" id="kbAusBtn">Eintragen</button>' +
        '<label class="feld" style="width:130px"><span>Gezählt €</span><input id="kbZaehl" inputmode="decimal" class="mono"></label><button class="knopf voll" id="kbZaehlBtn">Zählung eintragen</button>' +
      '</div><p class="muted">Das sind Geldbewegungen der Kasse. Korrekturen am Guthaben einer Karte stehen nicht hier, sondern in deren Verlauf.</p></div></div>' +

    '<div class="karte"><div class="titel"><h2>Sicherungen</h2></div><div class="inhalt">' +
      '<div class="reihe umbruch"><button class="knopf voll" id="sNeu">Sicherung der Ablage jetzt</button><button class="knopf" id="sListe">Liste laden</button><button class="knopf" id="sLokal">Datei auf dieses Gerät speichern</button></div>' +
      '<div id="sListeKasten" style="margin-top:10px">' + sicherungsListeHtml() + '</div>' +
      '<p class="muted">Die Ablage sichert sich selbst, alle 20 Minuten bei Änderungen (die letzten zwölf bleiben). Wiederherstellen braucht das Administrator-Wort; vorher wird der jetzige Stand gesichert.</p></div></div>' +

    '<div class="karte"><div class="titel"><h2>Erweitert</h2></div><div class="inhalt">' +
      '<div class="feldTitel">Buchungsablauf</div>' +
      '<div class="wahl" id="wahlModus"><button data-modus="auto">Automatisch</button><button data-modus="schnell">Schnell</button><button data-modus="sicher">Sicher</button></div>' +
      '<p class="muted" id="modusInfo" style="margin:6px 0 0"></p>' +
      '<p class="muted" style="margin:6px 0 12px">Schnell: Betrag, scannen, gebucht. Sicher: scannen, Guthaben ansehen, dann bestätigen.</p>' +
      '<div class="reihe umbruch" style="align-items:flex-end"><label class="feld" style="width:160px"><span>Gerätename</span><input id="geraetName" maxlength="20" placeholder="zum Beispiel Theke"></label>' +
        '<label class="feld" style="width:160px"><span>Verwaltungs-PIN</span><input id="pinNeu" inputmode="numeric" maxlength="8" placeholder="leer = keine"></label><button class="knopf" id="pinBtn">PIN setzen</button></div>' +
      '<div class="feldTitel" style="margin-top:14px">Für alle Geräte (Administrator-Wort)</div>' +
      '<label style="display:flex;gap:8px;align-items:center;margin:6px 0;font-size:14px"><input type="checkbox" id="eAnschreiben" style="width:auto;height:auto"' + (db.einst && db.einst.anschreiben ? ' checked' : '') + '> Anschreiben (negatives Guthaben) erlauben, bis ' + eur((db.einst && db.einst.anschreibenGrenze) || 5000) + ' €</label>' +
      '<div class="reihe umbruch" style="align-items:flex-end"><label class="feld" style="width:180px"><span>Offline-Limit je Karte und Gerät €</span><input id="eOffline" class="mono" inputmode="decimal" value="' + eur((db.einst && db.einst.offlineLimit) || 2000).replace(/\.(?=\d{3})/g, "") + '"></label><button class="knopf" id="eSpeichern">Speichern</button></div>' +
      '<div class="reihe umbruch" style="margin-top:10px"><button class="knopf" id="gEntfernen">Gerät aus der Liste entfernen</button></div>' +
    '</div></div>';
  zeichneEinstellungen();
}

function geldFeld(id) { var c = centAus(document.getElementById(id).value); return isNaN(c) ? null : c; }

function berichtHtmlV2(b) {
  var k = b.kasse || {};
  return '<div class="zahlen"><div><b>' + eur(b.umsatz.netto) + '</b><span>Umsatz (netto)</span></div><div><b>' + eur(b.trinkgeld) + '</b><span>Trinkgeld</span></div><div><b>' + eur(b.nochAufKarten) + '</b><span>noch auf Karten</span></div></div>' +
    '<p style="margin:10px 0" class="' + (b.endgueltig ? "s-ok" : "s-warte") + '"><b>' + (b.endgueltig ? "Endgültig möglich" : "Vorläufig") + '</b>' + (b.gruende.length ? ' – ' + esc(b.gruende.join("; ")) : '') + '</p>' +
    '<table class="tab"><tr><td>Aufgebucht</td><td class="n">' + eur(b.aufgebucht) + '</td></tr><tr><td>Abgebucht gesamt</td><td class="n">' + eur(b.umsatz.brutto) + '</td></tr><tr><td>Zurückgenommen (' + b.stornos.anzahl + ')</td><td class="n">' + eur(b.umsatz.zurueckgenommen) + '</td></tr>' +
    '<tr><td>Ausgezahlte Restbeträge</td><td class="n">' + eur(b.ausgezahlt) + '</td></tr><tr><td>Korrekturen am Guthaben</td><td class="n">' + eur(b.korrekturen) + '</td></tr><tr><td>Auf Karten im Minus</td><td class="n">' + eur(b.minus) + '</td></tr></table>' +
    '<div class="feldTitel" style="margin-top:10px">Je Gerät</div><table class="tab">' + b.proGeraet.map(function (g) { return '<tr><td>' + esc(g.geraet + " " + g.name) + '</td><td class="n">' + eur(g.abgebucht) + '</td><td class="n">TG ' + eur(g.trinkgeld) + '</td></tr>'; }).join("") + '</table>' +
    '<div class="feldTitel" style="margin-top:10px">Je Bediener</div><table class="tab">' + b.proBedienung.map(function (g) { return '<tr><td>' + esc(g.name) + '</td><td class="n">' + eur(g.abgebucht) + '</td><td class="n">TG ' + eur(g.trinkgeld) + '</td></tr>'; }).join("") + '</table>' +
    '<div class="feldTitel" style="margin-top:10px">Kassensturz</div><table class="tab"><tr><td>Anfangsbestand</td><td class="n">' + eur(k.anfang) + '</td></tr><tr><td>Aufladungen (bar)</td><td class="n">' + eur(k.aufladungen) + '</td></tr><tr><td>Rückzahlungen Restguthaben</td><td class="n">-' + eur(k.auszahlungenRest) + '</td></tr><tr><td>Einzahlungen / Auszahlungen</td><td class="n">' + eur(k.einzahlungen) + ' / -' + eur(k.auszahlungen) + '</td></tr><tr><td><b>Soll</b></td><td class="n"><b>' + eur(k.soll) + '</b></td></tr><tr><td>Gezählt</td><td class="n">' + (k.gezaehlt === null ? "–" : eur(k.gezaehlt)) + '</td></tr><tr><td><b>Differenz</b></td><td class="n"><b>' + (k.differenz === null ? "–" : eur(k.differenz)) + '</b></td></tr></table>' +
    (b.ueberziehungen.length ? '<div class="hinweis" style="margin-top:10px">Überziehungen durch Offline-Buchungen:<br>' + b.ueberziehungen.map(function (u) { return esc(u.karte + " " + euro(u.cent) + " · Gerät " + u.geraet + (u.quittiert ? " · quittiert" : " · OFFEN")); }).join("<br>") + (b.ueberziehungen.some(function (u) { return !u.quittiert; }) ? '<br><button class="knopf klein" id="vQuittieren">Alle quittieren</button>' : '') + '</div>' : '') +
    (b.verworfen && b.verworfen.length ? '<div class="hinweis" style="margin-top:10px">Von der Ablage abgelehnte Buchungen: ' + b.verworfen.length + '</div>' : '') +
    (b.pruefung && !b.pruefung.unveraendert ? '<div class="hinweis" style="margin-top:10px"><b>Prüfung:</b><br>' + b.pruefung.luecken.map(function (l) { return "Gerät " + esc(l.geraet) + ": Nummern " + l.von + "–" + l.bis + " fehlen"; }).join("<br>") + b.pruefung.kette.map(function (l) { return "Gerät " + esc(l.geraet) + ": Prüfsumme bei " + l.n + " passt nicht"; }).join("<br>") + (b.vermerke || []).slice(-5).map(function (v) { return "<br>" + esc(v.text); }).join("") + '</div>' : '') +
    '<p class="muted">Stand ' + esc(String(b.stand)) + ' · ' + esc(zeitpunkt(Date.parse(b.zeit))) + '</p>';
}
function sicherungsListeHtml() {
  var l = verwaltungStand.sicherungen;
  if (!l) return '<p class="muted">Noch nicht geladen.</p>';
  if (!l.length) return '<p class="muted">Keine Sicherungen vorhanden.</p>';
  return l.slice(0, 15).map(function (s) {
    return '<div class="zeile"><span class="grow">' + esc(s.name.replace("guthabenkasse-sicherung-", "")) + '</span><span class="muted">' + Math.round(s.groesse / 1024) + ' kB</span><button class="knopf klein" data-wiederher="' + esc(s.name) + '">Wiederherstellen</button></div>';
  }).join("");
}

function berichtDruckenV2(b) {
  var k = b.kasse || {};
  $("bogen").className = "";
  $("bogen").innerHTML = '<div style="font-family:Georgia,serif;padding:16mm;font-size:13px"><h1 style="margin:0">' + (b.endgueltig ? "Abschluss" : "VORLÄUFIGE Auswertung") + '</h1><p>' + esc(b.anlass || "") + ' · ' + esc(zeitpunkt(Date.parse(b.zeit))) + ' · Stand ' + b.stand + '</p>' +
    '<p><b>Umsatz ' + euro(b.umsatz.netto) + '</b> · Trinkgeld ' + euro(b.trinkgeld) + ' · noch auf Karten ' + euro(b.nochAufKarten) + '</p>' +
    '<p>' + (b.endgueltig ? "Alles übertragen, nichts offen." : "VORLÄUFIG: " + esc(b.gruende.join("; "))) + '</p>' + berichtHtmlV2(b).replace(/<button[^>]*>.*?<\/button>/g, "") + '</div>';
  setTimeout(function () { window.print(); }, 80);
}
function berichtHolen(mailen) {
  return rufeAblage({ aktion: "bericht", mailen: !!mailen, meldung: { geraet: db.geraet, n: (db.kette[db.geraet] || { n: 0 }).n, k: (db.kette[db.geraet] || { k: "" }).k } }).then(function (a) {
    if (a.ok) { verwaltungStand.bericht = a.bericht; zeichneVerwaltung(); if (mailen) vMeld(a.mail && a.mail.gesendet ? "Mail an " + a.mail.an + " gesendet" : "Mail nicht gesendet" + (a.mail && a.mail.fehler ? ": " + a.mail.fehler : "")); }
    else vMeld(a.fehler || "Keine Antwort");
    return a;
  });
}
abschlussStart = function () {
  if (!wolkeBereit()) { abschlussDrucken(); return; }
  syncJetzt(10000).then(function () { return berichtHolen(false); }).then(function (a) { if (a && a.ok) berichtDruckenV2(a.bericht); }).catch(function (f) { melden("Keine Verbindung: " + f.message); });
};

function v2Verwaltung(e) {
  var t = e.target; if (!t || !t.closest) return;
  var knopf = t.closest("button"); if (!knopf) return;
  var id = knopf.id;
  if (knopf.getAttribute("data-gesehen")) { db.abgelehnt.forEach(function (x) { x.gesehen = true; }); sichern(); zeichneVerwaltung(); zeichneMeine(); zeichneStatus(); return; }
  if (knopf.getAttribute("data-modus")) { db.modus = knopf.getAttribute("data-modus"); sichern(); zeichneEinstellungen(); return; }
  if (knopf.getAttribute("data-tm")) { trinkModusSetzen(knopf.getAttribute("data-tm")); return; }
  if (knopf.getAttribute("data-wiederher")) { wiederherstellen(knopf.getAttribute("data-wiederher")); return; }
  if (!id) return;
  var ab = function (p) { p.then(null, function (f) { vMeld("Keine Verbindung: " + (f && f.message || f)); }); };
  switch (id) {
    case "vJetzt": vMeld("Gleicht ab …"); ab(syncJetzt(15000).then(function (a) { vMeld(a && a.ok ? "Abgeglichen" : "Nicht abgeglichen: " + (a && a.fehler)); zeichneVerwaltung(); })); break;
    case "btnWolkeJetzt": ab(syncJetzt(15000).then(function () { zeichneWolke(); })); break;
    case "vPruefen": case "btnWolkePruefen": ab(rufeAblage({ aktion: "pruefen", ids: [] }).then(function (a) { vMeld(a.ok ? "Die Ablage antwortet richtig (Folgenummer " + a.seq + ")" : "Ablage: " + (a.fehler || "?")); })); break;
    case "vAuswerten": ab(berichtHolen(false)); break;
    case "vAbschlussMail": ab(berichtHolen(true)); break;
    case "vAbschlussDruck": if (verwaltungStand.bericht) berichtDruckenV2(verwaltungStand.bericht); else vMeld("Erst auswerten"); break;
    case "vAbschlussFest": ab(rufeAblage({ aktion: "abschluss" }).then(function (a) {
      if (a.ok) { verwaltungStand.bericht = a.bericht; vMeld("Abschluss " + a.nr + (a.endgueltig ? " endgültig festgehalten" : " vorläufig festgehalten")); zeichneVerwaltung(); }
      else { if (a.bericht) { verwaltungStand.bericht = a.bericht; zeichneVerwaltung(); } vMeld((a.fehler || "Nicht möglich") + (a.gruende ? " – " + a.gruende.join("; ") : "")); }
    })); break;
    case "vQuittieren": ab(rufeAblage({ aktion: "quittieren", was: "ueberziehung" }).then(function () { return berichtHolen(false); })); break;
    case "kbAnfangBtn": kassenEintrag("anfang", "kbAnfang"); break;
    case "kbEinBtn": kassenEintrag("einzahlung", "kbEin"); break;
    case "kbAusBtn": kassenEintrag("auszahlung", "kbAus"); break;
    case "kbZaehlBtn": kassenEintrag("zaehlung", "kbZaehl"); break;
    case "sNeu": ab(rufeAblage({ aktion: "sicherung", was: "erstellen" }).then(function (a) { vMeld(a.ok ? "Gesichert: " + a.name : (a.fehler || "?")); return sicherungenLaden(); })); break;
    case "sListe": ab(sicherungenLaden()); break;
    case "sLokal": sicherungSpeichern(); break;
    case "pinBtn": var p = document.getElementById("pinNeu").value.trim(); db.pin = p ? kettenHash("pin|" + p) : ""; sichern(); vMeld(p ? "PIN gesetzt" : "PIN entfernt"); break;
    case "eSpeichern": einstSpeichern(); break;
    case "gEntfernen": geraetEntfernen(); break;
  }
}
function kassenEintrag(art, feld) {
  var c = geldFeld(feld);
  if (c === null || c < 0) { vMeld("Betrag fehlt oder ist ungültig"); return; }
  var e = { id: "kb-" + neueId(), art: art, cent: c, wer: db.bediener || "" };
  rufeAblage({ aktion: "kassenbuch", eintrag: e }).then(function (a) { if (a.ok) { document.getElementById(feld).value = ""; vMeld("Eingetragen"); berichtHolen(false); } else vMeld(a.fehler || "?"); })
    .then(null, function (f) { vMeld("Keine Verbindung: " + f.message); });
}
function sicherungenLaden() {
  return rufeAblage({ aktion: "sicherung", was: "liste" }).then(function (a) { if (a.ok) { verwaltungStand.sicherungen = a.liste; var k = document.getElementById("sListeKasten"); if (k) k.innerHTML = sicherungsListeHtml(); } else vMeld(a.fehler || "?"); });
}
function wiederherstellen(name) {
  var w = adminWort("Stand der Ablage durch " + name + " ersetzen?"); if (!w) return;
  rufeAblage({ aktion: "sicherung", was: "wiederherstellen", name: name }, w).then(function (a) {
    if (a.neuer && confirm(a.fehler)) return rufeAblage({ aktion: "sicherung", was: "wiederherstellen", name: name, ueberschreiben: true }, w);
    return a;
  }).then(function (a) {
    if (a.ok) { db.cursor = 0; db.kv = 0; db.buchungen = db.buchungen.filter(function (b) { return !b.s; }); sichern(); vMeld("Wiederhergestellt (" + a.buchungen + " Buchungen); vorher gesichert als " + a.vorher); syncJetzt(15000).then(zeichneVerwaltung); }
    else if (!a.neuer) vMeld(a.fehler || "?");
  }).then(null, function (f) { vMeld("Keine Verbindung: " + f.message); });
}
function einstSpeichern() {
  var w = adminWort("Einstellungen für alle Geräte ändern"); if (!w) return;
  var c = geldFeld("eOffline");
  rufeAblage({ aktion: "einstellungen", einst: { anschreiben: document.getElementById("eAnschreiben").checked, offlineLimit: c === null ? 2000 : c } }, w).then(function (a) {
    if (a.ok) { db.einst = a.einst; sichern(); vMeld("Gespeichert"); zeichneEinstellungen(); } else vMeld(a.fehler || "?");
  }).then(null, function (f) { vMeld("Keine Verbindung: " + f.message); });
}
function geraetEntfernen() {
  var b = prompt("Welches Gerät aus der Liste entfernen? (Buchstabe)"); if (!b) return;
  var w = adminWort("Gerät " + b.toUpperCase() + " entfernen"); if (!w) return;
  rufeAblage({ aktion: "geraete", was: "entfernen", id: b.toUpperCase() }, w).then(function (a) { vMeld(a.ok ? "Entfernt" : (a.fehler || "?")); return syncJetzt(10000); }).then(zeichneVerwaltung).then(null, function () {});
}

/* ======================= Karte ersetzen und sperren ======================= */
var _detailHtml = detailHtml;
detailHtml = function (nr) {
  var h = _detailHtml(nr), k = db.karten[nr] || {}, status = k.status === "gesperrt" ? (k.ersetztDurch ? "Ersetzt durch " + k.ersetztDurch : "Gesperrt") : "";
  var zusatz = '<div class="reihe umbruch" style="margin:0 0 10px">' +
    (status ? '<span class="hinweis" style="margin:0">' + esc(status) + '</span>' : '') +
    (!k.ersetztDurch ? '<button class="knopf" data-tat="ersetzen">Karte ersetzen</button>' : '') +
    (k.status === "gesperrt" ? (k.ersetztDurch ? '' : '<button class="knopf" data-tat="freigeben">Freigeben</button>') : '<button class="knopf" data-tat="sperren">Sperren</button>') + '</div>';
  return h.replace('<div class="reihe umbruch">', zusatz + '<div class="reihe umbruch">');
};
function kartenAktion(was, nr) {
  if (!wolkeBereit()) { melden("Das geht nur mit Verbindung zur Ablage"); return; }
  if (was === "sperren") {
    var grund = prompt("Karte " + nr + " sperren – Grund (zum Beispiel „verloren“):"); if (grund === null) return;
    db.ops.push({ was: "sperren", nr: nr, grund: grund }); if (db.karten[nr]) db.karten[nr].status = "gesperrt";
    sichern(); opsSenden().then(function () { return syncJetzt(10000); }).then(function () { zeichneAlles(); melden("Karte gesperrt"); });
  } else if (was === "freigeben") {
    var w = adminWort("Karte " + nr + " wieder freigeben"); if (!w) return;
    rufeAblage({ aktion: "karten", was: "freigeben", nr: nr }, w).then(function (a) { melden(a.ok ? "Freigegeben" : (a.fehler || "?")); return syncJetzt(10000); }).then(function () { zeichneAlles(); });
  } else if (was === "ersetzen") {
    var neu = nummerSchreiben(naechsteKartenNummer()), g = saldo(nr);
    if (g < 0) { melden("Eine Karte im Minus wird nicht ersetzt – erst begleichen"); return; }
    if (!confirm("Karte " + nr + " durch die neue Karte " + neu + " ersetzen?\n\nDas Guthaben (" + euro(g) + ") wird auf die neue Karte übertragen, die alte Karte wird gesperrt. Die neue Karte wird danach gedruckt.")) return;
    var code = pruefCodeNeu(), idE = "ers-" + neueId();
    syncJetzt(10000).then(function () {
      return rufeAblage({ aktion: "karten", was: "ersetzen", alt: nr, neu: neu, code: code, id: idE, wer: db.bediener || "" });
    }).then(function (a) {
      if (!a.ok) { melden(a.fehler || "Nicht ersetzt"); return; }
      db.karten[neu] = { nr: neu, ts: Date.now(), code: code, status: "aktiv" };
      var altK = db.karten[nr]; if (altK && altK.name) { db.karten[neu].name = altK.name; db.karten[neu].zusatz = altK.zusatz || ""; }
      if (db.karten[nr]) { db.karten[nr].status = "gesperrt"; db.karten[nr].ersetztDurch = neu; }
      sichern();
      return syncJetzt(10000).then(function () {
        zeichneAlles(); melden("Ersetzt – Guthaben " + euro(a.uebertragen) + " übertragen");
        drucken(_kartenBlatt([neu]));
      });
    }).then(null, function (f) { melden("Keine Verbindung: " + f.message); });
  }
}
function v2Detail(e) {
  var t = e.target.closest ? e.target.closest("[data-tat]") : null;
  if (!t) return;
  var was = t.getAttribute("data-tat");
  if (was !== "ersetzen" && was !== "sperren" && was !== "freigeben") return;
  var nr = offeneKarte; if (!nr) return;
  e.stopPropagation(); kartenAktion(was, nr);
}

/* ======================= Neues Fest ======================= */
var _betriebAufNull = betriebAufNull;
betriebAufNull = function () {
  if (!wolkeBereit()) { _betriebAufNull(); return; }
  if (!confirm("Neues Fest beginnen? Alle Karten und Buchungen werden auf allen Geräten gelöscht. Die Ablage legt vorher ein Archiv an.")) return;
  var w = adminWort("Neues Fest beginnen"); if (!w) return;
  syncJetzt(15000).then(function () {
    return rufeAblage({ aktion: "neubeginn", nummernNeu: $("nummernNeu").checked }, w);
  }).then(function (a) {
    if (!a.ok) { melden(a.fehler || "Nicht möglich"); return; }
    db.buchungen = []; db.karten = {}; db.geloescht = {}; db.cursor = 0; db.kv = 0; db.epoche = a.epoche; db.abgelehnt = []; db.ops = [];
    db.nummernNeu = $("nummernNeu").checked; db.aufBetrag = ""; sichern(); zeichneAlles(); melden("Neues Fest begonnen");
    syncJetzt(10000);
  }).then(null, function (f) { melden("Keine Verbindung: " + f.message); });
};

/* ======================= Tabellenimport: nur die gebräuchlichen Formate ======================= */
var _gaesteLaden = gaesteLaden;
gaesteLaden = function (datei) {
  if (datei && /\.(xls|xml|html?|mht)$/i.test(datei.name || "")) {
    gaesteFehler("Dieses Format wird nicht mehr gelesen. Bitte als .xlsx, .ods oder .csv speichern.");
    return Promise.resolve();
  }
  return _gaesteLaden(datei);
};

/* ======================= Start ======================= */
function v2Start() {
  if (v2Meldung) setTimeout(function () { melden(v2Meldung); }, 800);
  document.addEventListener("click", v2Klick);
  document.addEventListener("click", v2Verwaltung);
  document.addEventListener("click", function (e) {
    var t = e.target.closest ? e.target.closest("button") : null;
    if (t && t.id === "btnMeineDrucken") meineDrucken();
    if (t && t.id === "btnMeineHolen") meineHolen();
    if (t && t.getAttribute("data-zurueck") && document.getElementById("meineInhalt") && document.getElementById("meineInhalt").contains(t)) { nehmeZurueck(t.getAttribute("data-zurueck")); setTimeout(zeichneMeine, 200); }
  });
  document.addEventListener("click", v2Detail, true);
  document.addEventListener("input", function (e) {
    if (e.target && e.target.id === "geraetName") { db.geraetName = e.target.value.slice(0, 20); sichern(); }
  });
  window.addEventListener("online", function () { sync.online = null; syncJetzt(15000); });
  window.addEventListener("offline", function () { sync.online = false; zeichneStatus(); });
  document.addEventListener("visibilitychange", function () { if (!document.hidden) syncJetzt(15000); });
  idbOeffnen(function () {
    idbLesen(function (j) {
      if (!j) { sichern(); return; }
      var d = null; try { d = JSON.parse(j); } catch (e) {}
      if (d && (d.rev || 0) > (db.rev || 0)) {
        db = v2Felder(migriere(d)); try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) {}
        standZaehler++; zeichneAlles(); zeichneEinstellungen(); melden("Bestand aus der zweiten Speicherung im Gerät wiederhergestellt");
      }
    });
  });
  if (wolkeBereit()) syncJetzt(15000).then(function () { opsSenden(); });
  zeichneStatus();
  try {
    if ("serviceWorker" in navigator && /^https?:$/.test(location.protocol)) navigator.serviceWorker.register("sw.js").then(null, function () {});
  } catch (e) {}
  if (navigator.storage && navigator.storage.persist) { try { navigator.storage.persist(); } catch (e) {} }
}

/* Fassung und Status in der Kopfzeile */
var _zeichneAlles = zeichneAlles;
zeichneAlles = function () { _zeichneAlles(); zeichneStatus(); if (MODUS === "verkauf" && aktiverReiter === "meine") zeichneMeine(); };
