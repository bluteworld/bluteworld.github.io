/**
 * Run createGuessBluteSurvey() from script.google.com (or the Apps Script
 * editor bound to a Sheet/Doc) to generate the playtesting Google Form.
 * The form URL is logged to the execution log (View > Logs) when it finishes.
 */
function createGuessBluteSurvey() {
  const form = FormApp.create('Guess Blute Playtesting Survey');

  form.setDescription(
    "Guess Blute is a daily guessing game — each day there's a secret Blute hidden among a grid " +
    'of characters, and your job is to identify it by asking yes/no questions about its traits ' +
    '(color, mouth, smile, marks, and more). The fewer questions you need, the better your score, ' +
    'with a bonus for solving it without asking about color. Thanks for playtesting! This survey ' +
    'takes about 5 minutes, and specific examples (like a question you typed that didn\'t work as ' +
    'expected) are especially helpful.'
  );

  addMultipleChoice(form, 'Before playing, did you understand what you were supposed to do?',
    ['Yes, completely', 'Mostly', 'Somewhat confused', 'Not at all']);

  addCheckboxes(form, 'What was confusing when you started?',
    ['Nothing was confusing', 'How to ask questions', 'What the grid meant',
     'How scoring works', 'What counts as "one question"'], true);

  addMultipleChoice(form, 'The tutorial was:',
    ['Too long', 'Too short', 'About right', 'I skipped it']);

  addMultipleChoice(form, 'Did you understand you could type free-text questions rather than pick from a list?',
    ['Yes', 'No']);

  // --- Section 2: Asking Questions ---
  form.addPageBreakItem().setTitle('Asking Questions');

  addMultipleChoice(form, 'Did any question you typed get misunderstood or rejected when you felt it should\'ve worked?',
    ['Yes', 'No']);

  form.addTextItem()
    .setTitle('If yes, what did you type?')
    .setRequired(false);

  addMultipleChoice(form, 'Did you ever get flagged for asking multiple questions at once when you thought it was one?',
    ['Yes', 'No']);

  addLinearScale(form, 'Were the yes/no answers to your questions clear and unambiguous?',
    'Confusing', 'Very clear');

  addMultipleChoice(form, 'Did you feel like you ran out of good questions before narrowing it down?',
    ['Yes', 'No', 'Sometimes']);

  // --- Section 3: Difficulty & Pacing ---
  form.addPageBreakItem().setTitle('Difficulty & Pacing');

  addMultipleChoice(form, 'How many questions did it typically take you to guess correctly?',
    ['1–3', '4–6', '7–10', '11+', 'Varied a lot']);

  addLinearScale(form, 'The game felt:', 'Too easy', 'Too hard');

  addCheckboxes(form, 'Were any attributes harder to distinguish visually?',
    ['Color', 'Mouth', 'Smile', 'Marks', 'None'], false);

  // --- Section 4: Scoring ---
  form.addPageBreakItem().setTitle('Scoring');

  addMultipleChoice(form, 'Did you understand how your score was calculated before checking the stats screen?',
    ['Yes', 'No', 'Sort of']);

  addMultipleChoice(form, 'Did you notice the "no-color bonus" for not asking about color?',
    ['Yes, and it changed my strategy', 'Yes, but it didn\'t change anything', 'No, I didn\'t notice']);

  addLinearScale(form, 'The leaderboard felt:', 'Discouraging', 'Motivating');

  // --- Section 5: Retention ---
  form.addPageBreakItem().setTitle('Retention');

  addMultipleChoice(form, 'Would you come back and play again tomorrow?',
    ['Yes', 'No', 'Maybe']);

  addCheckboxes(form, 'Why or why not?',
    ['I enjoy the daily challenge', 'It\'s quick and fun', 'I want to beat my score',
     'Not challenging enough', 'Not fun enough'], true);

  addMultipleChoice(form, 'Is once a day enough?',
    ['Yes', 'I\'d want more puzzles', 'I\'d want a replay mode']);

  // --- Section 6: Bugs & Friction ---
  form.addPageBreakItem().setTitle('Bugs & Friction');

  addMultipleChoice(form, 'Did you hit any bugs, freezes, or unexpected behavior?',
    ['Yes', 'No']);

  form.addTextItem()
    .setTitle('If yes, please describe:')
    .setRequired(false);

  addMultipleChoice(form, 'Did anything about the UI feel unclear on your device/screen size?',
    ['Yes', 'No', 'Somewhat']);

  // --- Section 7: Wrap-up ---
  form.addPageBreakItem().setTitle('Wrap-up');

  addCheckboxes(form, 'What\'s one thing you\'d change?',
    ['Difficulty', 'Scoring system', 'Tutorial', 'Question parsing',
     'Visual design', 'Daily limit', 'Nothing'], true);

  addCheckboxes(form, 'What\'s one thing you\'d keep exactly as-is?',
    ['Daily puzzle format', 'Question-asking mechanic', 'Scoring system',
     'Leaderboard', 'Art and character designs'], true);

  form.addTextItem()
    .setTitle('Anything else you want to tell us?')
    .setRequired(false);

  Logger.log('Form created: ' + form.getEditUrl());
  Logger.log('Share this link with playtesters: ' + form.getPublishedUrl());
}

function addMultipleChoice(form, title, choices) {
  form.addMultipleChoiceItem()
    .setTitle(title)
    .setChoiceValues(choices)
    .setRequired(true);
}

function addCheckboxes(form, title, choices, showOther) {
  const item = form.addCheckboxItem()
    .setTitle(title)
    .setChoiceValues(choices)
    .setRequired(true);
  if (showOther) item.showOtherOption(true);
}

function addLinearScale(form, title, lowLabel, highLabel) {
  form.addScaleItem()
    .setTitle(title)
    .setBounds(1, 5)
    .setLabels(lowLabel, highLabel)
    .setRequired(true);
}
