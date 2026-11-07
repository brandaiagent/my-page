// Vercel 빌드 시 실행: 저장소의 .md 글을 모아 posts.json 으로 만듭니다.
const fs = require('fs');
const path = require('path');

const dirs = ['.', 'posts'];
const posts = [];

for (const dir of dirs) {
  if (!fs.existsSync(dir)) continue;
  for (const name of fs.readdirSync(dir)) {
    if (!name.endsWith('.md') || name === 'README.md') continue;
    const file = path.join(dir, name);
    if (!fs.statSync(file).isFile()) continue;
    posts.push({ name, text: fs.readFileSync(file, 'utf8') });
  }
}

fs.writeFileSync('posts.json', JSON.stringify(posts));
console.log(`posts.json 생성 완료: 글 ${posts.length}개`);
