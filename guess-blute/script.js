const CARD_FRAME = 'card_bg.PNG';

const grid = document.getElementById('grid');
const questionWrap = document.querySelector('.question-wrap');
const questionForm = document.getElementById('questionForm');
const questionInput = document.getElementById('questionInput');
const questionFeedback = document.getElementById('questionFeedback');
const historyList = document.getElementById('historyList');
const modalOverlay = document.getElementById('modalOverlay');
const modalContent = document.getElementById('modalContent');
const scoreDisplay = document.getElementById('scoreDisplay');
const statsBtn = document.getElementById('statsBtn');
const infoBtn = document.getElementById('infoBtn');
const feedbackBtn = document.getElementById('feedbackBtn');
const unlimitedModeBtn = document.getElementById('unlimitedModeBtn');
const quitBtn = document.getElementById('quitBtn');
const secretLabel = document.getElementById('secretLabel');

let dailyState = null;
let gameMode = 'daily'; // 'daily' | 'unlimited'
let playerName = localStorage.getItem('guessBluteName') || '';
let lastQuestionRef = null;

const DEFAULT_PLACEHOLDER = questionInput.placeholder;

const MARK_COLORS = ['red', 'yellow', 'green'];
const MARK_LABELS = { none: '', red: 'eliminated', yellow: 'suspect', green: 'likely' };
const WRONG_GUESS_SHAKE_MS = 400;
const WRONG_GUESS_MODAL_MS = 1000;
const COLOR_BONUS = 2;
const QUIT_DATE_KEY = 'guessBluteQuitDate';

function shakeFeedback() {
  questionFeedback.classList.remove('shake');
  void questionFeedback.offsetWidth;
  questionFeedback.classList.add('shake');
  setTimeout(() => questionFeedback.classList.remove('shake'), WRONG_GUESS_SHAKE_MS);
}

function randomExampleQuestion() {
  const list = BLUTE_DATA.questions;
  return list[Math.floor(Math.random() * list.length)].text;
}

function setMark(cell, blute, mark) {
  cell.dataset.mark = mark;
  const suffix = MARK_LABELS[mark] ? ` – ${MARK_LABELS[mark]}` : '';
  cell.setAttribute('aria-label', `${blute.name}${suffix}`);
}

let openPopupCell = null;

function closeCardPopup() {
  if (!openPopupCell) return;
  const overlay = openPopupCell.querySelector('.card-overlay');
  if (overlay) overlay.hidden = true;
  openPopupCell = null;
}

function openCardPopup(cell) {
  if (openPopupCell === cell) {
    closeCardPopup();
    return;
  }
  closeCardPopup();
  openPopupCell = cell;
  const overlay = cell.querySelector('.card-overlay');
  if (overlay) overlay.hidden = false;
}

// Built once per cell in renderGrid and toggled hidden/visible from then on —
// it sits directly on top of the card art (see overlay-layout.png) rather
// than floating in a separately-positioned box.
function buildCardOverlay(cell, blute) {
  const overlay = document.createElement('div');
  overlay.className = 'card-overlay';
  overlay.hidden = true;

  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.className = 'card-overlay-close';
  closeBtn.setAttribute('aria-label', 'Close');
  closeBtn.textContent = '✕';
  closeBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    closeCardPopup();
  });
  overlay.appendChild(closeBtn);

  const swatches = document.createElement('div');
  swatches.className = 'card-overlay-swatches';
  MARK_COLORS.forEach((color) => {
    const swatch = document.createElement('button');
    swatch.type = 'button';
    swatch.className = 'card-overlay-swatch';
    swatch.dataset.color = color;
    swatch.setAttribute('aria-label', MARK_LABELS[color]);
    swatch.addEventListener('click', (e) => {
      e.stopPropagation();
      const nextMark = cell.dataset.mark === color ? 'none' : color;
      setMark(cell, blute, nextMark);
      swatches.querySelectorAll('.card-overlay-swatch').forEach((s) => s.classList.toggle('active', s === swatch && nextMark !== 'none'));
      closeCardPopup();
    });
    swatches.appendChild(swatch);
  });
  overlay.appendChild(swatches);

  const guessBtn = document.createElement('button');
  guessBtn.type = 'button';
  guessBtn.className = 'card-overlay-guess';
  guessBtn.textContent = 'Guess';
  guessBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    closeCardPopup();
    handleGuess(blute.id, cell);
  });
  overlay.appendChild(guessBtn);

  cell.appendChild(overlay);
}

