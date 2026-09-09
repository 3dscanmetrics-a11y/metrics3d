import fs from 'fs';

const contactFiles = [
  'site/contact.html',
  'site/contact/index.html'
];

let updatedCount = 0;

contactFiles.forEach(file => {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');

    const targetPattern = /src=["']https:\/\/images\.unsplash\.com\/photo-1596526131083-e8c633c948d2[^"']*["']/g;
    if (targetPattern.test(content)) {
      content = content.replace(targetPattern, 'src="/assets/images/contact_hero.jpg"');
      fs.writeFileSync(file, content, 'utf8');
      updatedCount++;
      console.log(`Updated contact hero image in: ${file}`);
    }
  }
});

console.log(`Successfully updated contact hero images across ${updatedCount} files.`);
