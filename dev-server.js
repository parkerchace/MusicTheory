// Minimal static dev server for the Music Theory Studio.
// Usage: `npm start` (defaults to http://localhost:8000/modular-music-theory.html)

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = Number(process.env.PORT) || 8000;
const ROOT = process.cwd();

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8'
};

function safeResolve(urlPath) {
  const decoded = decodeURIComponent(urlPath);
  const cleaned = decoded.split('?')[0].split('#')[0];
  const rel = cleaned.startsWith('/') ? cleaned.slice(1) : cleaned;
  const abs = path.resolve(ROOT, rel);
  if (!abs.startsWith(path.resolve(ROOT))) return null;
  return abs;
}

function send(res, status, headers, body) {
  res.writeHead(status, headers);
  res.end(body);
}

const server = http.createServer((req, res) => {
  const url = req.url || '/';

  // Default route
  let requestPath = url;
  if (url === '/' || url === '') {
    requestPath = '/modular-music-theory.html';
  }

  const absPath = safeResolve(requestPath);
  if (!absPath) {
    return send(res, 400, { 'Content-Type': 'text/plain; charset=utf-8' }, 'Bad request');
  }

  fs.stat(absPath, (err, stat) => {
    if (err || !stat) {
      return send(res, 404, { 'Content-Type': 'text/plain; charset=utf-8' }, 'Not found');
    }

    const finalPath = stat.isDirectory() ? path.join(absPath, 'index.html') : absPath;
    fs.readFile(finalPath, (readErr, data) => {
      if (readErr) {
        return send(res, 500, { 'Content-Type': 'text/plain; charset=utf-8' }, 'Server error');
      }

      const ext = path.extname(finalPath).toLowerCase();
      const contentType = MIME[ext] || 'application/octet-stream';
      send(res, 200, { 'Content-Type': contentType, 'Cache-Control': 'no-cache' }, data);
    });
  });
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`[dev-server] Serving ${ROOT}`);
  console.log(`[dev-server] Open: http://localhost:${PORT}/modular-music-theory.html`);
});