document.addEventListener('click', (e) => {
  if (!openPopupCell) return;
  if (openPopupCell.contains(e.target)) return;
  closeCardPopup();
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeCardPopup();
});

function getPlayerUUID() {
  let uuid = localStorage.getItem('guessBluteUUID');
  if (!uuid) {
    uuid = crypto.randomUUID();
    localStorage.setItem('guessBluteUUID', uuid);
  }
  return uuid;
}

let modalOnDismiss = null;

function closeModal() {
  modalOverlay.hidden = true;
  modalContent.innerHTML = '';
  modalContent.classList.remove('tutorial-modal');
  modalOnDismiss = null;
}

// onDismiss (optional) fires if the modal is closed by clicking outside it —
// use this when closing that way should still trigger whatever the modal's
// buttons would have (e.g. the name prompt still starting the game).
function openModal(contentEl, onDismiss) {
  modalContent.innerHTML = '';
  modalContent.appendChild(contentEl);
  modalOverlay.hidden = false;
  modalOnDismiss = onDismiss || null;
}

function makeButton(label, onClick, variant = 'primary') {
  const btn = document.createElement('button');
  btn.className = variant;
  btn.textContent = label;
  btn.addEventListener('click', onClick);
  return btn;
}

function getTodayString() {
  return new Date().toISOString().split('T')[0];
}

function dateToSeed(dateStr) {
  return dateStr.split('-').reduce((acc, n) => acc * 10000 + parseInt(n, 10), 0);
}

