/* ===================== Guthabenkasse · Ablage im Drive =====================

   Diese Datei gehört nicht in die Guthabenkasse, sondern zu Google. Sie ist
   die kleine Tür vor deinem Drive: die Geräte rufen sie auf, sie schreibt
   in deinem Namen eine einzige Datei. So braucht sich am Eingang niemand
   bei Google anzumelden.

   Einrichten, einmalig:

     1. script.google.com öffnen, "Neues Projekt"
     2. Den vorhandenen Inhalt löschen und diese Datei hineinkopieren
     3. Unten das ZUGANGSWORT auf ein eigenes ändern — es ist der einzige
        Schutz der Ablage. Ein Satz aus vier Wörtern ist besser als ein
        kurzes, verdrehtes Kunstwort.
     4. Speichern, dann "Bereitstellen" → "Neue Bereitstellung"
        Typ:        Web-App
        Ausführen als:            Ich selbst
        Zugriffsberechtigung:     Jeder
     5. Google fragt nach der Erlaubnis, auf dein Drive zuzugreifen. Beim
        Warnhinweis "Diese App ist nicht verifiziert" auf "Erweitert" und
        dann auf "Zu ... (unsicher)" — das bist du selbst, es ist dein
        eigenes Skript.
     6. Die angezeigte Web-App-Adresse kopieren. Sie und das Zugangswort
        kommen in der Guthabenkasse unter Einstellungen → Ablage hinein.

   Das ist ein eigenes Skript mit eigener Datei — es teilt nichts mit der
   Ablage der Ticketkasse. Beide dürfen im selben Google-Konto nebeneinander
   laufen, jedes mit seiner Adresse.

   Wer die Adresse UND das Zugangswort hat, kann alle Guthaben lesen und
   (ohne Treuhand-Modus) überschreiben. Beides gehört also nur auf die
   Geräte des Vereins, nicht in eine Rundmail.

   Änderst du hier später etwas, muss über "Bereitstellen" eine NEUE
   Version veröffentlicht werden — sonst läuft weiter die alte.


   TREUHAND-MODUS
   --------------
   Für den Fall, dass ein anderer die Kasse betreibt und du als Entwickler
   verlässlich erfahren willst, was an einem Abend umgesetzt wurde. Das Skript
   läuft dann IN DEINEM Google-Konto, der Betreiber kennt nur Adresse und
   Zugangswort — nie das Admin-Wort.

     TREUHAND = true   schaltet ihn ein. Dann gilt:

     - Die Ablage ist ein Protokoll, das nur wächst. Die Geräte schicken
       Buchungen, die Ablage legt sie dazu. Überschreiben, Löschen und das
       Zurücksetzen auf Null nimmt sie von den Geräten nicht an.
     - Ein neues Fest beginnen kann nur, wer das ADMINWORT kennt. Der alte
       Stand wird dabei als eigene Datei im Drive archiviert, nicht gelöscht.
     - Jede Buchung trägt die laufende Nummer ihres Geräts und eine Prüfsumme,
       die auf der vorigen aufbaut. Fehlt eine Nummer, ist eine Buchung
       verändert worden oder hat ein Gerät von vorn begonnen, steht das im
       Bericht.
     - Beim Abschluss rechnet die Ablage selbst: Umsatz = Abbuchungen
       (ohne Trinkgeld) abzüglich zurückgenommener. Auszahlungen von
       Restguthaben ändern ihn nicht. Der Bericht geht per Mail an
       BERICHT_AN (du und der Betreiber, dieselben Zahlen für beide).
     - GEBUEHR_PROZENT: dein Anteil am Umsatz; steht im Bericht, wenn > 0.

   Wichtig: Der Treuhand-Modus sieht nur, was gescannt wird. Wer am Handy
   vorbei kassiert, kommt in keiner Zahl vor. Er sichert gegen Löschen und
   Verändern, nicht gegen Weglassen.
======================================================================== */

var ZUGANGSWORT = "hier-ein-eigenes-wort-eintragen";
var DATEINAME   = "guthabenkasse-ablage.json";

