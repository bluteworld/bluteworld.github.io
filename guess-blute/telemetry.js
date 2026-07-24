function logQuestionEvent(date, uuid, entry) {
  return db.ref(`${date}/questionLog/${uuid}`).push({
    ...entry,
    uuid,
    timestamp: firebase.database.ServerValue.TIMESTAMP,
  });
}

function logUnansweredQuestion(date, uuid, rawText, name, reason) {
  return db.ref(`${date}/unansweredQuestions/${uuid}`).push({
    text: rawText,
    name,
    uuid,
    reason: reason || 'unmatched',
    timestamp: firebase.database.ServerValue.TIMESTAMP,
  });
}

function submitFeedback(date, uuid, message, name) {
  return db.ref(`${date}/feedback/${uuid}`).push({
    message,
    name,
    uuid,
    timestamp: firebase.database.ServerValue.TIMESTAMP,
  });
}