function seededRandom(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle(array, rand) {
  const copy = array.slice();
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function renderGrid(gridBlutes) {
  grid.innerHTML = '';
  gridBlutes.forEach((blute) => {
    const cell = document.createElement('div');
    cell.className = 'cell';
    cell.dataset.id = blute.id;
    cell.setAttribute('role', 'button');
    cell.setAttribute('aria-label', blute.name);
    cell.tabIndex = 0;

    const art = document.createElement('img');
    art.className = 'cell-art';
    art.src = blute.image;
    art.alt = blute.name;

    cell.appendChild(art);
    buildCardOverlay(cell, blute);

    cell.addEventListener('click', () => {
      if (!dailyState || dailyState.finished) return;
      openCardPopup(cell);
    });

    cell.addEventListener('keydown', (e) => {
      if (!dailyState || dailyState.finished) return;
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openCardPopup(cell);
      }
    });

    grid.appendChild(cell);
  });
}

function syncGridWidth() {
  document.documentElement.style.setProperty('--grid-width', `${grid.offsetWidth}px`);
}

function getSecretBlute() {
  return BLUTE_DATA.blutes.find((b) => b.id === dailyState.secretId);
}

function evaluateQuestion(blute, question) {
  if (question.attribute === 'color') return blute.color === question.value;
  return blute.attributes[question.attribute] === question.value;
}

function getBoardAnswers(question) {
  const answers = {};
  dailyState.gridIds.forEach((id) => {
    const blute = BLUTE_DATA.blutes.find((b) => b.id === id);
    answers[id] = evaluateQuestion(blute, question);
  });
  return answers;
}

function getBoardMarks() {
  const marks = {};
  Array.from(grid.children).forEach((cell) => {
    marks[cell.dataset.id] = cell.dataset.mark || 'none';
  });
  return marks;
}

// Marks are a manual, player-driven action — nothing about answering a
// question changes them. So "marksAfter" for a question isn't knowable until
// the player's next action (another question, or a winning guess). This
// patches the previously-logged entry at that point instead of writing a
// same-instant (and therefore always-identical) snapshot.
function finalizeLastQuestionMarks() {
  if (!lastQuestionRef) return;
  const ref = lastQuestionRef;
  lastQuestionRef = null;
  ref.update({ marksAfter: getBoardMarks() }).catch(() => {});
}

function renderHistory() {
  historyList.innerHTML = '';

  if (dailyState.history.length === 0) {
    const li = document.createElement('li');
    li.className = 'question-empty';
    li.textContent = 'No questions asked yet.';
    historyList.appendChild(li);
    return;
  }

  dailyState.history.forEach((entry) => {
    const li = document.createElement('li');
    const q = document.createElement('span');
    q.className = 'history-question';
    q.textContent = entry.text;
    const dots = document.createElement('span');
    dots.className = 'history-dots';
    const a = document.createElement('span');
    a.textContent = entry.answer ? 'Yes' : 'No';
    a.className = entry.answer ? 'answer-yes' : 'answer-no';
    li.appendChild(q);
    li.appendChild(dots);
    li.appendChild(a);
    historyList.appendChild(li);
  });

  historyList.scrollTop = historyList.scrollHeight;
}

function showQuestionFeedback(message) {
  questionFeedback.textContent = message;
}

function updateScoreDisplay() {
  scoreDisplay.textContent = dailyState ? `Score: ${dailyState.questionsAsked}` : '';
}

function showWrongGuessModal() {
  const wrap = document.createElement('div');
  wrap.className = 'toast-modal';
  wrap.innerHTML = '<p>Wrong guess</p>';
  openModal(wrap);
  setTimeout(() => {
    if (modalContent.contains(wrap)) closeModal();
  }, WRONG_GUESS_MODAL_MS);
}

function askQuestion() {
  if (!dailyState || dailyState.finished) return;

  const rawText = questionInput.value.trim();
  if (!rawText) return;

  finalizeLastQuestionMarks();

  const marksBefore = getBoardMarks();
  const result = interpretQuestion(rawText);

  if (!result.ok) {
    questionInput.value = '';

    if (result.reason === 'multiple') {
      showQuestionFeedback('One question at a time, please — try splitting that up.');
      shakeFeedback();
      logUnansweredQuestion(dailyState.date, getPlayerUUID(), rawText, playerName, 'multiple').catch(() => {});
      return;
    }

    questionInput.placeholder = `Try something like: "${randomExampleQuestion()}"`;
    showQuestionFeedback("Couldn't quite figure out what that's asking — try the example above.");
    shakeFeedback();
    logUnansweredQuestion(dailyState.date, getPlayerUUID(), rawText, playerName, 'unmatched').catch(() => {});
    return;
  }

  const askedKey = `${result.attribute}:${result.value}`;
  if (dailyState.askedKeys.has(askedKey)) {
    showQuestionFeedback("You've already asked something that answers that.");
    shakeFeedback();
    return;
  }

  const answer = evaluateQuestion(getSecretBlute(), result);
  const boardAnswers = getBoardAnswers(result);
  dailyState.askedKeys.add(askedKey);
  dailyState.history.push({ text: rawText, attribute: result.attribute, value: result.value, answer });
  dailyState.questionsAsked += 1;

  const ref = logQuestionEvent(dailyState.date, getPlayerUUID(), {
    name: playerName,
    secretId: dailyState.secretId,
    rawText,
    attribute: result.attribute,
    value: result.value,
    answer,
    boardAnswers,
    marksBefore,
  });
  ref.catch(() => {});
  lastQuestionRef = ref;

  questionInput.value = '';
  showQuestionFeedback('');
  renderHistory();
  updateScoreDisplay();
}

function renderStatsModal(yourScore, colorBonus) {
  const wrap = document.createElement('div');
  wrap.innerHTML = `<h2>Today's Stats</h2>`;

  if (typeof yourScore !== 'number') {
    const p = document.createElement('p');
    p.textContent = "You haven't finished today's puzzle yet.";
    wrap.appendChild(p);
    const closeBtn = makeButton('Close', closeModal);
    closeBtn.classList.add('stats-close');
    wrap.appendChild(closeBtn);
    openModal(wrap);
    return;
  }

  const rawScore = yourScore + (colorBonus || 0);

  const list = document.createElement('ul');
  list.className = 'leaderboard-list';

  const rows = [
    ['Score', rawScore],
    ['No-color bonus', colorBonus ? `-${colorBonus}` : 0],
    ['Total score', yourScore, true],
  ];

  rows.forEach(([label, value, bold]) => {
    const li = document.createElement('li');
    if (bold) li.classList.add('stat-highlight');
    const labelEl = document.createElement('span');
    labelEl.textContent = label;
    const valueEl = document.createElement('span');
    valueEl.textContent = value;
    li.appendChild(labelEl);
    li.appendChild(valueEl);
    list.appendChild(li);
  });

  wrap.appendChild(list);
  const closeBtn = makeButton('Close', closeModal);
  closeBtn.classList.add('stats-close');
  wrap.appendChild(closeBtn);
  openModal(wrap);
}

function renderNameModal(onSubmit) {
  const wrap = document.createElement('div');
  wrap.innerHTML = `
    <button type="button" class="modal-close" id="nameModalClose" aria-label="Close">&times;</button>
    <h2>Welcome!</h2>
    <p>What should we call you?</p>
    <input type="text" id="nameInput" placeholder="Your name" autocomplete="off" />
  `;

  // Grab direct references now, before this content ever gets appended (and
  // later removed by closeModal(), which would make a getElementById lookup
  // at finish-time return null since the input would no longer be in the DOM).
  const input = wrap.querySelector('#nameInput');
  const closeBtn = wrap.querySelector('#nameModalClose');

  // Called whether the player fills in a name, leaves it blank, or dismisses
  // the dialog entirely (X button or clicking outside) — a name is a nice-to-
  // have for identifying data later, not required to play.
  const finish = () => {
    const name = input.value.trim();
    if (name) {
      playerName = name;
      localStorage.setItem('guessBluteName', name);
    }
    onSubmit();
  };

  const submitAndClose = () => {
    closeModal();
    finish();
  };

  wrap.appendChild(makeButton('Start', submitAndClose));
  openModal(wrap, finish);

  closeBtn.addEventListener('click', submitAndClose);

  input.value = playerName;
  input.focus();
  input.select();
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      submitAndClose();
    }
  });
}