var TREUHAND        = false;   /* true = Treuhand-Modus */
var ADMINWORT       = "";      /* nur damit lässt sich ein neues Fest beginnen; leer = nie */
var BERICHT_AN      = "";      /* Mailadressen, durch Komma getrennt */
var GEBUEHR_PROZENT = 0;       /* zum Beispiel 2 für zwei Prozent vom Umsatz */


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


function verarbeiten(e) {
  var anfrage;
  try {
    anfrage = JSON.parse(e.postData.contents);
  } catch (f) {
    return { fehler: "Unlesbare Anfrage" };
  }

  if (anfrage.wort !== ZUGANGSWORT) {
    return { fehler: "Das Zugangswort stimmt nicht." };
  }

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

    if (anfrage.aktion === "holen") {
      return { ok: true, stand: inhalt.stand, daten: inhalt.daten, treuhand: !!TREUHAND };
    }

    if (!TREUHAND) {
      if (anfrage.aktion === "legen") return altesLegen(datei, inhalt, anfrage);
      if (anfrage.aktion === "neubeginn" || anfrage.aktion === "bericht") {
        return { fehler: "Der Treuhand-Modus ist nicht eingeschaltet." };
      }
      return { fehler: "Unbekannte Anweisung: " + anfrage.aktion };
    }

    /* ---------------------------- Treuhand ---------------------------- */
    if (anfrage.aktion === "legen") {
      zusammenlegen(inhalt, anfrage);
      inhalt.stand = (inhalt.stand || 0) + 1;
      speichern(datei, inhalt);
      return { ok: true, stand: inhalt.stand, treuhand: true };
    }

    if (anfrage.aktion === "neubeginn") {
      if (!ADMINWORT || anfrage.admin !== ADMINWORT) {
        vermerk(inhalt, "admin", geraetVon(anfrage), "Neues Fest mit falschem Admin-Wort versucht");
        speichern(datei, inhalt);
        return { fehler: "Das Admin-Wort stimmt nicht." };
      }
      var neu = neuesFest(inhalt, !!anfrage.nummernNeu);
      speichern(datei, neu.inhalt);
      return { ok: true, epoche: neu.epoche, archiv: neu.archiv, treuhand: true };
    }

    if (anfrage.aktion === "bericht") {
      if (anfrage.meldung && typeof anfrage.meldung === "object" && anfrage.meldung.geraet) {
        inhalt.meldungen[String(anfrage.meldung.geraet).slice(0, 1)] = {
          n: Number(anfrage.meldung.n) || 0,
          k: String(anfrage.meldung.k || ""),
          zeit: new Date().toISOString()
        };
      }
      var bericht = berichtRechnen(inhalt);
      var mail = { gesendet: false, an: "" };
      if (anfrage.mailen && BERICHT_AN) {
        try {
          MailApp.sendEmail({
            to: BERICHT_AN,
            subject: "Guthabenkasse – Abschluss " + (bericht.anlass || "") + " – Umsatz " + euroText(bericht.umsatz.netto),
            body: berichtText(bericht),
            htmlBody: berichtHtml(bericht)
          });
          mail = { gesendet: true, an: BERICHT_AN };
        } catch (f) {
          mail = { gesendet: false, an: BERICHT_AN, fehler: String(f) };
        }
      }
      inhalt.berichte.push({ zeit: bericht.zeit, geraet: geraetVon(anfrage), umsatz: bericht.umsatz.netto,
                             vollstaendig: bericht.pruefung.vollstaendig, unveraendert: bericht.pruefung.unveraendert });
      speichern(datei, inhalt);
      return { ok: true, bericht: bericht, mail: mail, treuhand: true };
    }

    return { fehler: "Unbekannte Anweisung: " + anfrage.aktion };
  } finally {
    sperre.releaseLock();
  }
}


