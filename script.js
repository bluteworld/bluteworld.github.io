const CARD_FRAME = 'card_bg.PNG';

const grid = document.getElementById('grid');
const questionWrap = document.querySelector('.question-wrap');
const questionForm = document.getElementById('questionForm');
const questionInput = document.getElementById('questionInput');
const questionFeedback = document.getElementById('questionFeedback');
const historyList = document.getElementById('historyList');
const modalOverlay = document.getElementById('modalOverlay');
const modalContent = document.getElementById('modalContent');
const statsBtn = document.getElementById('statsBtn');
const infoBtn = document.getElementById('infoBtn');
const feedbackBtn = document.getElementById('feedbackBtn');
const unlimitedModeBtn = document.getElementById('unlimitedModeBtn');
const secretLabel = document.getElementById('secretLabel');

let dailyState = null;
let gameMode = 'daily'; // 'daily' | 'unlimited'
let playerName = localStorage.getItem('guessBluteName') || '';
let lastQuestionRef = null;

const DEFAULT_PLACEHOLDER = questionInput.placeholder;

const MARK_STATES = ['none', 'red', 'yellow', 'green'];
const MARK_LABELS = { none: '', red: 'eliminated', yellow: 'suspect', green: 'likely' };
const DOUBLE_CLICK_MS = 300;
const LONG_PRESS_MS = 500;
const WRONG_GUESS_SHAKE_MS = 400;
const COLOR_BONUS = 2;

function shakeWrongGuess(cell) {
  cell.classList.remove('wrong-guess');
  void cell.offsetWidth; // restart the animation if it's already mid-shake
  cell.classList.add('wrong-guess');
  setTimeout(() => cell.classList.remove('wrong-guess'), WRONG_GUESS_SHAKE_MS);
}

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

function cycleMark(cell, blute) {
  const current = cell.dataset.mark || 'none';
  const next = MARK_STATES[(MARK_STATES.indexOf(current) + 1) % MARK_STATES.length];
  cell.dataset.mark = next;
  const suffix = MARK_LABELS[next] ? ` – ${MARK_LABELS[next]}` : '';
  cell.setAttribute('aria-label', `${blute.name}${suffix}`);
}

function lockBoard() {
  grid.classList.add('locked');
  questionWrap.classList.add('locked');
}

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

