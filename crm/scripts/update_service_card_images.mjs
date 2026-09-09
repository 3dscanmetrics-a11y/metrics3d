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

const replacements = [
  {
    old: /background-image:\s*url\(['"]?https:\/\/images\.unsplash\.com\/photo-1581091226825-[^'"]+['"]?\)/g,
    new: "background-image: url('/assets/images/service_reverse_engineering.jpg')"
  },
  {
    old: /background-image:\s*url\(['"]?https:\/\/images\.unsplash\.com\/photo-1503387762-[^'"]+['"]?\)/g,
    new: "background-image: url('/assets/images/service_3d_laser_scanning.jpg')"
  },
  {
    old: /background-image:\s*url\(['"]?https:\/\/images\.unsplash\.com\/photo-1563986768609-[^'"]+['"]?\)/g,
    new: "background-image: url('/assets/images/service_quality_inspection.jpg')"
  },
  {
    old: /background-image:\s*url\(['"]?\/scan_to_bim_bg\.png['"]?\)/g,
    new: "background-image: url('/assets/images/service_scan_to_bim.jpg')"
  }
];

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let modified = false;

  replacements.forEach(r => {
    if (r.old.test(content)) {
      content = content.replace(r.old, r.new);
      modified = true;
    }
  });

  if (modified) {
    fs.writeFileSync(file, content, 'utf8');
    updatedCount++;
    console.log(`Updated service card images in: ${file}`);
  }
});

console.log(`Successfully updated service card images across ${updatedCount} site files.`);
