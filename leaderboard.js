function extractScore(entry) {
  // Older entries were stored as a raw number; newer ones as { questionsAsked, name }.
  return typeof entry === 'number' ? entry : entry.questionsAsked;
}

function submitScore(date, uuid, questionsAsked, name, extra = {}) {
  return db.ref(`leaderboard/${date}/${uuid}`).set({ questionsAsked, name, uuid, ...extra });
}

function clearPlayerScore(date, uuid) {
  return db.ref(`leaderboard/${date}/${uuid}`).remove();
}

function getPlayerScore(date, uuid) {
  return db
    .ref(`leaderboard/${date}/${uuid}`)
    .get()
    .then((snapshot) => (snapshot.exists() ? extractScore(snapshot.val()) : null));
}

function getStats(date) {
  return db
    .ref(`leaderboard/${date}`)
    .get()
    .then((snapshot) => {
      const data = snapshot.val() || {};
      const scores = Object.values(data).map(extractScore);

      if (scores.length === 0) {
        return { count: 0, average: null, best: null };
      }

      const sum = scores.reduce((a, b) => a + b, 0);
      return {
        count: scores.length,
        average: sum / scores.length,
        best: Math.min(...scores),
      };
    });
}