/* ------------------------- ohne Treuhand: wie bisher ------------------------- */
function altesLegen(datei, inhalt, anfrage) {
  /* Der Zählerstand ist die ganze Absicherung gegen verlorene Änderungen:
     wer schreiben will, muss sagen, auf welchem Stand er aufsetzt. Hat
     inzwischen ein anderes Gerät geschrieben, bekommt er dessen Stand zurück
     und rechnet noch einmal. */
  if (typeof anfrage.basis === "number" && anfrage.basis !== inhalt.stand) {
    return { fehler: "veraltet", stand: inhalt.stand, daten: inhalt.daten };
  }
  var neu = {
    stand: (inhalt.stand || 0) + 1,
    daten: anfrage.daten,
    geaendert: new Date().toISOString(),
    vonGeraet: String(anfrage.geraet || "").slice(0, 40)
  };
  datei.setContent(JSON.stringify(neu));
  return { ok: true, stand: neu.stand };
}


/* ============================ Treuhand: Inhalt ============================ */

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
  inhalt.stand = inhalt.stand || 0;
  inhalt.geraete = inhalt.geraete || {};      /* Kontakt je Gerät */
  inhalt.basis = inhalt.basis || {};          /* Nummer, ab der dieses Fest zählt */
  inhalt.basisK = inhalt.basisK || {};        /* Prüfsumme dazu */
  inhalt.meldungen = inhalt.meldungen || {};  /* Abschlussmeldungen der Geräte */
  inhalt.vermerke = inhalt.vermerke || [];    /* Auffälligkeiten dieses Festes */
  inhalt.berichte = inhalt.berichte || [];
  inhalt.chronik = inhalt.chronik || [];
  return inhalt;
}

function speichern(datei, inhalt) {
  datei.setContent(JSON.stringify(inhalt));
}

function geraetVon(anfrage) {
  return String(anfrage.geraet || "?").slice(0, 1);
}

function vermerk(inhalt, art, geraet, text) {
  var v = { zeit: new Date().toISOString(), art: art, geraet: geraet, text: text };
  inhalt.vermerke.push(v);
  if (inhalt.vermerke.length > 500) inhalt.vermerke.shift();
}


/* Dieselbe Prüfsumme rechnet die Guthabenkasse. Sie ist keine Geheimschrift,
   sondern ein Fingerabdruck: ändert sich eine Buchung nachträglich oder fehlt
   eine, passt die nächste nicht mehr dazu. Die Ablage vergleicht mit dem, was
   sie schon hat. */
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

var ARTEN = { auf: 1, ab: 1, storno: 1, auszahlung: 1, korrektur: 1, trinkgeld: 1 };

function buchungFehler(x) {
  if (!x || typeof x !== "object") return "keine Buchung";
  if (typeof x.id !== "string" || !x.id) return "ohne Kennung";
  if (typeof x.karte !== "string" || !x.karte) return "ohne Karte";
  if (typeof x.cent !== "number" || x.cent !== Math.round(x.cent) || !isFinite(x.cent)) return "ungültiger Betrag";
  if (!ARTEN[x.art]) return "unbekannte Art";
  if (typeof x.zeit !== "number") return "ohne Zeit";
  if (typeof x.geraet !== "string") return "ohne Gerät";
  return "";
}

function gleicheBuchung(a, b) {
  var f = ["id", "karte", "cent", "art", "zeit", "geraet", "wer", "ref", "stapel", "n", "k"];
  for (var i = 0; i < f.length; i++) {
    if ((a[f[i]] === undefined ? "" : a[f[i]]) !== (b[f[i]] === undefined ? "" : b[f[i]])) return false;
  }
  return true;
}

function indexAus(liste) {
  var idx = {};
  for (var i = 0; i < liste.length; i++) idx[liste[i].id] = liste[i];
  return idx;
}


/* Was ein Gerät schickt, wird zu dem gelegt, was die Ablage hat — nie
   dagegen getauscht. */
