import {server2,dev} from './gsh2.mjs';
let ok=0,bad=0; const t=(n,c)=>{ if(c){ok++;} else {bad++; console.log('FAIL',n);} };
const s=server2(); const T=dev(s,'T','kt','Anna'), V=dev(s,'V','kv','Ben'), V2=dev(s,'W','kw','Cem');
// Karten anlegen
let r=s.post('ka',{aktion:'karten',was:'anlegen',karten:[{nr:'A0001',code:'K7Q2'},{nr:'A0002',code:'ABCD'}]}); t('anlegen',r.ok&&r.neu===2);
t('verkauf darf keine karten',s.post('vk',{aktion:'karten',was:'anlegen',karten:[{nr:'A0009',code:'AAAA'}]}).verweigert);
t('falsches wort',!!s.post('nix',{aktion:'holen'}).fehler);
// Aufbuchen
r=T.sync('ka',[T.buche('A0001',2000,'auf',{kc:'K7Q2'})]); const id1='bT1'; t('auf ok',r.ergebnisse[id1].st==='ok');
// Verkauf versucht aufzubuchen
r=V.sync('vk',[V.buche('A0001',5000,'auf')]); t('verkauf auf abgelehnt',r.ergebnisse['bV1'].st==='abgelehnt'&&r.ergebnisse['bV1'].code==='recht');
// Abbuchung
r=V.sync('vk',[V.buche('A0001',-500,'ab',{kc:'K7Q2'})]); t('ab ok',r.ergebnisse['bV2'].st==='ok'&&r.ergebnisse['bV2'].saldo===1500);
// Doppelt gesendet
const b3=V.buche('A0001',-300,'ab',{kc:'K7Q2'}); r=V.sync('vk',[b3]); const r2=V.sync('vk',[b3]);
t('idempotent',r2.ergebnisse[b3.id].st==='doppelt'&&r2.seq===r.seq);
// Falscher Prüfcode
r=V.sync('vk',[V.buche('A0001',-100,'ab',{kc:'XXXX'})]); t('prüfcode',Object.values(r.ergebnisse)[0].code==='pruefnummer');
// Gleichzeitig: Rest 1200; zwei Geräte buchen je 800 online
const x1=V.buche('A0001',-800,'ab',{kc:'K7Q2'}), x2=V2.buche('A0001',-800,'ab',{kc:'K7Q2'});
const ra=V.sync('vk',[x1]), rb=V2.sync('vk',[x2]);
t('atomar',ra.ergebnisse[x1.id].st==='ok'&&rb.ergebnisse[x2.id].code==='guthaben');
// Offline-Buchung überzieht → ok mit ueber
const y=V2.buche('A0001',-900,'ab',{kc:'K7Q2',off:1}); r=V2.sync('vk',[y]);
t('offline überzogen gekennzeichnet',r.ergebnisse[y.id].st==='ok'&&r.ergebnisse[y.id].ueber===true);
// Storno: Verkauf, eigene letzte
T.sync('ka',[T.buche('A0001',3000,'auf',{kc:'K7Q2'})]);
const last=V.buche('A0001',-100,'ab',{kc:'K7Q2'}); // aktuell Saldo? Prüfen
r=V.sync('vk',[last]); const sid='st-'+last.id;
const st=(d,ref,rolle='vk')=>{ const b=d.buche('A0001',0,'storno',{ref,id:'st-'+ref}); return d.sync(rolle,[b]).ergebnisse['st-'+ref]; };
const s1=st(V,last.id); t('storno ok',s1.st==='ok'||s1.code==='guthaben');
const s2=st(V,last.id); t('doppel-storno',s2.st==='doppelt'||s2.st==='abgelehnt');
const cnt=s.post('ka',{aktion:'holen'}).daten.buchungen.filter(b=>b.ref===last.id&&b.art==='storno').length; t('storno einmal',cnt===1);
// Storno einer fremden Buchung durch Verkauf
const fremd=st(V2,'bV2'); t('fremd storno',fremd.st==='abgelehnt'&&fremd.code==='recht');
// Storno von Storno
t('storno von storno',st(T,'st-'+last.id,'ka').code==='storno');
// Karte ersetzen
r=s.post('ka',{aktion:'karten',was:'ersetzen',alt:'A0001',neu:'A0003',code:'ZZZZ',id:'ers1',geraet:{id:'T'}});
t('ersetzen',r.ok); 
r=s.post('ka',{aktion:'karten',was:'ersetzen',alt:'A0001',neu:'A0003',code:'ZZZZ',id:'ers1',geraet:{id:'T'}}); t('ersetzen idempotent',r.ok&&r.schon);
const sa=s.post('ka',{aktion:'holen'}).daten.buchungen; const sal={}; sa.forEach(b=>sal[b.karte]=(sal[b.karte]||0)+b.cent);
t('guthaben übertragen',sal['A0001']===0&&sal['A0003']>0);
r=V.sync('vk',[V.buche('A0001',-100,'ab',{kc:'K7Q2'})]); t('gesperrte karte',Object.values(r.ergebnisse)[0].code==='gesperrt');
// Altkarte ohne Code wird akzeptiert
r=T.sync('ka',[T.buche('A0100',1000,'auf')]); t('altkarte auf',Object.values(r.ergebnisse)[0].st==='ok');
r=V.sync('vk',[V.buche('A0100',-200,'ab')]); t('altkarte ab',Object.values(r.ergebnisse)[0].st==='ok');
// Geräte max 3
const X=dev(s,'X','kx'); r=X.sync('vk',[]); t('viertes gerät',!!r.fehler&&r.geraeteLimit);
const T2=dev(s,'T','andere'); r=T2.sync('ka',[]); t('gleicher buchstabe',!!r.fehler&&r.geraetKonflikt);
// Verkauf: Bericht nur eigene, Kasse: vollständig
r=s.post('vk',{aktion:'bericht',geraet:{id:'V'}}); t('meine abrechnung',r.ok&&r.geraet==='V'&&r.bericht===undefined);
r=s.post('ka',{aktion:'bericht'}); t('gesamt',r.ok&&r.bericht.proGeraet.length>=2);
t('abschluss vorläufig',r.bericht.endgueltig===false);
// Neubeginn nur Admin
t('neubeginn kasse',s.post('ka',{aktion:'neubeginn'}).verweigert);
// Sicherung + Restore
r=s.post('ka',{aktion:'sicherung',was:'erstellen'}); t('sicherung',r.ok);
t('restore kasse verboten',s.post('ka',{aktion:'sicherung',was:'wiederherstellen',name:r.name}).verweigert);
const before=s.post('ka',{aktion:'holen'}).daten.buchungen.length;
const nm=r.name; T.sync('ka',[T.buche('A0100',500,'auf')]);
r=s.post('ad',{aktion:'sicherung',was:'wiederherstellen',name:nm}); t('restore neuer→warnung',r.neuer===true);
r=s.post('ad',{aktion:'sicherung',was:'wiederherstellen',name:nm,ueberschreiben:true}); t('restore',r.ok);
t('restore stand',s.post('ka',{aktion:'holen'}).daten.buchungen.length===before);
// Kassenbuch
s.post('ka',{aktion:'kassenbuch',eintrag:{id:'k1',art:'anfang',cent:10000}}); s.post('ka',{aktion:'kassenbuch',eintrag:{id:'k1',art:'anfang',cent:10000}});
r=s.post('ka',{aktion:'bericht'}); t('kassenbuch einmal',r.bericht.kasse.anfang===10000);
// Abschluss mit ausstehendem
r=s.post('ka',{aktion:'abschluss'}); t('abschluss verweigert',!!r.fehler&&r.vorlaeufig);
// Neubeginn Admin
r=s.post('ad',{aktion:'neubeginn'}); t('neubeginn admin',r.ok);
// Kompatibilität: Gerät mit Fassung 0.12 (holen/legen)
{ const s2=server2(); const B=(n,c,a)=>({id:'alt'+n,karte:'B0001',cent:c,art:a,zeit:1700000000000+n,geraet:'B',n:n,k:'x'+n});
  const paket={karten:{B0001:{nr:'B0001',ts:1}},buchungen:[B(1,1000,'auf'),B(2,-300,'ab')],anlass:{name:'Alt',verein:'',zusatz:'',ts:1},geloescht:{},epoche:0,nummernNeu:false};
  const r1=s2.post('ka',{aktion:'legen',daten:paket,geraet:'B'}); const r2=s2.post('ka',{aktion:'legen',daten:paket,geraet:'B'});
  const h=s2.post('ka',{aktion:'holen'});
  t('alt: legen ok',r1.ok&&r2.ok); t('alt: keine Doppelten',h.daten.buchungen.length===2&&h.daten.buchungen.every(b=>typeof b.s==='number'));
  t('alt: Verkauf darf nicht legen',!!s2.post('vk',{aktion:'legen',daten:paket,geraet:'B'}).verweigert);
  const sy=dev(s2,'T','k1').sync('ka',[]); t('alt→neu: Buchungen per Abgleich sichtbar',sy.buchungen.length===2);
}
console.log(ok+' ok, '+bad+' Fehler');
