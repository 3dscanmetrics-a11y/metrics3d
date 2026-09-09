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

const oldHeading = 'Ready to Discuss Your Next Project?';
const newHeading = 'Ready to Start Your 3D Laser Scanning Project?';

const oldSubtext = 'Get an indicative price range based on your site complexity, required tolerances, and deliverables.';
const newSubtext = 'Get an instant price estimate for millimeter-accurate point cloud data, Scan-to-BIM Revit modeling, and 3D reality capture across South Africa.';

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  if (content.includes('http-equiv="refresh"')) return;

  let modified = false;
  if (content.includes(oldHeading)) {
    content = content.replace(new RegExp(oldHeading, 'g'), newHeading);
    modified = true;
  }
  if (content.includes(oldSubtext)) {
    content = content.replace(new RegExp(oldSubtext, 'g'), newSubtext);
    modified = true;
  }

  if (modified) {
    fs.writeFileSync(file, content, 'utf8');
    count++;
    console.log(`Updated pre-footer SEO heading in: ${file}`);
  }
});

console.log(`Successfully updated SEO heading and subtext across ${count} HTML files.`);
