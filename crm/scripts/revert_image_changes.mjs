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

const revertReplacements = [
  {
    match: /\/assets\/images\/contact_hero_real\.jpg/g,
    replace: 'https://images.unsplash.com/photo-1596526131083-e8c633c948d2?auto=format&fit=crop&q=80&w=800'
  },
  {
    match: /\/assets\/images\/reverse_engineering_real\.jpg/g,
    replace: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&q=80&w=800'
  },
  {
    match: /\/assets\/images\/3d_laser_scanning_real\.jpg/g,
    replace: 'https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&q=80&w=800'
  },
  {
    match: /\/assets\/images\/quality_inspection_real\.jpg/g,
    replace: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&q=80&w=800'
  },
  {
    match: /\/assets\/images\/civil_infrastructure_real\.jpg/g,
    replace: 'https://images.unsplash.com/photo-1541888087618-fb1ea4257174?auto=format&fit=crop&q=80&w=800'
  },
  {
    match: /\/assets\/images\/mining_scan_real\.jpg/g,
    replace: 'https://images.unsplash.com/photo-1581093458791-9f3c3900df4b?auto=format&fit=crop&q=80&w=800'
  },
  {
    match: /\/assets\/images\/pointcloud_site\.jpg/g,
    replace: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&q=80&w=800'
  },
  {
    match: /\/assets\/images\/property_development_real\.jpg/g,
    replace: 'https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&q=80&w=800'
  },
  {
    match: /\/assets\/images\/scan_to_bim_real\.jpg/g,
    replace: '/scan_to_bim_bg.png'
  },
  {
    match: /\/assets\/images\/hero_scanner_real\.jpg/g,
    replace: 'hero_scan.png'
  }
];

htmlFiles.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let modified = false;

  revertReplacements.forEach(({ match, replace }) => {
    if (match.test(content)) {
      content = content.replace(match, replace);
      modified = true;
    }
  });

  if (modified) {
    fs.writeFileSync(file, content, 'utf8');
    updatedFiles++;
    console.log(`Reverted images in: ${file}`);
  }
});

// Remove software ecosystem banner from index.html if present
let indexContent = fs.readFileSync('site/index.html', 'utf8');
if (indexContent.includes('autocad-logo.png')) {
  indexContent = indexContent.replace(/<div style="display: flex; justify-content: center; align-items: center; gap: 2.5rem; flex-wrap: wrap; margin-bottom: 3.5rem; padding: 1.5rem; background: #ffffff; border-radius: 16px; border: 1px solid var\(--glass-border\); box-shadow: var\(--card-shadow\);">[\s\S]*?<\/div>/g, '');
  indexContent = indexContent.replace('State-of-the-Art Technology & Software Ecosystem', 'State-of-the-Art Technology & Accuracy');
  fs.writeFileSync('site/index.html', indexContent, 'utf8');
  console.log('Reverted CAD software ecosystem banner from site/index.html');
}

console.log(`Reverted image changes across ${updatedFiles} HTML files.`);
