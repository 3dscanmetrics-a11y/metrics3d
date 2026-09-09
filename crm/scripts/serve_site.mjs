import http from 'http';
import fs from 'fs';
import path from 'path';
import { DEFAULT_PRICING, calculateEstimateRange } from '../../shared/pricing.js';

const PORT = 8080;
const PUBLIC_DIR = path.resolve('site');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.json': 'application/json',
  '.xml': 'application/xml',
  '.txt': 'text/plain',
};

const server = http.createServer((req, res) => {
  let reqPath = decodeURIComponent(req.url.split('?')[0]);

  if (req.method === 'POST' && (reqPath === '/api/quote' || reqPath === '/api/quote/')) {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const payload = JSON.parse(body || '{}');
        const estimate = calculateEstimateRange(DEFAULT_PRICING, {
          area: parseFloat(payload.area) || 0,
          complexity: payload.complexity || 'Commercial/Retail/Residential',
          deliverables: Array.isArray(payload.deliverables) ? payload.deliverables : [],
          access: payload.access,
          accuracy: payload.accuracy,
          bimLevel: payload.bimLevel || payload.lod,
          systems: payload.systems,
          areaUnknown: Boolean(payload.areaUnknown),
          areaBucket: payload.areaBucket
        });

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          estimate: estimate.formatted,
          leadId: 'local-preview-lead'
        }));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: err.message }));
      }
    });
    return;
  }

  if (reqPath === '/') reqPath = '/index.html';

  let filePath = path.join(PUBLIC_DIR, reqPath);

  // If path without extension exists + .html, use that
  if (!fs.existsSync(filePath) && fs.existsSync(filePath + '.html')) {
    filePath += '.html';
  } else if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
    filePath = path.join(filePath, 'index.html');
  }

  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end('<h1>404 Not Found</h1>');
    return;
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';
  res.writeHead(200, { 'Content-Type': contentType });
  fs.createReadStream(filePath).pipe(res);
});

server.listen(PORT, () => {
  console.log(`Website local preview server running at http://localhost:${PORT}`);
});
