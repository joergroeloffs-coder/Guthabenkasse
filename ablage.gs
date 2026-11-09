/* ===================== Guthabenkasse · Ablage (Version 2) =====================

   Diese Datei gehört nicht in die Guthabenkasse, sondern zu Google. Sie ist die
   zentrale Ablage und zugleich der Wächter über das Guthaben: Buchungen werden
   hier angenommen, geprüft und nummeriert. Die Geräte (Terminal, Verkaufsgeräte)
   arbeiten mit einer Kopie und gleichen sich mit dieser Ablage ab.

   Einrichten, einmalig:

     1. script.google.com öffnen, "Neues Projekt"
     2. Den vorhandenen Inhalt löschen und diese Datei hineinkopieren
     3. Unten drei verschiedene Zugangswörter eintragen (siehe unten)
     4. Speichern, dann "Bereitstellen" → "Neue Bereitstellung"
        Typ: Web-App · Ausführen als: Ich selbst · Zugriffsberechtigung: Jeder
     5. Google fragt nach der Erlaubnis (Drive, Mail). Beim Warnhinweis "Diese
        App ist nicht verifiziert" auf "Erweitert" und "Zu ... (unsicher)" —
        das bist du selbst, es ist dein eigenes Skript.
     6. Die angezeigte Web-App-Adresse kopieren und in jedem Gerät unter
        Einstellungen → Ablage eintragen, dazu das passende Zugangswort.

   Änderst du hier später etwas, muss über "Bereitstellen → Bereitstellungen
   verwalten → Neue Version" veröffentlicht werden — sonst läuft die alte weiter.

   DIE DREI ZUGANGSWÖRTER (die Rolle steht hier, nicht im Gerät)

     WORT_VERKAUF   für die Verkaufsgeräte. Darf: Guthaben abfragen, abbuchen,
                    die eigene letzte Abbuchung (2 Minuten) zurücknehmen, die
                    eigene Abrechnung ansehen. Der Server weist alles andere ab,
                    auch wenn jemand die App verändert.
     WORT_KASSE     für das Terminal (Kassenleitung). Darf zusätzlich aufbuchen,
                    Karten anlegen/sperren/ersetzen, zurücknehmen und korrigieren,
                    das Kassenbuch führen, Abschlüsse erstellen, sichern.
     WORT_ADMIN     Administrator. Darf zusätzlich Geräte, Einstellungen,
                    Wiederherstellung und ein neues Fest.

   Die alte Einstellung ZUGANGSWORT gilt weiter als Kassenwort, solange
   WORT_KASSE leer ist (so läuft die bisherige Guthabenkasse unverändert weiter).

   WAS DIE ABLAGE GARANTIERT
     - Jede Buchung hat eine eindeutige ID und wird nie zweimal wirksam.
     - Eine Abbuchung wird unter Sperre gegen das Guthaben geprüft; zwei
       gleichzeitige Abbuchungen können es nicht doppelt ausgeben.
     - Buchungen werden nur angehängt, nie geändert oder gelöscht. Fehler werden
       durch Gegenbuchungen korrigiert (Rücknahme: feste ID "st-<Buchung>", wirkt
       höchstens einmal).
     - Offline gemachte Abbuchungen werden angenommen und, falls das Guthaben
       nicht reichte, als ÜBERZIEHUNG gekennzeichnet (nicht stillschweigend
       verworfen). Ein Abschluss ist erst endgültig, wenn alle Geräte alles
       gemeldet haben und Überziehungen und Auffälligkeiten quittiert sind.
     - Höchstens drei Geräte; jedes hat einen Buchstaben und einen eigenen
       Schlüssel. Ein zweites Gerät mit demselben Buchstaben wird abgewiesen.
     - Eine Sicherungskopie im Drive entsteht automatisch (alle 20 Minuten bei
       Änderungen, die letzten 12 bleiben) und auf Wunsch.
======================================================================== */

var WORT_VERKAUF = "";
var WORT_KASSE   = "";
var WORT_ADMIN   = "";
var ZUGANGSWORT  = "hier-ein-eigenes-wort-eintragen";   /* alt: gilt als Kassenwort */
var DATEINAME    = "guthabenkasse-ablage.json";

var BERICHT_AN       = "";    /* Mailadressen, durch Komma getrennt */
var GEBUEHR_PROZENT  = 0;     /* Anteil am Umsatz, im Bericht, wenn > 0 */
var OFFLINE_LIMIT    = 2000;  /* Cent: so viel darf ein Gerät je Karte offline abbuchen */
var ANSCHREIBEN_STANDARD = false;
var ANSCHREIBEN_GRENZE   = 5000;
var MAX_GERAETE      = 3;
var STORNO_FENSTER   = 120000;     /* Verkauf: eigene letzte Abbuchung, 2 Minuten */
var SICHERUNG_ABSTAND = 20 * 60000;
var SICHERUNG_BEHALTEN = 12;
var ONLINE_FENSTER   = 75000;      /* "aktuell online": Kontakt in den letzten 75 s */


function doPost(e) {
  var antwort;
  try {
    antwort = verarbeiten(e);
  } catch (f) {
    antwort = { fehler: "Die Ablage hat sich verschluckt: " + f };
  }
  return ContentService
    .createTextOutput(JSON.stringify(antwort))
    .setMimeType(ContentService.MimeType.JSON);
}


/* ============================== Rollen ============================== */
function rolleVon(wort) {
  if (!wort) return "";
  if (WORT_ADMIN && wort === WORT_ADMIN) return "admin";
  if (WORT_KASSE ? wort === WORT_KASSE : wort === ZUGANGSWORT) return "kasse";
  if (WORT_VERKAUF && wort === WORT_VERKAUF) return "verkauf";
  return "";
}
function darf(rolle, was) {
  var stufe = { verkauf: 1, kasse: 2, admin: 3 }[rolle] || 0;
  var noetig = {
    lesen: 1, sync: 1, abbuchen: 1, abfragen: 1, meineAbrechnung: 1, pruefen: 1,
    aufbuchen: 2, karten: 2, rueckbuchen: 2, kassenbuch: 2, bericht: 2, sicherung: 2, quittieren: 2, abschluss: 2, legen: 2,
    geraete: 3, einstellungen: 3, neubeginn: 3, wiederherstellen: 3, freigeben: 3, befunde: 3
  }[was];
  return noetig !== undefined && stufe >= noetig;
}
var NEIN = function (was) { return { fehler: "Dafür fehlt die Berechtigung (" + was + ").", verweigert: true }; };


function verarbeiten(e) {
  var anfrage;
  try {
    anfrage = JSON.parse(e.postData.contents);
  } catch (f) {
    return { fehler: "Unlesbare Anfrage" };
  }

  var rolle = rolleVon(anfrage.wort);
  if (!rolle) return { fehler: "Das Zugangswort stimmt nicht." };

  /* Zwei Geräte können im selben Augenblick schreiben wollen. Ohne Sperre
     überholt das eine das andere mitten im Schreiben. */
  var sperre = LockService.getScriptLock();
  try {
    sperre.waitLock(20000);
  } catch (f) {
    return { fehler: "Die Ablage ist gerade belegt. Gleich noch einmal." };
  }

  try {
    var datei = dateiFinden();
    var inhalt = lesen(datei);
    var ctx = { rolle: rolle, jetzt: Date.now(), geaendert: false, anfrage: anfrage };
    var antwort = aktion(inhalt, ctx, anfrage);
    if (ctx.geaendert) {
      inhalt.stand = (inhalt.stand || 0) + 1;
      speichern(datei, inhalt);
      autoSicherung(inhalt, ctx);
    }
    if (antwort && typeof antwort === "object" && antwort.ok) antwort.rolle = rolle;
    return antwort;
  } finally {
    sperre.releaseLock();
  }
}


function aktion(inhalt, ctx, a) {
  var r = ctx.rolle;
  switch (a.aktion) {
    case "holen":
      return { ok: true, stand: inhalt.stand, daten: inhalt.daten, treuhand: true, v: 2 };
    case "legen":
      if (!darf(r, "legen")) return NEIN("legen");
      zusammenlegen(inhalt, ctx, a);
      return { ok: true, stand: inhalt.stand + 1, treuhand: true };
    case "sync":
      return sync(inhalt, ctx, a);
    case "pruefen":
      return statusVon(inhalt, a.ids);
    case "karten":
      if (!darf(r, "karten")) return NEIN("Karten");
      return kartenAktion(inhalt, ctx, a);
    case "kassenbuch":
      if (!darf(r, "kassenbuch")) return NEIN("Kassenbuch");
      return kassenbuch(inhalt, ctx, a);
    case "bericht":
      return bericht(inhalt, ctx, a);
    case "quittieren":
      if (!darf(r, "quittieren")) return NEIN("quittieren");
      return quittieren(inhalt, ctx, a);
    case "abschluss":
      if (!darf(r, "abschluss")) return NEIN("Abschluss");
      return abschlussSetzen(inhalt, ctx, a);
    case "einstellungen":
      if (!darf(r, "einstellungen")) return NEIN("Einstellungen");
      return einstellungenSetzen(inhalt, ctx, a);
    case "geraete":
      if (!darf(r, "geraete")) return NEIN("Geräte");
      return geraeteAktion(inhalt, ctx, a);
    case "sicherung":
      if (!darf(r, "sicherung")) return NEIN("Sicherung");
      return sicherungAktion(inhalt, ctx, a);
    case "neubeginn":
      if (!darf(r, "neubeginn")) {
        vermerk(inhalt, "admin", geraetVon(a), "Neues Fest ohne Berechtigung versucht"); ctx.geaendert = true;
        return NEIN("neues Fest");
      }
      return neubeginn(inhalt, ctx, a);
  }
  return { fehler: "Unbekannte Anweisung: " + a.aktion };
}


