/**
 * Local launcher for Slip n Slide. Serves the whole site from the repo root
 * (the game pulls ../firebase-config.js, ../player.js and ../favicon.png from
 * there) and opens the game in your default browser.
 *
 * No dependencies — just Node.
 *
 * Usage (from anywhere):
 *   node slip-n-slide/launch.js [--port 8080] [--no-open]
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const args = process.argv.slice(2);
function argVal(flag, fallback) {
  const i = args.indexOf(flag);
  return i === -1 ? fallback : args[i + 1];
}

const port = Number(argVal('--port', '8080'));
const shouldOpen = !args.includes('--no-open');

const ROOT = path.resolve(__dirname, '..');

const MIME = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.css': 'text/css',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
};

function serveStatic(req, res, urlPath) {
  let filePath = path.join(ROOT, decodeURIComponent(urlPath));
  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }
  if (urlPath.endsWith('/')) filePath = path.join(filePath, 'index.html');

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, {
      'Content-Type': MIME[ext] || 'application/octet-stream',
      'Cache-Control': 'no-store',
    });
    res.end(data);
  });
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${port}`);
  // Without the trailing slash the game's relative paths (style.css etc.)
  // would resolve against the root instead of the game folder.
  if (url.pathname === '/' || url.pathname === '/slip-n-slide') {
    res.writeHead(302, { Location: '/slip-n-slide/' });
    res.end();
    return;
  }
  serveStatic(req, res, url.pathname);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${port} is already in use — try --port <other>.`);
  } else {
    console.error(err);
  }
  process.exit(1);
});

server.listen(port, () => {
  const gameUrl = `http://localhost:${port}/slip-n-slide/`;
  console.log(`Slip n Slide running at ${gameUrl}`);
  console.log('Press Ctrl+C to stop.');
  if (shouldOpen) {
    const cmd =
      process.platform === 'win32' ? `start "" "${gameUrl}"`
      : process.platform === 'darwin' ? `open "${gameUrl}"`
      : `xdg-open "${gameUrl}"`;
    exec(cmd);
  }
});
