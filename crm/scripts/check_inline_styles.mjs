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
files.forEach(f => {
  const content = fs.readFileSync(f, 'utf8');
  const inlineBgs = content.match(/style=["'][^"']*background:[^"';]+["']/g) || [];
  if (inlineBgs.length > 0) {
    console.log(`--- ${f} ---`);
    console.log(inlineBgs);
  }
});
