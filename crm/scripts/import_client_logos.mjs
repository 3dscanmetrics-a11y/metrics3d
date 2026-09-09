import fs from 'fs';
import path from 'path';

const srcDir = 'C:/Users/Isaiah Mpofu/Downloads/Regal Point Content-20260906T175709Z-1-001/Regal Point Content/clients';
const destDir = 'site/assets/clients';

if (!fs.existsSync(destDir)) {
  fs.mkdirSync(destDir, { recursive: true });
}

const clientFiles = fs.readdirSync(srcDir);
console.log(`Found ${clientFiles.length} client logos in download folder:`);

clientFiles.forEach(file => {
  const srcPath = path.join(srcDir, file);
  const cleanName = file.toLowerCase().replace(/\s+/g, '-');
  const destPath = path.join(destDir, cleanName);
  fs.copyFileSync(srcPath, destPath);
  console.log(`  Copied: ${file} -> ${cleanName}`);
});

console.log('Client logo import complete.');
