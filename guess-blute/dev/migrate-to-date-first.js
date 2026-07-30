/**
 * SUPERSEDED — historical record only. This has already been run; it will
 * refuse to do anything unless you pass --i-know-this-is-superseded.
 *
 * unansweredQuestions and feedback have since been moved back out to the root
 * by migrate-feedback-to-root.js, and no longer live under a date. This script
 * can no longer touch them: they have been removed from CATEGORIES below, so
 * even forced past the guard it only handles leaderboard and questionLog, which
 * are still date-first. Both of those were migrated long ago, so there is
 * nothing left at the old source paths for it to find.
 *
 * One-time migration: restructure the Realtime Database from
 *   /leaderboard/{date}/{uuid}
 *   /questionLog/{date}/{uuid}/{pushId}
 *   /unansweredQuestions/{date}/{uuid}/{pushId}   (since moved back to the root)
 *   /feedback/{date}/{uuid}/{pushId}              (since moved back to the root)
 * to
 *   /{date}/leaderboard/{uuid}
 *   /{date}/questionLog/{uuid}/{pushId}
 *   /{date}/unansweredQuestions/{uuid}/{pushId}   (no longer — see above)
 *   /{date}/feedback/{uuid}/{pushId}              (no longer — see above)
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

if (!args.includes('--i-know-this-is-superseded')) {
  console.error('This migration has already been run and is kept only as a record.');
  console.error('');
  console.error('feedback and unansweredQuestions no longer live under a date — they were');
  console.error('moved back to the root by migrate-feedback-to-root.js. This script has been');
  console.error('stripped down to leaderboard and questionLog so it cannot undo that, and');
  console.error('both of those were migrated long ago, so it has nothing left to do.');
  console.error('');
  console.error('If you genuinely need to run it anyway, pass --i-know-this-is-superseded.');
  process.exit(1);
}

if (!keyPath || args.indexOf('--key') === -1) {
  console.error('Usage: node migrate-to-date-first.js --key <path-to-service-account.json> [--live] [--delete-old] --i-know-this-is-superseded');
  process.exit(1);
}

const app = initializeApp({
  credential: cert(require(path.resolve(keyPath))),
  databaseURL: 'https://guess-blute-default-rtdb.firebaseio.com',
});

const db = getDatabase(app);
// unansweredQuestions and feedback deliberately removed — they live at the root
// now, and listing them here would let this script move them back under a date.
const CATEGORIES = ['leaderboard', 'questionLog'];

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
