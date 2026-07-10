function logQuestionEvent(date, uuid, entry) {
  return db.ref(`questionLog/${date}/${uuid}`).push({
    ...entry,
    uuid,
    timestamp: firebase.database.ServerValue.TIMESTAMP,
  });
}

function logUnansweredQuestion(date, uuid, rawText, name, reason) {
  return db.ref(`unansweredQuestions/${date}/${uuid}`).push({
    text: rawText,
    name,
    uuid,
    reason: reason || 'unmatched',
    timestamp: firebase.database.ServerValue.TIMESTAMP,
  });
}

function getQuestionLog(date, uuid) {
  return db
    .ref(`questionLog/${date}/${uuid}`)
    .get()
    .then((snapshot) => Object.values(snapshot.val() || {}));
}

function submitFeedback(date, uuid, message, name) {
  return db.ref(`feedback/${date}/${uuid}`).push({
    message,
    name,
    uuid,
    timestamp: firebase.database.ServerValue.TIMESTAMP,
  });
}
