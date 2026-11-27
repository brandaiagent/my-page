// 키네틱 자막 오버레이 (스펙 JSON 버전)
// 사용법: node kinetic.js spec.json 프레임폴더
// spec: {total, tag, tagEnd, scenes:[{s,e,items:[{txt,top,size,at,shake}],rows:[{k,v,top,at}],small:{txt,top,at},arrow:{at}}]}
const { chromium } = require('playwright');
const FPS = 30;
const SPEC = JSON.parse(require('fs').readFileSync(process.argv[2], 'utf8'));
const OUT = process.argv[3]; require('fs').mkdirSync(OUT, { recursive: true });
const TOTAL = SPEC.total;
const html = `<html><head><link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@700;900&display=block" rel="stylesheet"><style>
*{margin:0;box-sizing:border-box}body{width:1080px;height:1920px;background:transparent;font-family:'Noto Sans KR';overflow:hidden;position:relative}
.dim{position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,.35),rgba(0,0,0,0) 25%,rgba(0,0,0,0) 70%,rgba(0,0,0,.45))}
.flash{position:absolute;inset:0;background:#fff;opacity:0}
.l{position:absolute;left:0;right:0;text-align:center;color:#fff;font-weight:900;letter-spacing:-4px;opacity:0;transform-origin:50% 50%;-webkit-text-stroke:16px #000;paint-order:stroke fill;text-shadow:0 10px 26px rgba(0,0,0,.55);line-height:1.15}
.y{color:#ffe033}.r{color:#ff5a4d}
.pill{color:#ffe033}
.row{position:absolute;left:0;right:0;text-align:center;opacity:0;font-weight:900;letter-spacing:-3px;-webkit-text-stroke:14px #000;paint-order:stroke fill;text-shadow:0 8px 22px rgba(0,0,0,.55)}
.row .k{color:#fff;font-size:92px}.row .a{color:#fff;font-size:80px;margin:0 18px}.row .v{color:#ffe033;font-size:110px}
.small{position:absolute;left:0;right:0;text-align:center;color:#fff;font-weight:700;font-size:44px;opacity:0;-webkit-text-stroke:8px #000;paint-order:stroke fill}
.tag{position:absolute;top:170px;left:0;right:0;text-align:center;color:#ff5a4d;font-weight:900;font-size:70px;opacity:0;-webkit-text-stroke:12px #000;paint-order:stroke fill;letter-spacing:-2px}
</style></head><body><div class="dim" id="dim"></div><div class="flash" id="flash"></div><div class="tag" id="tag"></div><div id="stage"></div></body></html>`;
// 장면 정의: [시작, 끝, 요소들]
const pop = (t, s) => { const x = Math.max(0, Math.min(1, (t - s) / 0.22)); const sc = x < 1 ? 0.6 + 0.55 * x - 0.15 * Math.sin(x * Math.PI) : 1; return { o: x > 0 ? 1 : 0, sc: x <= 0 ? 0.6 : (x < 1 ? 0.6 + 0.4 * (1 - Math.pow(1 - x, 3)) * 1.08 : 1) }; };
const shake = (t, s, d) => (t >= s && t < s + d) ? (Math.sin(t * 90) * 14) : 0;
const SCENES = SPEC.scenes;
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
  await p.setContent(html, { waitUntil: 'networkidle' }); await p.evaluate(() => document.fonts.ready);
  await p.evaluate(t => { document.getElementById('tag').textContent = t; }, SPEC.tag || '');
  const n = process.env.ONLY ? 0 : Math.round(TOTAL * FPS);
  for (let f = 0; f < n; f++) {
    const t = f / FPS;
    const sc = SCENES.find(s => t >= s.s && t < s.e) || SCENES[SCENES.length - 1];
    let h = '';
    (sc.items || []).forEach(it => { const a = pop(t, it.at); const dx = it.shake ? shake(t, it.at + 0.15, 0.45) : 0;
      h += `<div class="l" style="top:${it.top}px;font-size:${it.size}px;opacity:${a.o};transform:translateX(${dx}px) scale(${a.sc})">${it.txt}</div>`; });
    (sc.rows || []).forEach(r => { const x = Math.max(0, Math.min(1, (t - r.at) / 0.25)); const e = 1 - Math.pow(1 - x, 3);
      h += `<div class="row" style="top:${r.top}px;opacity:${x > 0 ? 1 : 0};transform:translateX(${(1 - e) * 700}px)"><span class="k">${r.k}</span><span class="a">→</span><span class="v">${r.v}</span></div>`; });
    if (sc.arrow && t >= sc.arrow.at) { const k = Math.min(1, (t - sc.arrow.at) / 0.25); const bob = Math.abs(Math.sin((t - sc.arrow.at) * 7)) * 45;
      h += `<div style="position:absolute;left:150px;top:${1250 + bob}px;opacity:${k};font-size:230px;font-weight:900;color:#ffe033;-webkit-text-stroke:14px #000;paint-order:stroke fill;transform:rotate(25deg);line-height:1">↓</div>`;
      h += `<div style="position:absolute;left:330px;top:${1330}px;opacity:${k};font-size:58px;font-weight:900;color:#fff;-webkit-text-stroke:10px #000;paint-order:stroke fill;letter-spacing:-2px">여기 눌러보세요</div>`; }
    if (sc.small) { const x = Math.max(0, Math.min(1, (t - sc.small.at) / 0.3)); h += `<div class="small" style="top:${sc.small.top}px;opacity:${x}">${sc.small.txt}</div>`; }
    const fl = SCENES.some(s => t >= s.s && t < s.s + 0.07) ? 0.55 : 0;  // 장면 전환 순간 짧은 플래시
    const tagO = t < (SPEC.tagEnd || SCENES[0].e) ? Math.min(1, t / 0.2) : 0;
    await p.evaluate(([h, fl, tagO]) => { document.getElementById('stage').innerHTML = h; document.getElementById('flash').style.opacity = fl; document.getElementById('tag').style.opacity = tagO; }, [h, fl, tagO]);
    await p.screenshot({ path: `${OUT}/f${String(f).padStart(4, '0')}.png`, omitBackground: true });
  }
  await b.close(); console.log('frames', n);
})();
