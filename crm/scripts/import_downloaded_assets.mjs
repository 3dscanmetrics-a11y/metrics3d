import fs from 'fs';
import path from 'path';

const srcDir = 'C:/Users/Isaiah Mpofu/Downloads/Regal Point Content-20260906T175709Z-1-001/Regal Point Content';
const destDir = 'site/assets/images';

if (!fs.existsSync(destDir)) {
  fs.mkdirSync(destDir, { recursive: true });
}

const copyMap = {
  'autocad-logo.png': 'autocad-logo.png',
  'revit-logo.png': 'revit-logo.png',
  'bentley-logo.png': 'bentley-logo.png',
  'rhinoceros-logo.png': 'rhinoceros-logo.png',
  'sketchup-logo.png': 'sketchup-logo.png',
  'escom-logo-01.jpg': 'escom-logo.jpg',
  'pb-contacts-form.jpg': 'contact_hero_real.jpg',
  'WhatsApp Image 2023-10-12 at 06.42.53_f26175f4.jpg': 'hero_scanner_real.jpg',
  'WhatsApp Image 2023-10-13 at 07.27.28_6b9e5952.jpg': 'field_scan_site.jpg',
  'WhatsApp Image 2023-10-25 at 09.39.43_c1db723a.jpg': 'pointcloud_site.jpg',
  'WhatsApp Image 2023-10-13 at 07.27.28_17807a82.jpg': 'scan_to_bim_real.jpg',
  'WhatsApp Image 2023-10-12 at 06.42.53_ace77a42.jpg': '3d_laser_scanning_real.jpg',
  'WhatsApp Image 2023-12-01 at 07.11.30_1bf580e0.jpg': 'reverse_engineering_real.jpg',
  'WhatsApp Image 2023-10-18 at 06.54.09_68ded3bd.jpg': 'quality_inspection_real.jpg',
  'WhatsApp Image 2023-10-18 at 06.54.07_3f5c1795.jpg': 'civil_infrastructure_real.jpg',
  'WhatsApp Image 2023-10-18 at 06.54.07_f0b43683.jpg': 'mining_scan_real.jpg',
  'WhatsApp Image 2023-10-18 at 06.54.08_70adebd3.jpg': 'property_development_real.jpg'
};

let count = 0;
for (const [srcName, destName] of Object.entries(copyMap)) {
  const srcPath = path.join(srcDir, srcName);
  const destPath = path.join(destDir, destName);
  if (fs.existsSync(srcPath)) {
    fs.copyFileSync(srcPath, destPath);
    console.log(`Copied: ${srcName} -> ${destName}`);
    count++;
  } else {
    console.warn(`Source file missing: ${srcName}`);
  }
}

// Copy raw files as well
fs.readdirSync(srcDir).forEach(f => {
  const srcPath = path.join(srcDir, f);
  if (fs.statSync(srcPath).isFile()) {
    const rawDestPath = path.join(destDir, f.replace(/\s+/g, '_'));
    fs.copyFileSync(srcPath, rawDestPath);
  }
});

console.log(`Successfully imported ${count} real project assets into ${destDir}`);
