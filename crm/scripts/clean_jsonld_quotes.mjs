import fs from 'fs';
import path from 'path';

function walk(dir) {
  let files = [];
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) {
      if (f !== 'node_modules' && f !== 'dist') files = files.concat(walk(p));
    } else if (f.endsWith('.html')) {
      files.push(p);
    }
  }
  return files;
}

const files = walk('site');
let issueCount = 0;

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  if (content.includes('""') || content.includes('type=""')) {
    console.log(`[FIX NEEDED] Double double-quotes found in ${file}`);
    content = content.replace(/""/g, '"');
    fs.writeFileSync(file, content, 'utf8');
    issueCount++;
  }
});

console.log(`Cleaned double-quote syntax issues in ${issueCount} files.`);