function renderFeedbackModal() {
  const wrap = document.createElement('div');
  wrap.innerHTML = `
    <h2>Feedback</h2>
    <p>Found a bug, have a question idea, or just want to say hi?</p>
    <textarea id="feedbackText" rows="4" maxlength="2000" placeholder="Type your feedback here..."></textarea>
  `;

  wrap.appendChild(
    makeButton('Send', () => {
      const message = document.getElementById('feedbackText').value.trim();
      if (!message) return;

      const date = dailyState ? dailyState.date : getTodayString();
      submitFeedback(date, getPlayerUUID(), message, playerName)
        .then(() => {
          wrap.innerHTML = '<h2>Thanks!</h2><p>Your feedback was sent.</p>';
          wrap.appendChild(makeButton('Close', closeModal));
        })
        .catch(() => {
          wrap.innerHTML = '<h2>Oops</h2><p>Could not send feedback right now. Please try again later.</p>';
          wrap.appendChild(makeButton('Close', closeModal));
        });
    })
  );

  openModal(wrap);
}

const TUTORIAL_SLIDES = [
  {
    image: 'secret.png',
    title: 'Guess the Secret Blute',
    body: "Every day, one of the 25 blutes on the board is the secret one. Your job: figure out which, using as few questions as possible.",
  },
  {
    visual: 'ask',
    title: 'Ask Yes/No Questions',
    body: 'Type any question and hit enter. Ask one question at a time; your answers show up in History.',
  },
  {
    visual: 'popup',
    title: 'Mark Your Suspects',
    body: 'Click a card to open its popup, then tap red (eliminated), yellow (suspect), or green (likely) to mark it. This is just for you to keep track — it doesn’t affect your score.',
  },
  {
    visual: 'popup',
    title: 'Lock In Your Guess',
    body: 'In that same popup, tap “Guess this Blute” to lock in your answer. A wrong guess still counts as a question, so guess when you’re confident.',
  },
  {
    image: 'blutes/gamer.png',
    title: 'Score = Fewer Questions',
    body: 'Your score is how many questions you asked — lower is better.',
    highlight: 'Never ask about color and you’ll earn a bonus that lowers your score even further!',
  },
  {
    image: 'blutes/party.png',
    title: 'One Puzzle a Day',
    body: 'There’s a new secret blute every day — check the stats button to see today’s average and best. Want more? Toggle unlimited mode anytime for random practice boards (they don’t affect the leaderboard).',
  },
];

