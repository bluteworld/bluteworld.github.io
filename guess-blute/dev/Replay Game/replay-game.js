/**
 * Fetch one player's full game data for a given date — their question log,
 * unanswered questions, and final leaderboard entry — and write it to a
 * JSON file that dev/replay-viewer.html can load and visually step through.
 *
 * Requires admin credentials. questionLog and unansweredQuestions are not
 * readable by client code by design (see database.rules.json) — only an
 * admin service account can read them.
 *
 * Setup: same as dev/migrate-to-date-first.js. From this folder:
 *   npm install   (installs firebase-admin, already declared in package.json)
 * Then download a service account key from Firebase Console > Project
 * Settings > Service Accounts > Generate new private key. Save it OUTSIDE
 * this git repo — it's a secret, never commit it.
 *
 * Usage:
 *   node dev/replay-game.js --key <path> --date 2026-07-21 --uuid <uuid>
 *
 * Name is optional in the game (often blank/"Anonymous"), so this only
 * looks players up by uuid. Find a day's uuids via the leaderboard, e.g.
 * dev/migrate-to-date-first.js's dry run, or by reading /{date}/leaderboard
 * directly with admin credentials.
 */

const fs = require('fs');
const path = require('path');
const { initializeApp, cert } = require('firebase-admin/app');
const { getDatabase } = require('firebase-admin/database');

const args = process.argv.slice(2);
function argVal(flag) {
  const i = args.indexOf(flag);
  return i === -1 ? undefined : args[i + 1];
}

const keyPath = argVal('--key');
const date = argVal('--date');
const uuid = argVal('--uuid');
const outArg = argVal('--out');

if (!keyPath || !date || !uuid) {
  console.error('Usage: node replay-game.js --key <service-account.json> --date <YYYY-MM-DD> --uuid <uuid> [--out <file.json>]');
  process.exit(1);
}

const app = initializeApp({
  credential: cert(require(path.resolve(keyPath))),
  databaseURL: 'https://guess-blute-default-rtdb.firebaseio.com',
});
const db = getDatabase(app);

async function main() {
  const [leaderboardSnap, questionLogSnap, unansweredSnap] = await Promise.all([
    db.ref(`${date}/leaderboard/${uuid}`).get(),
    db.ref(`${date}/questionLog/${uuid}`).get(),
    db.ref(`${date}/unansweredQuestions/${uuid}`).get(),
  ]);

  if (!questionLogSnap.exists()) {
    console.error(`No question log found for uuid ${uuid} on ${date}.`);
    process.exit(1);
  }

  const result = {
    date,
    uuid,
    leaderboard: leaderboardSnap.val(),
    questionLog: Object.values(questionLogSnap.val() || {}),
    unansweredQuestions: Object.values(unansweredSnap.val() || {}),
  };

  const outPath = path.resolve(outArg || `replay-${date}-${uuid}.json`);
  fs.writeFileSync(outPath, JSON.stringify(result, null, 2));
  console.log(`Wrote ${outPath}`);
  console.log('Open dev/replay-viewer.html in a browser and load that file to watch the replay.');
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Failed:', err);
    process.exit(1);
  });
