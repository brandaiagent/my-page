// 설명 애니메이션 쇼츠 프레임 렌더 (v2: 연속 나레이션 + 단어별 자막 + 직접 그린 장면)
// 사용법: node render.js scene.html words.json 출력폴더 [fps]
// words.json: Typecast with-timestamps 의 words. 문장 끝(. ? !)마다 장면이 하나씩 넘어간다
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const [html, wordsPath, out, fpsArg] = process.argv.slice(2);
const FPS = +fpsArg || 30;
const raw = JSON.parse(fs.readFileSync(wordsPath, 'utf8'));
let si = 0; const W = [], B = []; let sStart = 0;
raw.forEach((w, i) => {
  W.push({ text: w.text, start: w.start, end: w.end, s: si });
  if (/[.?!]$/.test(w.text) || i === raw.length - 1) {
    const next = raw[i + 1];
    const end = next ? (w.end + next.start) / 2 : w.end + 0.8;
    B.push([sStart, end]); sStart = end; si++;
  }
});
const T = B[B.length - 1][1];
fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(path.join(out, 'bounds.json'), JSON.stringify({ B, T }));
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
  await p.goto('file://' + path.resolve(html), { waitUntil: 'networkidle' });
  await p.evaluate(() => document.fonts.ready);
  const n = Math.round(T * FPS);
  for (let f = 0; f < n; f++) {
    await p.evaluate(([t, W, B, T]) => window.renderFrame(t, W, B, T), [f / FPS, W, B, T]);
    await p.screenshot({ path: path.join(out, `f${String(f).padStart(4, '0')}.jpg`), type: 'jpeg', quality: 90 });
  }
  await b.close(); console.log('frames', n, 'scenes', B.length, 'T', T.toFixed(2));
})();
