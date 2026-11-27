// 키네틱 자막 오버레이: 시간 t(초)를 받아 장면을 그리고 투명 PNG로 프레임 저장
const { chromium } = require('playwright');
const FPS = 30, TOTAL = 18.6;
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
</style></head><body><div class="dim" id="dim"></div><div class="flash" id="flash"></div><div class="tag" id="tag">김장 전 필수!</div><div id="stage"></div></body></html>`;
// 장면 정의: [시작, 끝, 요소들]
const pop = (t, s) => { const x = Math.max(0, Math.min(1, (t - s) / 0.22)); const sc = x < 1 ? 0.6 + 0.55 * x - 0.15 * Math.sin(x * Math.PI) : 1; return { o: x > 0 ? 1 : 0, sc: x <= 0 ? 0.6 : (x < 1 ? 0.6 + 0.4 * (1 - Math.pow(1 - x, 3)) * 1.08 : 1) }; };
const shake = (t, s, d) => (t >= s && t < s + d) ? (Math.sin(t * 90) * 14) : 0;
const SCENES = [
  { s: 0, e: 2.7, items: [
    { txt: '김치냉장고', top: 640, size: 160, at: 0.05 },
    { txt: '<span class="y">설정</span>', top: 840, size: 170, at: 0.5 },
    { txt: '<span class="r">꼭 확인하세요</span>', top: 1060, size: 150, at: 1.0, shake: true } ] },
  { s: 2.7, e: 4.9, items: [
    { txt: '김치마다', top: 720, size: 140, at: 2.75 },
    { txt: '<span class="y">설정이 달라요</span>', top: 900, size: 140, at: 3.2 } ] },
  { s: 4.9, e: 10.9, rows: [
    { k: '배추·무김치', v: '중', top: 600, at: 4.95 },
    { k: '물김치·동치미', v: '약', top: 820, at: 7.15 },
    { k: '짠 묵은지', v: '강', top: 1040, at: 8.95 } ], small: { txt: 'LG전자·삼성전자 안내 기준', top: 1290, at: 5.1 } },
  { s: 10.9, e: 13.3, items: [
    { txt: '살얼음 보이면?', top: 700, size: 130, at: 10.95 },
    { txt: '<span class="y">한 단계 약하게</span>', top: 900, size: 132, at: 11.6 } ] },
  { s: 13.3, e: 15.7, items: [
    { txt: '빨리 시어지면?', top: 700, size: 130, at: 13.35 },
    { txt: '<span class="y">한 단계 강하게</span>', top: 900, size: 132, at: 14.0 } ] },
  { s: 15.7, e: TOTAL, items: [
    { txt: '김장 전에', top: 640, size: 120, at: 15.75 },
    { txt: '<span class="y">저장</span> 해두세요', top: 820, size: 130, at: 16.2 } ], small: { txt: '제조사별 온도표는 블로그에', top: 1080, at: 16.6 } }
];
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
  await p.setContent(html, { waitUntil: 'networkidle' }); await p.evaluate(() => document.fonts.ready);
  const n = process.env.ONLY ? 0 : Math.round(TOTAL * FPS);
  for (let f = 0; f < n; f++) {
    const t = f / FPS;
    const sc = SCENES.find(s => t >= s.s && t < s.e) || SCENES[SCENES.length - 1];
    let h = '';
    (sc.items || []).forEach(it => { const a = pop(t, it.at); const dx = it.shake ? shake(t, it.at + 0.15, 0.45) : 0;
      h += `<div class="l" style="top:${it.top}px;font-size:${it.size}px;opacity:${a.o};transform:translateX(${dx}px) scale(${a.sc})">${it.txt}</div>`; });
    (sc.rows || []).forEach(r => { const x = Math.max(0, Math.min(1, (t - r.at) / 0.25)); const e = 1 - Math.pow(1 - x, 3);
      h += `<div class="row" style="top:${r.top}px;opacity:${x > 0 ? 1 : 0};transform:translateX(${(1 - e) * 700}px)"><span class="k">${r.k}</span><span class="a">→</span><span class="v">${r.v}</span></div>`; });
    if (sc.small) { const x = Math.max(0, Math.min(1, (t - sc.small.at) / 0.3)); h += `<div class="small" style="top:${sc.small.top}px;opacity:${x}">${sc.small.txt}</div>`; }
    const fl = SCENES.some(s => t >= s.s && t < s.s + 0.07) ? 0.55 : 0;  // 장면 전환 순간 짧은 플래시
    const tagO = t < 2.7 ? Math.min(1, t / 0.2) : 0;
    await p.evaluate(([h, fl, tagO]) => { document.getElementById('stage').innerHTML = h; document.getElementById('flash').style.opacity = fl; document.getElementById('tag').style.opacity = tagO; }, [h, fl, tagO]);
    await p.screenshot({ path: `frames/f${String(f).padStart(4, '0')}.png`, omitBackground: true });
  }
  await b.close(); console.log('frames', n);
})();
