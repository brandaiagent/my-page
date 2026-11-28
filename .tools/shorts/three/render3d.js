// 3D 쇼츠 프레임 렌더: 이 폴더를 로컬 서버로 띄우고(ES 모듈), 장면 html 의 window.renderFrame(t,W,B,T) 를 프레임마다 호출
// 사용법: node render3d.js 장면.html words.json 출력폴더 [fps] [--preview]
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const [html, wordsPath, out, fpsArg, flag] = process.argv.slice(2);
const FPS = +fpsArg || 30, DIR = __dirname;
const raw = JSON.parse(fs.readFileSync(wordsPath, 'utf8'));
let si = 0, s0 = 0; const W = [], B = [];
raw.forEach((w, i) => { W.push({ text: w.text, start: w.start, end: w.end, s: si });
  if (/[.?!]$/.test(w.text) || i === raw.length - 1) { const n = raw[i + 1]; const e = n ? (w.end + n.start) / 2 : w.end + 0.8; B.push([s0, e]); s0 = e; si++; } });
const T = B[B.length - 1][1];
fs.mkdirSync(out, { recursive: true }); fs.writeFileSync(path.join(out, 'bounds.json'), JSON.stringify({ B, T }));
const types = { '.html': 'text/html', '.js': 'text/javascript' };
const srv = http.createServer((q, s) => { const f = path.join(DIR, decodeURIComponent(q.url.split('?')[0]));
  fs.readFile(f, (e, d) => { if (e) { s.writeHead(404); s.end(); } else { s.writeHead(200, { 'Content-Type': types[path.extname(f)] || 'application/octet-stream' }); s.end(d); } }); });
srv.listen(0, async () => {
  const port = srv.address().port;
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
  p.on('pageerror', e => console.log('page error', e.message));
  await p.goto(`http://127.0.0.1:${port}/${path.basename(html)}`, { waitUntil: 'networkidle' });
  await p.waitForFunction(() => window.ready === true); await p.evaluate(() => document.fonts.ready);
  const times = flag === '--preview' ? B.map(([a, e]) => a + (e - a) * 0.7) : [...Array(Math.round(T * FPS)).keys()].map(f => f / FPS);
  for (let i = 0; i < times.length; i++) {
    await p.evaluate(([t, W, B, T]) => new Promise(res => { window.renderFrame(t, W, B, T); requestAnimationFrame(() => requestAnimationFrame(res)); }), [times[i], W, B, T]);
    await p.screenshot({ path: path.join(out, `f${String(i).padStart(4, '0')}.jpg`), type: 'jpeg', quality: 90 });
  }
  await b.close(); srv.close(); console.log('frames', times.length, 'T', T.toFixed(2));
});