function renderTutorialSlideVisual(slide) {
  if (slide.visual === 'popup') {
    return `
      <div class="tutorial-mock-cell">
        <img src="blutes/glad.PNG" alt="" />
        <div class="card-overlay">
          <button type="button" class="card-overlay-close">✕</button>
          <div class="card-overlay-swatches">
            <button type="button" class="card-overlay-swatch" data-color="red"></button>
            <button type="button" class="card-overlay-swatch active" data-color="yellow"></button>
            <button type="button" class="card-overlay-swatch" data-color="green"></button>
          </div>
          <button type="button" class="card-overlay-guess">Guess</button>
        </div>
      </div>
    `;
  }
  if (slide.visual === 'ask') {
    return `
      <div class="tutorial-question-box">
        <div class="tutorial-ask-demo">
          <span>Is it yellow?</span>
          <span class="tutorial-ask-cursor"></span>
        </div>
        <ul class="history-list tutorial-history-demo">
          <li><span class="history-question">Does it wear glasses?</span><span class="history-dots"></span><span class="answer-no">No</span></li>
          <li><span class="history-question">Is it playing a sport?</span><span class="history-dots"></span><span class="answer-yes">Yes</span></li>
        </ul>
      </div>
    `;
  }
  return `<img class="tutorial-image" src="${slide.image}" alt="" />`;
}

function renderTutorialModal(onDone) {
  let index = 0;
  const wrap = document.createElement('div');

  const finish = () => {
    closeModal();
    onDone();
  };

  function draw() {
    const slide = TUTORIAL_SLIDES[index];
    const isLast = index === TUTORIAL_SLIDES.length - 1;

    wrap.innerHTML = `
      <button type="button" class="modal-close" id="tutorialClose" aria-label="Close">&times;</button>
      <div class="tutorial-visual">
        <button type="button" class="tutorial-arrow tutorial-arrow-prev" id="tutorialPrev" aria-label="Previous slide">&lsaquo;</button>
        ${renderTutorialSlideVisual(slide)}
        <button type="button" class="tutorial-arrow tutorial-arrow-next" id="tutorialNextArrow" aria-label="Next slide">&rsaquo;</button>
      </div>
      <h2>${slide.title}</h2>
      <p>${slide.body}</p>
      ${slide.highlight ? `<p class="tutorial-highlight">${slide.highlight}</p>` : ''}
      <div class="tutorial-dots">
        ${TUTORIAL_SLIDES.map((_, i) => `<span class="tutorial-dot${i === index ? ' active' : ''}" data-index="${i}"></span>`).join('')}
      </div>
      <div class="tutorial-nav"></div>
    `;

    const prevArrow = wrap.querySelector('#tutorialPrev');
    const nextArrow = wrap.querySelector('#tutorialNextArrow');
    prevArrow.disabled = index === 0;
    prevArrow.addEventListener('click', () => {
      index -= 1;
      draw();
    });
    nextArrow.disabled = isLast;
    nextArrow.addEventListener('click', () => {
      index += 1;
      draw();
    });

    if (isLast) {
      wrap.querySelector('.tutorial-nav').appendChild(makeButton("Let's Play!", finish));
    }

    wrap.querySelector('.tutorial-dots').addEventListener('click', (e) => {
      const dot = e.target.closest('.tutorial-dot');
      if (!dot) return;
      index = Number(dot.dataset.index);
      draw();
    });

    wrap.querySelector('#tutorialClose').addEventListener('click', finish);
  }

  let touchStartX = null;
  wrap.addEventListener('touchstart', (e) => { touchStartX = e.touches[0].clientX; }, { passive: true });
  wrap.addEventListener('touchend', (e) => {
    if (touchStartX === null) return;
    const deltaX = e.changedTouches[0].clientX - touchStartX;
    touchStartX = null;
    const SWIPE_THRESHOLD = 40;
    if (deltaX > SWIPE_THRESHOLD && index > 0) {
      index -= 1;
      draw();
    } else if (deltaX < -SWIPE_THRESHOLD && index < TUTORIAL_SLIDES.length - 1) {
      index += 1;
      draw();
    }
  }, { passive: true });

  draw();
  openModal(wrap, finish);
  modalContent.classList.add('tutorial-modal');
}

