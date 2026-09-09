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
let count = 0;

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  if (content.includes('http-equiv="refresh"')) return;

  const targetRegex = /<section class="bottom-cta" style="background:[^"]*">/g;
  if (targetRegex.test(content)) {
    content = content.replace(targetRegex, '<section class="bottom-cta" style="background: #f8fafc; padding: 6rem 0; text-align: center; border-top: 1px solid var(--glass-border);">');
    fs.writeFileSync(file, content, 'utf8');
    count++;
    console.log(`Updated bottom CTA background in: ${file}`);
  }
});

console.log(`Successfully updated bottom-cta light grey background across ${count} HTML files.`);
