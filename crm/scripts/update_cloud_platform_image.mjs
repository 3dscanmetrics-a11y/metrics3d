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

const targetPattern = /src=["']https:\/\/images\.unsplash\.com\/photo-1460925895917-afdab827c52f[^"']*["']/g;
const replacement = 'src="/assets/images/cloud_pointcloud_platform.jpg"';

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');

  if (targetPattern.test(content)) {
    content = content.replace(targetPattern, replacement);
    fs.writeFileSync(file, content, 'utf8');
    updatedCount++;
    console.log(`Updated cloud platform image in: ${file}`);
  }
});

console.log(`Successfully updated cloud platform images across ${updatedCount} site files.`);
