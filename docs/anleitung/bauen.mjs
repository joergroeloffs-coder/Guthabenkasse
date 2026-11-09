// Baut die Anleitungen (Terminal, Verkauf) auf Deutsch und Türkisch als PDF.
// Aufruf: node docs/anleitung/bauen.mjs   (Bilder vorher: node docs/anleitung/bilder.mjs)
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import { readFileSync, writeFileSync } from 'node:fs';
const HIER = new URL('./', import.meta.url).pathname;
const WURZEL = HIER + '../../';
const stil = readFileSync(HIER + 'stil-anleitung.css', 'utf8') + readFileSync(HIER + 'extra.css', 'utf8') + `
.syncpunkt{display:inline-block;padding:0 6pt;border-radius:8pt;background:var(--watt);color:#fff;font-size:8.5pt}
.zweispalt{display:flex;gap:10pt}.zweispalt>div{flex:1;min-width:0}
.bildreihe{display:flex;gap:7pt;margin:6pt 0}.bildreihe figure{flex:1;margin:0;min-width:0}.bildreihe img{width:100%}
.bildreihe figcaption{font-size:8pt}
.klein{font-size:9.2pt}
.bildreihe img{height:auto}.bildreihe.zwei img{height:98mm;object-fit:cover;object-position:top}.bildreihe.drei img{height:100mm;object-fit:cover;object-position:top}
.kurz img{max-height:70mm;object-fit:cover;object-position:top;width:auto;max-width:100%}
`;

