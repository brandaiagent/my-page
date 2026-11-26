// 네이버 블로그용 카드 이미지 템플릿 (1080x1080)
// 사용법: node naver-cards.js spec.json 출력폴더
// spec.json 예: { "theme": "green", "site": "Brand Ai Agent", "cards": [ {type:"cover",...}, ... ] }
// checklist 에 "warn": true 를 주면 체크 대신 빨간 느낌표(하지 말아야 할 것)
// 카드 종류: cover(표지) / summary(핵심 3가지) / table(비교표) / checklist(체크리스트) / faq(질문 답) / closing(마무리·출처)
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const THEMES = {
  green:  { main: '#2f6b5e', soft: '#e6efe9', bg: '#f6f3ec', ink: '#1d2533' },
  orange: { main: '#b5562f', soft: '#f6e6dc', bg: '#f8f3ec', ink: '#2a2420' },
  blue:   { main: '#3b5ea8', soft: '#e3e9f5', bg: '#f4f5f8', ink: '#1b2233' },
  pink:   { main: '#a8456f', soft: '#f4e2ea', bg: '#f8f3f4', ink: '#2a1f25' },
  navy:   { main: '#14213d', soft: '#e4e7ee', bg: '#f5f5f2', ink: '#14213d' }
};
const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const br = s => esc(s).replace(/\n/g, '<br>');

function body(card, t, site, idx, total) {
  const head = card.label ? `<div class="label">${esc(card.label)}</div>` : '';
  const foot = `<div class="foot"><span>${esc(site)}</span><span>${idx}/${total}</span></div>`;
  switch (card.type) {
    case 'cover':
      return `<div class="cover"><div class="pill">${esc(card.category)}</div><h1>${br(card.title)}</h1><div class="bar"></div><p>${br(card.sub)}</p></div>${foot}`;
    case 'summary':
      return `${head}<h2>${br(card.title)}</h2><ol class="sum">${card.items.map((it, i) =>
        `<li><b>${i + 1}</b><div><strong>${esc(it.h)}</strong><span>${br(it.d)}</span></div></li>`).join('')}</ol>${foot}`;
    case 'table':
      return `${head}<h2>${br(card.title)}</h2><table><thead><tr>${card.cols.map(c => `<th>${esc(c)}</th>`).join('')}</tr></thead><tbody>${card.rows.map(r =>
        `<tr>${r.map((c, i) => i === 0 ? `<th>${br(c)}</th>` : `<td>${br(c)}</td>`).join('')}</tr>`).join('')}</tbody></table>${card.note ? `<p class="note">${br(card.note)}</p>` : ''}${foot}`;
    case 'checklist':
      return `${head}<h2>${br(card.title)}</h2><ul class="chk">${card.items.map(it => `<li><i class="${card.warn ? 'warn' : ''}">${card.warn ? '!' : '✓'}</i><span>${br(it)}</span></li>`).join('')}</ul>${foot}`;
    case 'faq':
      return `${head}<div class="q"><b>Q</b><span>${br(card.q)}</span></div><div class="a"><b>A</b><span>${br(card.a)}</span></div>${card.src ? `<p class="note">${br(card.src)}</p>` : ''}${foot}`;
    case 'closing':
      return `<div class="closing"><div class="label">${esc(card.label || '정리')}</div><h2>${br(card.title)}</h2><ul class="next">${card.items.map(it => `<li>${br(it)}</li>`).join('')}</ul>${card.src ? `<p class="src">${br(card.src)}</p>` : ''}</div>${foot}`;
  }
  throw new Error('알 수 없는 카드 종류: ' + card.type);
}

