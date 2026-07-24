/**
 * Local admin-only server for the replay viewer. Serves the guess-blute
 * static files (so replay-viewer.html's existing relative asset paths just
 * work, same as opening it directly) plus a JSON API backed by your
 * Firebase admin credentials, so questionLog/unansweredQuestions (not
 * client-readable, by design — see database.rules.json) can be fetched by
 * typing a uuid into a text box instead of running replay-game.js by hand
 * each time.
 *
 * This never touches your security rules and never exposes your service
 * account key to the browser — the key stays on this local process; the
 * page only ever talks to http://localhost, never to Firebase directly for
 * the private paths.
 *
 * Setup: same as dev/migrate-to-date-first.js — npm install (already
 * declared in package.json), then download a service account key from
 * Firebase Console > Project Settings > Service Accounts. Keep it outside
 * this repo.
 *
 * Usage (from the "dev/Replay Game" folder, or give the full path):
 *   node replay-server.js --key <path-to-service-account.json> [--port 4321]
 * Then open the printed URL — type a date and uuid into the form and click
 * Fetch.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { initializeApp, cert } = require('firebase-admin/app');
const { getDatabase } = require('firebase-admin/database');

const args = process.argv.slice(2);
function argVal(flag, fallback) {
  const i = args.indexOf(flag);
  return i === -1 ? fallback : args[i + 1];
}

const keyPath = argVal('--key');
const port = Number(argVal('--port', '4321'));

if (!keyPath) {
  console.error('Usage: node replay-server.js --key <service-account.json> [--port 4321]');
  process.exit(1);
}

const app = initializeApp({
  credential: cert(require(path.resolve(keyPath))),
  databaseURL: 'https://guess-blute-default-rtdb.firebaseio.com',
});
const db = getDatabase(app);

const ROOT = path.resolve(__dirname, '..', '..');

const MIME = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.css': 'text/css',
  '.png': 'image/png',
  '.PNG': 'image/png',
  '.svg': 'image/svg+xml',
};

async function handleApi(req, res, url) {
  const date = url.searchParams.get('date');
  const uuid = url.searchParams.get('uuid');
  if (!date || !uuid) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'date and uuid query params are required' }));
    return;
  }

  try {
    const [leaderboardSnap, questionLogSnap, unansweredSnap] = await Promise.all([
      db.ref(`${date}/leaderboard/${uuid}`).get(),
      db.ref(`${date}/questionLog/${uuid}`).get(),
      db.ref(`${date}/unansweredQuestions/${uuid}`).get(),
    ]);

    if (!questionLogSnap.exists()) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: `No question log found for uuid ${uuid} on ${date}.` }));
      return;
    }

    const result = {
      date,
      uuid,
      leaderboard: leaderboardSnap.val(),
      questionLog: Object.values(questionLogSnap.val() || {}),
      unansweredQuestions: Object.values(unansweredSnap.val() || {}),
    };
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(result));
  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: String(err) }));
  }
}

function serveStatic(req, res, urlPath) {
  const filePath = path.join(ROOT, decodeURIComponent(urlPath));
  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }
    const ext = path.extname(filePath);
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(data);
  });
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${port}`);

  if (url.pathname === '/api/replay') {
    handleApi(req, res, url);
    return;
  }

  const urlPath = url.pathname === '/' ? '/dev/Replay Game/replay-viewer.html' : url.pathname;
  serveStatic(req, res, urlPath);
});

server.listen(port, () => {
  console.log(`Replay server running at http://localhost:${port}/`);
  console.log('Open that URL, then type a date and uuid into the form and click Fetch.');
});