function zusammenlegen(inhalt, anfrage) {
  var g0 = geraetVon(anfrage);
  var p = anfrage.daten;
  if (!p || typeof p !== "object" || !Array.isArray(p.buchungen) || !p.karten || typeof p.karten !== "object") {
    vermerk(inhalt, "unlesbar", g0, "Unlesbarer Stand von einem Gerät abgewiesen");
    return;
  }
  var d = inhalt.daten || leerDaten();
  inhalt.daten = d;
  inhalt.geraete[g0] = { zuletzt: new Date().toISOString(), anzahl: ((inhalt.geraete[g0] || {}).anzahl || 0) + 1 };

  var ep = Number(p.epoche) || 0, dep = Number(d.epoche) || 0;
  var idx = indexAus(d.buchungen);

  if (ep < dep) {
    /* Das Gerät kommt aus einem früheren Fest. Seine Buchungen gehören nicht
       in dieses; die Ablage zählt sie nur. */
    var verworfen = 0;
    p.buchungen.forEach(function (x) { if (x && x.id && !idx[x.id]) verworfen++; });
    if (verworfen) vermerk(inhalt, "altesFest", g0, verworfen + " Buchung(en) aus einem früheren Fest nicht übernommen");
    return;
  }
  if (ep > dep) {
    vermerk(inhalt, "neubeginn", g0,
            "Gerät hat auf eigene Faust von vorn begonnen (Zeit " + ep + "); der Neubeginn gilt nicht, seine Buchungen werden übernommen");
  }

  p.buchungen.forEach(function (x) {
    var f = buchungFehler(x);
    if (f) { vermerk(inhalt, "ungueltig", g0, "Buchung abgewiesen: " + f); return; }
    var alt = idx[x.id];
    if (alt) {
      if (!gleicheBuchung(alt, x)) {
        vermerk(inhalt, "veraendert", x.geraet, "Buchung " + x.id + " ist verändert worden – das Original bleibt");
      }
      return;
    }
    d.buchungen.push(x);
    idx[x.id] = x;
  });

  for (var nr in p.karten) {
    if (!Object.prototype.hasOwnProperty.call(p.karten, nr)) continue;
    var fremd = p.karten[nr];
    if (!fremd || typeof fremd !== "object") continue;
    if (!d.karten[nr]) d.karten[nr] = fremd;
    else if ((fremd.nts || 0) > (d.karten[nr].nts || 0)) {
      d.karten[nr].name = fremd.name || "";
      d.karten[nr].zusatz = fremd.zusatz || "";
      d.karten[nr].nts = fremd.nts;
    }
  }
  var v = (p.geloescht && typeof p.geloescht === "object") ? p.geloescht : {};
  for (var gn in v) {
    if (!Object.prototype.hasOwnProperty.call(v, gn)) continue;
    var alt2 = d.geloescht[gn] || 0, neu2 = Number(v[gn]) || 0;
    if (Math.abs(neu2) > Math.abs(alt2)) d.geloescht[gn] = neu2;
  }
  if (p.anlass && typeof p.anlass === "object" && (p.anlass.ts || 0) > ((d.anlass && d.anlass.ts) || 0)) d.anlass = p.anlass;
  d.buchungen.sort(function (a, b) { return a.zeit - b.zeit; });
}


/* ---------------------------- neues Fest ---------------------------- */
function ketteStand(inhalt) {
  var st = {}, B = (inhalt.daten && inhalt.daten.buchungen) || [];
  Object.keys(inhalt.basis).forEach(function (g) { st[g] = { n: inhalt.basis[g], k: inhalt.basisK[g] || "" }; });
  B.forEach(function (b) {
    if (typeof b.n !== "number") return;
    var s = st[b.geraet] || (st[b.geraet] = { n: 0, k: "" });
    if (b.n > s.n) { s.n = b.n; s.k = b.k || ""; }
  });
  return st;
}

function neuesFest(inhalt, nummernNeu) {
  var jetzt = new Date();
  var name = "guthabenkasse-archiv-" + jetzt.toISOString().replace(/[:.]/g, "-") + ".json";
  DriveApp.createFile(name, JSON.stringify(inhalt), MimeType.PLAIN_TEXT);
  var ep = Math.max(jetzt.getTime(), ((inhalt.daten && inhalt.daten.epoche) || 0) + 1);
  var st = ketteStand(inhalt), basis = {}, basisK = {};
  Object.keys(st).forEach(function (g) { basis[g] = st[g].n; basisK[g] = st[g].k; });
  var d = leerDaten();
  d.epoche = ep;
  d.nummernNeu = !!nummernNeu;
  if (inhalt.daten && inhalt.daten.anlass) d.anlass = inhalt.daten.anlass;
  var neu = {
    stand: (inhalt.stand || 0) + 1,
    daten: d,
    geraete: {},
    basis: basis,
    basisK: basisK,
    meldungen: {},
    vermerke: [],
    berichte: inhalt.berichte,
    chronik: inhalt.chronik.concat([{ zeit: jetzt.toISOString(), art: "neuesFest", text: "Neues Fest begonnen, Archiv: " + name }])
  };
  return { inhalt: neu, epoche: ep, archiv: name };
}