const css = t => `*{margin:0;box-sizing:border-box}body{width:1080px;height:1080px;font-family:'Noto Sans KR';background:${t.bg};color:${t.ink};position:relative;overflow:hidden;padding:96px 96px 0;word-break:keep-all;letter-spacing:-1px}
body:before{content:"";position:absolute;inset:0;background-image:linear-gradient(rgba(0,0,0,.025) 1px,transparent 1px),linear-gradient(90deg,rgba(0,0,0,.025) 1px,transparent 1px);background-size:54px 54px;z-index:-1}
.label{display:inline-block;background:${t.main};color:#fff;font-weight:700;font-size:30px;padding:8px 26px;border-radius:40px;margin-bottom:34px}
h1{font-size:108px;font-weight:900;line-height:1.2;letter-spacing:-4px}
h2{font-size:64px;font-weight:900;line-height:1.28;letter-spacing:-2.5px;margin-bottom:46px}
.cover{height:820px;display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center}
.cover .pill{background:${t.main};color:#fff;font-weight:700;font-size:34px;padding:10px 32px;border-radius:40px;margin-bottom:44px}
.cover .bar{width:110px;height:8px;background:${t.main};margin:50px 0 40px;border-radius:4px}.cover p{font-size:44px;font-weight:500;color:#4a505b;line-height:1.45}
.sum{list-style:none;display:flex;flex-direction:column;gap:26px}.sum li{display:flex;gap:30px;align-items:flex-start;background:#fff;border-radius:24px;padding:30px 34px;box-shadow:0 4px 18px rgba(0,0,0,.05)}
.sum b{flex:none;width:68px;height:68px;border-radius:50%;background:${t.main};color:#fff;font-size:38px;display:grid;place-items:center}
.sum strong{display:block;font-size:42px;font-weight:900;margin-bottom:6px}.sum span{font-size:32px;color:#4a505b;line-height:1.45}
table{width:100%;border-collapse:separate;border-spacing:0;background:#fff;border-radius:24px;overflow:hidden;box-shadow:0 4px 18px rgba(0,0,0,.05);font-size:36px}
thead th{background:${t.main};color:#fff;font-weight:700;padding:26px 24px;text-align:left}tbody th{background:${t.soft};font-weight:700;text-align:left;padding:26px 24px;width:38%}
tbody td{padding:26px 24px;border-left:1px solid #eee}tbody tr+tr th,tbody tr+tr td{border-top:1px solid #eee}
.note{margin-top:28px;font-size:28px;color:#6b707a;line-height:1.5}
.chk{list-style:none;display:flex;flex-direction:column;gap:24px}.chk li{display:flex;gap:26px;align-items:flex-start;font-size:40px;line-height:1.45;font-weight:500}
.chk i{flex:none;font-style:normal;width:56px;height:56px;border-radius:14px;background:${t.main};color:#fff;display:grid;place-items:center;font-size:34px;font-weight:900;margin-top:2px}
.q,.a{display:flex;gap:28px;align-items:flex-start;border-radius:28px;padding:40px 40px}.q{background:${t.main};color:#fff;font-size:50px;font-weight:900;line-height:1.35;margin-bottom:30px}
.a{background:#fff;font-size:38px;line-height:1.6;box-shadow:0 4px 18px rgba(0,0,0,.05)}.q b,.a b{flex:none;font-size:54px;font-weight:900}.a b{color:${t.main}}
.closing{height:820px;display:flex;flex-direction:column;justify-content:center;align-items:flex-start}
.chk i.warn{background:#c2452d}.next{list-style:none;display:flex;flex-direction:column;gap:22px}
.next li{font-size:40px;font-weight:500;padding-left:44px;position:relative;line-height:1.45}.next li:before{content:"→";position:absolute;left:0;color:${t.main};font-weight:900}
.src{margin-top:50px;font-size:27px;color:#6b707a;line-height:1.55;border-top:2px solid ${t.soft};padding-top:26px}
.foot{position:absolute;left:96px;right:96px;bottom:56px;display:flex;justify-content:space-between;font-size:26px;color:#8a8f98}`;

(async () => {
  const [specFile, outDir] = process.argv.slice(2);
  if (!specFile || !outDir) { console.log('사용법: node naver-cards.js spec.json 출력폴더'); process.exit(1); }
  const spec = JSON.parse(fs.readFileSync(specFile, 'utf8'));
  const t = THEMES[spec.theme] || THEMES.green;
  fs.mkdirSync(outDir, { recursive: true });
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1080, height: 1080 } });
  for (let i = 0; i < spec.cards.length; i++) {
    const html = `<html><head><link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@500;700;900&display=block" rel="stylesheet"><style>${css(t)}</style></head><body>${body(spec.cards[i], t, spec.site || '', i + 1, spec.cards.length)}</body></html>`;
    await p.setContent(html, { waitUntil: 'networkidle' });
    await p.evaluate(() => document.fonts.ready);
    const out = path.join(outDir, String(i + 1).padStart(2, '0') + '.png');
    await p.screenshot({ path: out });
    console.log(out);
  }
  await b.close();
})();
