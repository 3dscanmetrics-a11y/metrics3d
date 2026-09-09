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

const replacement = '<img src="/logo.png" alt="3D Scan Metrics Logo" class="logo-img">';
const htmlFiles = walk('site');
let updatedCount = 0;

for (const f of htmlFiles) {
  let content = fs.readFileSync(f, 'utf8');
  if (content.includes('ph-cube-transparent')) {
    content = content.replace(/<i class=["']ph ph-cube-transparent["'][^>]*><\/i>/g, replacement);
    fs.writeFileSync(f, content, 'utf8');
    updatedCount++;
    console.log('Updated logo in:', f);
  }
}

console.log(`Successfully updated logo in ${updatedCount} site HTML files!`);
