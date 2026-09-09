import fs from 'fs';

const pageMap = {
  'site/industry-civil-infrastructure.html': '/assets/images/industry_civil_infrastructure_hero.jpg',
  'site/industry-mining.html': '/assets/images/industry_mining_hero.jpg',
  'site/industry-property-development.html': '/assets/images/industry_property_development_hero.jpg',
  'site/services/3d-laser-scanning/index.html': '/assets/images/service_3d_laser_scanning.jpg',
  'site/services/scan-to-bim/index.html': '/assets/images/service_scan_to_bim.jpg',
  'site/services/reverse-engineering/index.html': '/assets/images/service_reverse_engineering.jpg',
  'site/services/quality-inspection/index.html': '/assets/images/service_quality_inspection.jpg'
};

let updatedCount = 0;

for (const [filePath, newImgSrc] of Object.entries(pageMap)) {
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');

    // Replace broken or old hero image inside <div class="hero-image">
    const heroImageRegex = /(<div class="hero-image">[\s\S]*?<img\s+src=")[^"]+("[\s\S]*?<\/div>)/;
    if (heroImageRegex.test(content)) {
      content = content.replace(heroImageRegex, `$1${newImgSrc}$2`);
      fs.writeFileSync(filePath, content, 'utf8');
      updatedCount++;
      console.log(`Updated hero image in: ${filePath} -> ${newImgSrc}`);
    }
  }
}

console.log(`Successfully updated hero images across ${updatedCount} landing templates.`);
