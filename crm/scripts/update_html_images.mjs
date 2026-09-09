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

const htmlFiles = walk('site');
let updatedFiles = 0;

const imageReplacements = [
  {
    // Contact hero image
    match: /https:\/\/images\.unsplash\.com\/photo-1596526131083-e8c633c948d2[^\s"']+/g,
    replace: '/assets/images/contact_hero_real.jpg'
  },
  {
    // Reverse Engineering
    match: /https:\/\/images\.unsplash\.com\/photo-1581091226825-a6a2a5aee158[^\s"']+/g,
    replace: '/assets/images/reverse_engineering_real.jpg'
  },
  {
    // 3D Laser Scanning
    match: /https:\/\/images\.unsplash\.com\/photo-1503387762-592deb58ef4e[^\s"']+/g,
    replace: '/assets/images/3d_laser_scanning_real.jpg'
  },
  {
    // Quality Inspection
    match: /https:\/\/images\.unsplash\.com\/photo-1563986768609-322da13575f3[^\s"']+/g,
    replace: '/assets/images/quality_inspection_real.jpg'
  },
  {
    // Civil Infrastructure
    match: /https:\/\/images\.unsplash\.com\/photo-1541888087618-fb1ea4257174[^\s"']+/g,
    replace: '/assets/images/civil_infrastructure_real.jpg'
  },
  {
    // Mining
    match: /https:\/\/images\.unsplash\.com\/photo-1581093458791-9f3c3900df4b[^\s"']+/g,
    replace: '/assets/images/mining_scan_real.jpg'
  },
  {
    // Generic Analytics / General Placeholder
    match: /https:\/\/images\.unsplash\.com\/photo-1460925895917-afdab827c52f[^\s"']+/g,
    replace: '/assets/images/pointcloud_site.jpg'
  }
];

htmlFiles.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let modified = false;

  imageReplacements.forEach(({ match, replace }) => {
    if (match.test(content)) {
      content = content.replace(match, replace);
      modified = true;
    }
  });

  if (modified) {
    fs.writeFileSync(file, content, 'utf8');
    updatedFiles++;
    console.log(`Updated images in: ${file}`);
  }
});

console.log(`Successfully replaced Unsplash placeholders with real assets across ${updatedFiles} HTML files.`);