const VERSION = '2.0.0';
let LANG = 'de';
const L = (de, tr) => LANG === 'de' ? de : tr;
const bild = (n, bildunterschrift) => `<figure><img src="BILD:${n}-${LANG}.png" alt=""><figcaption>${bildunterschrift}</figcaption></figure>`;
const kap = (nr, titel, wozu, farbe = '') => `<div class="kapitel ${farbe}"><div class="nr">${nr}</div><div><h2>${titel}</h2><div class="wozu">${wozu}</div></div></div>`;
const schritt = (t, text) => `<div class="schritt"><div class="zahl"></div><div class="was"><b>${t}</b><p>${text}</p></div></div>`;
const kasten = (typ, t, text) => `<div class="kasten ${typ}"><b>${t}</b><p>${text}</p></div>`;
const tab = (kopf, zeilen) => `<table><tr>${kopf.map(k => `<th>${k}</th>`).join('')}</tr>${zeilen.map(z => `<tr>${z.map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}</table>`;
const inhaltsliste = (liste) => `<div class="inhalt">${liste.map((z, i) => `<div class="zeile"><span class="nr" style="background:var(${['--watt', '--gold', '--ziegel', '--messing', '--kopf'][i % 5]})">${i + 1}</span><span class="titel2">${z[0]} <span class="wo">— ${z[1]}</span></span><span class="seite">${L('Seite', 'Sayfa')} ${z[2] || i + 2}</span></div>`).join('')}</div>`;
const mono = t => `<span class="mono">${t}</span>`;

/* =========================== VERKAUF =========================== */
function verkauf() {
  const titel = `<section class="blatt titel">
    <img class="symbol" src="BILD:icon-verkauf-512.png" alt="">
    <h1>${L('Guthabenkasse Verkauf', 'Bakiye Kasası – Satış')}</h1>
    <div class="unterzeile">${L('Kurzanleitung für den Tresen', 'Tezgâh için kısa kılavuz')}</div>
    <div class="verein">Fering Ferian e.V. · ${L('Fassung', 'Sürüm')} ${VERSION}</div>
    <div style="text-align:left;max-width:150mm;margin:6mm auto 0">
      <p>${L('Mit dem Verkaufsgerät buchen Sie den Betrag von der Karte des Gastes ab und sehen, wie viel noch darauf ist. Aufbuchen, Karten und Verwaltung gibt es hier nicht – das macht das Terminal.',
          'Satış cihazıyla misafirin kartından tutarı düşersiniz ve kartta ne kadar kaldığını görürsünüz. Para yükleme, kartlar ve yönetim burada yoktur – bunları Terminal yapar.')}</p>
      <div class="reihe" style="margin-top:4mm">
        <div class="f-gruen"><b>${L('Was Sie brauchen', 'Neye ihtiyacınız var')}</b><p>${L('Ein Handy oder Tablet mit Chrome (Android) oder Safari (iPhone), die Adresse der Kasse und das Verkaufswort vom Verein.', 'Chrome (Android) veya Safari (iPhone) olan bir telefon ya da tablet, kasanın adresi ve dernekten alacağınız satış sözcüğü.')}</p></div>
        <div class="f-sand"><b>${L('Ohne Netz', 'İnternet yokken')}</b><p>${L('Abbuchen geht weiter, bis zu einem Limit je Karte (Standard 20 €). Danach gleicht das Gerät von selbst ab.', 'Kartın harcaması bir sınıra kadar (standart 20 €) devam eder. Bağlantı gelince cihaz kendiliğinden eşitlenir.')}</p></div>
        <div class="f-ziegel"><b>${L('Kamera', 'Kamera')}</b><p>${L('Nur über eine https-Adresse und mit Ihrer Freigabe.', 'Yalnızca https adresiyle ve sizin izninizle çalışır.')}</p></div>
      </div>
      ${inhaltsliste([
        [L('Einrichten', 'Kurulum'), L('einmal pro Gerät', 'cihaz başına bir kez')],
        [L('Abbuchen', 'Harcama'), L('der Ablauf am Tresen', 'tezgâhtaki akış')],
        [L('Trinkgeld, Bestand, Rücknahme', 'Bahşiş, bakiye, geri alma'), L('die Zusätze', 'ek işlemler'), 4],
        [L('Abrechnung und Verbindung', 'Hesap ve bağlantı'), L('Ihre Zahlen, Online und Offline', 'rakamlarınız, çevrimiçi ve çevrimdışı'), 4],
        [L('Wenn etwas klemmt', 'Bir sorun olursa'), L('die Tabelle für den Ernstfall', 'acil durum tablosu'), 5],
      ])}
    </div></section>`;

  const s2 = `<section class="blatt">${kap(1, L('Einrichten', 'Kurulum'), L('Einmal pro Gerät – dauert zwei Minuten', 'Cihaz başına bir kez – iki dakika sürer'))}
    <div class="mitbild"><div class="text"><div class="schritte">
      ${schritt(L('Adresse öffnen', 'Adresi açın'), L(`Die Adresse des Verkaufsprogramms im Browser öffnen, zum Beispiel ${mono('…/guthabenkasse-verkauf.html')}. Es erscheint eine dunkle Kopfzeile mit den Reitern <i>Abbuchen</i>, <i>Abrechnung</i> und <i>Optionen</i>.`, `Satış programının adresini tarayıcıda açın, örneğin ${mono('…/guthabenkasse-verkauf.html')}. Koyu bir başlık ve <i>Harcama</i>, <i>Hesap</i>, <i>Ayarlar</i> sekmeleri görünür.`))}
      ${schritt(L('Als App installieren', 'Uygulama olarak yükleyin'), L('Android (Chrome): Menü ⋮ → <b>App installieren</b>. iPhone (Safari): Teilen-Knopf → <b>Zum Home-Bildschirm</b>. Danach öffnet sich die Kasse ohne Adresszeile.', 'Android (Chrome): Menü ⋮ → <b>Uygulamayı yükle</b>. iPhone (Safari): Paylaş düğmesi → <b>Ana Ekrana Ekle</b>. Sonra kasa adres çubuğu olmadan açılır.'))}
      ${schritt(L('Gerät benennen', 'Cihaza ad verin'), L('<i>Optionen</i>: ein <b>Gerätezeichen</b> (ein Buchstabe, bei jedem Gerät ein anderer) und Ihr <b>Vorname</b> bei „Name der Bedienung“. Er steht bei jeder Buchung und in Ihrer Abrechnung.', '<i>Ayarlar</i>: bir <b>cihaz harfi</b> (her cihazda farklı) ve „Name der Bedienung“ alanına <b>adınız</b>. Her işlemde ve hesabınızda görünür.'))}
      ${schritt(L('Verbindung zur Ablage', 'Depoya bağlantı'), L('Im Kasten <i>Ablage</i> die <b>Adresse</b> und das <b>Verkaufswort</b> eintragen (beides bekommen Sie vom Verein). Im Kopf muss <span class="syncpunkt">● Online</span> erscheinen.', '<i>Ablage</i> kutusuna <b>adresi</b> ve <b>satış sözcüğünü</b> yazın (ikisini dernekten alırsınız). Başlıkta <span class="syncpunkt">● Çevrimiçi</span> görünmelidir.'))}
      ${schritt(L('Kamera erlauben', 'Kameraya izin verin'), L('Beim ersten <b>Scannen</b> fragt der Browser nach der Kamera: <b>Zulassen</b>.', 'İlk <b>Tarama</b>da tarayıcı kamera izni ister: <b>İzin ver</b>.'))}
    </div></div>${bild('v-optionen', L('Optionen → Dieses Gerät und Ablage.', 'Ayarlar → Bu cihaz ve depo.'))}</div>
    ${kasten('k-warnung', L('Ein Buchstabe pro Gerät', 'Her cihaza bir harf'), L('Zwei Geräte mit demselben Buchstaben meldet die Ablage als Fehler („Gerätebuchstabe schon vergeben“). Es sind höchstens drei Geräte zugelassen: ein Terminal und zwei Verkaufsgeräte.', 'Aynı harfi taşıyan iki cihazı depo hata olarak bildirir („Gerätebuchstabe schon vergeben“). En fazla üç cihaz kullanılabilir: bir Terminal ve iki satış cihazı.'))}
  </section>`;

  const s3 = `<section class="blatt">${kap(2, L('Abbuchen', 'Harcama'), L('So läuft ein Verkauf', 'Bir satış böyle yürür'), 'k-messing')}
    <div class="bildreihe drei">${bild('v-eingabe', L('1 · Betrag eintippen', '1 · Tutarı yazın'))}${bild('v-ergebnis', L('2 · Scannen: Ergebnis', '2 · Taratın: sonuç'))}${bild('v-sicher', L('Sicherheitsmodus: bestätigen', 'Güvenli mod: onaylayın'))}</div>
    <div class="schritte">
      ${schritt(L('Betrag eintippen', 'Tutarı yazın'), L('Mit dem Ziffernblock den Betrag eintippen, oder eine Schnelltaste (1 €, 2 €, 3 €, 5 €) antippen. <b>Leeren</b> löscht den Betrag.', 'Rakam tuşlarıyla tutarı yazın veya hızlı tuşlardan birine (1 €, 2 €, 3 €, 5 €) dokunun. <b>Leeren</b> tutarı siler.'))}
      ${schritt(L('Karte scannen', 'Kartı taratın'), L('<b>Scannen</b> antippen und den QR-Code der Karte vor die Kamera halten. Bei schlechtem Licht schaltet sich der Blitz selbst ein (nur Chrome auf Android).', '<b>Scannen</b> düğmesine dokunun ve kartın QR kodunu kameraya tutun. Işık yetersizse flaş kendiliğinden yanar (yalnızca Android’de Chrome).'))}
      ${schritt(L('Ergebnis ablesen', 'Sonucu okuyun'), L('Oben, rötlich: was <b>abgebucht</b> wurde. Unten, grünlich: was <b>noch auf der Karte</b> ist. Beide gleich groß, damit Gast und Verkäufer es auch aus der Entfernung lesen.', 'Üstte, kırmızımsı: <b>düşülen</b> tutar. Altta, yeşilimsi: <b>kartta kalan</b> tutar. İkisi de aynı büyüklükte, uzaktan da okunur.'))}
      ${schritt(L('Nächster Gast', 'Sıradaki misafir'), L('Mit <b>Nächster Gast</b> geht es von vorn los. Der Betrag ist dann wieder leer: nach jeder Buchung beginnt es neu.', '<b>Sıradaki misafir</b> ile baştan başlarsınız. Tutar yeniden boş olur: her işlemden sonra yeniden başlar.'))}
    </div>
    ${kasten('', L('Schnellmodus und Sicherheitsmodus', 'Hızlı mod ve güvenli mod'), L('<b>Schnell:</b> Betrag, scannen, gebucht. <b>Sicher:</b> scannen, das Guthaben wird gezeigt, dann <b>Buchen</b> antippen. Neue Bediener beginnen im Sicherheitsmodus und wechseln nach zehn Buchungen auf schnell.', '<b>Hızlı:</b> tutar, tarama, işlem tamam. <b>Güvenli:</b> tarama, bakiye gösterilir, sonra <b>Buchen</b>’e dokunulur. Yeni görevliler güvenli modla başlar, on işlemden sonra hızlıya geçer.'))}
    ${kasten('k-merke', L('Kein doppeltes Buchen', 'Çift işlem yok'), L('Dieselbe Karte mit demselben Betrag wird innerhalb von fünf Sekunden nicht noch einmal gebucht („Gerade erst gebucht“). Wer wirklich zweimal dasselbe kauft, wartet kurz.', 'Aynı kart ve aynı tutar beş saniye içinde ikinci kez işlenmez („Gerade erst gebucht“). Gerçekten aynı şeyi iki kez alıyorsa kısa bir süre bekleyin.'))}
  </section>`;

  const s4 = `<section class="blatt">${kap(3, L('Trinkgeld, Bestand, Rücknahme', 'Bahşiş, bakiye, geri alma'), L('Die Zusätze am Tresen', 'Tezgâhta ek işlemler'), 'k-gold')}
    <div class="schritte">
      ${schritt(L('Trinkgeld', 'Bahşiş'), L('Nach dem Abbuchen erscheinen Tasten mit 5 %, 10 % und dem Betrag. Der Gast zahlt am Ende …,00 oder …,50 €. Tippen Sie eine Taste an, wird das Trinkgeld von derselben Karte abgebucht; im Abschluss steht es getrennt.', 'Harcamadan sonra %5, %10 ve tutar gösteren tuşlar çıkar. Misafir sonunda …,00 veya …,50 € öder. Bir tuşa dokunursanız bahşiş aynı karttan düşülür; hesapta ayrı gösterilir.'))}
      ${schritt(L('Aufrunden', 'Yuvarlama'), L('Mit <b>Aufrunden</b> oben am Abbuch-Schirm wird auf den vollen Euro aufgerundet; der Rest ist Trinkgeld. Reicht das Guthaben nur für den Betrag, wird nicht aufgerundet.', 'Harcama ekranının üstündeki <b>Aufrunden</b> ile tutar tam euroya yuvarlanır; fark bahşiştir. Bakiye yalnızca tutara yetiyorsa yuvarlanmaz.'))}
      ${schritt(L('Nur nachsehen: Bestand', 'Yalnızca bakmak: bakiye'), L('Kein Betrag (leer oder 0,00), Karte scannen: Es wird nichts gebucht, die Karte zeigt ihren <b>Bestand</b>.', 'Tutar yokken (boş veya 0,00) kartı taratırsanız hiçbir şey düşülmez, kart <b>bakiyesini</b> gösterir.'))}
      ${schritt(L('Letzte Buchung zurücknehmen', 'Son işlemi geri alma'), L('Reiter <i>Abrechnung</i>: Bei Ihrer <b>letzten</b> Abbuchung steht zwei Minuten lang <b>zurücknehmen</b>. Es entsteht eine Gegenbuchung; die ursprüngliche Buchung bleibt sichtbar. Ältere Buchungen nimmt nur das Terminal zurück.', '<i>Hesap</i> sekmesi: <b>Son</b> harcamanızın yanında iki dakika boyunca <b>zurücknehmen</b> görünür. Karşı bir kayıt oluşur; asıl işlem görünür kalır. Daha eski işlemleri yalnızca Terminal geri alabilir.'))}
    </div>
    ${kap(4, L('Abrechnung und Verbindung', 'Hesap ve bağlantı'), L('Ihre Zahlen und der Zustand der Verbindung', 'Rakamlarınız ve bağlantının durumu'), 'k-kopf')}
    <div class="mitbild"><div class="text">
      <p class="klein">${L('Reiter <i>Abrechnung</i>: Zahl und Betrag Ihrer Abbuchungen, zurückgenommene, Trinkgeld, die letzten Buchungen. <b>Abrechnung drucken</b> druckt Ihre Zahlen.', '<i>Hesap</i> sekmesi: harcama sayınız ve tutarınız, geri alınanlar, bahşiş, son işlemler. <b>Abrechnung drucken</b> rakamlarınızı yazdırır.')}</p>
      ${tab([L('Anzeige oben', 'Üstteki gösterge'), L('Bedeutung', 'Anlamı')], [
        ['<span class="syncpunkt">● Online</span>', L('Alles übertragen.', 'Her şey aktarıldı.')],
        ['<span class="syncpunkt" style="background:#8a6a12">3 offen</span>', L('Buchungen sind unterwegs oder warten.', 'İşlemler yolda veya bekliyor.')],
        ['<span class="syncpunkt" style="background:#8a4a12">Offline</span>', L('Keine Verbindung: Abbuchen geht bis zum Limit weiter.', 'Bağlantı yok: harcama sınıra kadar devam eder.')],
        ['<span class="syncpunkt" style="background:#9a2b22">! 1</span>', L('Die Ablage hat eine Buchung abgelehnt (Karte gesperrt?). Unter <i>Abrechnung</i> steht der Grund, mit <b>Gelesen</b> bestätigen.', 'Depo bir işlemi reddetti (kart engelli mi?). Sebep <i>Hesap</i>’ta yazar, <b>Gelesen</b> ile onaylayın.')],
      ])}
    </div>${bild('v-abrechnung', L('Reiter Abrechnung.', 'Hesap sekmesi.'))}</div>
  </section>`;

  const s5 = `<section class="blatt">${kap(5, L('Wenn etwas klemmt', 'Bir sorun olursa'), L('Die Tabelle für den Ernstfall', 'Acil durum tablosu'), 'k-ziegel')}
    ${tab([L('Was Sie sehen', 'Ne görüyorsunuz'), L('Was Sie tun', 'Ne yapmalısınız')], [
      [L('„Zu wenig Guthaben“', '„Zu wenig Guthaben“'), L('Der Gast hat zu wenig drauf. Hat gerade ein anderes Gerät aufgebucht, holt das Gerät den aktuellen Stand selbst. Sonst am Terminal aufladen lassen.', 'Misafirin bakiyesi yetersiz. Başka cihaz az önce yüklediyse cihaz güncel durumu kendi alır. Aksi halde Terminalde yükleme yapılır.')],
      [L('„Karte gesperrt“', '„Karte gesperrt“'), L('Die Karte wurde ersetzt oder gesperrt. Gast zum Terminal schicken.', 'Kart değiştirilmiş veya engellenmiş. Misafiri Terminale yönlendirin.')],
      [L('„Prüfnummer fehlt“ / „Prüfnummer stimmt nicht“', '„Prüfnummer fehlt“ / „stimmt nicht“'), L('Die Karte muss mit dem QR-Code gescannt werden. Eine abgetippte Nummer allein genügt am Verkaufsgerät nicht.', 'Kart QR koduyla taranmalıdır. Satış cihazında yalnızca elle yazılan numara yetmez.')],
      [L('„Keine Guthabenkarte“', '„Keine Guthabenkarte“'), L('Der Code gehört nicht zur Guthabenkasse. Karte sauber halten, näher heran, Licht an.', 'Kod Bakiye Kasası’na ait değil. Kartı temiz tutun, yaklaştırın, ışığı açın.')],
      [L('„Unklar – nicht noch einmal buchen“', '„Unklar – nicht noch einmal buchen“'), L('Die Ablage hat nicht geantwortet. Die Buchung ist vorgemerkt. <b>Nicht</b> erneut buchen; sie wird geklärt, sobald die Verbindung da ist.', 'Depo yanıt vermedi. İşlem kaydedildi. <b>Tekrar işlem yapmayın</b>; bağlantı gelince netleşir.')],
      [L('„Ohne Verbindung nicht möglich“', '„Ohne Verbindung nicht möglich“'), L('Offline ist je Karte nur ein kleiner Betrag erlaubt (Standard 20 €). Verbindung herstellen oder am Terminal buchen.', 'Çevrimdışıyken kart başına yalnızca küçük bir tutar serbest (standart 20 €). Bağlantı kurun veya Terminalde işlem yapın.')],
      [L('„Gerätebuchstabe schon vergeben“', '„Gerätebuchstabe schon vergeben“'), L('Unter <i>Optionen</i> einen anderen Buchstaben wählen, oder das Terminal entfernt das alte Gerät.', '<i>Ayarlar</i>’da başka bir harf seçin veya Terminal eski cihazı listeden kaldırsın.')],
      [L('Kamera startet nicht', 'Kamera açılmıyor'), L('Adresse muss mit <b>https://</b> beginnen (nicht aus einer Datei geöffnet). In den Browser-Einstellungen die Kamera für die Seite erlauben.', 'Adres <b>https://</b> ile başlamalıdır (dosyadan açılmamış olmalı). Tarayıcı ayarlarında bu site için kameraya izin verin.')],
      [L('Die Seite zeigt Altes', 'Sayfa eski görünüyor'), L('<i>Optionen → Nach neuer Fassung suchen</i>; App schließen und neu öffnen.', '<i>Ayarlar → Nach neuer Fassung suchen</i>; uygulamayı kapatıp yeniden açın.')],
    ])}
    ${kasten('k-merke', L('Im Zweifel', 'Şüphede'), L('Nichts doppelt eintippen. Am Terminal ist der Verlauf jeder Karte einsehbar; dort lässt sich auch jede Buchung zurücknehmen.', 'Hiçbir şeyi iki kez yazmayın. Terminalde her kartın geçmişi görülebilir; orada her işlem geri alınabilir.'))}
    <div class="fuss">${L('Guthabenkasse Verkauf', 'Bakiye Kasası – Satış')} ${VERSION} · ${L('Stand der Anleitung: Fassung', 'Kılavuz sürümü:')} ${VERSION}${LANG === 'tr' ? ' · Not: Yönetim sayfasındaki yeni metinler henüz yalnızca Almancadır.' : ''}</div>
  </section>`;
  return titel + s2 + s3 + s4 + s5;
}

/* =========================== TERMINAL =========================== */
function terminal() {
  const titel = `<section class="blatt titel">
    <img class="symbol" src="BILD:icon-512.png" alt="">
    <h1>${L('Guthabenkasse Terminal', 'Bakiye Kasası – Terminal')}</h1>
    <div class="unterzeile">${L('Anleitung für die Kassenleitung', 'Kasa sorumlusu için kılavuz')}</div>
    <div class="verein">Fering Ferian e.V. · ${L('Fassung', 'Sürüm')} ${VERSION}</div>
    <div style="text-align:left;max-width:150mm;margin:5mm auto 0">
      <p>${L('Das Terminal ist das Hauptgerät: Hier wird Geld aufgebucht, hier entstehen, drucken und verwalten sich die Karten, hier laufen Abrechnung und Sicherung. Die Verkaufsgeräte (zwei weitere Handys) buchen nur ab. Alle drei teilen sich einen Bestand in der gemeinsamen Ablage.', 'Terminal ana cihazdır: para burada yüklenir, kartlar burada oluşturulur, yazdırılır ve yönetilir; hesap ve yedekleme de burada yapılır. Satış cihazları (iki ek telefon) yalnızca düşme işlemi yapar. Üçü de ortak depodaki tek bir kaydı paylaşır.')}</p>
      <div class="reihe" style="margin-top:3mm">
        <div class="f-gruen"><b>${L('Rollen', 'Roller')}</b><p>${L('Drei Zugangswörter in der Ablage: <b>Verkauf</b>, <b>Kasse</b> (dieses Gerät), <b>Administrator</b> (nur für Sie). Die Ablage prüft die Rolle selbst.', 'Depoda üç erişim sözcüğü: <b>Satış</b>, <b>Kasa</b> (bu cihaz), <b>Yönetici</b> (yalnızca sizin için). Rolü depo kendisi denetler.')}</p></div>
        <div class="f-sand"><b>${L('Ohne Netz', 'İnternet yokken')}</b><p>${L('Aufbuchen und Abbuchen gehen weiter; alles wird später abgeglichen.', 'Yükleme ve düşme devam eder; her şey sonra eşitlenir.')}</p></div>
        <div class="f-ziegel"><b>${L('Netz nötig für', 'İnternet gereken')}</b><p>${L('Kamera (https), Abgleich, Karte ersetzen, Sicherungen.', 'Kamera (https), eşitleme, kart değiştirme, yedekler.')}</p></div>
      </div>
      ${inhaltsliste([
        [L('Terminal einrichten', 'Terminali kurmak'), L('einmal', 'bir kez')],
        [L('Ablage und Verkaufsgeräte', 'Depo ve satış cihazları'), L('Skript, Wörter, Geräte', 'betik, sözcükler, cihazlar'), '3–4'],
        [L('Karten vorbereiten', 'Kartları hazırlamak'), L('drucken, Gästeliste, Stapel', 'yazdırma, misafir listesi, deste'), 5],
        [L('Aufbuchen und Abbuchen', 'Yükleme ve düşme'), L('der Abend', 'akşam'), 6],
        [L('Karten verwalten', 'Kartları yönetmek'), L('ersetzen, sperren, zurücknehmen', 'değiştirme, engelleme, geri alma'), 7],
        [L('Verwaltung', 'Yönetim'), L('Geräte, Abrechnung, Sicherung, neues Fest', 'cihazlar, hesap, yedek, yeni etkinlik'), 8],
        [L('Wenn etwas klemmt', 'Bir sorun olursa'), L('die Tabelle', 'tablo'), 9],
      ])}
    </div></section>`;

  const s2 = `<section class="blatt">${kap(1, L('Terminal einrichten', 'Terminali kurmak'), L('Einmal vor dem ersten Abend', 'İlk akşamdan önce bir kez'))}
    <div class="mitbild"><div class="text"><div class="schritte">
      ${schritt(L('Adresse öffnen und installieren', 'Adresi açın ve yükleyin'), L(`${mono('…/guthabenkasse-terminal.html')} im Browser öffnen (<b>https</b>, sonst gibt Chrome die Kamera nicht frei). Android: Menü ⋮ → <b>App installieren</b>; iPhone: Teilen → <b>Zum Home-Bildschirm</b>.`, `${mono('…/guthabenkasse-terminal.html')} adresini tarayıcıda açın (<b>https</b>, aksi halde Chrome kamerayı vermez). Android: Menü ⋮ → <b>Uygulamayı yükle</b>; iPhone: Paylaş → <b>Ana Ekrana Ekle</b>.`))}
      ${schritt(L('Gerätezeichen und Name', 'Cihaz harfi ve ad'), L('<i>Optionen → Dieses Gerät</i>: ein Buchstabe, zum Beispiel <b>T</b> (steht in jeder neuen Kartennummer), und Ihr Vorname.', '<i>Ayarlar → Bu cihaz</i>: bir harf, örneğin <b>T</b> (her yeni kart numarasında yer alır) ve adınız.'))}
      ${schritt(L('Anlass eintragen', 'Etkinliği yazın'), L('<i>Optionen → Anlass</i>: Name des Festes, Verein, Zusatz. Das steht auf jeder Karte.', '<i>Ayarlar → Anlass</i>: etkinlik adı, dernek, ek bilgi. Her kartta yer alır.'))}
      ${schritt(L('Ablage verbinden', 'Depoyu bağlayın'), L('<i>Optionen → Ablage</i>: <b>Adresse</b> (endet auf /exec) und das <b>Kassenwort</b>. Im Kopf muss <span class="syncpunkt">● Online</span> stehen. Zum Prüfen: <i>Erweitert: von Hand abgleichen → Verbindung prüfen</i>.', '<i>Ayarlar → Ablage</i>: <b>adres</b> (/exec ile biter) ve <b>kasa sözcüğü</b>. Başlıkta <span class="syncpunkt">● Çevrimiçi</span> yazmalı. Denemek için: <i>Erweitert: von Hand abgleichen → Verbindung prüfen</i>.'))}
      ${schritt(L('PIN setzen (empfohlen)', 'PIN koyun (önerilir)'), L('<i>Verwaltung → Erweitert → Verwaltungs-PIN</i>. Danach fragen die Reiter Karten, Verwaltung und Optionen nach der PIN, damit am Tresen niemand versehentlich Karten verwaltet.', '<i>Verwaltung → Erweitert → Verwaltungs-PIN</i>. Sonra Kartlar, Yönetim ve Ayarlar sekmeleri PIN ister; böylece tezgâhta kimse yanlışlıkla kart yönetemez.'))}
    </div></div>${bild('t-optionen', L('Optionen: Gerät, Trinkgeld, Ablage.', 'Ayarlar: cihaz, bahşiş, depo.'))}</div>
    ${kasten('', L('Trinkgeld und Aufrunden', 'Bahşiş ve yuvarlama'), L('Eine Einstellung mit drei Stufen: <b>Aus</b>, <b>Tasten</b> (nach dem Abbuchen 5 %, 7,5 %, 10 %, auf 0,50 € gerundet), <b>Tasten + Aufrunden</b>. Das Anschreiben (Minus) ist ausgeschaltet; Sie schalten es unter Verwaltung → Erweitert mit dem Administrator-Wort ein.', 'Üç kademeli bir ayar: <b>Aus</b> (kapalı), <b>Tasten</b> (düşmeden sonra %5, %7,5, %10; 0,50 €’ya yuvarlanır), <b>Tasten + Aufrunden</b>. Veresiye (eksi bakiye) kapalıdır; Yönetim → Erweitert’ten yönetici sözcüğüyle açılır.'))}
  </section>`;

  const s3 = `<section class="blatt">${kap(2, L('Ablage und Verkaufsgeräte', 'Depo ve satış cihazları'), L('Das Skript in Ihrem Google-Konto – einmalig, etwa zehn Minuten', 'Google hesabınızdaki betik – tek seferlik, yaklaşık on dakika'), 'k-gold')}
    <div class="schritte">
      ${schritt(L('Neues Projekt', 'Yeni proje'), L(`Auf ${mono('script.google.com')} mit dem Konto des Vereins <i>Neues Projekt</i>; Namen geben, zum Beispiel „Guthabenkasse Ablage“. Wer schon eine ältere Ablage hat, legt für Version 2 ein <b>eigenes</b> Projekt an.`, `${mono('script.google.com')} adresinde derneğin hesabıyla <i>Yeni proje</i>; bir ad verin, örneğin „Guthabenkasse Ablage“. Eski bir depo varsa 2. sürüm için <b>ayrı</b> bir proje açın.`))}
      ${schritt(L('Skript einfügen', 'Betiği yapıştırın'), L(`Den Inhalt der Datei ${mono('ablage.gs')} komplett in ${mono('Code.gs')} einfügen (vorher alles löschen), speichern.`, `${mono('ablage.gs')} dosyasının tüm içeriğini ${mono('Code.gs')} içine yapıştırın (önce hepsini silin), kaydedin.`))}
      ${schritt(L('Drei Zugangswörter und Dateiname', 'Üç erişim sözcüğü ve dosya adı'), L(`Oben ${mono('WORT_VERKAUF')}, ${mono('WORT_KASSE')}, ${mono('WORT_ADMIN')} eintragen, alle <b>verschieden</b> und nicht erratbar. Optional ${mono('BERICHT_AN')} (E-Mail für den Bericht). Bei einem zweiten Projekt den ${mono('DATEINAME')} ändern, damit die alte Ablage unberührt bleibt.`, `Üstte ${mono('WORT_VERKAUF')}, ${mono('WORT_KASSE')}, ${mono('WORT_ADMIN')} alanlarını doldurun; üçü <b>farklı</b> ve tahmin edilemez olsun. İsteğe bağlı ${mono('BERICHT_AN')} (rapor için e-posta). İkinci proje ise eski depoya dokunmamak için ${mono('DATEINAME')} değerini değiştirin.`))}
      ${schritt(L('Bereitstellen', 'Yayınlayın'), L('<i>Bereitstellen → Neue Bereitstellung → Web-App</i>, <i>Ausführen als: Ich</i>, <i>Zugriff: Jeder</i> (nicht „Jeder mit Google-Konto“). Berechtigungen zulassen; bei „nicht verifiziert“ <i>Erweitert → Zu … (unsicher)</i>. Die <b>Web-App-URL</b> (…/exec) kopieren.', '<i>Bereitstellen → Neue Bereitstellung → Web-App</i>, <i>Ausführen als: Ich</i>, <i>Zugriff: Jeder</i> („Google hesabı olan herkes“ değil). İzinleri verin; „doğrulanmadı“ çıkarsa <i>Erweitert → Zu … (unsicher)</i>. <b>Web uygulaması URL</b>’sini (…/exec) kopyalayın.'))}
      ${schritt(L('Nach jeder Änderung: neue Version', 'Her değişiklikte: yeni sürüm'), L('Wird das Skript später geändert, <i>Bereitstellen → Bereitstellungen verwalten → Stift → Neue Version</i>. Sonst läuft die alte weiter. Die Adresse bleibt gleich.', 'Betik sonra değiştirilirse <i>Bereitstellen → Bereitstellungen verwalten → kalem → Neue Version</i>. Aksi halde eskisi çalışır. Adres aynı kalır.'))}
    </div>
  </section>

  <section class="blatt">${kap(3, L('Verkaufsgeräte anschließen', 'Satış cihazlarını bağlamak'), L('Bis zu zwei, je mit eigenem Buchstaben', 'En fazla iki, her biri kendi harfiyle'), 'k-messing')}
    <div class="schritte">
      ${schritt(L('Verkaufsprogramm öffnen', 'Satış programını açın'), L('Auf dem Handy <b>guthabenkasse-verkauf.html</b> öffnen, installieren. Dort Gerätezeichen (<b>V</b>, <b>W</b>), Vorname, Adresse und das <b>Verkaufswort</b> eintragen. Die Anleitung „Verkauf“ erklärt es Schritt für Schritt.', 'Telefonda <b>guthabenkasse-verkauf.html</b> adresini açın, yükleyin. Orada cihaz harfini (<b>V</b>, <b>W</b>), adı, adresi ve <b>satış sözcüğünü</b> girin. „Satış“ kılavuzu adım adım anlatır.'))}
      ${schritt(L('Geräteliste kontrollieren', 'Cihaz listesini kontrol edin'), L('<i>Verwaltung → Abgleich und Geräte</i>: Jedes Gerät steht mit Buchstabe, Bediener, Aufgabe und Zeit des letzten Abgleichs. <span class="syncpunkt">● online</span> heißt: in den letzten 75 Sekunden gemeldet; sonst steht dort <i>zuletzt</i> mit Uhrzeit.', '<i>Verwaltung → Abgleich und Geräte</i>: her cihaz harfi, görevli, görev ve son eşitleme zamanıyla listelenir. <span class="syncpunkt">● online</span> son 75 saniyede haber verdi demektir; aksi halde saatiyle <i>zuletzt</i> yazar.'))}
      ${schritt(L('Gerät entfernen', 'Cihazı kaldırmak'), L('Ein Buchstabe, der „schon vergeben“ ist (Gerät ausgetauscht, Speicher gelöscht), wird in der Geräteliste mit <b>entfernen</b> und dem Administrator-Wort frei. Seine Buchungen bleiben erhalten. Nach Speicherverlust besser einen neuen Buchstaben nehmen.', 'Zaten „vergeben“ olan bir harf (cihaz değişti, bellek silindi) cihaz listesinde <b>entfernen</b> ve yönetici sözcüğüyle serbest kalır. İşlemleri korunur. Bellek kaybından sonra yeni bir harf almak daha iyidir.'))}
    </div>
    <div class="kurz">${bild('t-verwaltung', L('Verwaltung → Abgleich und Geräte.', 'Yönetim → Eşitleme ve cihazlar.'))}</div>
  </section>`;

  const s4 = `<section class="blatt">${kap(4, L('Karten vorbereiten', 'Kartları hazırlamak'), L('Drucken, Namen, Stapel – alles im Reiter Karten', 'Yazdırma, adlar, deste – hepsi Kartlar sekmesinde'), 'k-ziegel')}
    <div class="mitbild"><div class="text"><div class="schritte">
      ${schritt(L('Karten drucken', 'Kart yazdırma'), L('<i>Karten → Neue Karten</i>: Anzahl eintragen (oder Namen / Gästeliste laden) und <b>Drucken</b>. Es sind acht Karten je A4-Blatt, Format 85 × 54 mm. Drucken geht erst, wenn das Gerät einmal mit der Ablage abgeglichen hat – sonst würden Nummern doppelt vergeben.', '<i>Karten → Neue Karten</i>: adedi girin (veya adları / misafir listesini yükleyin) ve <b>Drucken</b>. A4 sayfada sekiz kart, 85 × 54 mm. Yazdırma cihaz depoyla en az bir kez eşitlendikten sonra çalışır – yoksa numaralar çift verilirdi.'))}
      ${schritt(L('Die Prüfnummer', 'Kontrol numarası'), L('Jede neue Karte trägt im QR-Code eine versteckte Prüfnummer (<span class="mono">GK-T0042-K7Q2</span>). Das Verkaufsgerät kennt sie nicht und kann deshalb nur <b>gescannte</b> Karten abbuchen, keine erratenen Nummern. Alte Karten ohne Prüfnummer gelten weiter.', 'Her yeni kartın QR kodunda gizli bir kontrol numarası bulunur (<span class="mono">GK-T0042-K7Q2</span>). Satış cihazı bunu bilmez, bu yüzden yalnızca <b>taranan</b> kartları düşebilir; tahmin edilen numaralar işe yaramaz. Kontrol numarasız eski kartlar geçerli kalır.'))}
      ${schritt(L('Laminieren', 'Laminasyon'), L('Karten ausschneiden, laminieren. Auf dem Papier steht nur die Nummer (und gern der Name) – nie ein Betrag.', 'Kartları kesin, laminasyon yapın. Kağıtta yalnızca numara (isterseniz ad) bulunur – asla tutar.'))}
      ${schritt(L('Karten vorab aufladen', 'Kartları önceden yüklemek'), L('<i>Karten → Vorab aufladen</i>: Nummernbereich und Betrag, zum Beispiel Karten 1–20 je 50 €. Jede Karte bekommt eine eigene Aufbuchung; ein Stapel lässt sich im Ganzen zurücknehmen.', '<i>Karten → Vorab aufladen</i>: numara aralığı ve tutar, örneğin 1–20 numaralı kartlar 50 € ile. Her karta ayrı bir yükleme yapılır; bir deste bütün olarak geri alınabilir.'))}
      ${schritt(L('Gästeliste', 'Misafir listesi'), L('Eine Tabelle (.xlsx, .ods, .csv oder aus Excel eingefügt) als Namensliste laden; Spalte wählen, Zeilen ankreuzen. Ältere Formate (.xls, Excel-2003-XML, HTML) werden nicht mehr gelesen – bitte als .xlsx speichern.', 'Bir tabloyu (.xlsx, .ods, .csv veya Excel’den yapıştırarak) ad listesi olarak yükleyin; sütunu seçin, satırları işaretleyin. Eski biçimler (.xls, Excel 2003 XML, HTML) artık okunmaz – lütfen .xlsx olarak kaydedin.'))}
    </div></div>${bild('t-kartenseite', L('Karten: Neue Karten, Namen.', 'Kartlar: yeni kartlar, adlar.'))}</div>
    ${kasten('k-warnung', L('Neues Fest: nichts Altes', 'Yeni etkinlik: eski bir şey kalmasın'), L('Nach „Betrieb auf Null setzen“ sind Anlass, Verein, Zusatz, Namensfeld und Gästeliste leer. Alte Karten aus dem Vorjahr gelten nicht mehr.', '„Betrieb auf Null setzen“ sonrasında etkinlik, dernek, ek bilgi, ad alanı ve misafir listesi boş olur. Geçen yıldan kalan kartlar artık geçerli değildir.'))}
  </section>`;

  const s5 = `<section class="blatt">${kap(5, L('Aufbuchen und Abbuchen', 'Yükleme ve düşme'), L('Der Abend am Terminal', 'Terminalde akşam'))}
    <div class="bildreihe zwei">${bild('t-aufbuchen', L('Aufbuchen: Guthaben steht gleich da.', 'Yükleme: bakiye hemen görünür.'))}${bild('t-abbuchen', L('Abbuchen: oben abgebucht, unten Rest.', 'Düşme: üstte düşülen, altta kalan.'))}</div>
    <div class="schritte">
      ${schritt(L('Aufbuchen', 'Yükleme'), L('Reiter <i>Aufbuchen</i>: Betrag (Ziffern oder Schnelltasten 5, 10, 20, 50 €), <b>Scannen</b>. Das Ergebnis zeigt das neue Guthaben und erscheint sofort; die Ablage erfährt es gleich danach.', '<i>Aufbuchen</i> sekmesi: tutar (rakamlar veya 5, 10, 20, 50 € hızlı tuşları), <b>Scannen</b>. Sonuç yeni bakiyeyi gösterir ve hemen görünür; depo hemen ardından haber alır.'))}
      ${schritt(L('Abbuchen', 'Düşme'), L('Wie am Verkaufsgerät: Betrag, scannen, oben abgebucht (rötlich), unten Rest (grünlich). Dahinter Trinkgeld-Tasten oder <b>Aufrunden</b>.', 'Satış cihazındaki gibi: tutar, tarama, üstte düşülen (kırmızımsı), altta kalan (yeşilimsi). Ardından bahşiş tuşları veya <b>Aufrunden</b>.'))}
      ${schritt(L('Abfrage', 'Sorgu'), L('Kein Betrag, Karte scannen: nichts wird gebucht, die Karte zeigt ihren Bestand. Das geht an jedem Gerät.', 'Tutar yokken kartı taratın: hiçbir şey işlenmez, kart bakiyesini gösterir. Her cihazda çalışır.'))}
      ${schritt(L('Codes eintippen', 'Kodu elle yazmak'), L('Ohne Kamera lässt sich der Code (<span class="mono">GK-T0042</span>) ins Feld tippen. Am Terminal reicht die Nummer; Verkaufsgeräte brauchen den vollständigen QR-Inhalt.', 'Kamera olmadan kod (<span class="mono">GK-T0042</span>) alana yazılabilir. Terminalde numara yeter; satış cihazları tam QR içeriğini ister.'))}
      ${schritt(L('Sicherer und schneller Ablauf', 'Güvenli ve hızlı akış'), L('<i>Verwaltung → Erweitert → Buchungsablauf</i>: <b>Schnell</b> (Betrag, scannen, fertig), <b>Sicher</b> (scannen, Guthaben, bestätigen) oder <b>Automatisch</b>. Das Häkchen „Ergebnis erst zeigen, wenn die Ablage bestätigt hat“ macht das Terminal langsamer, aber sicherer.', '<i>Verwaltung → Erweitert → Buchungsablauf</i>: <b>Schnell</b> (tutar, tarama, tamam), <b>Sicher</b> (tarama, bakiye, onay) veya <b>Automatisch</b>. „Ergebnis erst zeigen, wenn die Ablage bestätigt hat“ kutusu Terminali yavaşlatır ama daha güvenli yapar.'))}
    </div>
    ${kasten('k-merke', L('Ohne Verbindung', 'Bağlantı yokken'), L('Buchungen bleiben im Gerät gespeichert (Browserspeicher und zweite Kopie) und gehen mit der Verbindung hinaus. Das Verkaufsgerät darf je Karte nur bis zum Offline-Limit (20 €) abbuchen. Reicht das Guthaben später nicht, nimmt die Ablage die Buchung trotzdem an; die Karte steht dann im Minus (Abrechnung: „Auf Karten im Minus“).', 'İşlemler cihazda kayıtlı kalır (tarayıcı belleği ve ikinci kopya), bağlantı gelince gönderilir. Satış cihazı kart başına yalnızca çevrimdışı sınıra (20 €) kadar düşebilir. Bakiye sonradan yetmezse depo işlemi yine de kabul eder; kart eksiye düşer (Hesap: „Auf Karten im Minus“).'))}
  </section>`;

  const s6 = `<section class="blatt">${kap(6, L('Karten verwalten', 'Kartları yönetmek'), L('Reiter Karten: Liste, Karte antippen', 'Kartlar sekmesi: liste, karta dokunun'), 'k-gold')}
    <div class="mitbild"><div class="text"><div class="schritte">
      ${schritt(L('Liste und Suche', 'Liste ve arama'), L('Unten steht jede Karte mit Nummer, Name und Guthaben. Oben im Feld lässt sich nach Nummer suchen. Antippen öffnet die Karte mit ihrem Verlauf.', 'Altta her kart numarası, adı ve bakiyesiyle görünür. Üstteki alanda numaraya göre aranır. Dokunmak kartı geçmişiyle açar.'))}
      ${schritt(L('Karte ersetzen', 'Kartı değiştirmek'), L('Karte verloren oder kaputt? <b>Karte ersetzen</b>: Die neue Karte bekommt die nächste Nummer und eine Prüfnummer, das Guthaben wird übertragen, die alte Karte ist gesperrt. Danach wird die neue gedruckt. Das braucht Verbindung zur Ablage.', 'Kart kayıp veya bozuk mu? <b>Karte ersetzen</b>: yeni kart bir sonraki numarayı ve kontrol numarasını alır, bakiye aktarılır, eski kart engellenir. Sonra yenisi yazdırılır. Depo bağlantısı gerekir.'))}
      ${schritt(L('Sperren und Freigeben', 'Engelleme ve serbest bırakma'), L('<b>Sperren</b> (mit Grund) sperrt eine Karte für alle Geräte. <b>Freigeben</b> braucht das Administrator-Wort; eine ersetzte Karte bleibt immer gesperrt.', '<b>Sperren</b> (sebep belirterek) bir kartı tüm cihazlarda engeller. <b>Freigeben</b> yönetici sözcüğü ister; değiştirilmiş kart her zaman engelli kalır.'))}
      ${schritt(L('Zurücknehmen', 'Geri almak'), L('Im Verlauf steht neben jeder Buchung <b>zurücknehmen</b>. Es entsteht eine Gegenbuchung mit fester Kennung; die Buchung wirkt höchstens einmal, auch bei Doppelklick oder von zwei Geräten. Eine Rücknahme lässt sich nicht zurücknehmen. Gerät, Bediener und Zeit stehen dabei.', 'Geçmişte her işlemin yanında <b>zurücknehmen</b> bulunur. Sabit kimlikli bir karşı kayıt oluşur; işlem en fazla bir kez etkili olur, çift tıklamada veya iki cihazdan da. Geri alma geri alınamaz. Cihaz, görevli ve zaman kaydedilir.'))}
      ${schritt(L('Korrigieren, Auszahlen, Löschen', 'Düzeltmek, ödemek, silmek'), L('<b>Setzen</b> ändert das Guthaben durch eine Korrekturbuchung. <b>Restguthaben auszahlen</b> bucht den Rest aus (Bargeld zurück). <b>Karte löschen</b> geht nur ohne Guthaben; die Buchungen bleiben erhalten.', '<b>Setzen</b> bakiyeyi bir düzeltme kaydıyla değiştirir. <b>Restguthaben auszahlen</b> kalanı düşer (nakit iade). <b>Karte löschen</b> yalnızca bakiye yokken olur; işlemler korunur.'))}
      ${schritt(L('Namen auf der Karte', 'Karttaki ad'), L('Name und Zusatz lassen sich nachträglich eintragen („Karte nochmal drucken“). Anschreiben geht nur mit Namen.', 'Ad ve ek bilgi sonradan girilebilir („Karte nochmal drucken“). Veresiye yalnızca adlı kartlarda mümkündür.'))}
    </div></div>${bild('t-detail', L('Karte antippen: Verlauf und Aktionen.', 'Karta dokunun: geçmiş ve işlemler.'))}</div>
  </section>`;

  const s7 = `<section class="blatt">${kap(7, L('Verwaltung', 'Yönetim'), L('Reiter Verwaltung (mit PIN geschützt)', 'Yönetim sekmesi (PIN ile korunur)'), 'k-kopf')}
    <div class="mitbild"><div class="text"><div class="schritte">
      ${schritt(L('Abrechnung', 'Hesap'), L('<b>Auswerten</b> zeigt die aktuellen Zahlen aus der Ablage: Umsatz (netto), Trinkgeld, noch auf Karten, aufgebucht, abgebucht, zurückgenommen, ausgezahlt, je Gerät und je Bediener. <b>Drucken</b> oder <b>Per Mail senden</b> (an die im Skript eingetragene Adresse). Es gibt keine Freigabe und keinen Kassensturz; was in der Kasse liegt, wird nicht gegengerechnet. Haben Geräte noch Buchungen nicht übertragen, steht ein Hinweis darunter.', '<b>Auswerten</b> depodaki güncel rakamları gösterir: ciro (net), bahşiş, kartlarda kalan, yüklenen, düşülen, geri alınan, ödenen; cihaz ve görevli başına. <b>Drucken</b> veya <b>Per Mail senden</b> (betikte yazılı adrese). Onay ve kasa sayımı yoktur; kasadaki nakit karşılaştırılmaz. Cihazlar henüz aktarılmamış işlemler taşıyorsa altında bir not görünür.'))}
      ${schritt(L('Sicherungen', 'Yedekler'), L('Die Ablage sichert sich selbst (alle 20 Minuten bei Änderungen, die letzten zwölf bleiben). <b>Sicherung der Ablage jetzt</b> macht eine weitere. <b>Wiederherstellen</b> braucht das Administrator-Wort; vorher wird der jetzige Stand gesichert. Ist die Ablage neuer als die Sicherung, fragt das Terminal ausdrücklich nach.', 'Depo kendini yedekler (değişiklik varsa 20 dakikada bir, son on iki kalır). <b>Sicherung der Ablage jetzt</b> ek bir yedek alır. <b>Wiederherstellen</b> yönetici sözcüğü ister; önce mevcut durum yedeklenir. Depo yedekten daha yeniyse Terminal ayrıca sorar.'))}
      ${schritt(L('Erweitert', 'Gelişmiş'), L('Buchungsablauf, Gerätename, PIN. Für alle Geräte mit Administrator-Wort: <b>Anschreiben</b> erlauben (Standard aus, Grenze 50 €) und das <b>Offline-Limit</b> je Karte und Gerät. <b>Karten und Stand neu von der Ablage laden</b> hilft, wenn ein Gerät nach einem Speicherproblem nicht mehr stimmt.', 'Akış, cihaz adı, PIN. Tüm cihazlar için yönetici sözcüğüyle: <b>Anschreiben</b> izni (standart kapalı, sınır 50 €) ve kart ile cihaz başına <b>çevrimdışı sınır</b>. <b>Karten und Stand neu von der Ablage laden</b>, bellek sorunundan sonra bir cihaz tutmadığında yardımcı olur.'))}
      ${schritt(L('Neues Fest', 'Yeni etkinlik'), L('<i>Optionen → Betrieb auf Null setzen</i> (Administrator-Wort): Die Ablage legt vorher ein Archiv an, dann sind alle Karten, Buchungen und die Beschriftung leer – auf allen Geräten. Optional beginnen die Kartennummern wieder bei 1.', '<i>Ayarlar → Betrieb auf Null setzen</i> (yönetici sözcüğü): Depo önce bir arşiv oluşturur, sonra tüm kartlar, işlemler ve etiketler tüm cihazlarda sıfırlanır. İsteğe bağlı kart numaraları yeniden 1’den başlar.'))}
    </div></div>${bild('t-abrechnung', L('Verwaltung → Abrechnung.', 'Yönetim → Hesap.'))}</div>
  </section>`;

  const s8 = `<section class="blatt">${kap(8, L('Wenn etwas klemmt', 'Bir sorun olursa'), L('Die Tabelle für den Ernstfall', 'Acil durum tablosu'), 'k-ziegel')}
    ${tab([L('Was Sie sehen', 'Ne görüyorsunuz'), L('Was Sie tun', 'Ne yapmalısınız')], [
      [L('„Gerätebuchstabe schon vergeben“', '„Gerätebuchstabe schon vergeben“'), L('Ein anderer Browser/Speicher hat den Buchstaben schon. Unter <i>Optionen</i> einen neuen Buchstaben wählen oder in der Geräteliste das alte Gerät <b>entfernen</b> (Administrator-Wort).', 'Başka bir tarayıcı/bellek harfi zaten kullanıyor. <i>Ayarlar</i>’da yeni harf seçin veya cihaz listesinde eski cihazı <b>entfernen</b> ile kaldırın (yönetici sözcüğü).')],
      [L('„Zeitüberschreitung“', '„Zeitüberschreitung“'), L('Die Ablage antwortet langsam (Google). Buchungen gehen nicht verloren, sie bleiben gespeichert und werden nachgeliefert. Neue Skript-Version verwenden (sie schreibt bei Abfragen nicht mehr).', 'Depo yavaş yanıt veriyor (Google). İşlemler kaybolmaz, kayıtlı kalır ve sonradan gönderilir. Yeni betik sürümünü kullanın (sorgularda artık yazmıyor).')],
      [L('Roter Punkt „! 1“', 'Kırmızı nokta „! 1“'), L('Die Ablage hat eine Buchung abgelehnt (zum Beispiel Karte inzwischen gesperrt). Grund steht in der Verwaltung; „Gelesen“ bestätigt.', 'Depo bir işlemi reddetti (örneğin kart sonradan engellendi). Sebep Yönetim’de yazar; „Gelesen“ ile onaylayın.')],
      [L('Karten zeigen 0,00 €', 'Kartlar 0,00 € gösteriyor'), L('Das Gerät hat sich noch nie mit der Ablage abgeglichen (Buchstabe belegt, falsches Wort). Verbindung prüfen, dann <b>Karten und Stand neu von der Ablage laden</b>.', 'Cihaz depoyla hiç eşitlenmedi (harf dolu, yanlış sözcük). Bağlantıyı kontrol edin, sonra <b>Karten und Stand neu von der Ablage laden</b>.')],
      [L('Karten drucken geht nicht', 'Kart yazdırılamıyor'), L('Erst muss das Gerät einmal erfolgreich abgleichen (Kopf: ● Online).', 'Cihaz önce bir kez başarıyla eşitlenmeli (başlık: ● Online).')],
      [L('Karte „Prüfnummer fehlt“', 'Kart „Prüfnummer fehlt“'), L('Mit dem QR-Code scannen; Altkarten ohne Prüfnummer gehen ohne.', 'QR koduyla taratın; kontrol numarasız eski kartlar bunsuz çalışır.')],
      [L('Kamera startet nicht', 'Kamera açılmıyor'), L('Adresse muss mit https:// beginnen; Kamera für die Seite erlauben. Aus einer gespeicherten Datei geht die Kamera nicht.', 'Adres https:// ile başlamalı; bu site için kameraya izin verin. Kayıtlı dosyadan açılırsa kamera çalışmaz.')],
      [L('Nach einem Update alles beim Alten', 'Güncellemeden sonra eski görünüyor'), L('<i>Optionen → Nach neuer Fassung suchen</i>; App schließen, neu öffnen. Beim Skript nicht vergessen: <i>Neue Version</i> bereitstellen.', '<i>Ayarlar → Nach neuer Fassung suchen</i>; uygulamayı kapatıp açın. Betikte unutmayın: <i>Neue Version</i> yayınlayın.')],
    ])}
    ${kasten('k-merke', L('Gut zu wissen', 'Bilinmesi iyi olur'), L('Die Ablage ist der Wächter über das Guthaben: Doppelt gesendete Buchungen wirken nur einmal, Gesperrtes wird abgelehnt, und die Rolle (Verkauf, Kasse, Administrator) prüft die Ablage selbst, nicht nur das Programm. Ein Gerät mit alter Fassung 0.12 kann weiter abgleichen, hat aber keinen dieser Schutzmechanismen.', 'Depo bakiyenin bekçisidir: çift gönderilen işlemler yalnızca bir kez etkili olur, engellenmiş kartlar reddedilir ve rolü (Satış, Kasa, Yönetici) yalnızca program değil depo da denetler. Eski 0.12 sürümlü bir cihaz eşitlemeye devam edebilir ama bu korumaların hiçbirine sahip değildir.'))}
    <div class="fuss">${L('Guthabenkasse Terminal', 'Bakiye Kasası – Terminal')} ${VERSION}${LANG === 'tr' ? ' · Not: Yönetim sayfasındaki yeni metinler henüz yalnızca Almancadır; düğme adları kılavuzda olduğu gibi Almanca yazılmıştır.' : ''}</div>
  </section>`;
  return titel + s2 + s3 + s4 + s5 + s6 + s7 + s8;
}

/* =========================== Ausgabe =========================== */
const browser = await chromium.launch();
for (const [name, fn, titelText] of [['Terminal', terminal, 'Terminal'], ['Verkauf', verkauf, 'Verkauf']]) {
  for (const lang of ['de', 'tr']) {
    LANG = lang;
    let inhalt = fn().replace(/BILD:([\w.-]+)/g, (_, n) => {
      const f = n.endsWith('.png') && !n.startsWith('icon') ? HIER + 'bild/' + n : WURZEL + n;
      return 'data:image/png;base64,' + readFileSync(f).toString('base64');
    });
    const seite = `<!doctype html><html lang="${lang}"><head><meta charset="utf-8"><title>Guthabenkasse ${titelText}</title><style>${stil}</style></head><body>${inhalt}</body></html>`;
    const pfad = HIER + `Anleitung-${name}-${lang}`;
    writeFileSync(pfad + '.html', seite);
    const p = await browser.newPage({ viewport: { width: 680, height: 1123 } });
    await p.goto('file://' + pfad + '.html', { waitUntil: 'networkidle' });
    await p.emulateMedia({ media: 'print' });
    const m = await p.evaluate(() => [...document.querySelectorAll('section.blatt')].map(e => e.getBoundingClientRect().height));
    const mm = px => Math.round(px / 3.7795);
    const zuLang = m.map((h, i) => [i + 1, mm(h)]).filter(([, h]) => h > 266);
    await p.pdf({ path: pfad + '.pdf', format: 'A4', printBackground: true, displayHeaderFooter: true, headerTemplate: '<div></div>',
      footerTemplate: `<div style="width:100%;font-size:7.5pt;color:#57685C;font-family:sans-serif;padding:0 15mm;display:flex;justify-content:space-between"><span>Guthabenkasse ${titelText} · ${lang === 'de' ? 'Bedienungsanleitung' : 'Kullanım kılavuzu'}</span><span>${lang === 'de' ? 'Seite' : 'Sayfa'} <span class="pageNumber"></span> / <span class="totalPages"></span></span></div>`,
      margin: { top: '15mm', bottom: '16mm', left: '15mm', right: '15mm' } });
    console.log(name, lang, m.length + ' Seiten', zuLang.length ? 'ZU LANG: ' + JSON.stringify(zuLang) : 'alle passen');
    await p.close();
  }
}
await browser.close();
