/**
 * One-time migration: lift feedback and unansweredQuestions out from under the
 * date and back to the root of the database, from
 *   /{date}/unansweredQuestions/{uuid}/{pushId}
 *   /{date}/feedback/{uuid}/{pushId}
 * to
 *   /unansweredQuestions/{uuid}/{pushId}
 *   /feedback/{uuid}/{pushId}
 *
 * leaderboard and questionLog are NOT touched — they stay date-first at
 * /{date}/leaderboard/{uuid} and /{date}/questionLog/{uuid}/{pushId}.
 *
 * Because the date is no longer a path segment, this script writes the date it
 * came from onto each record as a `date` field. New writes from telemetry.js do
 * the same, and the replay tooling relies on it to scope a replay to one day.
 *
 * Push IDs are chronologically ordered and globally unique, so records from
 * different dates merge under a single uuid without collision. Where the same
 * push ID somehow already exists at the destination it is left alone and
 * reported, rather than overwritten.
 *
 * This must be run with admin credentials (a service account), not the client
 * SDK — the security rules deny reading questionLog, unansweredQuestions, and
 * feedback from client code by design.
 *
 * Setup:
 *   1. npm install firebase-admin   (in this folder, or anywhere on your machine)
 *   2. Firebase Console > Project Settings > Service Accounts >
 *      Generate new private key. Save the JSON file somewhere OUTSIDE
 *      this git repo (it's a secret — never commit it).
 *   3. node migrate-feedback-to-root.js --key /path/to/serviceAccountKey.json
 *
 * By default this only PRINTS what it would do (dry run). Nothing is written
 * until you pass --live. Nothing under the old paths is deleted until you
 * separately pass --delete-old (only meaningful together with --live, and only
 * after you've verified the migration looks right).
 *
 * Usage:
 *   node migrate-feedback-to-root.js --key <path>                     # dry run
 *   node migrate-feedback-to-root.js --key <path> --live              # write new paths, keep old
 *   node migrate-feedback-to-root.js --key <path> --live --delete-old # write new, then remove old
 */

const path = require('path');
const { initializeApp, cert } = require('firebase-admin/app');
const { getDatabase } = require('firebase-admin/database');

const args = process.argv.slice(2);
const keyPath = args[args.indexOf('--key') + 1];
const isLive = args.includes('--live');
const deleteOld = args.includes('--delete-old');

if (!keyPath || args.indexOf('--key') === -1) {
  console.error('Usage: node migrate-feedback-to-root.js --key <path-to-service-account.json> [--live] [--delete-old]');
  process.exit(1);
}

const app = initializeApp({
  credential: cert(require(path.resolve(keyPath))),
  databaseURL: 'https://guess-blute-default-rtdb.firebaseio.com',
});

const db = getDatabase(app);
const CATEGORIES = ['unansweredQuestions', 'feedback'];
const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;

async function main() {
  console.log(isLive ? 'LIVE RUN — writes will happen.' : 'DRY RUN — nothing will be written. Pass --live to actually migrate.');
  if (isLive && deleteOld) {
    console.log('Old paths WILL be deleted after a successful copy.');
  }
  console.log('');

  const rootSnapshot = await db.ref('/').get();
  const rootKeys = rootSnapshot.exists() ? Object.keys(rootSnapshot.val()) : [];
  const dates = rootKeys.filter((key) => DATE_KEY.test(key)).sort();

  console.log('Top-level keys currently in the database:', rootKeys.length ? rootKeys : '(none — database is empty)');
  console.log(`Date nodes found: ${dates.length ? dates.join(', ') : '(none)'}`);
  console.log('');

  const summary = {};
  let skipped = 0;

  for (const category of CATEGORIES) {
    let moved = 0;
    let players = 0;

    for (const date of dates) {
      const snapshot = await db.ref(`${date}/${category}`).get();
      if (!snapshot.exists()) continue;

      const byPlayer = snapshot.val();

      for (const uuid of Object.keys(byPlayer)) {
        const records = byPlayer[uuid] || {};
        players += 1;

        for (const pushId of Object.keys(records)) {
          const destRef = db.ref(`${category}/${uuid}/${pushId}`);

          if (isLive) {
            const existing = await destRef.get();
            if (existing.exists()) {
              console.log(`  SKIP ${category}/${uuid}/${pushId} — already present at destination`);
              skipped += 1;
              continue;
            }
            // Stamp the date the record came from, since it is no longer in the path.
            await destRef.set({ ...records[pushId], date });
          }

          moved += 1;
        }
      }

      console.log(`${category}: ${date} — ${Object.keys(byPlayer).length} player(s)`);
    }

    summary[category] = { records: moved, playerNodes: players };

    if (isLive && deleteOld) {
      for (const date of dates) {
        const snapshot = await db.ref(`${date}/${category}`).get();
        if (!snapshot.exists()) continue;
        await db.ref(`${date}/${category}`).remove();
        console.log(`  removed old /${date}/${category}`);
      }
    }
  }

  console.log('');
  console.log('Summary:', summary);
  if (skipped) {
    console.log(`${skipped} record(s) skipped because they already existed at the destination.`);
  }
  if (!isLive) {
    console.log('This was a dry run — re-run with --live to actually write the new structure.');
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Migration failed:', err);
    process.exit(1);
  });