function startRandomBoard() {
  gameMode = 'unlimited';

  closeModal();
  buildGame(getTodayString(), Math.random);
}

function handleWin() {
  finalizeLastQuestionMarks();

  const questionsAsked = dailyState.questionsAsked;

  if (gameMode === 'unlimited') {
    const wrap = document.createElement('div');
    const plural = questionsAsked === 1 ? '' : 's';
    wrap.innerHTML = `<h2>Solved!</h2><p>Got it in ${questionsAsked} question${plural}. Loading a new practice board…</p>`;
    openModal(wrap);
    setTimeout(() => startRandomBoard(), 1500);
    return;
  }

  // Daily mode: don't lock the board — you can keep playing after solving it,
  // only your earliest score of the day is ever recorded.
  dailyState.finished = false;

  if (dailyState.quit) {
    // Gave up earlier this round — still fully playable, just excluded from
    // today's leaderboard, so a correct guess now doesn't submit a score.
    renderStatsModal();
    return;
  }

  if (dailyState.scoreRecorded) {
    renderStatsModal(dailyState.recordedScore, dailyState.recordedColorBonus);
    return;
  }

  const uuid = getPlayerUUID();
  const usedColor = dailyState.history.some((entry) => entry.attribute === 'color');
  const colorBonus = usedColor ? 0 : COLOR_BONUS;
  const finalScore = questionsAsked - colorBonus;

  submitScore(dailyState.date, uuid, finalScore, playerName, { rawQuestionsAsked: questionsAsked, colorBonus })
    .then(() => {
      dailyState.scoreRecorded = true;
      dailyState.recordedScore = finalScore;
      dailyState.recordedColorBonus = colorBonus;
      renderStatsModal(finalScore, colorBonus);
    })
    .catch(() => {
      // Most likely cause: another tab/device already recorded today's score for
      // this uuid first (writes are first-one-wins) — show that instead of an error.
      getPlayerEntry(dailyState.date, uuid).then((entry) => {
        if (entry !== null) {
          const existingScore = extractScore(entry);
          const existingColorBonus = entry.colorBonus || 0;
          dailyState.scoreRecorded = true;
          dailyState.recordedScore = existingScore;
          dailyState.recordedColorBonus = existingColorBonus;
          renderStatsModal(existingScore, existingColorBonus);
          return;
        }
        const wrap = document.createElement('div');
        wrap.innerHTML = '<h2>Oops</h2><p>Could not submit your score. Please try again later.</p>';
        wrap.appendChild(makeButton('Close', closeModal));
        openModal(wrap);
      });
    });
}

function showQuitState(persist) {
  dailyState.quit = true;

  const secretBlute = getSecretBlute();
  const cell = Array.from(grid.children).find((c) => c.dataset.id === secretBlute.id);
  if (cell) cell.classList.add('revealed-secret');

  if (persist) localStorage.setItem(QUIT_DATE_KEY, dailyState.date);

  const wrap = document.createElement('div');
  if (gameMode === 'unlimited') {
    wrap.innerHTML = `<h2>The answer was ${secretBlute.name}</h2><p>No worries — practice boards don't affect any leaderboard.</p>`;
    wrap.appendChild(makeButton('New Board', startRandomBoard));
  } else {
    wrap.innerHTML = `<h2>The answer was ${secretBlute.name}</h2><p>You won't appear on today's leaderboard for this round.</p>`;
    wrap.appendChild(makeButton('See Stats', () => renderStatsModal()));
  }
  openModal(wrap);
}

function handleQuit() {
  if (!dailyState || dailyState.scoreRecorded || dailyState.quit) return;
  finalizeLastQuestionMarks();
  showQuitState(gameMode === 'daily');
}

function renderQuitConfirmModal() {
  const wrap = document.createElement('div');
  wrap.innerHTML = `
    <h2>Give up?</h2>
    <p>This reveals today's secret blute and disqualifies you from today's leaderboard.</p>
  `;
  wrap.appendChild(makeButton('Cancel', closeModal, 'secondary'));
  wrap.appendChild(makeButton('Give Up', () => { closeModal(); handleQuit(); }));
  openModal(wrap);
}