function makeButton(label, onClick) {
  const btn = document.createElement('button');
  btn.className = 'primary';
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

    let clickTimer = null;
    cell.addEventListener('click', () => {
      if (!dailyState || dailyState.finished) return;
      if (clickTimer) {
        clearTimeout(clickTimer);
        clickTimer = null;
        handleGuess(blute.id, cell);
      } else {
        clickTimer = setTimeout(() => {
          clickTimer = null;
          cycleMark(cell, blute);
        }, DOUBLE_CLICK_MS);
      }
    });

    let pressTimer = null;
    let longPressFired = false;
    cell.addEventListener(
      'touchstart',
      () => {
        longPressFired = false;
        pressTimer = setTimeout(() => {
          longPressFired = true;
          if (dailyState && !dailyState.finished) handleGuess(blute.id, cell);
        }, LONG_PRESS_MS);
      },
      { passive: true }
    );
    cell.addEventListener('touchmove', () => clearTimeout(pressTimer), { passive: true });
    cell.addEventListener('touchend', (e) => {
      clearTimeout(pressTimer);
      if (longPressFired) e.preventDefault();
    });

    cell.addEventListener('keydown', (e) => {
      if (!dailyState || dailyState.finished) return;
      if (e.key === 'Enter') {
        e.preventDefault();
        handleGuess(blute.id, cell);
      } else if (e.key === ' ') {
        e.preventDefault();
        cycleMark(cell, blute);
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
}

function renderStatsModal(date, yourScore, colorBonus) {
  const wrap = document.createElement('div');
  wrap.innerHTML = `<h2>Today's Stats</h2><p>Loading…</p>`;
  openModal(wrap);

  getStats(date)
    .then((stats) => {
      wrap.innerHTML = `<h2>Today's Stats</h2>`;

      if (stats.count === 0) {
        const p = document.createElement('p');
        p.textContent = 'No scores yet today.';
        wrap.appendChild(p);
        return;
      }

      const list = document.createElement('ul');
      list.className = 'leaderboard-list';

      const rows = [];
      if (typeof yourScore === 'number') {
        rows.push(['Your score', yourScore, true]);
        rows.push(['No-color bonus', colorBonus ? `-${colorBonus}` : 0, Boolean(colorBonus)]);
      }
      rows.push(
        ['Best score', stats.best],
        ['Average questions', Math.round(stats.average)],
        ['Players today', stats.count]
      );

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

      // Playtesting only — remove before public launch.
      return getBestScoreEntry(date)
        .then((best) => (best ? getQuestionLog(date, best.uuid) : []))
        .then((entries) => {
          if (!entries.length) return;
          const section = document.createElement('div');
          section.className = 'playtest-section';
          const heading = document.createElement('h3');
          heading.textContent = "Playtesting only — best score's questions";
          section.appendChild(heading);

          const ol = document.createElement('ol');
          entries.forEach((entry) => {
            const li = document.createElement('li');
            li.textContent = `${entry.rawText} — ${entry.answer ? 'Yes' : 'No'}`;
            ol.appendChild(li);
          });
          section.appendChild(ol);
          wrap.appendChild(section);
        })
        .catch(() => {});
    })
    .then(() => {
      wrap.appendChild(makeButton('Close', closeModal));
    })
    .catch(() => {
      wrap.innerHTML = "<h2>Today's Stats</h2><p>Could not load stats right now.</p>";
      wrap.appendChild(makeButton('Close', closeModal));
    });
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
    <textarea id="feedbackText" rows="4" placeholder="Type your feedback here..."></textarea>
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
    visual: 'marks',
    title: 'Mark Your Suspects',
    body: 'Click a cell to cycle it: red (eliminated), yellow (suspect), green (likely). This is just for you to keep track — it doesn’t affect your score.',
  },
  {
    visual: 'shake',
    title: 'Lock In Your Guess',
    body: 'Double-click (or long-press on touch) a cell to guess. Guessed wrong? No penalty — the cell just shakes. Try again.',
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
  if (slide.visual === 'marks') {
    return `
      <div class="tutorial-marks">
        <div class="tutorial-mock-cell" data-mark="red"><img src="blutes/glad.PNG" alt="" /></div>
        <div class="tutorial-mock-cell" data-mark="yellow"><img src="blutes/glad.PNG" alt="" /></div>
        <div class="tutorial-mock-cell" data-mark="green"><img src="blutes/glad.PNG" alt="" /></div>
      </div>
      <div class="tutorial-mark-labels"><span>Eliminated</span><span>Suspect</span><span>Likely</span></div>
    `;
  }
  if (slide.visual === 'shake') {
    return `<div class="tutorial-mock-cell tutorial-shake-demo"><img src="blutes/glad.PNG" alt="" /></div>`;
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
  grid.classList.remove('locked');
  questionWrap.classList.remove('locked');
  buildGame(getTodayString(), Math.random);
}

function handleWin() {
  finalizeLastQuestionMarks();

  const questionsAsked = dailyState.questionsAsked;

  if (gameMode === 'unlimited') {
    lockBoard();
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

  if (dailyState.scoreRecorded) {
    renderStatsModal(dailyState.date, dailyState.recordedScore, dailyState.recordedColorBonus);
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
      renderStatsModal(dailyState.date, finalScore, colorBonus);
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
          renderStatsModal(dailyState.date, existingScore, existingColorBonus);
          return;
        }
        const wrap = document.createElement('div');
        wrap.innerHTML = '<h2>Oops</h2><p>Could not submit your score. Please try again later.</p>';
        wrap.appendChild(makeButton('Close', closeModal));
        openModal(wrap);
      });
    });
}

function handleGuess(guessId, cell) {
  if (!dailyState || dailyState.finished) return;

  if (guessId === dailyState.secretId) {
    dailyState.finished = true;
    handleWin();
  } else if (cell) {
    shakeWrongGuess(cell);
  }
}

function buildGame(date, rand) {
  finalizeLastQuestionMarks();

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
  syncGridWidth();
}

function initDailyGame() {
  const today = getTodayString();
  buildGame(today, seededRandom(dateToSeed(today)));

  getPlayerEntry(today, getPlayerUUID()).then((entry) => {
    if (entry !== null && dailyState.date === today) {
      const existingScore = extractScore(entry);
      const existingColorBonus = entry.colorBonus || 0;
      dailyState.scoreRecorded = true;
      dailyState.recordedScore = existingScore;
      dailyState.recordedColorBonus = existingColorBonus;
      renderStatsModal(today, existingScore, existingColorBonus);
    }
  });
}

statsBtn.addEventListener('click', () => {
  if (!dailyState) return;
  renderStatsModal(dailyState.date);
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
  grid.classList.remove('locked');
  questionWrap.classList.remove('locked');

  if (gameMode === 'unlimited') {
    gameMode = 'daily';
    initDailyGame();
  } else {
    startRandomBoard();
  }

  updateModeButtons();
}

unlimitedModeBtn.addEventListener('click', toggleUnlimitedMode);

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
