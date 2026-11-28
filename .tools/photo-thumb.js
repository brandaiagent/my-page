const { chromium } = require('playwright'); const fs=require('fs');
// 쇼핑 글 썸네일: 사진 + 큰 글씨 (1080x1350)
// 사용법: node photo-thumb.js picks.json 출력폴더
// picks.json: [[slug, 사진파일경로, 카테고리, "큰 제목\n2줄", "작은 설명"], ...]  → 출력폴더/<slug>.png
const P = JSON.parse(fs.readFileSync(process.argv[2],'utf8')); const OUT=process.argv[3]; fs.mkdirSync(OUT,{recursive:true});
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:1080,height:1350}});
for (const [slug,pid,pill,main,sub] of P){
 const img='data:image/jpeg;base64,'+fs.readFileSync(pid).toString('base64');
 await p.setContent(`<html><head><link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@500;700;900&display=block" rel="stylesheet"><style>
 *{margin:0;box-sizing:border-box}body{width:1080px;height:1350px;font-family:'Noto Sans KR';position:relative;overflow:hidden;word-break:keep-all}
 .bg{position:absolute;inset:0;background:url(${img}) center/cover}
 .sh{position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,0) 30%,rgba(0,0,0,.25) 50%,rgba(0,0,0,.82) 100%)}
 .box{position:absolute;left:80px;right:80px;bottom:110px;color:#fff}
 .pill{display:inline-block;background:#ffcf4a;color:#1d2533;font-weight:700;font-size:36px;padding:8px 26px;border-radius:40px}
 h1{font-size:118px;font-weight:900;line-height:1.15;letter-spacing:-4px;margin-top:26px;white-space:pre-line;text-shadow:0 6px 24px rgba(0,0,0,.45)}
 .sub{font-size:46px;font-weight:500;margin-top:22px;opacity:.95;text-shadow:0 3px 12px rgba(0,0,0,.5)}
 .br{position:absolute;right:60px;top:50px;color:#fff;font-weight:700;font-size:30px;text-shadow:0 2px 10px rgba(0,0,0,.6)}
 </style></head><body><div class="bg"></div><div class="sh"></div><div class="br">Brand Ai Agent</div><div class="box"><div class="pill">${pill}</div><h1>${main}</h1><div class="sub">${sub}</div></div></body></html>`,{waitUntil:'networkidle'});
 await p.evaluate(()=>document.fonts.ready); await p.screenshot({path:`${OUT}/${slug}.png`});}
await b.close();})();
