function logQuestionEvent(date, uuid, entry) {
  return db.ref(`questionLog/${date}/${uuid}`).push({
    ...entry,
    uuid,
    timestamp: firebase.database.ServerValue.TIMESTAMP,
  });
}

function logUnansweredQuestion(date, uuid, rawText, name) {
  return db.ref(`unansweredQuestions/${date}/${uuid}`).push({
    text: rawText,
    name,
    uuid,
    timestamp: firebase.database.ServerValue.TIMESTAMP,
  });
}

function submitFeedback(date, uuid, message, name) {
  return db.ref(`feedback/${date}/${uuid}`).push({
    message,
    name,
    uuid,
    timestamp: firebase.database.ServerValue.TIMESTAMP,
  });
}