/* ============================== Bericht ============================== */
function pruefen(inhalt) {
  var B = (inhalt.daten && inhalt.daten.buchungen) || [];
  var nachGeraet = {};
  B.forEach(function (b) { (nachGeraet[b.geraet] = nachGeraet[b.geraet] || []).push(b); });
  var namen = {};
  Object.keys(inhalt.geraete).forEach(function (g) { namen[g] = 1; });
  Object.keys(nachGeraet).forEach(function (g) { namen[g] = 1; });
  var res = { luecken: [], doppelt: [], kette: [], ohneNummer: 0, geraete: [] };

  Object.keys(namen).sort().forEach(function (g) {
    var liste = nachGeraet[g] || [], nm = {}, maxN = 0;
    liste.forEach(function (b) {
      if (typeof b.n !== "number") { res.ohneNummer++; return; }
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
    Object.keys(nm).forEach(function (k) { if (nm[k].length > 1) res.doppelt.push({ geraet: g, n: Number(k) }); });
    for (n = basis + 1; n <= maxN; n++) {
      var b = nm[n] && nm[n][0];
      if (!b) continue;
      var vor;
      if (n - 1 === basis) vor = inhalt.basisK[g] || "";
      else vor = (nm[n - 1] && nm[n - 1][0]) ? nm[n - 1][0].k : null;
      if (vor === null || vor === undefined) continue;
      if (kettenHash(kettenText(b, vor)) !== b.k) res.kette.push({ geraet: g, n: n });
    }
    var kLetzte = (nm[maxN] && nm[maxN][0] && nm[maxN][0].k) || inhalt.basisK[g] || "";
    var m = inhalt.meldungen[g] || null;
    res.geraete.push({
      geraet: g, letzte: wirklichMax, zuletzt: (inhalt.geraete[g] || {}).zuletzt || null,
      gemeldet: !!m, passt: !!m && m.n === wirklichMax && m.k === kLetzte,
      gemeldetN: m ? m.n : null
    });
  });

  var schwer = inhalt.vermerke.filter(function (v) { return v.art !== "admin"; });
  res.unveraendert = !res.luecken.length && !res.doppelt.length && !res.kette.length &&
                     !res.ohneNummer && !schwer.length;
  res.vollstaendig = res.geraete.length > 0 && res.geraete.every(function (g) { return g.passt; });
  return res;
}

function berichtRechnen(inhalt) {
  var d = inhalt.daten || leerDaten();
  var B = d.buchungen, idx = indexAus(B);
  var u = { aufgebucht: 0, aufStorno: 0, abgebucht: 0, abZurueck: 0, trinkgeld: 0, trinkgeldZurueck: 0,
            ausgezahlt: 0, korrektur: 0, stornos: 0, summeStorno: 0 };
  var pro = {};
  function zeile(b) {
    var k = b.wer || ("Gerät " + b.geraet);
    return pro[k] || (pro[k] = { name: k, ab: 0, abZurueck: 0, trinkgeld: 0, anzahl: 0 });
  }
  B.forEach(function (b) {
    var z = zeile(b); z.anzahl++;
    if (b.art === "auf") u.aufgebucht += b.cent;
    else if (b.art === "ab") { u.abgebucht += -b.cent; z.ab += -b.cent; }
    else if (b.art === "trinkgeld") { u.trinkgeld += -b.cent; z.trinkgeld += -b.cent; }
    else if (b.art === "auszahlung") u.ausgezahlt += -b.cent;
    else if (b.art === "korrektur") u.korrektur += b.cent;
    else if (b.art === "storno") {
      u.stornos++; u.summeStorno += b.cent;
      var o = idx[b.ref];
      if (o && o.art === "ab") { u.abZurueck += b.cent; zeile(o).abZurueck += b.cent; }
      else if (o && o.art === "trinkgeld") { u.trinkgeldZurueck += b.cent; }
      else if (o && o.art === "auf") u.aufStorno += -b.cent;
    }
  });
  var netto = u.abgebucht - u.abZurueck;
  var prozent = Number(GEBUEHR_PROZENT) || 0;
  var rest = 0; B.forEach(function (b) { rest += b.cent; });
  return {
    zeit: new Date().toISOString(),
    stand: inhalt.stand,
    anlass: (d.anlass && d.anlass.name) || "",
    umsatz: { brutto: u.abgebucht, zurueckgenommen: u.abZurueck, netto: netto },
    trinkgeld: u.trinkgeld - u.trinkgeldZurueck,
    aufgebucht: u.aufgebucht - u.aufStorno,
    ausgezahlt: u.ausgezahlt,
    korrekturen: u.korrektur,
    stornos: { anzahl: u.stornos, summe: u.summeStorno },
    nochAufKarten: rest,
    gebuehr: { prozent: prozent, betrag: prozent > 0 ? Math.round(netto * prozent / 100) : 0 },
    proBedienung: Object.keys(pro).sort().map(function (k) {
      var z = pro[k]; return { name: z.name, abgebucht: z.ab - z.abZurueck, trinkgeld: z.trinkgeld, buchungen: z.anzahl };
    }),
    pruefung: pruefen(inhalt),
    vermerke: inhalt.vermerke.slice(-30),
    buchungenAnzahl: B.length
  };
}

function euroText(cent) {
  var neg = cent < 0; cent = Math.abs(Math.round(cent));
  var e = String(Math.floor(cent / 100)).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return (neg ? "-" : "") + e + "," + ("0" + (cent % 100)).slice(-2) + " €";
}

function statusText(b) {
  var p = b.pruefung;
  if (p.unveraendert && p.vollstaendig) return "Vollständig und unverändert.";
  var t = [];
  if (!p.unveraendert) t.push("AUFFÄLLIGKEITEN – bitte prüfen");
  if (!p.vollstaendig) t.push("noch nicht alle Geräte haben ihren Abschluss gemeldet oder es fehlen Buchungen");
  return t.join("; ") + ".";
}

function befundZeilen(b) {
  var p = b.pruefung, z = [];
  p.luecken.forEach(function (l) { z.push("Gerät " + l.geraet + ": Nummern " + l.von + (l.bis > l.von ? "–" + l.bis : "") + " fehlen"); });
  p.doppelt.forEach(function (l) { z.push("Gerät " + l.geraet + ": Nummer " + l.n + " doppelt vergeben (Zähler zurückgesetzt?)"); });
  p.kette.forEach(function (l) { z.push("Gerät " + l.geraet + ": Prüfsumme bei Nummer " + l.n + " passt nicht (Buchung verändert?)"); });
  if (p.ohneNummer) z.push(p.ohneNummer + " Buchung(en) ohne laufende Nummer");
  b.vermerke.forEach(function (v) { z.push(v.zeit.slice(0, 16).replace("T", " ") + " · " + v.text); });
  p.geraete.forEach(function (g) {
    z.push("Gerät " + g.geraet + ": letzte Nummer " + g.letzte + ", " +
           (g.gemeldet ? (g.passt ? "Abschluss gemeldet, stimmt" : "Abschluss gemeldet, STIMMT NICHT (meldet " + g.gemeldetN + ")") : "Abschluss noch nicht gemeldet"));
  });
  return z;
}

function berichtText(b) {
  var t = [];
  t.push("Guthabenkasse – Abschluss" + (b.anlass ? " · " + b.anlass : ""));
  t.push("Stand der Ablage: " + b.stand + " · " + b.zeit);
  t.push("");
  t.push("UMSATZ (Abbuchungen, ohne Trinkgeld): " + euroText(b.umsatz.netto));
  t.push("  abgebucht gesamt:        " + euroText(b.umsatz.brutto));
  t.push("  davon zurückgenommen:    " + euroText(b.umsatz.zurueckgenommen) + "  (" + b.stornos.anzahl + " Rücknahmen)");
  if (b.gebuehr.prozent > 0) t.push("  Gebühr " + b.gebuehr.prozent + " %:            " + euroText(b.gebuehr.betrag));
  t.push("");
  t.push("Trinkgeld (getrennt):      " + euroText(b.trinkgeld));
  t.push("Aufgebucht:                " + euroText(b.aufgebucht));
  t.push("Ausgezahlt (Restbeträge):  " + euroText(b.ausgezahlt) + "  – ändert den Umsatz nicht");
  t.push("Noch auf Karten (netto):   " + euroText(b.nochAufKarten));
  t.push("");
  t.push("Je Bedienung:");
  b.proBedienung.forEach(function (z) { t.push("  " + z.name + ": " + euroText(z.abgebucht) + ", Trinkgeld " + euroText(z.trinkgeld)); });
  t.push("");
  t.push("PRÜFUNG: " + statusText(b));
  befundZeilen(b).forEach(function (z) { t.push("  - " + z); });
  return t.join("\n");
}

function htmlSicher(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }

function berichtHtml(b) {
  var ok = b.pruefung.unveraendert && b.pruefung.vollstaendig;
  return "<div style=\"font-family:Georgia,serif;max-width:560px\">" +
    "<h2 style=\"margin:0 0 4px\">Guthabenkasse – Abschluss" + (b.anlass ? " · " + htmlSicher(b.anlass) : "") + "</h2>" +
    "<div style=\"color:#57685C;font-size:12px\">Stand der Ablage " + b.stand + " · " + htmlSicher(b.zeit) + "</div>" +
    "<p style=\"font-size:20px;margin:14px 0 2px\"><b>Umsatz " + euroText(b.umsatz.netto) + "</b></p>" +
    "<div style=\"font-size:13px\">Abbuchungen ohne Trinkgeld, abzüglich " + b.stornos.anzahl + " Rücknahmen (" + euroText(b.umsatz.zurueckgenommen) + "). " +
    "Auszahlungen von Restbeträgen ändern ihn nicht.</div>" +
    (b.gebuehr.prozent > 0 ? "<p style=\"margin:8px 0\">Gebühr " + b.gebuehr.prozent + " %: <b>" + euroText(b.gebuehr.betrag) + "</b></p>" : "") +
    "<table style=\"border-collapse:collapse;margin:10px 0;font-size:13px\">" +
    "<tr><td>Trinkgeld</td><td style=\"text-align:right;padding-left:18px\">" + euroText(b.trinkgeld) + "</td></tr>" +
    "<tr><td>Aufgebucht</td><td style=\"text-align:right;padding-left:18px\">" + euroText(b.aufgebucht) + "</td></tr>" +
    "<tr><td>Ausgezahlt (Restbeträge)</td><td style=\"text-align:right;padding-left:18px\">" + euroText(b.ausgezahlt) + "</td></tr>" +
    "<tr><td>Noch auf Karten</td><td style=\"text-align:right;padding-left:18px\">" + euroText(b.nochAufKarten) + "</td></tr></table>" +
    "<div style=\"background:" + (ok ? "#D6EADB" : "#F6E3B8") + ";padding:8px 10px;border-radius:6px;font-size:13px\"><b>Prüfung:</b> " + htmlSicher(statusText(b)) + "</div>" +
    "<ul style=\"font-size:12px;margin-top:8px\">" + befundZeilen(b).map(function (z) { return "<li>" + htmlSicher(z) + "</li>"; }).join("") + "</ul></div>";
}


function dateiFinden() {
  var treffer = DriveApp.getFilesByName(DATEINAME);
  while (treffer.hasNext()) {
    var d = treffer.next();
    if (!d.isTrashed()) return d;
  }
  return DriveApp.createFile(DATEINAME,
    JSON.stringify({ stand: 0, daten: null }), MimeType.PLAIN_TEXT);
}
