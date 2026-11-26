// 대표 카드 이미지 만들기 (사이트에 안 올라가는 작업용 도구)
// 사용: node .tools/card.js <저장할.png> "<카테고리>" "<큰 제목 1줄>\n<큰 제목 2줄>" "<작은 설명>" "<사이트 이름>"
// 그다음: python3 -c "from PIL import Image;Image.open('x.png').convert('RGB').save('images/x-thumb.webp','WEBP',quality=88)"
const { chromium } = require('playwright');
const [out, pill, main, sub, brand = 'Brand Ai Agent'] = process.argv.slice(2);
const esc = s => String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
const html = `<!doctype html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;900&display=block" rel="stylesheet">
<style>*{margin:0;box-sizing:border-box}body{width:1080px;height:1350px;font-family:'Noto Sans KR';overflow:hidden;background:linear-gradient(135deg,#f3ede1,#e9e0cf);position:relative}
.grid{position:absolute;inset:0;background-image:linear-gradient(rgba(120,110,90,.13) 1px,transparent 1px),linear-gradient(90deg,rgba(120,110,90,.13) 1px,transparent 1px);background-size:60px 60px}
.arc{position:absolute;border-radius:50%;border:2.5px solid rgba(110,125,115,.45)}
.wrap{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:0 70px}
.pill{background:#2f5a5a;color:#fff;font-weight:900;font-size:32px;padding:10px 34px;border-radius:40px;margin-bottom:46px}
.main{font-weight:900;color:#1d2533;font-size:124px;line-height:1.22;letter-spacing:-2px;white-space:pre-line}
.bar{width:96px;height:7px;background:#2f5a5a;margin:56px 0 44px}.sub{font-size:52px;color:#3d4450;font-weight:500;letter-spacing:-1px}
.brand{margin-top:70px;font-size:32px;color:#5c616b}</style></head><body><div class="grid"></div>
<div class="arc" style="width:900px;height:900px;left:580px;top:690px"></div><div class="arc" style="width:900px;height:900px;left:670px;top:780px"></div>
<div class="wrap"><div class="pill">${esc(pill)}</div><div class="main">${esc(main.replace(/\\n/g, '\n'))}</div><div class="bar"></div><div class="sub">${esc(sub)}</div><div class="brand">${esc(brand)}</div></div></body></html>`;
(async () => { const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1080, height: 1350 } });
  await p.setContent(html, { waitUntil: 'networkidle' }); await p.evaluate(() => document.fonts.ready); await p.screenshot({ path: out }); await b.close(); })();
