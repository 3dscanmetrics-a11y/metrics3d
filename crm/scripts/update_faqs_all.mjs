import fs from 'fs';
import path from 'path';

const locationsMap = {
  '3d-laser-scanning-johannesburg': 'Johannesburg',
  '3d-laser-scanning-cape-town': 'Cape Town',
  '3d-laser-scanning-durban': 'Durban',
  '3d-laser-scanning-pretoria': 'Pretoria',
  '3d-laser-scanning-centurion': 'Centurion',
  '3d-laser-scanning-sandton': 'Sandton',
  '3d-laser-scanning-port-elizabeth': 'Port Elizabeth',
  'locations': 'South Africa'
};

function getFaqHtml(loc) {
  return `<section class="faq-aeo" style="padding: 5rem 0;">
            <div class="container">
                <h2 style="text-align: center; font-size: 2.5rem; margin-bottom: 3rem;">Frequently Asked Questions (${loc})</h2>
                
                <div class="faq-accordion">
                    <details class="faq-item" open>
                        <summary class="faq-summary">What file formats will I receive, and are they compatible with Revit or AutoCAD?</summary>
                        <div class="faq-content">
                            <p>We deliver registered point cloud data in <strong>.RCP, .E57, and .LAS</strong> formats (100% compatible with Autodesk Revit, AutoCAD, Navisworks, and ArchiCAD), as well as native 3D <strong>.RVT</strong> BIM models (LOD 200–500) and 2D/3D <strong>.DWG</strong> CAD drawings ready for immediate design workflows.</p>
                        </div>
                    </details>
                    <details class="faq-item">
                        <summary class="faq-summary">What level of accuracy can 3D laser scanning achieve on site?</summary>
                        <div class="faq-content">
                            <p>Our high-definition terrestrial LiDAR scanners achieve sub-millimeter to <strong>±2mm spatial accuracy</strong>. This millimeter precision allows engineering and architectural teams in ${loc} to pre-detect clashes and eliminate costly site rework before fabrication or construction begins.</p>
                        </div>
                    </details>
                    <details class="faq-item">
                        <summary class="faq-summary">What is the difference between a Point Cloud and a Scan-to-BIM model?</summary>
                        <div class="faq-content">
                            <p>A <strong>Point Cloud</strong> is a raw 3D digital measurement map composed of millions of laser points (.RCP/.E57). <strong>Scan-to-BIM</strong> converts that raw point cloud into an intelligent, parametric 3D Revit model (.RVT) containing smart building objects like structural beams, walls, pipes, and MEP systems for architectural design and facility management.</p>
                        </div>
                    </details>
                    <details class="faq-item">
                        <summary class="faq-summary">How long does a 3D scanning survey and modeling project take in ${loc}?</summary>
                        <div class="faq-content">
                            <p>Our localized survey teams in ${loc} can mobilize within <strong>24 to 48 hours</strong> of project approval. On-site scanning is up to 75% faster than manual surveying (typically 1 to 2 days on site), and registered point clouds or 3D BIM models are delivered within 3 to 5 business days.</p>
                        </div>
                    </details>
                    <details class="faq-item">
                        <summary class="faq-summary">Can 3D laser scanning be conducted on active industrial or mining sites without downtime?</summary>
                        <div class="faq-content">
                            <p>Yes. Non-contact terrestrial laser scanning operates safely from a distance without touching equipment or disrupting plant operations. Our field surveyors hold safety certifications and medical clearances to operate on active construction sites, chemical plants, and underground mines across South Africa.</p>
                        </div>
                    </details>
                    <details class="faq-item">
                        <summary class="faq-summary">How are 3D laser scanning project costs calculated?</summary>
                        <div class="faq-content">
                            <p>Pricing is based on site square footage/acreage, spatial complexity (e.g., commercial building vs. complex industrial MEP plant), and requested deliverable type (raw point cloud vs. LOD 300–500 BIM model). You can request an instant indicative cost estimate via our online estimator tool.</p>
                        </div>
                    </details>
                </div>
            </div>
        </section>`;
}

function getFaqSchemaJson(loc) {
  const schemaObj = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "What file formats will I receive, and are they compatible with Revit or AutoCAD?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "We deliver registered point cloud data in .RCP, .E57, and .LAS formats (compatible with Autodesk Revit, AutoCAD, Navisworks, and ArchiCAD), as well as native 3D .RVT BIM models (LOD 200–500) and 2D/3D .DWG CAD drawings."
        }
      },
      {
        "@type": "Question",
        "name": `What level of accuracy can 3D laser scanning achieve on site in ${loc}?`,
        "acceptedAnswer": {
          "@type": "Answer",
          "text": `Our high-definition terrestrial LiDAR scanners achieve sub-millimeter to ±2mm spatial accuracy, allowing engineering and architectural teams in ${loc} to pre-detect clashes and eliminate costly site rework.`
        }
      },
      {
        "@type": "Question",
        "name": "What is the difference between a Point Cloud and a Scan-to-BIM model?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "A Point Cloud is a raw 3D digital measurement map composed of millions of laser points (.RCP/.E57). Scan-to-BIM converts that raw point cloud into an intelligent, parametric 3D Revit model (.RVT) containing smart building objects."
        }
      },
      {
        "@type": "Question",
        "name": `How long does a 3D scanning survey and modeling project take in ${loc}?`,
        "acceptedAnswer": {
          "@type": "Answer",
          "text": `Survey teams in ${loc} can mobilize within 24 to 48 hours. On-site scanning takes 1 to 2 days, and registered point clouds or 3D BIM models are delivered within 3 to 5 business days.`
        }
      },
      {
        "@type": "Question",
        "name": "Can 3D laser scanning be conducted on active industrial or mining sites without downtime?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Yes. Non-contact terrestrial laser scanning operates safely from a distance without touching equipment or disrupting plant operations. Surveyors hold full safety clearances for active construction sites, refineries, and mines."
        }
      },
      {
        "@type": "Question",
        "name": "How are 3D laser scanning project costs calculated?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Pricing is based on site square footage/acreage, spatial complexity, and requested deliverable type (raw point cloud vs. LOD 300–500 BIM model)."
        }
      }
    ]
  };
  return `    <script type="application/ld+json">\n${JSON.stringify(schemaObj, null, 2)}\n    </script>`;
}

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
let updatedFaqCount = 0;

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');

  content = content.replace(/Project\?\?/g, 'Project?');

  const dirName = path.basename(path.dirname(file));
  const locName = locationsMap[dirName] || locationsMap[path.basename(file, '.html')] || (file.includes('locations') ? 'South Africa' : null);

  if (locName || content.includes('class="faq-aeo"')) {
    const activeLoc = locName || 'South Africa';

    const faqHtmlRegex = /<section class="faq-aeo"[\s\S]*?<\/section>/g;
    if (faqHtmlRegex.test(content)) {
      content = content.replace(faqHtmlRegex, getFaqHtml(activeLoc));
    }

    const faqSchemaRegex = /<script type="application\/ld\+json">\s*\{\s*"@context":\s*"https:\/\/schema\.org",\s*"@type":\s*"FAQPage"[\s\S]*?<\/script>/g;
    if (faqSchemaRegex.test(content)) {
      content = content.replace(faqSchemaRegex, getFaqSchemaJson(activeLoc));
    }

    fs.writeFileSync(file, content, 'utf8');
    updatedFaqCount++;
    console.log(`Updated Accordion FAQs in: ${file}`);
  } else {
    fs.writeFileSync(file, content, 'utf8');
  }
});

console.log(`Successfully updated interactive dropdown FAQ accordions across ${updatedFaqCount} site files.`);