/* ============================== Inhalt ============================== */
function leerDaten() {
  return { karten: {}, buchungen: [], anlass: { name: "", verein: "", zusatz: "", ts: 0 },
           geloescht: {}, epoche: 0, nummernNeu: false };
}

function lesen(datei) {
  var inhalt;
  try {
    inhalt = JSON.parse(datei.getBlob().getDataAsString());
  } catch (f) {
    inhalt = { stand: 0, daten: null };
  }
  if (!inhalt || typeof inhalt !== "object") inhalt = { stand: 0, daten: null };
  inhalt.version = 2;
  inhalt.stand = inhalt.stand || 0;
  inhalt.daten = inhalt.daten || leerDaten();
  inhalt.geraete = inhalt.geraete || {};
  inhalt.basis = inhalt.basis || {};
  inhalt.basisK = inhalt.basisK || {};
  inhalt.meldungen = inhalt.meldungen || {};
  inhalt.vermerke = inhalt.vermerke || [];
  inhalt.berichte = inhalt.berichte || [];
  inhalt.chronik = inhalt.chronik || [];
  inhalt.kassenbuch = inhalt.kassenbuch || [];
  inhalt.quittiert = inhalt.quittiert || { ueber: {}, befund: 0 };
  inhalt.verworfen = inhalt.verworfen || {};
  inhalt.einst = inhalt.einst || {};
  if (inhalt.einst.anschreiben === undefined) inhalt.einst.anschreiben = !!ANSCHREIBEN_STANDARD;
  if (inhalt.einst.anschreibenGrenze === undefined) inhalt.einst.anschreibenGrenze = ANSCHREIBEN_GRENZE;
  if (inhalt.einst.offlineLimit === undefined) inhalt.einst.offlineLimit = OFFLINE_LIMIT;
  inhalt.kv = inhalt.kv || 1;
  /* Übernahme aus Version 1: Buchungen ohne laufende Nummer bekommen eine, in der
     Reihenfolge ihrer Zeit. Das ändert keine Buchung, es ordnet sie nur ein. */
  var B = inhalt.daten.buchungen;
  var maxS = inhalt.seq || 0, ohne = [];
  for (var i = 0; i < B.length; i++) { if (typeof B[i].s === "number") { if (B[i].s > maxS) maxS = B[i].s; } else ohne.push(B[i]); }
  if (ohne.length) {
    ohne.sort(function (x, y) { return x.zeit - y.zeit; });
    ohne.forEach(function (b) { b.s = ++maxS; });
    inhalt.migriert = true;
  }
  inhalt.seq = maxS;
  return inhalt;
}

function speichern(datei, inhalt) { datei.setContent(JSON.stringify(inhalt)); }
function geraetVon(a) { return String((a.geraet && (a.geraet.id || a.geraet)) || "?").slice(0, 1); }

function vermerk(inhalt, art, geraet, text, extra) {
  var l = inhalt.vermerke[inhalt.vermerke.length - 1];
  if (l && l.art === art && l.text === text && Date.now() - Date.parse(l.zeit) < 600000) return;   /* dasselbe nicht im Minutentakt */
  var v = { zeit: new Date().toISOString(), art: art, geraet: geraet, text: text };
  if (extra) for (var k in extra) v[k] = extra[k];
  inhalt.vermerke.push(v);
  if (inhalt.vermerke.length > 500) inhalt.vermerke.shift();
}

function indexAus(liste) {
  var idx = {};
  for (var i = 0; i < liste.length; i++) idx[liste[i].id] = liste[i];
  return idx;
}

function salden(inhalt) {
  var s = {}, B = inhalt.daten.buchungen;
  for (var i = 0; i < B.length; i++) s[B[i].karte] = (s[B[i].karte] || 0) + B[i].cent;
  return s;
}


