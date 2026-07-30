/**
 * Dump the text of every feedback message and every unanswered question.
 *
 * Prints just the words — no uuid, no push id, no timestamp, no reason code.
 * Both live at the root of the database (/feedback and /unansweredQuestions),
 * so this is one read per category rather than a walk over every date.
 *
 * Must be run with admin credentials (a service account), not the client SDK —
 * the security rules deny reading feedback and unansweredQuestions from client
 * code by design.
 *
 * Setup:
 *   1. npm install firebase-admin   (already installed at the repo root)
 *   2. Firebase Console > Project Settings > Service Accounts >
 *      Generate new private key. Keep the JSON file OUTSIDE this git repo.
 *
 * Run it from the repo root (guess-blute/), not from dev/, so Node can resolve
 * firebase-admin:
 *
 *   node dev/export-text.js --key <path>                  # both, to the terminal
 *   node dev/export-text.js --key <path> --feedback       # feedback only
 *   node dev/export-text.js --key <path> --unanswered     # unanswered only
 *   node dev/export-text.js --key <path> --unique         # collapse duplicates, show counts
 *   node dev/export-text.js --key <path> --out dump.txt   # write to a file instead
 *
 * This script only ever reads. It writes nothing back to the database.
 */

const fs = require('fs');
const path = require('path');
const { initializeApp, cert } = require('firebase-admin/app');
const { getDatabase } = require('firebase-admin/database');

const args = process.argv.slice(2);
const keyPath = args[args.indexOf('--key') + 1];
const outPath = args.includes('--out') ? args[args.indexOf('--out') + 1] : null;
const unique = args.includes('--unique');
const onlyFeedback = args.includes('--feedback');
const onlyUnanswered = args.includes('--unanswered');

if (!keyPath || args.indexOf('--key') === -1) {
  console.error('Usage: node dev/export-text.js --key <path-to-service-account.json> [--feedback] [--unanswered] [--unique] [--out <file>]');
  process.exit(1);
}

const app = initializeApp({
  credential: cert(require(path.resolve(keyPath))),
  databaseURL: 'https://guess-blute-default-rtdb.firebaseio.com',
});

const db = getDatabase(app);

// Records are nested one level deep per player: /{category}/{uuid}/{pushId}.
// Flatten to a plain list of { text, timestamp }, oldest first.
function flatten(snapshotValue, textField) {
  const out = [];
  for (const uuid of Object.keys(snapshotValue || {})) {
    for (const pushId of Object.keys(snapshotValue[uuid] || {})) {
      const record = snapshotValue[uuid][pushId] || {};
      const text = record[textField];
      if (typeof text === 'string' && text.trim()) {
        out.push({ text: text.trim(), timestamp: record.timestamp || 0 });
      }
    }
  }
  return out.sort((a, b) => a.timestamp - b.timestamp);
}

function render(title, items) {
  const lines = [];
  lines.push(title);
  lines.push('='.repeat(title.length));
  lines.push('');

  if (!items.length) {
    lines.push('(none)');
    lines.push('');
    return lines;
  }

  if (unique) {
    const counts = new Map();
    for (const { text } of items) {
      counts.set(text, (counts.get(text) || 0) + 1);
    }
    const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
    for (const [text, n] of sorted) {
      lines.push(n > 1 ? `${text}  (x${n})` : text);
    }
    lines.push('');
    lines.push(`${sorted.length} unique of ${items.length} total`);
  } else {
    for (const { text } of items) lines.push(text);
    lines.push('');
    lines.push(`${items.length} total`);
  }

  lines.push('');
  return lines;
}

async function main() {
  const wantFeedback = onlyFeedback || !onlyUnanswered;
  const wantUnanswered = onlyUnanswered || !onlyFeedback;

  const [feedbackSnap, unansweredSnap] = await Promise.all([
    wantFeedback ? db.ref('feedback').get() : Promise.resolve(null),
    wantUnanswered ? db.ref('unansweredQuestions').get() : Promise.resolve(null),
  ]);

  let lines = [];

  if (wantFeedback) {
    lines = lines.concat(render('FEEDBACK', flatten(feedbackSnap.val(), 'message')));
  }
  if (wantUnanswered) {
    lines = lines.concat(render('UNANSWERED QUESTIONS', flatten(unansweredSnap.val(), 'text')));
  }

  const output = lines.join('\n');

  if (outPath) {
    fs.writeFileSync(path.resolve(outPath), output);
    console.log(`Wrote ${path.resolve(outPath)}`);
  } else {
    console.log(output);
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Export failed:', err);
    process.exit(1);
  });
