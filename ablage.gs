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
   überschreiben. Beides gehört also nur auf die Geräte des Vereins, nicht
   in eine Rundmail.

   Änderst du hier später etwas, muss über "Bereitstellen" eine NEUE
   Version veröffentlicht werden — sonst läuft weiter die alte.
======================================================================== */

var ZUGANGSWORT = "hier-ein-eigenes-wort-eintragen";
var DATEINAME   = "guthabenkasse-ablage.json";


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
    var inhalt;
    try {
      inhalt = JSON.parse(datei.getBlob().getDataAsString());
    } catch (f) {
      inhalt = { stand: 0, daten: null };
    }

    if (anfrage.aktion === "holen") {
      return { ok: true, stand: inhalt.stand, daten: inhalt.daten };
    }

    if (anfrage.aktion === "legen") {
      /* Der Zählerstand ist die ganze Absicherung gegen verlorene
         Änderungen: wer schreiben will, muss sagen, auf welchem Stand er
         aufsetzt. Hat inzwischen ein anderes Gerät geschrieben, bekommt er
         dessen Stand zurück und rechnet noch einmal. */
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

    return { fehler: "Unbekannte Anweisung: " + anfrage.aktion };
  } finally {
    sperre.releaseLock();
  }
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
