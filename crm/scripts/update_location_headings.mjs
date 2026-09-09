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

const files = walk('site/locations');
let count = 0;

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');

  if (content.includes('Local Spatial Engineering in')) {
    content = content.replace(/Local Spatial Engineering in/g, 'High-Precision 3D Laser Scanning Services in');
    fs.writeFileSync(file, content, 'utf8');
    count++;
    console.log(`Updated heading in: ${file}`);
  } else if (content.includes('Local Spatial Engineering')) {
    content = content.replace(/Local Spatial Engineering/g, 'High-Precision 3D Laser Scanning Services');
    fs.writeFileSync(file, content, 'utf8');
    count++;
    console.log(`Updated heading in: ${file}`);
  }
});

console.log(`Successfully updated location headings across ${count} HTML files.`);
