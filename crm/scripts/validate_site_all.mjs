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
console.log(`Auditing ${htmlFiles.length} HTML files...`);

let issues = 0;

htmlFiles.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');

  // Skip redirect files like home/index.html
  if (content.includes('http-equiv="refresh"')) return;

  // 1. Trust banner count
  const trustBanners = (content.match(/class=["']trust-banner/g) || []).length;
  if (trustBanners > 1) {
    console.error(`[ISSUE] Duplicate trust banner in ${file}: ${trustBanners}`);
    issues++;
  }

  // 2. Logo image tag presence
  if (!content.includes('logo-img')) {
    console.error(`[ISSUE] Missing logo-img class in ${file}`);
    issues++;
  }

  // 3. Check for leftover ph-cube-transparent icon placeholders
  if (content.includes('ph-cube-transparent')) {
    console.error(`[ISSUE] Leftover icon logo placeholder in ${file}`);
    issues++;
  }

  // 4. Check for invalid quotes in JSON-LD
  if (content.includes('""@context""') || content.includes('type=""')) {
    console.error(`[ISSUE] Broken JSON-LD quotes in ${file}`);
    issues++;
  }

  // 5. Check local image src exist
  const imgMatches = content.matchAll(/src=["'](\/[^"']+|\.\/[^"']+|assets\/[^"']+)["']/g);
  for (const match of imgMatches) {
    const src = match[1];
    if (src.startsWith('http') || src.startsWith('//')) continue;
    const relPath = src.startsWith('/') ? src.slice(1) : src;
    const fullPath = path.join('site', relPath);
    if (!fs.existsSync(fullPath)) {
      console.error(`[ISSUE] Missing image file reference in ${file}: ${src} -> ${fullPath}`);
      issues++;
    }
  }

  // 6. Check for unsplash external image URLs
  if (content.includes('images.unsplash.com')) {
    console.error(`[ISSUE] Leftover Unsplash image URL found in ${file}`);
    issues++;
  }

  // 7. Contact page specific calculator & markup regressions
  if (file.endsWith('contact.html')) {
    if (!content.includes('id="bim-systems-row"') || !content.includes('style="display:none;"')) {
      console.error(`[ISSUE] bim-systems-row missing or not hidden by default in ${file}`);
      issues++;
    }
    if (content.includes('ph-buildings') && content.includes('micro-trust')) {
      console.error(`[ISSUE] Leftover icon placeholders in micro-trust section of ${file}`);
      issues++;
    }
    if (!content.includes('/assets/images/contact_hero.jpg')) {
      console.error(`[ISSUE] Contact hero image is not set to /assets/images/contact_hero.jpg in ${file}`);
      issues++;
    }
  }
});

if (issues === 0) {
  console.log('✅ ALL PAGES PASSED COMPREHENSIVE AUDIT WITH ZERO ISSUES!');
} else {
  console.error(`❌ Total issues found across pages: ${issues}`);
}
