/**
 * One-time migration: restructure the Realtime Database from
 *   /leaderboard/{date}/{uuid}
 *   /questionLog/{date}/{uuid}/{pushId}
 *   /unansweredQuestions/{date}/{uuid}/{pushId}
 *   /feedback/{date}/{uuid}/{pushId}
 * to
 *   /{date}/leaderboard/{uuid}
 *   /{date}/questionLog/{uuid}/{pushId}
 *   /{date}/unansweredQuestions/{uuid}/{pushId}
 *   /{date}/feedback/{uuid}/{pushId}
 *
 * This must be run with admin credentials (a service account), not the
 * client SDK — the security rules deny reading questionLog,
 * unansweredQuestions, and feedback from client code by design.
 *
 * Setup:
 *   1. npm install firebase-admin   (in this folder, or anywhere on your machine)
 *   2. Firebase Console > Project Settings > Service Accounts >
 *      Generate new private key. Save the JSON file somewhere OUTSIDE
 *      this git repo (it's a secret — never commit it).
 *   3. node migrate-to-date-first.js --key /path/to/serviceAccountKey.json
 *
 * By default this only PRINTS what it would do (dry run). Nothing is
 * written until you pass --live. Nothing under the old paths is deleted
 * until you separately pass --delete-old (only meaningful together with
 * --live, and only after you've verified the migration looks right).
 *
 * Usage:
 *   node migrate-to-date-first.js --key <path>                  # dry run
 *   node migrate-to-date-first.js --key <path> --live            # write new paths, keep old
 *   node migrate-to-date-first.js --key <path> --live --delete-old  # write new, then remove old
 */

const path = require('path');
const { initializeApp, cert } = require('firebase-admin/app');
const { getDatabase } = require('firebase-admin/database');

const args = process.argv.slice(2);
const keyPath = args[args.indexOf('--key') + 1];
const isLive = args.includes('--live');
const deleteOld = args.includes('--delete-old');

if (!keyPath || args.indexOf('--key') === -1) {
  console.error('Usage: node migrate-to-date-first.js --key <path-to-service-account.json> [--live] [--delete-old]');
  process.exit(1);
}

const app = initializeApp({
  credential: cert(require(path.resolve(keyPath))),
  databaseURL: 'https://guess-blute-default-rtdb.firebaseio.com',
});

const db = getDatabase(app);
const CATEGORIES = ['leaderboard', 'questionLog', 'unansweredQuestions', 'feedback'];

async function main() {
  console.log(isLive ? 'LIVE RUN — writes will happen.' : 'DRY RUN — nothing will be written. Pass --live to actually migrate.');
  if (isLive && deleteOld) {
    console.log('Old paths WILL be deleted after a successful copy.');
  }
  console.log('');

  const rootSnapshot = await db.ref('/').get();
  const rootKeys = rootSnapshot.exists() ? Object.keys(rootSnapshot.val()) : [];
  console.log('Top-level keys currently in the database:', rootKeys.length ? rootKeys : '(none — database is empty)');
  console.log('');

  const summary = {};

  for (const category of CATEGORIES) {
    const snapshot = await db.ref(category).get();
    if (!snapshot.exists()) {
      console.log(`${category}: nothing to migrate`);
      continue;
    }

    const dates = Object.keys(snapshot.val());
    summary[category] = dates.length;
    console.log(`${category}: ${dates.length} date(s) — ${dates.join(', ')}`);

    if (!isLive) continue;

    for (const date of dates) {
      const data = snapshot.val()[date];
      await db.ref(`${date}/${category}`).set(data);
      console.log(`  wrote /${date}/${category}`);
    }

    if (deleteOld) {
      await db.ref(category).remove();
      console.log(`  removed old /${category}`);
    }
  }

  console.log('');
  console.log('Summary:', summary);
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
