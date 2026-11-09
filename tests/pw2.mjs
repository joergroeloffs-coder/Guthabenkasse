import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import { server2 } from './gsh2.mjs';
export const URL_ABLAGE = 'https://script.google.com/macros/s/TEST/exec';
export async function start(opt = {}) {
  const srv = server2(opt);
  const browser = await chromium.launch();
  const steuer = { offline: false, verzoegerung: 0, nurAntwortVerlieren: false, log: [] };
  async function seite(modus, geraet, wort, name = '') {
    const ctx = await browser.newContext({ viewport: opt.viewport || { width: 390, height: 780 } });
    const page = await ctx.newPage();
    page.on('pageerror', e => steuer.log.push('FEHLER ' + modus + ': ' + e.message));
    await ctx.route(URL_ABLAGE, async route => {
      if (steuer.offline) return route.abort('failed');
      if (steuer.verzoegerung) await new Promise(r => setTimeout(r, steuer.verzoegerung));
      const q = JSON.parse(route.request().postData());
      const antwort = srv.post(q.wort, q);
      if (steuer.nurAntwortVerlieren) { steuer.nurAntwortVerlieren = false; return route.abort('failed'); }
      route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(antwort) });
    });
    await page.goto('file:///home/user/guthabenkasse/guthabenkasse-' + modus + '.html');
    await page.evaluate(([g, w, n, schnell]) => {
      db.geraet = g; db.ablage = { adresse: 'https://script.google.com/macros/s/TEST/exec', wort: w, intervall: 0 };
      db.bediener = n; db.modus = 'schnell'; db.bestaetigen = !schnell; db.ton = false; db.kompakt = false; sichern();
    }, [geraet, wort, name, !!opt.schnell]);
    return page;
  }
  return { srv, browser, steuer, seite, ende: () => browser.close() };
}
