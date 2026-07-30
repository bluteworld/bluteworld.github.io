function logQuestionEvent(date, uuid, entry) {
  return db.ref(`${date}/questionLog/${uuid}`).push({
    ...entry,
    uuid,
    timestamp: firebase.database.ServerValue.TIMESTAMP,
  });
}

// unansweredQuestions and feedback live at the root rather than under a date,
// so they can be read in one query across every puzzle. The date is kept as a
// field on each record instead of as a path segment.
function logUnansweredQuestion(date, uuid, rawText, name, reason) {
  return db.ref(`unansweredQuestions/${uuid}`).push({
    text: rawText,
    name,
    uuid,
    date,
    reason: reason || 'unmatched',
    timestamp: firebase.database.ServerValue.TIMESTAMP,
  });
}

function submitFeedback(date, uuid, message, name) {
  return db.ref(`feedback/${uuid}`).push({
    message,
    name,
    uuid,
    date,
    timestamp: firebase.database.ServerValue.TIMESTAMP,
  });
}
