const CARD_FRAME = 'card_bg.PNG';

const grid = document.getElementById('grid');
const questionWrap = document.querySelector('.question-wrap');
const questionInput = document.getElementById('questionInput');
const questionBody = document.getElementById('questionBody');
const modalOverlay = document.getElementById('modalOverlay');
const modalContent = document.getElementById('modalContent');
const statsBtn = document.getElementById('statsBtn');
const infoBtn = document.getElementById('infoBtn');
const homeBtn = document.getElementById('homeBtn');
const secretLabel = document.getElementById('secretLabel');

let dailyState = null;

const MARK_STATES = ['none', 'red', 'yellow'];
const MARK_LABELS = { none: '', red: 'eliminated', yellow: 'suspect' };
const DOUBLE_CLICK_MS = 300;
const LONG_PRESS_MS = 500;

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
  questionInput.disabled = true;
}

function getPlayerUUID() {
  let uuid = localStorage.getItem('guessBluteUUID');
  if (!uuid) {
    uuid = crypto.randomUUID();
    localStorage.setItem('guessBluteUUID', uuid);
  }
  return uuid;
}

function closeModal() {
  modalOverlay.hidden = true;
  modalContent.innerHTML = '';
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
        handleGuess(blute.id);
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
          if (dailyState && !dailyState.finished) handleGuess(blute.id);
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
        handleGuess(blute.id);
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

function unaskedQuestions(query) {
  const askedIds = new Set(dailyState.history.map((h) => h.id));
  return BLUTE_DATA.questions.filter(
    (q) => !askedIds.has(q.id) && q.text.toLowerCase().includes(query.toLowerCase())
  );
}

function renderHistory() {
  questionBody.innerHTML = '';

  if (dailyState.history.length === 0) {
    const p = document.createElement('p');
    p.textContent = 'Type above to ask a yes/no question.';
    questionBody.appendChild(p);
    return;
  }

  const list = document.createElement('ul');
  list.className = 'history-list';
  for (let i = dailyState.history.length - 1; i >= 0; i--) {
    const entry = dailyState.history[i];
    const li = document.createElement('li');
    const q = document.createElement('span');
    q.textContent = entry.text;
    const a = document.createElement('span');
    a.textContent = entry.answer ? 'Yes' : 'No';
    a.className = entry.answer ? 'answer-yes' : 'answer-no';
    li.appendChild(q);
    li.appendChild(a);
    list.appendChild(li);
  }
  questionBody.appendChild(list);
}

function renderSuggestions(query) {
  const matches = unaskedQuestions(query).slice(0, 8);
  questionBody.innerHTML = '';

  if (matches.length === 0) {
    const p = document.createElement('p');
    p.textContent = 'No suggestions match, but you can press Enter to ask it your own way.';
    questionBody.appendChild(p);
    return;
  }

  const list = document.createElement('ul');
  list.className = 'question-list';
  matches.forEach((q) => {
    const li = document.createElement('li');
    li.textContent = q.text;
    li.addEventListener('click', () => askQuestion(q));
    list.appendChild(li);
  });
  questionBody.appendChild(list);
}

function askQuestion(question) {
  if (!dailyState || dailyState.finished) return;

  const answer = evaluateQuestion(getSecretBlute(), question);
  dailyState.history.push({ id: question.id, text: question.text, answer });
  dailyState.questionsAsked += 1;

  questionInput.value = '';
  renderHistory();
}

function showQuestionFeedback(message) {
  questionBody.innerHTML = '';
  const p = document.createElement('p');
  p.textContent = message;
  questionBody.appendChild(p);
}

function askFreeformQuestion(text) {
  const answer = interpretQuestion(getSecretBlute(), text);

  if (answer === null) {
    showQuestionFeedback("Hmm, I couldn't figure that one out. Try asking about color, clothing, activity, or surroundings.");
    return;
  }

  dailyState.history.push({ id: null, text, answer });
  dailyState.questionsAsked += 1;

  questionInput.value = '';
  renderHistory();
}

questionInput.addEventListener('input', () => {
  if (!dailyState || dailyState.finished) return;
  const query = questionInput.value.trim();
  if (query === '') {
    renderHistory();
  } else {
    renderSuggestions(query);
  }
});

questionInput.addEventListener('keydown', (e) => {
  if (e.key !== 'Enter' || !dailyState || dailyState.finished) return;
  e.preventDefault();
  const text = questionInput.value.trim();
  if (text === '') return;

  const canonicalMatches = unaskedQuestions(text);
  if (canonicalMatches.length === 1) {
    askQuestion(canonicalMatches[0]);
    return;
  }

  askFreeformQuestion(text);
});

function renderStatsModal(date, yourScore) {
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

function renderRulesModal() {
  const wrap = document.createElement('div');
  wrap.innerHTML = `
    <h2>How to Play</h2>
    <p>Every day there's one secret blute hiding among the 25 on the grid.</p>
    <ul>
      <li>Ask yes/no questions to narrow it down — type your own or pick a suggestion.</li>
      <li>Click a cell once to mark it red (eliminated) or yellow (suspect); click again to cycle.</li>
      <li>Double-click (or long-press on touch) a cell to lock in your guess.</li>
      <li>Your score is the number of questions you asked — fewer is better.</li>
      <li>One puzzle per day. Check the stats button to see today's average and best score.</li>
    </ul>
  `;
  wrap.appendChild(makeButton('Close', closeModal));
  openModal(wrap);
}

function handleWin() {
  const questionsAsked = dailyState.questionsAsked;
  const uuid = getPlayerUUID();

  lockBoard();

  submitScore(dailyState.date, uuid, questionsAsked)
    .then(() => renderStatsModal(dailyState.date, questionsAsked))
    .catch(() => {
      const wrap = document.createElement('div');
      wrap.innerHTML = '<h2>Oops</h2><p>Could not submit your score. Please try again later.</p>';
      wrap.appendChild(makeButton('Close', closeModal));
      openModal(wrap);
    });
}

function handleGuess(guessId) {
  if (!dailyState || dailyState.finished) return;

  if (guessId === dailyState.secretId) {
    dailyState.finished = true;
    handleWin();
  }
}

function buildGame(date, rand) {
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
  };

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

homeBtn.addEventListener('click', () => {
  const date = dailyState ? dailyState.date : getTodayString();
  const uuid = getPlayerUUID();

  clearPlayerScore(date, uuid).finally(() => {
    closeModal();
    grid.classList.remove('locked');
    questionWrap.classList.remove('locked');
    questionInput.disabled = false;
    buildGame(getTodayString(), Math.random);
  });
});

modalOverlay.addEventListener('click', (e) => {
  if (e.target === modalOverlay) closeModal();
});

const frameProbe = new Image();
frameProbe.onload = () => {
  document.documentElement.style.setProperty('--card-ratio', frameProbe.naturalWidth / frameProbe.naturalHeight);
  initDailyGame();
  new ResizeObserver(syncGridWidth).observe(grid);
};
frameProbe.src = CARD_FRAME;
