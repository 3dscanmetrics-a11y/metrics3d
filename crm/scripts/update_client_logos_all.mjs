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

const clientLogosSlideshowHTML = `<div class="micro-trust" style="margin-top: 3rem; text-align: center;">
                <p style="font-size: 0.85rem; text-transform: uppercase; letter-spacing: 1px; color: var(--text-muted); margin-bottom: 1.25rem;">Trusted by Top AEC & Mining Firms Across South Africa</p>
                <div class="client-slider-wrapper">
                    <div class="client-logos-track">
                        <div class="client-logo-badge"><img src="/assets/clients/anglo.png" alt="Anglo American" title="Anglo American"></div>
                        <div class="client-logo-badge"><img src="/assets/clients/eskom.png" alt="Eskom" title="Eskom"></div>
                        <div class="client-logo-badge"><img src="/assets/clients/omnia.png" alt="Omnia" title="Omnia"></div>
                        <div class="client-logo-badge"><img src="/assets/clients/wilmar.png" alt="Wilmar" title="Wilmar"></div>
                        <div class="client-logo-badge"><img src="/assets/clients/bmsa.png" alt="BMSA" title="BMSA"></div>
                        <div class="client-logo-badge"><img src="/assets/clients/frys-metal.png" alt="FRYS Metal" title="FRYS Metal"></div>
                        <div class="client-logo-badge"><img src="/assets/clients/santasalo.png" alt="Santasalo" title="Santasalo"></div>
                        <div class="client-logo-badge"><img src="/assets/clients/anglo.png" alt="Anglo American" title="Anglo American"></div>
                        <div class="client-logo-badge"><img src="/assets/clients/eskom.png" alt="Eskom" title="Eskom"></div>
                        <div class="client-logo-badge"><img src="/assets/clients/omnia.png" alt="Omnia" title="Omnia"></div>
                        <div class="client-logo-badge"><img src="/assets/clients/wilmar.png" alt="Wilmar" title="Wilmar"></div>
                        <div class="client-logo-badge"><img src="/assets/clients/bmsa.png" alt="BMSA" title="BMSA"></div>
                        <div class="client-logo-badge"><img src="/assets/clients/frys-metal.png" alt="FRYS Metal" title="FRYS Metal"></div>
                        <div class="client-logo-badge"><img src="/assets/clients/santasalo.png" alt="Santasalo" title="Santasalo"></div>
                    </div>
                </div>
            </div>`;

const files = walk('site');
let updatedCount = 0;

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');

  // Skip meta refresh redirect files
  if (content.includes('http-equiv="refresh"')) return;

  const oldTrustRegex = /<div class="micro-trust"[\s\S]*?<\/div>\s*<\/div>/g;
  if (oldTrustRegex.test(content)) {
    content = content.replace(oldTrustRegex, clientLogosSlideshowHTML + '\n        </div>');
    fs.writeFileSync(file, content, 'utf8');
    updatedCount++;
    console.log(`Updated slideshow ticker in: ${file}`);
  }
});

console.log(`Successfully updated continuous slideshow slider across ${updatedCount} site HTML files.`);
