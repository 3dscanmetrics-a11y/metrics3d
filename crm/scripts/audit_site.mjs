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
console.log(`Found ${files.length} HTML files:`);

files.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  
  // Check trust banner count
  const trustBanners = (content.match(/class=["']trust-banner/g) || []).length;
  
  // Check logo count
  const logoImgs = (content.match(/logo-img/g) || []).length;
  const phCubeLogos = (content.match(/ph-cube-transparent/g) || []).length;
  
  // Check min-height styles
  const minHeights = content.match(/min-height:\s*[^;";]+/g) || [];
  
  // Check inline large paddings
  const largePaddings = content.match(/padding(-top)?:[^\n"';]+/g) || [];

  console.log(`--- ${file} ---`);
  console.log(`  Trust banners: ${trustBanners}`);
  console.log(`  Logo images (.logo-img): ${logoImgs} (Old ph-cube: ${phCubeLogos})`);
  if (minHeights.length > 0) console.log(`  min-heights:`, minHeights);
  if (largePaddings.length > 0) console.log(`  inline paddings:`, largePaddings);
});
