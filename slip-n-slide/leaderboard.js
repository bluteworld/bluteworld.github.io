// Global scores for Slip n Slide. There is no daily puzzle here, so
// unlike Guess Blute every score goes into a single all-time list keyed by
// player, and the "best" everyone sees is the highest entry in it.
//
// Every function here works without a network: if the Firebase scripts failed
// to load, or the write is refused, the caller falls back to the local best.
//
// The player UUID comes from ../player.js and is shared with every other game
// on the site, so a score posted here belongs to the same person who plays
// Guess Blute in this browser.

const SCORES_PATH = "slipNSlideScores";

// One row per player, holding only their best. Writing again overwrites it.
function submitScore(uuid, score) {
  if (typeof db === "undefined") return Promise.resolve();
  return db.ref(`${SCORES_PATH}/${uuid}`).set({
    score,
    uuid,
    timestamp: firebase.database.ServerValue.TIMESTAMP,
  });
}

// The single highest score anyone has posted. limitToLast(1) on an ordered
// query means the server sends one row rather than the whole list.
function getGlobalBest() {
  if (typeof db === "undefined") return Promise.resolve(0);
  return db
    .ref(SCORES_PATH)
    .orderByChild("score")
    .limitToLast(1)
    .get()
    .then((snapshot) => {
      let top = 0;
      snapshot.forEach((child) => {
        const entry = child.val();
        if (entry && typeof entry.score === "number") {
          top = Math.max(top, entry.score);
        }
      });
      return top;
    });
}