function handleGuess(guessId, cell) {
  if (!dailyState || dailyState.finished) return;

  if (guessId === dailyState.secretId) {
    dailyState.finished = true;
    handleWin();
  } else if (cell) {
    dailyState.questionsAsked += 1;
    updateScoreDisplay();
    showWrongGuessModal();
  }
}

function buildGame(date, rand) {
  finalizeLastQuestionMarks();
  closeCardPopup();

  const playable = BLUTE_DATA.blutes.filter((b) => b.is_blute);
  const gridBlutes = shuffle(playable, rand).slice(0, 25);
  const secretIndex = Math.floor(rand() * 25);
  const secretBlute = gridBlutes[secretIndex];

  renderGrid(gridBlutes);
  secretLabel.textContent = secretBlute.name;

  dailyState = {
    date,
    gridIds: gridBlutes.map((b) => b.id),
    secretId: secretBlute.id,
    history: [],
    questionsAsked: 0,
    askedKeys: new Set(),
    scoreRecorded: false,
    recordedScore: null,
    recordedColorBonus: 0,
  };

  questionInput.value = '';
  questionInput.placeholder = DEFAULT_PLACEHOLDER;
  showQuestionFeedback('');
  renderHistory();
  updateScoreDisplay();
  syncGridWidth();
}

function initDailyGame() {
  const today = getTodayString();
  buildGame(today, seededRandom(dateToSeed(today)));

  if (localStorage.getItem(QUIT_DATE_KEY) === today) {
    showQuitState(false);
    return;
  }

  getPlayerEntry(today, getPlayerUUID()).then((entry) => {
    if (entry !== null && dailyState.date === today) {
      const existingScore = extractScore(entry);
      const existingColorBonus = entry.colorBonus || 0;
      dailyState.scoreRecorded = true;
      dailyState.recordedScore = existingScore;
      dailyState.recordedColorBonus = existingColorBonus;
      renderStatsModal(existingScore, existingColorBonus);
    }
  });
}

statsBtn.addEventListener('click', () => {
  if (!dailyState) return;
  renderStatsModal(dailyState.scoreRecorded ? dailyState.recordedScore : undefined, dailyState.recordedColorBonus);
});

infoBtn.addEventListener('click', () => renderTutorialModal(() => {}));
feedbackBtn.addEventListener('click', renderFeedbackModal);

questionForm.addEventListener('submit', (e) => {
  e.preventDefault();
  askQuestion();
});

function updateModeButtons() {
  unlimitedModeBtn.classList.toggle('active', gameMode === 'unlimited');
}

function toggleUnlimitedMode() {
  closeModal();

  if (gameMode === 'unlimited') {
    gameMode = 'daily';
    initDailyGame();
  } else {
    startRandomBoard();
  }

  updateModeButtons();
}

unlimitedModeBtn.addEventListener('click', toggleUnlimitedMode);

quitBtn.addEventListener('click', () => {
  if (!dailyState || dailyState.scoreRecorded || dailyState.quit) return;
  renderQuitConfirmModal();
});

modalOverlay.addEventListener('click', (e) => {
  if (e.target !== modalOverlay) return;
  const onDismiss = modalOnDismiss;
  closeModal();
  if (onDismiss) onDismiss();
});

const TUTORIAL_SEEN_KEY = 'guessBluteTutorialSeen';

function startGameAfterOnboarding() {
  if (localStorage.getItem(TUTORIAL_SEEN_KEY)) {
    initDailyGame();
    return;
  }
  localStorage.setItem(TUTORIAL_SEEN_KEY, 'true');
  renderTutorialModal(initDailyGame);
}

const frameProbe = new Image();
frameProbe.onload = () => {
  document.documentElement.style.setProperty('--card-ratio', frameProbe.naturalWidth / frameProbe.naturalHeight);
  new ResizeObserver(syncGridWidth).observe(grid);
  renderNameModal(startGameAfterOnboarding);
};
frameProbe.src = CARD_FRAME;
