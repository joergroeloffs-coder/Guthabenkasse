// Stellt den Ordner lokal/paket/ zusammen: Server, ablage.gs, die drei Apps, Startdateien. Danach zippen und auf den Rechner kopieren.
// Aufruf: node bauen/bauen.mjs && node lokal/paket.mjs
import { mkdirSync, copyFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const W = join(dirname(fileURLToPath(import.meta.url)), '..'), Z = join(W, 'lokal', 'paket');
mkdirSync(join(Z, 'app'), { recursive: true });
const kopie = (von, nach) => { if (!existsSync(von)) throw new Error('fehlt: ' + von); copyFileSync(von, nach); };
for (const f of ['ablage-server.mjs', 'start.bat', 'start.sh']) kopie(join(W, 'lokal', f), join(Z, f));
kopie(join(W, 'ablage.gs'), join(Z, 'ablage.gs'));
kopie(join(W, 'docs', 'LOKALE-ABLAGE.md'), join(Z, 'ANLEITUNG.md'));
for (const f of ['index.html', 'guthabenkasse-terminal.html', 'guthabenkasse-verkauf.html', 'guthabenkasse-anzeige.html', 'manifest-terminal.webmanifest', 'manifest-verkauf.webmanifest',
  'manifest-anzeige.webmanifest', 'manifest.webmanifest', 'sw.js', 'favicon.svg', 'apple-touch-icon.png', 'icon-192.png', 'icon-512.png', 'icon-verkauf-192.png', 'icon-verkauf-512.png', 'icon-32.png', 'icon-maskable-512.png', 'icon-verkauf-maskable-512.png']) {
  if (existsSync(join(W, f))) kopie(join(W, f), join(Z, 'app', f));
}
console.log('Paket in', Z);
