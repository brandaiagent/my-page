// 대사 타임라인(timeline.json: {T, lines:[{i,who,cap,start,end,words}]}) 기반 3D 쇼츠 프레임 렌더
// 사용법: node render-tl.js 장면.html timeline.json 출력폴더 [fps] [--preview]
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const [html, tlPath, out, fpsArg, flag] = process.argv.slice(2);
const FPS = +fpsArg || 30, DIR = __dirname, TL = JSON.parse(fs.readFileSync(tlPath, 'utf8'));
fs.mkdirSync(out, { recursive: true });
const srv = http.createServer((q, s) => { const f = path.join(DIR, decodeURIComponent(q.url.split('?')[0]));
  fs.readFile(f, (e, d) => { if (e) { s.writeHead(404); s.end(); } else { s.writeHead(200, { 'Content-Type': f.endsWith('.js') ? 'text/javascript' : 'text/html' }); s.end(d); } }); });
srv.listen(0, async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
  p.on('pageerror', e => console.log('page error', e.message));
  await p.goto(`http://127.0.0.1:${srv.address().port}/${path.basename(html)}`, { waitUntil: 'networkidle' });
  await p.waitForFunction(() => window.ready === true); await p.evaluate(() => document.fonts.ready);
  const L = TL.lines;
  const times = flag === '--preview'
    ? L.map((l, j) => { const e = L[j + 1] ? L[j + 1].start : TL.T; return l.start + (e - l.start) * 0.6; })
    : [...Array(Math.round(TL.T * FPS)).keys()].map(f => f / FPS);
  for (let i = 0; i < times.length; i++) {
    await p.evaluate(([t, TL]) => new Promise(res => { window.renderFrame(t, TL); requestAnimationFrame(() => requestAnimationFrame(res)); }), [times[i], TL]);
    await p.screenshot({ path: path.join(out, `f${String(i).padStart(4, '0')}.jpg`), type: 'jpeg', quality: 90 });
  }
  await b.close(); srv.close(); console.log('frames', times.length, 'T', TL.T.toFixed(2));
});
