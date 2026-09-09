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
let updatedCount = 0;

const targetStr = 'box-shadow: 0 10px 30px rgba(0, 229, 255, 0.2);';
const replacement = 'box-shadow: 0 20px 45px -10px rgba(15, 23, 42, 0.12), 0 4px 12px rgba(15, 23, 42, 0.04); border: 1px solid var(--glass-border);';

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');

  if (content.includes(targetStr)) {
    content = content.replaceAll(targetStr, replacement);
    fs.writeFileSync(file, content, 'utf8');
    updatedCount++;
    console.log(`Removed cyan image glow in: ${file}`);
  }
});

console.log(`Successfully updated image shadows across ${updatedCount} HTML files.`);
