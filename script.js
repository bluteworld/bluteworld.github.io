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
const testModeBtn = document.getElementById('testModeBtn');
const unlimitedModeBtn = document.getElementById('unlimitedModeBtn');
const secretLabel = document.getElementById('secretLabel');

let dailyState = null;
let gameMode = 'daily'; // 'daily' | 'test' | 'unlimited'
let testUUID = null;
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

function getActiveUUID() {
  return gameMode === 'test' ? testUUID : getPlayerUUID();
}

function closeModal() {
  modalOverlay.hidden = true;
  modalContent.innerHTML = '';
  delete modalOverlay.dataset.blocking;
}

function openModal(contentEl) {
  modalContent.innerHTML = '';
  modalContent.appendChild(contentEl);
  modalOverlay.hidden = false;
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
      logUnansweredQuestion(dailyState.date, getActiveUUID(), rawText, playerName, 'multiple').catch(() => {});
      return;
    }

    questionInput.placeholder = `Try something like: "${randomExampleQuestion()}"`;
    showQuestionFeedback("Couldn't quite figure out what that's asking — try the example above.");
    shakeFeedback();
    logUnansweredQuestion(dailyState.date, getActiveUUID(), rawText, playerName, 'unmatched').catch(() => {});
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

  const ref = logQuestionEvent(dailyState.date, getActiveUUID(), {
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
      } else {
        const list = document.createElement('ul');
        list.className = 'leaderboard-list';

        const rows = [
          ['Players today', stats.count],
          ['Average questions', stats.average.toFixed(1)],
          ['Best score', stats.best],
        ];
        if (typeof yourScore === 'number') {
          rows.push(['Your score', yourScore]);
          if (colorBonus) rows.push(['No-color bonus', `-${colorBonus}`]);
        }

        rows.forEach(([label, value]) => {
          const li = document.createElement('li');
          const labelEl = document.createElement('span');
          labelEl.textContent = label;
          const valueEl = document.createElement('span');
          valueEl.textContent = value;
          li.appendChild(labelEl);
          li.appendChild(valueEl);
          list.appendChild(li);
        });

        wrap.appendChild(list);
      }

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
    <h2>Welcome!</h2>
    <p>What should we call you?</p>
    <input type="text" id="nameInput" placeholder="Your name" autocomplete="off" />
  `;

  const submit = () => {
    const input = document.getElementById('nameInput');
    const name = input.value.trim() || 'Anonymous';
    playerName = name;
    localStorage.setItem('guessBluteName', name);
    closeModal();
    onSubmit();
  };

  wrap.appendChild(makeButton('Start', submit));
  openModal(wrap);
  modalOverlay.dataset.blocking = 'true';

  const input = document.getElementById('nameInput');
  input.value = playerName;
  input.focus();
  input.select();
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      submit();
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

function renderRulesModal() {
  const wrap = document.createElement('div');
  wrap.innerHTML = `
    <h2>How to Play</h2>
    <p>Every day there's one secret blute hiding among the 25 on the grid.</p>
    <ul>
      <li>Ask yes/no questions to narrow it down — type one question at a time and hit enter. Your answers show up below in History.</li>
      <li>Click a cell to cycle it through red (eliminated), yellow (suspect), and green (likely).</li>
      <li>Double-click (or long-press on touch) a cell to lock in your guess. A wrong guess just shakes — no penalty, try again.</li>
      <li>Your score is the number of questions you asked — fewer is better. Never ask about color and you'll earn a bonus that lowers your score even further.</li>
      <li>One puzzle per day. Check the stats button to see today's average and best score.</li>
      <li>Want to keep playing after today's puzzle? Toggle unlimited mode for random practice boards that don't count toward the leaderboard.</li>
    </ul>
  `;
  wrap.appendChild(makeButton('Close', closeModal));
  openModal(wrap);
}

function startRandomBoard(mode) {
  gameMode = mode;
  if (mode === 'test') testUUID = crypto.randomUUID();

  closeModal();
  grid.classList.remove('locked');
  questionWrap.classList.remove('locked');
  buildGame(getTodayString(), Math.random);
}

function handleWin() {
  finalizeLastQuestionMarks();

  const questionsAsked = dailyState.questionsAsked;

  lockBoard();

  if (gameMode === 'test' || gameMode === 'unlimited') {
    const wrap = document.createElement('div');
    const plural = questionsAsked === 1 ? '' : 's';
    const label = gameMode === 'test' ? 'test' : 'practice';
    wrap.innerHTML = `<h2>Solved!</h2><p>Got it in ${questionsAsked} question${plural}. Loading a new ${label} board…</p>`;
    openModal(wrap);
    setTimeout(() => startRandomBoard(gameMode), 1500);
    return;
  }

  const uuid = getPlayerUUID();
  const usedColor = dailyState.history.some((entry) => entry.attribute === 'color');
  const colorBonus = usedColor ? 0 : COLOR_BONUS;
  const finalScore = Math.max(0, questionsAsked - colorBonus);

  submitScore(dailyState.date, uuid, finalScore, playerName, { rawQuestionsAsked: questionsAsked, colorBonus })
    .then(() => renderStatsModal(dailyState.date, finalScore, colorBonus))
    .catch(() => {
      const wrap = document.createElement('div');
      wrap.innerHTML = '<h2>Oops</h2><p>Could not submit your score. Please try again later.</p>';
      wrap.appendChild(makeButton('Close', closeModal));
      openModal(wrap);
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

  getPlayerScore(today, getPlayerUUID()).then((existingScore) => {
    if (existingScore !== null) {
      dailyState.finished = true;
      lockBoard();
      renderStatsModal(today, existingScore);
    }
  });
}

statsBtn.addEventListener('click', () => {
  if (!dailyState) return;
  renderStatsModal(dailyState.date);
});

infoBtn.addEventListener('click', renderRulesModal);
feedbackBtn.addEventListener('click', renderFeedbackModal);

questionForm.addEventListener('submit', (e) => {
  e.preventDefault();
  askQuestion();
});

function updateModeButtons() {
  testModeBtn.classList.toggle('active', gameMode === 'test');
  unlimitedModeBtn.classList.toggle('active', gameMode === 'unlimited');
}

function toggleMode(mode) {
  closeModal();
  grid.classList.remove('locked');
  questionWrap.classList.remove('locked');

  if (gameMode === mode) {
    gameMode = 'daily';
    initDailyGame();
  } else {
    startRandomBoard(mode);
  }

  updateModeButtons();
}

testModeBtn.addEventListener('click', () => toggleMode('test'));
unlimitedModeBtn.addEventListener('click', () => toggleMode('unlimited'));

modalOverlay.addEventListener('click', (e) => {
  if (e.target === modalOverlay && !modalOverlay.dataset.blocking) closeModal();
});

const frameProbe = new Image();
frameProbe.onload = () => {
  document.documentElement.style.setProperty('--card-ratio', frameProbe.naturalWidth / frameProbe.naturalHeight);
  new ResizeObserver(syncGridWidth).observe(grid);
  renderNameModal(initDailyGame);
};
frameProbe.src = CARD_FRAME;