/* Fingerabdruck der Buchungen (dieselbe Rechnung macht die Guthabenkasse) */
function kettenHash(s) {
  var h1 = 0xdeadbeef, h2 = 0x41c6ce57, ch;
  for (var i = 0; i < s.length; i++) {
    ch = s.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
}
function kettenText(b, vor) {
  return [b.id, b.karte, b.cent, b.art, b.zeit, b.geraet, b.wer || "", b.ref || "", b.stapel || "", b.n, vor].join("|");
}

var ARTEN = { auf: 1, ab: 1, storno: 1, auszahlung: 1, korrektur: 1, trinkgeld: 1, ersatz: 1 };
var NUR_KASSE = { auf: 1, auszahlung: 1, korrektur: 1, ersatz: 1 };

function buchungFehler(x) {
  if (!x || typeof x !== "object") return "keine Buchung";
  if (typeof x.id !== "string" || !x.id || x.id.length > 80) return "ohne Kennung";
  if (typeof x.karte !== "string" || !x.karte) return "ohne Karte";
  if (typeof x.cent !== "number" || x.cent !== Math.round(x.cent) || !isFinite(x.cent)) return "ungültiger Betrag";
  if (!ARTEN[x.art]) return "unbekannte Art";
  if (typeof x.zeit !== "number") return "ohne Zeit";
  if (typeof x.geraet !== "string" || x.geraet.length !== 1) return "ohne Gerät";
  if (x.art === "ab" || x.art === "trinkgeld" || x.art === "auszahlung") { if (x.cent >= 0) return "Abbuchung muss negativ sein"; }
  if (x.art === "auf") { if (x.cent <= 0) return "Aufbuchung muss positiv sein"; }
  return "";
}

function gleicheBuchung(a, b) {
  var f = ["id", "karte", "cent", "art", "zeit", "geraet", "wer", "ref", "stapel", "n", "k"];
  for (var i = 0; i < f.length; i++) {
    if ((a[f[i]] === undefined ? "" : a[f[i]]) !== (b[f[i]] === undefined ? "" : b[f[i]])) return false;
  }
  return true;
}


/* ============================== Geräte ============================== */
function geraetPruefen(inhalt, ctx, g) {
  if (!g || typeof g !== "object" || !/^[A-Z]$/.test(String(g.id || "")) || !g.schluessel) {
    return { fehler: "Das Gerät hat keine gültige Kennung." };
  }
  var reg = inhalt.geraete[g.id];
  if (reg && reg.schluessel && reg.schluessel !== g.schluessel) {
    vermerk(inhalt, "geraet", g.id, "Zweites Gerät mit dem Buchstaben " + g.id + " abgewiesen"); ctx.geaendert = true;
    return { fehler: "Der Gerätebuchstabe " + g.id + " ist schon an ein anderes Gerät vergeben.", geraetKonflikt: true };
  }
  if (!reg) {
    if (Object.keys(inhalt.geraete).length >= MAX_GERAETE) {
      return { fehler: "Mehr als " + MAX_GERAETE + " Geräte sind nicht vorgesehen. Ein Administrator kann ein Gerät entfernen.", geraeteLimit: true };
    }
    reg = inhalt.geraete[g.id] = { schluessel: g.schluessel, erstmals: new Date().toISOString() };
  }
  var vorher = JSON.stringify([reg.name, reg.bediener, reg.aufgabe, reg.rolle, reg.ausstehend, reg.version, reg.fehler, reg.offline]);
  reg.name = String(g.name || reg.name || ("Gerät " + g.id)).slice(0, 30);
  reg.bediener = String(g.bediener || "").slice(0, 30);
  reg.aufgabe = ctx.rolle === "verkauf" ? "Verkauf" : "Terminal";
  reg.rolle = ctx.rolle;
  reg.ausstehend = Number(g.ausstehend) || 0;
  reg.version = String(g.version || "").slice(0, 12);
  reg.fehler = String(g.fehler || "").slice(0, 120);
  reg.offline = !!g.offline;
  var nachher = JSON.stringify([reg.name, reg.bediener, reg.aufgabe, reg.rolle, reg.ausstehend, reg.version, reg.fehler, reg.offline]);
  /* Das Lebenszeichen steht im Zwischenspeicher; die Datei wird nur beschrieben, wenn sich etwas
     ändert oder der letzte Eintrag älter als fünf Minuten ist. So belastet das Abfragen im
     Sekundentakt Drive nicht. */
  herzschlag(g.id, ctx.jetzt);
  if (vorher !== nachher || !reg.zuletztMs || ctx.jetzt - reg.zuletztMs > 300000) {
    reg.zuletzt = new Date(ctx.jetzt).toISOString(); reg.zuletztMs = ctx.jetzt;
    ctx.geaendert = true;
  }
  return null;
}

function herzschlag(id, ms) {
  try { CacheService.getScriptCache().put("hb-" + id, String(ms), 21600); } catch (e) {}
}
function herzschlagLesen(id) {
  try { return Number(CacheService.getScriptCache().get("hb-" + id)) || 0; } catch (e) { return 0; }
}


/* ============================== Abgleich ============================== */
/* Ein Aufruf bringt die neuen Buchungen eines Geräts und holt, was seit der
   letzten bekannten Nummer dazukam. Jede Buchung wird für sich angenommen oder
   abgelehnt; die Antwort sagt je Buchung, was daraus wurde. */
function sync(inhalt, ctx, a) {
  var gf = geraetPruefen(inhalt, ctx, a.geraet);
  if (gf) return gf;
  var g = a.geraet.id, ergebnisse = {};
  if (a.meldung && typeof a.meldung === "object") {
    var alt = inhalt.meldungen[g], mn = Number(a.meldung.n) || 0, mk = String(a.meldung.k || "");
    if (!alt || alt.n !== mn || alt.k !== mk) { inhalt.meldungen[g] = { n: mn, k: mk, zeit: new Date(ctx.jetzt).toISOString() }; ctx.geaendert = true; }
  }
  var neu = Array.isArray(a.neu) ? a.neu : [];
  neu.sort(function (x, y) { return (x.n || 0) - (y.n || 0) || (x.zeit || 0) - (y.zeit || 0); });
  for (var i = 0; i < neu.length; i++) {
    var res = buchungAnnehmen(inhalt, ctx, neu[i], g);
    ergebnisse[neu[i] && neu[i].id] = res;
    if (res.st === "ok") ctx.geaendert = true;
    if (res.st === "abgelehnt" && neu[i] && typeof neu[i].n === "number" && typeof neu[i].k === "string") {
      /* die Nummer und Prüfsumme bleiben in der Kette, die Buchung selbst nicht */
      inhalt.verworfen[g + ":" + neu[i].n] = { k: neu[i].k, grund: res.grund, id: neu[i].id, cent: neu[i].cent, karte: neu[i].karte, zeit: neu[i].zeit };
      ctx.geaendert = true;
    }
  }
  var cursor = Number(a.cursor) || 0;
  var antwort = {
    ok: true, seq: inhalt.seq, cursor: inhalt.seq, ergebnisse: ergebnisse,
    buchungen: inhalt.daten.buchungen.filter(function (b) { return b.s > cursor; }),
    kv: inhalt.kv, serverZeit: ctx.jetzt, epoche: inhalt.daten.epoche,
    einst: { offlineLimit: inhalt.einst.offlineLimit, anschreiben: inhalt.einst.anschreiben, anschreibenGrenze: inhalt.einst.anschreibenGrenze },
    v: 2
  };
  if (cursor > inhalt.seq) { antwort.zurueckgesetzt = true; antwort.buchungen = inhalt.daten.buchungen; }
  if (Number(a.kv) !== inhalt.kv || antwort.zurueckgesetzt) {
    antwort.karten = kartenFuer(inhalt, ctx.rolle); antwort.geloescht = inhalt.daten.geloescht; antwort.anlass = inhalt.daten.anlass;
  }
  if (a.zustand) { antwort.salden = null; }
  if (ctx.rolle !== "verkauf") antwort.geraete = geraeteListe(inhalt, ctx);
  antwort.nummernNeu = inhalt.daten.nummernNeu;
  return antwort;
}

function kartenFuer(inhalt, rolle) {
  if (rolle !== "verkauf") return inhalt.daten.karten;
  var aus = {};
  Object.keys(inhalt.daten.karten).forEach(function (nr) {
    var k = Object.assign({}, inhalt.daten.karten[nr]); delete k.code; k.hatCode = !!inhalt.daten.karten[nr].code; aus[nr] = k;
  });
  return aus;
}

function statusVon(inhalt, ids) {
  var idx = indexAus(inhalt.daten.buchungen), aus = {};
  (Array.isArray(ids) ? ids : []).slice(0, 200).forEach(function (id) {
    var b = idx[id]; aus[id] = b ? { st: "ok", s: b.s, ueber: !!b.ueber } : { st: "unbekannt" };
  });
  return { ok: true, status: aus, seq: inhalt.seq };
}

function stornoVon(inhalt) {
  var m = {};
  inhalt.daten.buchungen.forEach(function (b) { if (b.art === "storno" && b.ref) m[b.ref] = b; });
  return m;
}

function buchungAnnehmen(inhalt, ctx, x, geraetId) {
  var d = inhalt.daten, idx = indexAus(d.buchungen);
  var f = buchungFehler(x);
  if (f) { vermerk(inhalt, "ungueltig", geraetId, "Buchung abgewiesen: " + f); return { st: "abgelehnt", grund: f, code: "ungueltig" }; }
  if (x.geraet !== geraetId) { vermerk(inhalt, "fremd", geraetId, "Buchung für ein anderes Gerät abgewiesen"); return { st: "abgelehnt", grund: "Buchung gehört zu einem anderen Gerät", code: "fremd" }; }

  /* dieselbe ID noch einmal: nie ein zweites Mal wirksam */
  var da = idx[x.id];
  if (da) {
    if (!gleicheBuchung(da, x)) {
      vermerk(inhalt, "veraendert", x.geraet, "Buchung " + x.id + " ist verändert worden – das Original bleibt");
      return { st: "abgelehnt", grund: "Diese Kennung gehört schon zu einer anderen Buchung", code: "kennung" };
    }
    return { st: "doppelt", s: da.s, ueber: !!da.ueber, saldo: salden(inhalt)[da.karte] || 0 };
  }

  /* Berechtigung je Art */
  var r = ctx.rolle;
  if (NUR_KASSE[x.art] && !darf(r, "aufbuchen")) {
    vermerk(inhalt, "recht", geraetId, "Unberechtigte " + x.art + "-Buchung (" + r + ") abgewiesen");
    return { st: "abgelehnt", grund: "Keine Berechtigung für diese Buchungsart", code: "recht" };
  }
  var karte = d.karten[x.karte];

  if (x.art === "storno") return stornoAnnehmen(inhalt, ctx, x, idx, geraetId);

  if (x.art === "korrektur" || x.art === "ersatz") {
    if (x.art === "ersatz") return { st: "abgelehnt", grund: "Ersatzbuchungen entstehen nur über „Karte ersetzen“", code: "recht" };
    return annehmen(inhalt, ctx, x, null);
  }

  /* Karte prüfen */
  if (!karte) {
    if (x.art === "auf") {
      karte = d.karten[x.karte] = { nr: x.karte, ts: ctx.jetzt, alt: true };
      inhalt.kv++;
    } else {
      return { st: "abgelehnt", grund: "Karte unbekannt", code: "unbekannt" };
    }
  }
  if (karte.status === "gesperrt") {
    vermerk(inhalt, "gesperrt", geraetId, "Gesperrte Karte " + x.karte + " benutzt");
    return { st: "abgelehnt", grund: "Karte gesperrt" + (karte.ersetztDurch ? " (ersetzt durch " + karte.ersetztDurch + ")" : ""), code: "gesperrt" };
  }
  if ((d.geloescht[x.karte] || 0) > 0) return { st: "abgelehnt", grund: "Karte gelöscht", code: "geloescht" };
  if (karte.code && x.kc !== karte.code && !(r !== "verkauf" && x.kc === undefined)) {
    return { st: "abgelehnt", grund: (x.kc === undefined ? "Prüfnummer fehlt – die Karte ganz scannen" : "Prüfnummer der Karte stimmt nicht"), code: "pruefnummer" };
  }

  /* Guthaben */
  var saldo = salden(inhalt)[x.karte] || 0, nach = saldo + x.cent;
  var ueber = false;
  if (nach < 0) {
    if (x.an) {
      if (!darf(r, "aufbuchen") || !inhalt.einst.anschreiben) return { st: "abgelehnt", grund: "Anschreiben ist nicht eingeschaltet", code: "anschreiben", saldo: saldo };
      if (!karte.name) return { st: "abgelehnt", grund: "Anschreiben nur mit Namen auf der Karte", code: "name", saldo: saldo };
      if (nach < -inhalt.einst.anschreibenGrenze) return { st: "abgelehnt", grund: "Über der Grenze für das Anschreiben", code: "grenze", saldo: saldo };
    } else if (x.off || (x.mig && darf(r, "aufbuchen"))) {
      ueber = true;                       /* offline gebucht: angenommen, aber gekennzeichnet */
    } else {
      return { st: "abgelehnt", grund: "Zu wenig Guthaben", code: "guthaben", saldo: saldo, fehlt: -nach };
    }
  }
  return annehmen(inhalt, ctx, x, ueber ? { ueber: true } : null);
}

function annehmen(inhalt, ctx, x, extra) {
  var b = {};
  var felder = ["id", "karte", "cent", "art", "zeit", "geraet", "wer", "ref", "stapel", "zu", "n", "k", "off", "an", "mig"];
  felder.forEach(function (f) { if (x[f] !== undefined) b[f] = x[f]; });
  if (extra) for (var k in extra) b[k] = extra[k];
  b.s = ++inhalt.seq;
  b.sz = ctx.jetzt;
  inhalt.daten.buchungen.push(b);
  if (b.ueber) vermerk(inhalt, "ueberziehung", b.geraet, "Offline gebuchte Abbuchung überzieht die Karte " + b.karte, { id: b.id });
  return { st: "ok", s: b.s, ueber: !!b.ueber, saldo: salden(inhalt)[b.karte] || 0 };
}

function stornoAnnehmen(inhalt, ctx, x, idx, geraetId) {
  var ziel = idx[x.ref];
  if (!ziel) return { st: "abgelehnt", grund: "Die zurückzunehmende Buchung ist unbekannt", code: "unbekannt" };
  if (ziel.art === "storno") return { st: "abgelehnt", grund: "Eine Rücknahme lässt sich nicht zurücknehmen", code: "storno" };
  var vorhanden = stornoVon(inhalt)[ziel.id];
  if (vorhanden) return { st: "doppelt", s: vorhanden.s, grund: "Diese Buchung ist schon zurückgenommen", saldo: salden(inhalt)[ziel.karte] || 0 };
  if (ctx.rolle === "verkauf") {
    if (ziel.geraet !== geraetId) return { st: "abgelehnt", grund: "Nur eigene Buchungen", code: "recht" };
    if (ziel.art !== "ab" && ziel.art !== "trinkgeld") return { st: "abgelehnt", grund: "Nur Abbuchungen", code: "recht" };
    if (ctx.jetzt - ziel.zeit > STORNO_FENSTER) return { st: "abgelehnt", grund: "Zu spät: nur die letzten zwei Minuten", code: "zeit" };
    var B = inhalt.daten.buchungen;
    for (var i = B.length - 1; i >= 0; i--) {
      if (B[i].geraet === geraetId && B[i].s > ziel.s && B[i].art !== "storno") return { st: "abgelehnt", grund: "Nur der letzte eigene Vorgang", code: "letzter" };
    }
  } else {
    if (!darf(ctx.rolle, "rueckbuchen")) return { st: "abgelehnt", grund: "Keine Berechtigung", code: "recht" };
  }
  var gegen = Object.assign({}, x, { karte: ziel.karte, cent: -ziel.cent, ref: ziel.id, art: "storno" });
  /* Rücknahme einer Aufbuchung darf die Karte nicht ins Minus bringen — außer ausdrücklich bestätigt */
  var saldo = salden(inhalt)[ziel.karte] || 0;
  var extra = null;
  if (saldo + gegen.cent < 0) {
    if (!(x.erzwingen && darf(ctx.rolle, "rueckbuchen"))) return { st: "abgelehnt", grund: "Das Guthaben reicht für die Rücknahme nicht", code: "guthaben", saldo: saldo };
    extra = { ueber: true };
  }
  return annehmen(inhalt, ctx, gegen, extra);
}


/* v1: Merge für die bisherige Guthabenkasse (nur Kasse/Admin) */
function zusammenlegen(inhalt, ctx, a) {
  var p = a.daten, g0 = geraetVon(a);
  if (!p || typeof p !== "object" || !Array.isArray(p.buchungen) || !p.karten || typeof p.karten !== "object") {
    vermerk(inhalt, "unlesbar", g0, "Unlesbarer Stand von einem Gerät abgewiesen"); ctx.geaendert = true; return;
  }
  var d = inhalt.daten, ep = Number(p.epoche) || 0, dep = Number(d.epoche) || 0, idx = indexAus(d.buchungen);
  inhalt.geraete[g0] = Object.assign({}, inhalt.geraete[g0], { zuletzt: new Date(ctx.jetzt).toISOString(), zuletztMs: ctx.jetzt, aufgabe: "Terminal (alt)", rolle: ctx.rolle });
  ctx.geaendert = true;
  if (ep < dep) {
    var verworfen = 0;
    p.buchungen.forEach(function (x) { if (x && x.id && !idx[x.id]) verworfen++; });
    if (verworfen) vermerk(inhalt, "altesFest", g0, verworfen + " Buchung(en) aus einem früheren Fest nicht übernommen");
    return;
  }
  if (ep > dep) vermerk(inhalt, "neubeginn", g0, "Gerät hat auf eigene Faust von vorn begonnen (Zeit " + ep + "); der Neubeginn gilt nicht, seine Buchungen werden übernommen");
  p.buchungen.forEach(function (x) {
    var f = buchungFehler(x);
    if (f) { vermerk(inhalt, "ungueltig", g0, "Buchung abgewiesen: " + f); return; }
    var alt = idx[x.id];
    if (alt) { if (!gleicheBuchung(alt, x)) vermerk(inhalt, "veraendert", x.geraet, "Buchung " + x.id + " ist verändert worden – das Original bleibt"); return; }
    var b = Object.assign({}, x); delete b.kc; b.s = ++inhalt.seq; b.sz = ctx.jetzt;
    d.buchungen.push(b); idx[b.id] = b;
  });
  var changed = false;
  for (var nr in p.karten) {
    if (!Object.prototype.hasOwnProperty.call(p.karten, nr)) continue;
    var fremd = p.karten[nr];
    if (!fremd || typeof fremd !== "object") continue;
    if (!d.karten[nr]) { d.karten[nr] = fremd; changed = true; }
    else if ((fremd.nts || 0) > (d.karten[nr].nts || 0)) { d.karten[nr].name = fremd.name || ""; d.karten[nr].zusatz = fremd.zusatz || ""; d.karten[nr].nts = fremd.nts; changed = true; }
  }
  var v = (p.geloescht && typeof p.geloescht === "object") ? p.geloescht : {};
  for (var gn in v) {
    if (!Object.prototype.hasOwnProperty.call(v, gn)) continue;
    var alt2 = d.geloescht[gn] || 0, neu2 = Number(v[gn]) || 0;
    if (Math.abs(neu2) > Math.abs(alt2)) { d.geloescht[gn] = neu2; changed = true; }
  }
  if (p.anlass && typeof p.anlass === "object" && (p.anlass.ts || 0) > ((d.anlass && d.anlass.ts) || 0)) { d.anlass = p.anlass; changed = true; }
  if (changed) inhalt.kv++;
  d.buchungen.sort(function (a, b) { return a.zeit - b.zeit; });
}


/* ============================== Karten ============================== */
function kartenAktion(inhalt, ctx, a) {
  var d = inhalt.daten, was = a.was, jetzt = ctx.jetzt;
  if (was === "anlegen") {
    var liste = Array.isArray(a.karten) ? a.karten : [], neu = 0, konflikte = [];
    liste.forEach(function (k) {
      if (!k || !/^[A-Z]\d{4,6}$/.test(String(k.nr || "")) || !/^[A-Z0-9]{4}$/.test(String(k.code || ""))) { konflikte.push({ nr: k && k.nr, grund: "ungültig" }); return; }
      var da = d.karten[k.nr];
      if (da) { if (da.code === k.code) return; konflikte.push({ nr: k.nr, grund: "Nummer schon vergeben" }); return; }
      d.karten[k.nr] = { nr: k.nr, ts: jetzt, code: k.code, status: "aktiv" };
      if (k.name) { d.karten[k.nr].name = String(k.name).slice(0, 40); d.karten[k.nr].zusatz = String(k.zusatz || "").slice(0, 60); d.karten[k.nr].nts = jetzt; }
      neu++;
    });
    if (neu) { inhalt.kv++; ctx.geaendert = true; }
    return konflikte.length ? { fehler: "Nicht alle Karten konnten angelegt werden.", konflikte: konflikte, neu: neu } : { ok: true, neu: neu, kv: inhalt.kv };
  }
  var k = d.karten[a.nr];
  if (was === "name") {
    if (!k) return { fehler: "Karte unbekannt" };
    k.name = String(a.name || "").slice(0, 40); k.zusatz = String(a.zusatz || "").slice(0, 60); k.nts = jetzt;
    inhalt.kv++; ctx.geaendert = true; return { ok: true, kv: inhalt.kv };
  }
  if (was === "sperren") {
    if (!k) return { fehler: "Karte unbekannt" };
    if (k.status === "gesperrt") return { ok: true, schon: true, kv: inhalt.kv };
    k.status = "gesperrt"; k.sperrZeit = jetzt; k.sperrVon = geraetVon(a); k.sperrGrund = String(a.grund || "").slice(0, 80);
    vermerk(inhalt, "sperre", geraetVon(a), "Karte " + a.nr + " gesperrt" + (k.sperrGrund ? ": " + k.sperrGrund : ""));
    inhalt.kv++; ctx.geaendert = true; return { ok: true, kv: inhalt.kv };
  }
  if (was === "freigeben") {
    if (!darf(ctx.rolle, "freigeben")) return NEIN("Karte freigeben");
    if (!k) return { fehler: "Karte unbekannt" };
    if (k.ersetztDurch) return { fehler: "Eine ersetzte Karte bleibt gesperrt." };
    k.status = "aktiv"; delete k.sperrZeit; delete k.sperrGrund;
    vermerk(inhalt, "sperre", geraetVon(a), "Karte " + a.nr + " wieder freigegeben");
    inhalt.kv++; ctx.geaendert = true; return { ok: true, kv: inhalt.kv };
  }
  if (was === "loeschen") {
    var gesamt = 0, fehl = [], gel = 0;
    (Array.isArray(a.nrs) ? a.nrs : [a.nr]).forEach(function (nr) {
      if (!d.karten[nr]) return;
      if ((salden(inhalt)[nr] || 0) !== 0) { fehl.push(nr); return; }
      d.geloescht[nr] = jetzt; gel++;
    });
    if (gel) { inhalt.kv++; ctx.geaendert = true; }
    return fehl.length ? { fehler: "Karten mit Guthaben werden nicht gelöscht.", nicht: fehl, geloescht: gel } : { ok: true, geloescht: gel, kv: inhalt.kv };
  }
  if (was === "ersetzen") {
    var idRef = String(a.id || "");
    if (!idRef || idRef.length > 60) return { fehler: "Ersatz ohne Kennung" };
    var alt = d.karten[a.alt];
    if (!alt) return { fehler: "Alte Karte unbekannt" };
    if (alt.ersetztDurch) {
      if (alt.ersetztDurch === a.neu && alt.ersatzId === idRef) return { ok: true, schon: true, kv: inhalt.kv };
      return { fehler: "Diese Karte ist schon ersetzt." };
    }
    if (!a.neu || !/^[A-Z]\d{4,6}$/.test(a.neu) || a.neu === a.alt) return { fehler: "Neue Karte ungültig" };
    var neuK = d.karten[a.neu];
    if (neuK) {
      var hatBuchungen = d.buchungen.some(function (b) { return b.karte === a.neu; });
      if (neuK.status === "gesperrt" || hatBuchungen || (d.geloescht[a.neu] || 0) > 0) return { fehler: "Die neue Karte ist schon in Gebrauch." };
    } else {
      if (!/^[A-Z0-9]{4}$/.test(String(a.code || ""))) return { fehler: "Neue Karte braucht eine Prüfnummer." };
      neuK = d.karten[a.neu] = { nr: a.neu, ts: jetzt, code: a.code, status: "aktiv" };
    }
    var saldo = salden(inhalt)[a.alt] || 0;
    if (saldo < 0) return { fehler: "Eine Karte im Minus wird nicht ersetzt." };
    alt.status = "gesperrt"; alt.sperrZeit = jetzt; alt.sperrVon = geraetVon(a); alt.sperrGrund = "ersetzt"; alt.ersetztDurch = a.neu; alt.ersatzId = idRef;
    neuK.ersetztAlt = a.alt;
    if (alt.name && !neuK.name) { neuK.name = alt.name; neuK.zusatz = alt.zusatz || ""; neuK.nts = jetzt; }
    if (saldo > 0) {
      var wer = String(a.wer || "").slice(0, 30), basis = { zeit: jetzt, geraet: geraetVon(a), art: "ersatz", ref: idRef };
      if (wer) basis.wer = wer;
      annehmen(inhalt, ctx, Object.assign({}, basis, { id: idRef + "-a", karte: a.alt, cent: -saldo }), null);
      annehmen(inhalt, ctx, Object.assign({}, basis, { id: idRef + "-b", karte: a.neu, cent: saldo }), null);
    }
    vermerk(inhalt, "ersatz", geraetVon(a), "Karte " + a.alt + " ersetzt durch " + a.neu + " (" + saldo + " Cent übertragen)");
    inhalt.kv++; ctx.geaendert = true;
    return { ok: true, uebertragen: saldo, kv: inhalt.kv, seq: inhalt.seq };
  }
  return { fehler: "Unbekannte Kartenaktion" };
}


/* ============================ Kassenbuch ============================ */
/* Echte Geldbewegungen in der Kasse — getrennt von Guthabenkorrekturen. */
function kassenbuch(inhalt, ctx, a) {
  var e = a.eintrag;
  if (!e || typeof e !== "object" || typeof e.id !== "string" || !e.id) return { fehler: "Eintrag ohne Kennung" };
  if (["anfang", "einzahlung", "auszahlung", "zaehlung"].indexOf(e.art) < 0) return { fehler: "Unbekannte Art" };
  if (typeof e.cent !== "number" || e.cent !== Math.round(e.cent) || e.cent < 0) return { fehler: "Ungültiger Betrag" };
  var da = inhalt.kassenbuch.filter(function (x) { return x.id === e.id; })[0];
  if (da) return { ok: true, schon: true };
  inhalt.kassenbuch.push({ id: e.id, art: e.art, cent: e.cent, zeit: ctx.jetzt, geraet: geraetVon(a), wer: String(e.wer || "").slice(0, 30), text: String(e.text || "").slice(0, 80) });
  ctx.geaendert = true;
  return { ok: true };
}

function kassenRechnung(inhalt) {
  var k = { anfang: 0, aufladungen: 0, auszahlungenRest: 0, einzahlungen: 0, auszahlungen: 0, gezaehlt: null, zaehlZeit: null };
  inhalt.kassenbuch.forEach(function (e) {
    if (e.art === "anfang") k.anfang += e.cent;
    else if (e.art === "einzahlung") k.einzahlungen += e.cent;
    else if (e.art === "auszahlung") k.auszahlungen += e.cent;
    else if (e.art === "zaehlung") { if (k.zaehlZeit === null || e.zeit >= k.zaehlZeit) { k.gezaehlt = e.cent; k.zaehlZeit = e.zeit; } }
  });
  var idx = indexAus(inhalt.daten.buchungen);
  inhalt.daten.buchungen.forEach(function (b) {
    if (b.art === "auf") k.aufladungen += b.cent;                /* Guthaben gegen Bargeld */
    else if (b.art === "auszahlung") k.auszahlungenRest += -b.cent;   /* Restguthaben bar zurück */
    else if (b.art === "storno") {
      var o = idx[b.ref];
      if (o && o.art === "auf") k.aufladungen += b.cent;          /* b.cent ist negativ */
      else if (o && o.art === "auszahlung") k.auszahlungenRest -= b.cent;
    }
  });
  k.soll = k.anfang + k.aufladungen - k.auszahlungenRest + k.einzahlungen - k.auszahlungen;
  k.differenz = k.gezaehlt === null ? null : k.gezaehlt - k.soll;
  return k;
}


/* ============================== Geräteliste ============================== */
function geraeteListe(inhalt, ctx) {
  var jetzt = ctx.jetzt, aus = [];
  Object.keys(inhalt.geraete).sort().forEach(function (id) {
    var g = inhalt.geraete[id];
    var hb = herzschlagLesen(id); if (hb > (g.zuletztMs || 0)) { g = Object.assign({}, g, { zuletztMs: hb, zuletzt: new Date(hb).toISOString() }); }
    aus.push({ id: id, name: g.name || ("Gerät " + id), bediener: g.bediener || "", aufgabe: g.aufgabe || "", rolle: g.rolle || "",
               zuletzt: g.zuletzt || null, online: !!(g.zuletztMs && jetzt - g.zuletztMs < ONLINE_FENSTER) && !g.offline,
               ausstehend: g.ausstehend || 0, fehler: g.fehler || "", version: g.version || "", offline: !!g.offline });
  });
  return aus;
}

function geraeteAktion(inhalt, ctx, a) {
  if (a.was === "entfernen") {
    if (!inhalt.geraete[a.id]) return { fehler: "Gerät unbekannt" };
    delete inhalt.geraete[a.id]; ctx.geaendert = true;
    vermerk(inhalt, "geraet", geraetVon(a), "Gerät " + a.id + " aus der Liste entfernt");
    return { ok: true };
  }
  if (a.was === "umbenennen") {
    var g = inhalt.geraete[a.id]; if (!g) return { fehler: "Gerät unbekannt" };
    g.name = String(a.name || "").slice(0, 30); ctx.geaendert = true; return { ok: true };
  }
  return { ok: true, geraete: geraeteListe(inhalt, ctx) };
}

function einstellungenSetzen(inhalt, ctx, a) {
  var e = a.einst || {};
  if (e.anschreiben !== undefined) inhalt.einst.anschreiben = !!e.anschreiben;
  if (typeof e.anschreibenGrenze === "number" && e.anschreibenGrenze >= 0 && e.anschreibenGrenze <= 100000) inhalt.einst.anschreibenGrenze = Math.round(e.anschreibenGrenze);
  if (typeof e.offlineLimit === "number" && e.offlineLimit >= 0 && e.offlineLimit <= 100000) inhalt.einst.offlineLimit = Math.round(e.offlineLimit);
  ctx.geaendert = true;
  vermerk(inhalt, "einstellung", geraetVon(a), "Einstellungen geändert");
  return { ok: true, einst: inhalt.einst };
}


/* ============================== Sicherung ============================== */
function sicherungsDateien() {
  var liste = [], it = DriveApp.searchFiles("title contains 'guthabenkasse-sicherung-' and trashed = false");
  while (it.hasNext()) { var f = it.next(); liste.push(f); }
  liste.sort(function (x, y) { return y.getName() < x.getName() ? -1 : 1; });
  return liste;
}
function sicherungMachen(inhalt, art) {
  var name = "guthabenkasse-sicherung-" + new Date().toISOString().replace(/[:.]/g, "-") + "-" + art + ".json";
  DriveApp.createFile(name, JSON.stringify(inhalt), MimeType.PLAIN_TEXT);
  return name;
}
function autoSicherung(inhalt, ctx) {
  if (ctx.jetzt - (inhalt.letzteSicherung || 0) < SICHERUNG_ABSTAND) return;
  if (!inhalt.daten.buchungen.length) return;
  try {
    inhalt.letzteSicherung = ctx.jetzt;
    sicherungMachen(inhalt, "auto");
    var alle = sicherungsDateien().filter(function (f) { return /-auto\.json$/.test(f.getName()); });
    alle.slice(SICHERUNG_BEHALTEN).forEach(function (f) { f.setTrashed(true); });
    /* letzteSicherung steht jetzt im Speicher; beim nächsten Schreiben wird es mitgespeichert */
  } catch (f) { /* eine fehlgeschlagene Sicherung darf keine Buchung verhindern */ }
}
function sicherungAktion(inhalt, ctx, a) {
  if (a.was === "erstellen") {
    var name = sicherungMachen(inhalt, "hand");
    return { ok: true, name: name, buchungen: inhalt.daten.buchungen.length, stand: inhalt.stand };
  }
  if (a.was === "liste") {
    return { ok: true, liste: sicherungsDateien().slice(0, 40).map(function (f) { return { name: f.getName(), groesse: f.getSize(), zeit: f.getDateCreated().toISOString() }; }) };
  }
  if (a.was === "holen") {
    var f = sicherungsDateien().filter(function (x) { return x.getName() === a.name; })[0];
    if (!f) return { fehler: "Sicherung nicht gefunden" };
    return { ok: true, name: f.getName(), inhalt: f.getBlob().getDataAsString() };
  }
  if (a.was === "wiederherstellen") {
    if (!darf(ctx.rolle, "wiederherstellen")) return NEIN("Wiederherstellen");
    var quelle;
    if (a.inhalt) { try { quelle = typeof a.inhalt === "string" ? JSON.parse(a.inhalt) : a.inhalt; } catch (f2) { return { fehler: "Sicherung beschädigt" }; } }
    else {
      var ff = sicherungsDateien().filter(function (x) { return x.getName() === a.name; })[0];
      if (!ff) return { fehler: "Sicherung nicht gefunden" };
      try { quelle = JSON.parse(ff.getBlob().getDataAsString()); } catch (f3) { return { fehler: "Sicherung beschädigt" }; }
    }
    if (!quelle || !quelle.daten || !Array.isArray(quelle.daten.buchungen) || typeof quelle.daten.karten !== "object") return { fehler: "Das ist keine Sicherung der Guthabenkasse." };
    var jetzigeAnzahl = inhalt.daten.buchungen.length, neueAnzahl = quelle.daten.buchungen.length;
    var neuerAlsSicherung = (inhalt.seq || 0) > (quelle.seq || 0) || jetzigeAnzahl > neueAnzahl;
    if (neuerAlsSicherung && !a.ueberschreiben) {
      return { fehler: "Die Ablage ist neuer als diese Sicherung (" + jetzigeAnzahl + " Buchungen gegenüber " + neueAnzahl + "). Wirklich überschreiben?", neuer: true, jetzt: jetzigeAnzahl, sicherung: neueAnzahl };
    }
    var vorher = sicherungMachen(inhalt, "vor-wiederherstellung");
    var stand = inhalt.stand;
    Object.keys(inhalt).forEach(function (k) { delete inhalt[k]; });
    Object.keys(quelle).forEach(function (k) { inhalt[k] = quelle[k]; });
    inhalt.stand = stand;
    var neu = lesen({ getBlob: function () { return { getDataAsString: function () { return JSON.stringify(inhalt); } }; } });
    Object.keys(inhalt).forEach(function (k) { delete inhalt[k]; });
    Object.keys(neu).forEach(function (k) { inhalt[k] = neu[k]; });
    inhalt.chronik.push({ zeit: new Date().toISOString(), art: "wiederhergestellt", text: "Aus Sicherung wiederhergestellt; vorher gesichert als " + vorher });
    inhalt.kv = (inhalt.kv || 1) + 1;
    inhalt.epochenwechsel = (inhalt.epochenwechsel || 0) + 1;
    ctx.geaendert = true;
    return { ok: true, vorher: vorher, buchungen: inhalt.daten.buchungen.length };
  }
  return { fehler: "Unbekannte Sicherungsaktion" };
}


/* ============================== Neues Fest ============================== */
function ketteStand(inhalt) {
  var st = {}, B = inhalt.daten.buchungen;
  Object.keys(inhalt.basis).forEach(function (g) { st[g] = { n: inhalt.basis[g], k: inhalt.basisK[g] || "" }; });
  B.forEach(function (b) {
    if (typeof b.n !== "number") return;
    var s = st[b.geraet] || (st[b.geraet] = { n: 0, k: "" });
    if (b.n > s.n) { s.n = b.n; s.k = b.k || ""; }
  });
  Object.keys(inhalt.verworfen || {}).forEach(function (key) {
    var p = key.split(":"), n = Number(p[1]), s = st[p[0]] || (st[p[0]] = { n: 0, k: "" });
    if (n > s.n) { s.n = n; s.k = inhalt.verworfen[key].k; }
  });
  return st;
}

function neubeginn(inhalt, ctx, a) {
  var name = sicherungMachen(inhalt, "fest");
  var ep = Math.max(ctx.jetzt, (inhalt.daten.epoche || 0) + 1);
  var st = ketteStand(inhalt), basis = {}, basisK = {};
  Object.keys(st).forEach(function (g) { basis[g] = st[g].n; basisK[g] = st[g].k; });
  var d = leerDaten();
  d.epoche = ep; d.nummernNeu = !!a.nummernNeu;
  /* Die Beschriftung der Karten (Anlass, Verein, Zusatz) beginnt leer: besser nichts als etwas Altes. Das Archiv hat sie. */
  var geraete = {};
  Object.keys(inhalt.geraete).forEach(function (id) { var g = inhalt.geraete[id]; geraete[id] = { schluessel: g.schluessel, name: g.name, erstmals: g.erstmals }; });
  var chronik = inhalt.chronik.concat([{ zeit: new Date().toISOString(), art: "neuesFest", text: "Neues Fest begonnen, Archiv: " + name }]);
  var berichte = inhalt.berichte, seq = inhalt.seq, kv = inhalt.kv + 1, einst = inhalt.einst, stand = inhalt.stand;
  Object.keys(inhalt).forEach(function (k) { delete inhalt[k]; });
  inhalt.version = 2; inhalt.stand = stand; inhalt.seq = seq; inhalt.kv = kv; inhalt.daten = d; inhalt.geraete = geraete;
  inhalt.basis = basis; inhalt.basisK = basisK; inhalt.meldungen = {}; inhalt.vermerke = []; inhalt.berichte = berichte;
  inhalt.chronik = chronik; inhalt.kassenbuch = []; inhalt.quittiert = { ueber: {}, befund: 0 }; inhalt.einst = einst; inhalt.verworfen = {};
  inhalt.epochenwechsel = 1;
  ctx.geaendert = true;
  return { ok: true, epoche: ep, archiv: name, seq: seq, treuhand: true };
}


/* ============================== Prüfung und Bericht ============================== */
function pruefen(inhalt) {
  var B = inhalt.daten.buchungen, nachGeraet = {};
  B.forEach(function (b) { (nachGeraet[b.geraet] = nachGeraet[b.geraet] || []).push(b); });
  var namen = {};
  Object.keys(inhalt.geraete).forEach(function (g) { namen[g] = 1; });
  Object.keys(nachGeraet).forEach(function (g) { namen[g] = 1; });
  var res = { luecken: [], doppelt: [], kette: [], ohneNummer: 0, geraete: [] };

  Object.keys(namen).sort().forEach(function (g) {
    var liste = nachGeraet[g] || [], nm = {}, maxN = 0;
    Object.keys(inhalt.verworfen).forEach(function (key) {
      var p = key.split(":"); if (p[0] !== g) return;
      var vn = Number(p[1]); (nm[vn] = nm[vn] || []).push({ n: vn, k: inhalt.verworfen[key].k, verworfen: true, geraet: g });
      if (vn > maxN) maxN = vn;
    });
    liste.forEach(function (b) {
      if (typeof b.n !== "number") { if (b.art !== "ersatz" && b.art !== "storno") res.ohneNummer++; return; }
      (nm[b.n] = nm[b.n] || []).push(b);
      if (b.n > maxN) maxN = b.n;
    });
    var basis = inhalt.basis[g] || 0;
    var wirklichMax = Math.max(maxN, basis);
    var von = null, n;
    for (n = basis + 1; n <= maxN + 1; n++) {
      if (n <= maxN && !nm[n]) { if (von === null) von = n; }
      else if (von !== null) { res.luecken.push({ geraet: g, von: von, bis: n - 1 }); von = null; }
    }
    Object.keys(nm).forEach(function (k) { if (nm[k].length > 1 && !nm[k].some(function (z) { return z.verworfen; })) res.doppelt.push({ geraet: g, n: Number(k) }); });
    for (n = basis + 1; n <= maxN; n++) {
      var b = nm[n] && nm[n][0];
      if (!b || b.verworfen) continue;
      var vor;
      if (n - 1 === basis) vor = inhalt.basisK[g] || "";
      else vor = (nm[n - 1] && nm[n - 1][0]) ? nm[n - 1][0].k : null;
      if (vor === null || vor === undefined) continue;
      if (kettenHash(kettenText(b, vor)) !== b.k) res.kette.push({ geraet: g, n: n });
    }
    var kLetzte = (nm[maxN] && nm[maxN][0] && nm[maxN][0].k) || inhalt.basisK[g] || "";
    var m = inhalt.meldungen[g] || null;
    var reg = inhalt.geraete[g] || {};
    res.geraete.push({
      geraet: g, letzte: wirklichMax, zuletzt: reg.zuletzt || null, ausstehend: reg.ausstehend || 0,
      gemeldet: !!m, passt: !!m && m.n === wirklichMax && m.k === kLetzte, gemeldetN: m ? m.n : null
    });
  });

  var schwer = inhalt.vermerke.filter(function (v) { return v.art !== "admin" && v.art !== "sperre" && v.art !== "einstellung" && v.art !== "ersatz" && v.art !== "geraet" && v.art !== "ueberziehung" && v.art !== "gesperrt"; });
  var offen = schwer.filter(function (v) { return Date.parse(v.zeit) > (inhalt.quittiert.befund || 0); });
  res.unveraendert = !res.luecken.length && !res.doppelt.length && !res.kette.length && !res.ohneNummer && !schwer.length;
  /* Was quittiert wurde, ist der damalige Befund; ein anderer Befund (oder neue Vermerke) ist wieder offen. */
  res.signatur = JSON.stringify([res.luecken, res.doppelt, res.kette, res.ohneNummer]);
  var strukturOffen = (res.luecken.length || res.doppelt.length || res.kette.length || res.ohneNummer) && res.signatur !== inhalt.quittiert.signatur;
  res.befundOffen = !!(strukturOffen || offen.length);
  res.quittiertText = inhalt.quittiertText || "";
  res.vollstaendig = res.geraete.length > 0 && res.geraete.every(function (g) { return g.passt; });
  return res;
}

function ueberziehungen(inhalt) {
  var aus = [], S = {}, idx = indexAus(inhalt.daten.buchungen);
  inhalt.daten.buchungen.forEach(function (b) {
    if (b.ueber) aus.push({ id: b.id, karte: b.karte, cent: b.cent, geraet: b.geraet, zeit: b.zeit, quittiert: !!inhalt.quittiert.ueber[b.id] });
  });
  return aus;
}

function berichtRechnen(inhalt, ctx, nurGeraet) {
  var d = inhalt.daten, B = d.buchungen, idx = indexAus(B);
  var u = { aufgebucht: 0, aufStorno: 0, abgebucht: 0, abZurueck: 0, trinkgeld: 0, trinkgeldZurueck: 0, ausgezahlt: 0, korrektur: 0, stornos: 0, summeStorno: 0, ersatz: 0 };
  var pro = {}, proGeraet = {};
  function zeile(map, key, name) { return map[key] || (map[key] = { name: name, ab: 0, abZurueck: 0, trinkgeld: 0, anzahl: 0 }); }
  B.forEach(function (b) {
    var wer = b.wer || ("Gerät " + b.geraet);
    var z = zeile(pro, wer, wer), zg = zeile(proGeraet, b.geraet, (inhalt.geraete[b.geraet] && inhalt.geraete[b.geraet].name) || ("Gerät " + b.geraet));
    z.anzahl++; zg.anzahl++;
    if (b.art === "auf") u.aufgebucht += b.cent;
    else if (b.art === "ab") { u.abgebucht += -b.cent; z.ab += -b.cent; zg.ab += -b.cent; }
    else if (b.art === "trinkgeld") { u.trinkgeld += -b.cent; z.trinkgeld += -b.cent; zg.trinkgeld += -b.cent; }
    else if (b.art === "auszahlung") u.ausgezahlt += -b.cent;
    else if (b.art === "korrektur") u.korrektur += b.cent;
    else if (b.art === "ersatz") { u.ersatz += b.cent; }
    else if (b.art === "storno") {
      u.stornos++; u.summeStorno += b.cent;
      var o = idx[b.ref];
      if (o && o.art === "ab") { u.abZurueck += b.cent; zeile(pro, o.wer || ("Gerät " + o.geraet), "").abZurueck += b.cent; zeile(proGeraet, o.geraet, "").abZurueck += b.cent; }
      else if (o && o.art === "trinkgeld") { u.trinkgeldZurueck += b.cent; }
      else if (o && o.art === "auf") u.aufStorno += -b.cent;
    }
  });
  var netto = u.abgebucht - u.abZurueck, prozent = Number(GEBUEHR_PROZENT) || 0;
  var rest = 0, minus = 0; var S = salden(inhalt);
  Object.keys(S).forEach(function (nr) { rest += S[nr]; if (S[nr] < 0) minus += -S[nr]; });
  var p = pruefen(inhalt), ueber = ueberziehungen(inhalt);
  var offeneUeber = ueber.filter(function (x) { return !x.quittiert; });
  var gl = geraeteListe(inhalt, ctx);
  var ausstehend = gl.reduce(function (s, g) { return s + g.ausstehend; }, 0);
  var gruende = [];
  if (ausstehend > 0) gruende.push(ausstehend + " Buchung(en) auf Geräten noch nicht übertragen");
  gl.forEach(function (g) { if (g.offline) gruende.push("Gerät " + g.id + " meldet sich ohne Verbindung"); if (g.fehler) gruende.push("Gerät " + g.id + ": " + g.fehler); });
  if (!p.vollstaendig) gruende.push("nicht alle Geräte haben ihren Abschluss gemeldet");
  if (p.befundOffen) gruende.push("Auffälligkeiten sind nicht quittiert");
  if (offeneUeber.length) gruende.push(offeneUeber.length + " Überziehung(en) nicht quittiert");
  return {
    zeit: new Date(ctx.jetzt).toISOString(), stand: inhalt.stand, seq: inhalt.seq, anlass: (d.anlass && d.anlass.name) || "",
    umsatz: { brutto: u.abgebucht, zurueckgenommen: u.abZurueck, netto: netto },
    trinkgeld: u.trinkgeld - u.trinkgeldZurueck,
    aufgebucht: u.aufgebucht - u.aufStorno, ausgezahlt: u.ausgezahlt, korrekturen: u.korrektur, ersatz: u.ersatz,
    stornos: { anzahl: u.stornos, summe: u.summeStorno },
    nochAufKarten: rest, minus: minus,
    gebuehr: { prozent: prozent, betrag: prozent > 0 ? Math.round(netto * prozent / 100) : 0 },
    proBedienung: Object.keys(pro).sort().map(function (k) { var z = pro[k]; return { name: z.name || k, abgebucht: z.ab - z.abZurueck, trinkgeld: z.trinkgeld, buchungen: z.anzahl }; }),
    proGeraet: Object.keys(proGeraet).sort().map(function (k) { var z = proGeraet[k]; return { geraet: k, name: z.name, abgebucht: z.ab - z.abZurueck, trinkgeld: z.trinkgeld, buchungen: z.anzahl }; }),
    pruefung: p, vermerke: inhalt.vermerke.slice(-30), buchungenAnzahl: B.length,
    ueberziehungen: ueber, geraete: gl, ausstehend: ausstehend,
    kasse: kassenRechnung(inhalt),
    verworfen: Object.keys(inhalt.verworfen).map(function (k) { var v = inhalt.verworfen[k]; return { geraet: k.split(':')[0], n: Number(k.split(':')[1]), id: v.id, cent: v.cent, karte: v.karte, grund: v.grund, zeit: v.zeit }; }),
    endgueltig: gruende.length === 0, gruende: gruende,
    letzterAbschluss: inhalt.berichte.length ? inhalt.berichte[inhalt.berichte.length - 1] : null
  };
}

/* Verkaufsgerät: nur die eigene Abrechnung */
function meineAbrechnung(inhalt, ctx, g) {
  var B = inhalt.daten.buchungen, idx = indexAus(B), z = { anzahl: 0, abgebucht: 0, zurueck: 0, trinkgeld: 0, stornos: 0 };
  B.forEach(function (b) {
    if (b.geraet !== g) return;
    if (b.art === "ab") { z.anzahl++; z.abgebucht += -b.cent; }
    else if (b.art === "trinkgeld") z.trinkgeld += -b.cent;
    else if (b.art === "storno") { z.stornos++; var o = idx[b.ref]; if (o && o.art === "ab") z.zurueck += b.cent; else if (o && o.art === "trinkgeld") z.trinkgeld -= b.cent; }
  });
  var reg = inhalt.geraete[g] || {};
  return { ok: true, geraet: g, anzahl: z.anzahl, abgebucht: z.abgebucht, zurueckgenommen: z.zurueck, netto: z.abgebucht - z.zurueck, trinkgeld: z.trinkgeld, stornos: z.stornos,
           ausstehend: reg.ausstehend || 0, seq: inhalt.seq };
}

function bericht(inhalt, ctx, a) {
  if (ctx.rolle === "verkauf") return meineAbrechnung(inhalt, ctx, geraetVon(a));
  if (a.meldung && typeof a.meldung === "object" && a.meldung.geraet) {
    inhalt.meldungen[String(a.meldung.geraet).slice(0, 1)] = { n: Number(a.meldung.n) || 0, k: String(a.meldung.k || ""), zeit: new Date(ctx.jetzt).toISOString() };
    ctx.geaendert = true;
  }
  var b = berichtRechnen(inhalt, ctx);
  var mail = { gesendet: false, an: "" };
  if (a.mailen && BERICHT_AN) {
    try {
      MailApp.sendEmail({ to: BERICHT_AN, subject: "Guthabenkasse – Abrechnung " + (b.anlass || "") + " – Umsatz " + euroText(b.umsatz.netto),
                          body: berichtText(b), htmlBody: berichtHtml(b) });
      mail = { gesendet: true, an: BERICHT_AN };
    } catch (f) { mail = { gesendet: false, an: BERICHT_AN, fehler: String(f) }; }
  }
  return { ok: true, bericht: b, mail: mail, treuhand: true };
}

function quittieren(inhalt, ctx, a) {
  if (a.was === "ueberziehung") {
    var n = 0;
    ueberziehungen(inhalt).forEach(function (x) { if (!x.quittiert && (!a.ids || a.ids.indexOf(x.id) >= 0)) { inhalt.quittiert.ueber[x.id] = ctx.jetzt; n++; } });
    ctx.geaendert = true; return { ok: true, quittiert: n };
  }
  if (a.was === "geraet") {
    /* Ein Gerät, das sich nicht mehr melden kann (verloren, ausgeschaltet, ersetzt): sein Stand in der Ablage wird als sein Abschluss übernommen. */
    var id = String(a.id || "").slice(0, 1), st = ketteStand(inhalt)[id];
    if (!st) return { fehler: "Zu diesem Gerät gibt es keine Buchungen." };
    inhalt.meldungen[id] = { n: st.n, k: st.k, zeit: new Date(ctx.jetzt).toISOString(), manuell: true };
    vermerk(inhalt, "einstellung", geraetVon(a), "Gerät " + id + " am Terminal als abgeschlossen übernommen (letzte Nummer " + st.n + ")");
    ctx.geaendert = true; return { ok: true, n: st.n };
  }
  if (a.was === "befund") {
    if (!darf(ctx.rolle, "befunde")) return NEIN("Auffälligkeiten quittieren");
    inhalt.quittiert.befund = ctx.jetzt; inhalt.quittiert.signatur = pruefen(inhalt).signatur; inhalt.quittiertText = String(a.text || "").slice(0, 200);
    vermerk(inhalt, "einstellung", geraetVon(a), "Auffälligkeiten quittiert: " + inhalt.quittiertText);
    ctx.geaendert = true; return { ok: true };
  }
  return { fehler: "Unbekannt" };
}

function abschlussSetzen(inhalt, ctx, a) {
  var b = berichtRechnen(inhalt, ctx);
  if (!b.endgueltig && !a.vorlaeufig) {
    return { fehler: "Der Abschluss ist noch nicht endgültig möglich.", gruende: b.gruende, bericht: b, vorlaeufig: true };
  }
  var nr = inhalt.berichte.length + 1;
  inhalt.berichte.push({ nr: nr, zeit: b.zeit, geraet: geraetVon(a), umsatz: b.umsatz.netto, endgueltig: b.endgueltig, seq: inhalt.seq });
  ctx.geaendert = true;
  return { ok: true, nr: nr, endgueltig: b.endgueltig, bericht: b };
}

function euroText(cent) {
  var neg = cent < 0; cent = Math.abs(Math.round(cent));
  var e = String(Math.floor(cent / 100)).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return (neg ? "-" : "") + e + "," + ("0" + (cent % 100)).slice(-2) + " €";
}

function statusText(b) {
  if (b.endgueltig) return "Endgültig: alles übertragen, nichts offen.";
  return "VORLÄUFIG – " + b.gruende.join("; ") + ".";
}

function befundZeilen(b) {
  var p = b.pruefung, z = [];
  p.luecken.forEach(function (l) { z.push("Gerät " + l.geraet + ": Nummern " + l.von + (l.bis > l.von ? "–" + l.bis : "") + " fehlen"); });
  p.doppelt.forEach(function (l) { z.push("Gerät " + l.geraet + ": Nummer " + l.n + " doppelt vergeben (Zähler zurückgesetzt?)"); });
  p.kette.forEach(function (l) { z.push("Gerät " + l.geraet + ": Prüfsumme bei Nummer " + l.n + " passt nicht (Buchung verändert?)"); });
  if (p.ohneNummer) z.push(p.ohneNummer + " Buchung(en) ohne laufende Nummer");
  b.ueberziehungen.forEach(function (u) { z.push("Überziehung " + u.karte + " " + euroText(u.cent) + " (Gerät " + u.geraet + ")" + (u.quittiert ? ", quittiert" : ", OFFEN")); });
  b.vermerke.forEach(function (v) { z.push(v.zeit.slice(0, 16).replace("T", " ") + " · " + v.text); });
  p.geraete.forEach(function (g) {
    z.push("Gerät " + g.geraet + ": letzte Nummer " + g.letzte + ", " + (g.gemeldet ? (g.passt ? "Abschluss gemeldet, stimmt" : "Abschluss gemeldet, STIMMT NICHT (meldet " + g.gemeldetN + ")") : "Abschluss noch nicht gemeldet"));
  });
  return z;
}

function berichtText(b) {
  var t = [];
  t.push("Guthabenkasse – Abrechnung" + (b.anlass ? " · " + b.anlass : ""));
  t.push("Stand: " + b.zeit); t.push("");
  t.push("UMSATZ (Abbuchungen, ohne Trinkgeld): " + euroText(b.umsatz.netto));
  t.push("  abgebucht gesamt:        " + euroText(b.umsatz.brutto));
  t.push("  davon zurückgenommen:    " + euroText(b.umsatz.zurueckgenommen) + "  (" + b.stornos.anzahl + " Rücknahmen)");
  if (b.gebuehr.prozent > 0) t.push("  Gebühr " + b.gebuehr.prozent + " %:            " + euroText(b.gebuehr.betrag));
  t.push("");
  t.push("Trinkgeld (getrennt):      " + euroText(b.trinkgeld));
  t.push("Aufgebucht:                " + euroText(b.aufgebucht));
  t.push("Ausgezahlt (Restbeträge):  " + euroText(b.ausgezahlt) + "  – ändert den Umsatz nicht");
  t.push("Noch auf Karten (netto):   " + euroText(b.nochAufKarten));
  t.push(""); t.push("Je Bedienung:");
  b.proBedienung.forEach(function (z) { t.push("  " + z.name + ": " + euroText(z.abgebucht) + ", Trinkgeld " + euroText(z.trinkgeld)); });
  if (b.ausstehend) { t.push(""); t.push("Hinweis: " + b.ausstehend + " Buchung(en) waren auf Geräten noch nicht übertragen."); }
  return t.join("\n");
}

function htmlSicher(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }

function berichtHtml(b) {
  return "<div style=\"font-family:Georgia,serif;max-width:560px\">" +
    "<h2 style=\"margin:0 0 4px\">Guthabenkasse – Abrechnung" + (b.anlass ? " · " + htmlSicher(b.anlass) : "") + "</h2>" +
    "<div style=\"color:#57685C;font-size:12px\">Stand " + htmlSicher(b.zeit) + "</div>" +
    "<p style=\"font-size:20px;margin:14px 0 2px\"><b>Umsatz " + euroText(b.umsatz.netto) + "</b></p>" +
    "<div style=\"font-size:13px\">Abbuchungen ohne Trinkgeld, abzüglich " + b.stornos.anzahl + " Rücknahmen (" + euroText(b.umsatz.zurueckgenommen) + "). Auszahlungen von Restbeträgen ändern ihn nicht.</div>" +
    (b.gebuehr.prozent > 0 ? "<p style=\"margin:8px 0\">Gebühr " + b.gebuehr.prozent + " %: <b>" + euroText(b.gebuehr.betrag) + "</b></p>" : "") +
    "<table style=\"border-collapse:collapse;margin:10px 0;font-size:13px\">" +
    "<tr><td>Trinkgeld</td><td style=\"text-align:right;padding-left:18px\">" + euroText(b.trinkgeld) + "</td></tr>" +
    "<tr><td>Aufgebucht</td><td style=\"text-align:right;padding-left:18px\">" + euroText(b.aufgebucht) + "</td></tr>" +
    "<tr><td>Ausgezahlt (Restbeträge)</td><td style=\"text-align:right;padding-left:18px\">" + euroText(b.ausgezahlt) + "</td></tr>" +
    "<tr><td>Noch auf Karten</td><td style=\"text-align:right;padding-left:18px\">" + euroText(b.nochAufKarten) + "</td></tr></table>" +
    (b.ausstehend ? "<p style=\"font-size:12px\">Hinweis: " + b.ausstehend + " Buchung(en) waren auf Geräten noch nicht übertragen.</p>" : "") + "</div>";
}


function dateiFinden() {
  var treffer = DriveApp.getFilesByName(DATEINAME);
  while (treffer.hasNext()) {
    var d = treffer.next();
    if (!d.isTrashed()) return d;
  }
  return DriveApp.createFile(DATEINAME, JSON.stringify({ stand: 0, daten: null }), MimeType.PLAIN_TEXT);
}
