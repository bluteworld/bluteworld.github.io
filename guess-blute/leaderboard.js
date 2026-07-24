function extractScore(entry) {
  // Oldest entries were a raw number; newer ones are { questionsAsked, name }.
  // A brief points-based experiment also wrote { points, name } — fall back to it.
  if (typeof entry === 'number') return entry;
  if (typeof entry.questionsAsked === 'number') return entry.questionsAsked;
  return entry.points;
}

function submitScore(date, uuid, questionsAsked, name, extra = {}) {
  return db.ref(`${date}/leaderboard/${uuid}`).set({ questionsAsked, name, uuid, ...extra });
}

function clearPlayerScore(date, uuid) {
  return db.ref(`${date}/leaderboard/${uuid}`).remove();
}

function getPlayerEntry(date, uuid) {
  return db
    .ref(`${date}/leaderboard/${uuid}`)
    .get()
    .then((snapshot) => (snapshot.exists() ? snapshot.val() : null));
}

function getLeaderboard(date) {
  return db
    .ref(`${date}/leaderboard`)
    .get()
    .then((snapshot) => {
      const data = snapshot.val() || {};
      return Object.entries(data)
        .map(([uuid, entry]) => ({
          uuid,
          name: (entry && typeof entry === 'object' && entry.name) || 'Anonymous',
          score: extractScore(entry),
        }))
        .sort((a, b) => a.score - b.score);
    });
}
