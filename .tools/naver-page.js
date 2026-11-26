// 네이버 블로그 PC 복사용 HTML 만들기
// 사용법: node naver-page.js post.json 출력.html
// post.json: { "slug": "oyster-guide", "title": "...", "tags": "#a #b",
//   "blocks": [ ["img","01.jpg","사진 설명(선택)"], ["h","소제목"], ["p","문단"] ] }
// 사진은 먼저 my-page/.naver/<slug>/ 에 올려 push 해 둔다 (점 폴더라 사이트에는 안 올라감)
const fs = require('fs');
const [src, out] = process.argv.slice(2);
if (!src || !out) { console.log('사용법: node naver-page.js post.json 출력.html'); process.exit(1); }
const P = JSON.parse(fs.readFileSync(src, 'utf8'));
const BASE = `https://raw.githubusercontent.com/brandaiagent/my-page/main/.naver/${P.slug}/`;
const esc = t => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
let body = '';
for (const [k, v, cap] of P.blocks) {
  if (k === 'img') body += `<p style="text-align:center"><img src="${BASE + v}" width="740"></p>` + (cap ? `<p style="text-align:center;color:#888;font-size:13px">${esc(cap)}</p>` : '');
  else if (k === 'h') body += `<h3>${esc(v)}</h3>`;
  else body += `<p>${esc(v).replace(/\n/g, '<br>')}</p>`;
}
const html = `<!DOCTYPE html><html lang="ko"><head><meta charset="utf-8"><title>네이버 복사용 - ${esc(P.title)}</title>
<style>body{font-family:"Malgun Gothic",sans-serif;max-width:780px;margin:0 auto;padding:20px 16px 80px;line-height:1.8;color:#222}
.tool{position:sticky;top:0;background:#fff;border-bottom:1px solid #ddd;padding:12px 0;display:flex;gap:8px;flex-wrap:wrap;z-index:1}
button{font:inherit;font-weight:700;border:0;border-radius:8px;padding:10px 14px;cursor:pointer;background:#03c75a;color:#fff}button.g{background:#333}
.box{border:1px dashed #bbb;border-radius:8px;padding:10px 12px;margin:14px 0;background:#fafafa}#post img{max-width:100%}</style></head><body>
<div class="tool"><button id="c1" class="g">① 제목 복사</button><button id="c2">② 본문 전체 복사 (사진 포함)</button><button id="c3" class="g">③ 태그 복사</button><span id="msg"></span></div>
<div class="box"><b>제목</b><br><span id="t">${esc(P.title)}</span></div>
<div class="box"><b>태그</b><br><span id="g">${esc(P.tags || '')}</span></div>
<div id="post">${body}</div>
<script>
const msg=m=>document.getElementById('msg').textContent=m;
async function txt(s){try{await navigator.clipboard.writeText(s);msg('복사됨')}catch(e){msg('복사 실패: 직접 선택해서 Ctrl+C')}}
c1.onclick=()=>txt(t.textContent);c3.onclick=()=>txt(g.textContent);
c2.onclick=async()=>{const el=document.getElementById('post');try{await navigator.clipboard.write([new ClipboardItem({'text/html':new Blob([el.innerHTML],{type:'text/html'}),'text/plain':new Blob([el.innerText],{type:'text/plain'})})]);msg('본문 복사됨 → 네이버 본문에 Ctrl+V')}catch(e){const r=document.createRange();r.selectNodeContents(el);const s=getSelection();s.removeAllRanges();s.addRange(r);msg('본문이 선택됐어요 → Ctrl+C 누르고 네이버에 Ctrl+V')}};
</script></body></html>`;
fs.writeFileSync(out, html);
console.log('완료:', out);
