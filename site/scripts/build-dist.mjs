import { cpSync, mkdirSync, rmSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const root = process.cwd();
const dist = join(root, 'dist');

const includeExact = new Set([
  'index.html',
  'contact.html',
  'styles.css',
  'script.js',
  'llms.txt',
  'sitemap.xml',
  'robots.txt',
  'hero_scan.png',
  'scan_to_bim_bg.png',
  'industry-civil-infrastructure.html',
  'industry-mining.html',
  'industry-property-development.html',
]);

const includeDirs = ['assets', 'services', 'locations', 'contact', 'home'];

function shouldSkip(name) {
  return (
    name === 'dist' ||
    name === 'node_modules' ||
    name === 'src' ||
    name === 'migrations' ||
    name === 'scripts' ||
    name === '.git' ||
    name === '.wrangler' ||
    name.startsWith('patch') ||
    name.endsWith('.ps1') ||
    name.endsWith('.py') ||
    name === 'package-lock.json' ||
    name === 'package.json' ||
    name === 'wrangler.jsonc' ||
    name === 'template_header.html' ||
    name === 'template_footer.html'
  );
}

rmSync(dist, { recursive: true, force: true });
mkdirSync(dist, { recursive: true });

for (const name of readdirSync(root)) {
  if (shouldSkip(name)) continue;
  const src = join(root, name);
  const st = statSync(src);
  if (st.isDirectory()) {
    if (!includeDirs.includes(name)) continue;
    cpSync(src, join(dist, name), { recursive: true });
  } else if (
    includeExact.has(name) ||
    name.endsWith('.html') ||
    name.endsWith('.css') ||
    name.endsWith('.png') ||
    name.endsWith('.xml') ||
    name === 'robots.txt' ||
    name === 'llms.txt' ||
    name === 'script.js'
  ) {
    if (name.endsWith('.js') && name !== 'script.js') continue;
    cpSync(src, join(dist, name));
  }
}

console.log(`Built static assets -> ${relative(root, dist)}`);
