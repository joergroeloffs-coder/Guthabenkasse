import vm from 'node:vm'; import { readFileSync } from 'node:fs';
export function server2(opt={}){
  let code=readFileSync(new URL('../ablage.gs',import.meta.url).pathname,'utf8');
  const setze=(n,w)=>{ code=code.replace(new RegExp('var '+n+'\\s*=\\s*[^;]*;'),'var '+n+' = '+JSON.stringify(w)+';'); };
  setze('WORT_VERKAUF','vk'); setze('WORT_KASSE','ka'); setze('WORT_ADMIN','ad');
  setze('BERICHT_AN','a@example.org'); if(opt.prozent!==undefined) setze('GEBUEHR_PROZENT',opt.prozent);
  const dateien=[], mails=[], cache={}; let uhr=opt.start||1700000000000;
  const mk=(name,inhalt)=>({name,inhalt,papier:false,t:new Date(uhr),getBlob(){return{getDataAsString:()=>this.inhalt};},setContent(s){this.inhalt=s;},isTrashed(){return this.papier;},getName(){return this.name;},setTrashed(b){this.papier=b;},getSize(){return this.inhalt.length;},getDateCreated(){return this.t;}});
  const D=class extends Date{ constructor(...a){ if(a.length) super(...a); else super(uhr);} static now(){return uhr;} };
  const sb={console,JSON,Math,Date:D,String,Number,Object,Array,isFinite,parseInt,parseFloat,
    ContentService:{MimeType:{JSON:'json'},createTextOutput:s=>({text:s,setMimeType(){return this;}})},
    LockService:{getScriptLock:()=>({waitLock(){},releaseLock(){}})},
    MimeType:{PLAIN_TEXT:'t'},
    DriveApp:{getFilesByName:n=>{const t=dateien.filter(d=>d.name===n);let i=0;return{hasNext:()=>i<t.length,next:()=>t[i++]};},
      createFile:(n,c)=>{const d=mk(n,c);dateien.push(d);return d;},
      searchFiles:()=>{const t=dateien.filter(d=>/guthabenkasse-sicherung-/.test(d.name)&&!d.papier);let i=0;return{hasNext:()=>i<t.length,next:()=>t[i++]};}},
    CacheService:{getScriptCache:()=>({put:(k,v)=>{cache[k]=v;},get:k=>cache[k]===undefined?null:cache[k]})},
    MailApp:{sendEmail:m=>mails.push(m)}};
  vm.createContext(sb); vm.runInContext(code,sb);
  const W={vk:'vk',ka:'ka',ad:'ad'};
  const post=(rolle,obj)=>JSON.parse(sb.doPost({postData:{contents:JSON.stringify(Object.assign({wort:W[rolle]||rolle},obj))}}).text);
  return {post,dateien,mails,sb,zeit:(t)=>{uhr=t;},jetzt:()=>uhr,hash:s=>sb.kettenHash(s),text:(b,v)=>sb.kettenText(b,v)};
}
export function dev(srv,id,schluessel,wer=''){ let n=0,k='',c=0; 
 const g=()=>({id,schluessel,name:'G'+id,bediener:wer,ausstehend:0});
 return {g, buche(karte,cent,art,extra={}){ n++; const b=Object.assign({id:'b'+id+n,karte,cent,art,zeit:srv.jetzt(),geraet:id},wer?{wer}:{},extra); b.n=n; b.k=srv.hash(srv.text(b,k)); k=b.k; return b; },
   sync(rolle,neu=[],extra={}){ const r=srv.post(rolle,Object.assign({aktion:'sync',geraet:g(),neu,cursor:c,kv:0},extra)); if(r.ok) c=r.cursor; return r; }, stand:()=>({n,k}) };
}
