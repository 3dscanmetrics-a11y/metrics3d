import fs from 'fs';
import path from 'path';

function walk(d) {
  for (let f of fs.readdirSync(d)) {
    let p = path.join(d, f);
    if (fs.statSync(p).isDirectory()) {
      if (f !== 'node_modules' && f !== 'dist') walk(p);
    } else if (p.endsWith('.html') || p.endsWith('.css')) {
      let c = fs.readFileSync(p, 'utf8');
      if (c.includes('shadow') || c.includes('rgba(0,') || c.includes('cyan')) {
        let lines = c.split('\n');
        lines.forEach((line, idx) => {
          if (line.includes('img') || line.includes('hero') || line.includes('shadow') || line.includes('glow')) {
            if (line.includes('box-shadow') || line.includes('0 20px') || line.includes('rgba')) {
              console.log(`${p}:${idx + 1}: ${line.trim()}`);
            }
          }
        });
      }
    }
  }
}

walk('site');
