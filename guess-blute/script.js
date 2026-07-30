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
const menuBtn = document.getElementById('menuBtn');
const secretLabel = document.getElementById('secretLabel');
const finalGuessBtn = document.getElementById('finalGuessBtn');

let dailyState = null;
let gameMode = 'daily'; // 'daily' | 'unlimited'
let playerName = localStorage.getItem('guessBluteName') || '';
let lastQuestionRef = null;
let guessModeActive = false;

const DEFAULT_PLACEHOLDER = questionInput.placeholder;

const MARK_LABELS = { none: '', red: 'marked' };
const ANSWER_LABELS = { yes: 'Yes', no: 'No', na: 'N/A' };
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

// Color questions are excluded from hints since asking one costs the
// no-color score bonus — hints shouldn't nudge players into giving it up.
function randomExampleQuestion() {
  const list = BLUTE_DATA.questions.filter((q) => q.attribute !== 'color');
  return list[Math.floor(Math.random() * list.length)].text;
}

function setMark(cell, blute, mark) {
  cell.dataset.mark = mark;
  const suffix = MARK_LABELS[mark] ? ` – ${MARK_LABELS[mark]}` : '';
  cell.setAttribute('aria-label', `${blute.name}${suffix}`);
}

function toggleMark(cell, blute) {
  const next = cell.dataset.mark === 'red' ? 'none' : 'red';
  setMark(cell, blute, next);
}

let selectedGuessCell = null;

function clearGuessSelection() {
  if (selectedGuessCell) {
    selectedGuessCell.classList.remove('guess-selected');
    const btn = selectedGuessCell.querySelector('.guess-confirm-btn');
    if (btn) btn.remove();
  }
  selectedGuessCell = null;
}

function setGuessMode(active) {
  guessModeActive = active;
  finalGuessBtn.classList.toggle('active', active);
  finalGuessBtn.textContent = active ? 'Tap a card…' : 'Guess';
  grid.classList.toggle('guess-mode', active);
  if (!active) clearGuessSelection();
}

// Selecting a card during guess mode turns its overlay green and drops a
// Confirm button on top of it — no modal, so the board stays visible while
// deciding. Tapping the already-selected card (or a different one) toggles
// the selection instead.
function selectGuessCard(cell, blute) {
  if (selectedGuessCell === cell) {
    clearGuessSelection();
    return;
  }
  clearGuessSelection();
  selectedGuessCell = cell;
  cell.classList.add('guess-selected');

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'guess-confirm-btn';
  btn.textContent = 'Confirm';
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    setGuessMode(false);
    handleGuess(blute.id, cell);
  });
  cell.appendChild(btn);
}

finalGuessBtn.addEventListener('click', () => {
  if (!dailyState || dailyState.finished) return;
  setGuessMode(!guessModeActive);
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
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Los_Angeles',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const lookup = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  return `${lookup.year}-${lookup.month}-${lookup.day}`;
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

    cell.addEventListener('click', () => {
      if (!dailyState || dailyState.finished) return;
      if (guessModeActive) {
        selectGuessCard(cell, blute);
        return;
      }
      toggleMark(cell, blute);
    });

    cell.addEventListener('keydown', (e) => {
      if (!dailyState || dailyState.finished) return;
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        if (guessModeActive) {
          renderGuessConfirmModal(blute, cell);
          return;
        }
        toggleMark(cell, blute);
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

// Most attributes are plain booleans, so the answer is a straight yes/no.
// A few (like hat_color) are null when the underlying thing doesn't exist at
// all (no hat), which isn't really a "no" — it's not applicable.
function evaluateQuestion(blute, question) {
  const value = question.attribute === 'color' ? blute.color : blute.attributes[question.attribute];
  if (value === null || value === undefined) return 'na';
  return value === question.value ? 'yes' : 'no';
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
    a.textContent = ANSWER_LABELS[entry.answer];
    a.className = `answer-${entry.answer}`;
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

const CONFETTI_COLORS = ['#f94144', '#f3722c', '#f9c74f', '#90be6d', '#43aa8b', '#577590'];
const CONFETTI_PIECE_COUNT = 150;
const CONFETTI_RAIN_MS = 10000;
const CONFETTI_FADE_MS = 1800;

function launchConfetti() {
  const canvas = document.createElement('canvas');
  canvas.className = 'confetti-canvas';
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  document.body.appendChild(canvas);
  const ctx = canvas.getContext('2d');

  let pieces = [];
  function makePieces(n) {
    for (let i = 0; i < n; i++) {
      pieces.push({
        x: Math.random() * canvas.width,
        y: -20 - Math.random() * canvas.height,
        w: 6 + Math.random() * 6,
        h: 10 + Math.random() * 6,
        color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
        speedY: 2 + Math.random() * 3,
        speedX: -2 + Math.random() * 4,
        rotation: Math.random() * 360,
        spin: -10 + Math.random() * 20,
      });
    }
  }
  makePieces(CONFETTI_PIECE_COUNT);

  let wrapping = true;
  let rafId;
  function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (const p of pieces) {
      p.y += p.speedY;
      p.x += p.speedX;
      p.rotation += p.spin;
      if (p.y > canvas.height + 20 && wrapping) p.y = -20;

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate((p.rotation * Math.PI) / 180);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
    }
    rafId = requestAnimationFrame(animate);
  }

  function handleResize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  window.addEventListener('resize', handleResize);

  animate();

  setTimeout(() => {
    wrapping = false;
    canvas.classList.add('fade-out');
    setTimeout(() => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', handleResize);
      canvas.remove();
    }, CONFETTI_FADE_MS);
  }, CONFETTI_RAIN_MS);
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
      if (gameMode === 'daily') {
        logUnansweredQuestion(dailyState.date, getPlayerUUID(), rawText, playerName, 'multiple').catch(() => {});
      }
      return;
    }

    questionInput.placeholder = `Try something like: "${randomExampleQuestion()}"`;
    showQuestionFeedback("Couldn't quite figure out what that's asking — try the example above.");
    shakeFeedback();
    if (gameMode === 'daily') {
      logUnansweredQuestion(dailyState.date, getPlayerUUID(), rawText, playerName, 'unmatched').catch(() => {});
    }
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

  if (gameMode === 'daily') {
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
  }

  questionInput.value = '';
  questionInput.placeholder = `Ask a question... e.g. ${randomExampleQuestion()}`;
  showQuestionFeedback('');
  renderHistory();
  updateScoreDisplay();
}

// Appends into `container` — the scrollable region of the leaderboard modal,
// separate from the sticky score/share header and the sticky Close footer.
function appendPlayerList(container) {
  const heading = document.createElement('h3');
  heading.className = 'players-heading';
  heading.textContent = "Today's Players";
  container.appendChild(heading);

  const note = document.createElement('p');
  note.className = 'leaderboard-note';
  note.textContent = 'Loading…';
  container.appendChild(note);

  const uuid = getPlayerUUID();

  getLeaderboard(dailyState.date)
    .then((players) => {
      if (!container.isConnected) return;
      note.remove();

      if (players.length === 0) {
        const p = document.createElement('p');
        p.textContent = 'No scores yet today.';
        container.appendChild(p);
        return;
      }

      const list = document.createElement('ul');
      list.className = 'leaderboard-list players-list';
      players.forEach((player) => {
        const li = document.createElement('li');
        if (player.uuid === uuid) li.classList.add('me');
        const nameEl = document.createElement('span');
        nameEl.textContent = player.name;
        const scoreEl = document.createElement('span');
        scoreEl.textContent = player.score;
        li.appendChild(nameEl);
        li.appendChild(scoreEl);
        list.appendChild(li);
      });
      container.appendChild(list);
    })
    .catch(() => {
      if (!container.isConnected) return;
      note.remove();
    });
}

const SHARE_CARD_WIDTH = 640;
const SHARE_CARD_HEIGHT = 800;

function loadImageAsync(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

// Share cards only use this hand-picked set of blutes (share-images/), not
// the full roster — these are the ones that actually look good at card size.
const SHARE_IMAGE_FILES = [
  'blushing.PNG',
  'bubbles.PNG',
  'cozy.PNG',
  'dancing.PNG',
  'daydreaming.png',
  'envelope.PNG',
  'excited.PNG',
  'eye_mask.PNG',
  'flying_kite.png',
  'glad.PNG',
  'icecream.png',
  'in_love.PNG',
  'jumprope.PNG',
  'party.png',
  'photobooth.PNG',
  'photographer.png',
  'runner.PNG',
  'sitting_under_flower.PNG',
  'swing.png',
  'umbrella.png',
  'winter_blushing.png',
];

function pickShareBlute() {
  const pool = SHARE_IMAGE_FILES.map((filename) => {
    const id = filename.replace(/\.[^.]+$/, '');
    const blute = BLUTE_DATA.blutes.find((b) => b.id === id);
    return blute && { id, name: blute.name, image: `share-images/${filename}` };
  }).filter((entry) => entry && entry.id !== dailyState.secretId);

  return pool[Math.floor(Math.random() * pool.length)];
}

function formatShareDate(dateStr) {
  const date = new Date(`${dateStr}T00:00:00`);
  return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

async function buildShareCard(blute, rawScore, colorBonus, totalScore) {
  const [frameImg, bluteImg] = await Promise.all([
    loadImageAsync(CARD_FRAME),
    loadImageAsync(blute.image),
  ]);
  await document.fonts.ready;

  const canvas = document.createElement('canvas');
  canvas.width = SHARE_CARD_WIDTH;
  canvas.height = SHARE_CARD_HEIGHT;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#585931';
  ctx.fillRect(0, 0, SHARE_CARD_WIDTH, SHARE_CARD_HEIGHT);

  ctx.textAlign = 'center';
  ctx.fillStyle = '#E3D0A7';
  ctx.font = '700 46px "Bubblegum Sans", sans-serif';
  ctx.fillText('Guess Blute', SHARE_CARD_WIDTH / 2, 78);

  ctx.font = '400 22px "Bubblegum Sans", sans-serif';
  ctx.fillStyle = 'rgba(227, 208, 167, 0.8)';
  ctx.fillText(formatShareDate(dailyState.date), SHARE_CARD_WIDTH / 2, 112);

  const panelSize = 420;
  const panelX = (SHARE_CARD_WIDTH - panelSize) / 2;
  const panelY = 150;
  ctx.drawImage(frameImg, panelX, panelY, panelSize, panelSize);

  const pad = panelSize * 0.1;
  const innerSize = panelSize - pad * 2;
  const scale = Math.min(innerSize / bluteImg.width, innerSize / bluteImg.height);
  const drawW = bluteImg.width * scale;
  const drawH = bluteImg.height * scale;
  ctx.drawImage(
    bluteImg,
    panelX + (panelSize - drawW) / 2,
    panelY + (panelSize - drawH) / 2,
    drawW,
    drawH
  );

  ctx.fillStyle = '#E3D0A7';
  ctx.font = '700 60px "Bubblegum Sans", sans-serif';
  ctx.fillText(String(totalScore), SHARE_CARD_WIDTH / 2, panelY + panelSize + 90);

  if (colorBonus) {
    ctx.font = '400 22px "Bubblegum Sans", sans-serif';
    ctx.fillStyle = 'rgba(227, 208, 167, 0.75)';
    ctx.fillText(`(${rawScore} questions asked − ${colorBonus} no-color bonus)`, SHARE_CARD_WIDTH / 2, panelY + panelSize + 128);
  }

  ctx.font = '400 20px "Bubblegum Sans", sans-serif';
  ctx.fillStyle = 'rgba(227, 208, 167, 0.65)';
  ctx.fillText('bluteworld.com', SHARE_CARD_WIDTH / 2, SHARE_CARD_HEIGHT - 32);

  return canvas;
}

function canvasToBlob(canvas) {
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
}

// Kicked off as soon as the leaderboard modal opens (not on click) so the
// file is already resolved by the time the player taps Share — waiting on
// image loads inside the click handler burns the browser's user-activation
// window and silently breaks navigator.share on strict browsers (mobile
// Safari in particular).
function createShareFilePromise(blute, rawScore, colorBonus, totalScore) {
  return buildShareCard(blute, rawScore, colorBonus, totalScore)
    .then((canvas) => canvasToBlob(canvas))
    .then((blob) => {
      if (!blob) throw new Error('Canvas produced no image data');
      return new File([blob], 'guess-blute-score.png', { type: 'image/png' });
    });
}

function downloadShareFile(file) {
  const url = URL.createObjectURL(file);
  const a = document.createElement('a');
  a.href = url;
  a.download = file.name;
  a.click();
  URL.revokeObjectURL(url);
}

function renderSharePreviewModal(file) {
  const wrap = document.createElement('div');
  wrap.className = 'share-preview-modal';
  wrap.innerHTML = '<h2>Your score card</h2>';

  const url = URL.createObjectURL(file);
  const img = document.createElement('img');
  img.className = 'share-preview-img';
  img.src = url;
  img.alt = 'Guess Blute score card';
  wrap.appendChild(img);

  const actions = document.createElement('div');
  actions.className = 'share-preview-actions';
  const revokeAndClose = () => {
    URL.revokeObjectURL(url);
    closeModal();
  };
  actions.appendChild(makeButton('Download', () => downloadShareFile(file)));
  actions.appendChild(makeButton('Close', revokeAndClose, 'secondary'));
  wrap.appendChild(actions);

  openModal(wrap, () => URL.revokeObjectURL(url));
}

async function shareScoreCard(filePromise, score, triggerBtn) {
  const originalLabel = triggerBtn.textContent;
  triggerBtn.disabled = true;
  triggerBtn.textContent = 'Preparing…';

  try {
    const file = await filePromise;

    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title: 'Guess Blute',
          text: `I scored ${score} on today's Guess Blute!`,
        });
        return;
      } catch (err) {
        if (err && err.name === 'AbortError') return; // player closed the share sheet
        // Sharing failed for some other reason (e.g. activation expired) — fall back to a preview.
      }
    }

    renderSharePreviewModal(file);
  } catch (err) {
    console.error('Share card failed:', err);
    alert('Could not generate the share image. Please try again.');
  } finally {
    triggerBtn.disabled = false;
    triggerBtn.textContent = originalLabel;
  }
}

function renderLeaderboardModal(yourScore, colorBonus) {
  const wrap = document.createElement('div');
  wrap.className = 'leaderboard-modal';

  const top = document.createElement('div');
  top.className = 'leaderboard-top';
  top.innerHTML = `<h2>Today's Leaderboard</h2>`;

  const scroll = document.createElement('div');
  scroll.className = 'leaderboard-scroll';

  const closeBtn = makeButton('Close', closeModal);
  closeBtn.classList.add('leaderboard-close');

  if (typeof yourScore !== 'number') {
    const p = document.createElement('p');
    p.textContent = "You haven't finished today's puzzle yet.";
    top.appendChild(p);
  } else {
    const rawScore = yourScore + (colorBonus || 0);
    const shareBlute = pickShareBlute();

    const scoreCard = document.createElement('div');
    scoreCard.className = 'score-card';

    const frame = document.createElement('div');
    frame.className = 'score-card-frame';
    const bluteImg = document.createElement('img');
    bluteImg.className = 'score-card-blute';
    bluteImg.src = shareBlute.image;
    bluteImg.alt = shareBlute.name;
    frame.appendChild(bluteImg);
    scoreCard.appendChild(frame);

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
    scoreCard.appendChild(list);
    top.appendChild(scoreCard);

    const shareFilePromise = createShareFilePromise(shareBlute, rawScore, colorBonus || 0, yourScore);
    const shareBtn = makeButton('Share', () => shareScoreCard(shareFilePromise, yourScore, shareBtn), 'secondary');
    shareBtn.classList.add('share-btn');
    top.appendChild(shareBtn);
  }

  wrap.appendChild(top);
  wrap.appendChild(scroll);
  wrap.appendChild(closeBtn);
  appendPlayerList(scroll);

  openModal(wrap);
}

function renderNameModal(onSubmit) {
  const wrap = document.createElement('div');
  wrap.className = 'name-modal';
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
    visual: 'mark',
    title: 'Mark Your Suspects',
    body: 'Click a card to mark it red — click again to clear it. This is just for you to keep track — it doesn’t affect your score.',
  },
  {
    visual: 'guess',
    title: 'Lock In Your Guess',
    body: 'Tap “Guess” next to the menu, then tap a card to select it — you’ll get a chance to confirm before it counts. A wrong guess still counts as a question, so guess when you’re confident.',
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
    body: 'There’s a new secret blute every day — open the menu to check the Leaderboard, or switch to Unlimited Mode anytime for random practice boards (they don’t affect the leaderboard).',
  },
];

function renderTutorialSlideVisual(slide) {
  if (slide.visual === 'mark') {
    return `<div class="tutorial-mock-cell" data-mark="red"><img src="blutes/glad.PNG" alt="" /></div>`;
  }
  if (slide.visual === 'guess') {
    return `
      <div class="tutorial-guess-demo">
        <button type="button" class="final-guess-btn active" disabled>Tap a card…</button>
        <div class="tutorial-mock-cell guess-selected">
          <img src="blutes/glad.PNG" alt="" />
          <button type="button" class="guess-confirm-btn" disabled>Confirm</button>
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
    renderLeaderboardModal();
    return;
  }

  if (dailyState.scoreRecorded) {
    renderLeaderboardModal(dailyState.recordedScore, dailyState.recordedColorBonus);
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
      renderLeaderboardModal(finalScore, colorBonus);
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
          renderLeaderboardModal(existingScore, existingColorBonus);
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
    wrap.appendChild(makeButton('See Leaderboard', () => renderLeaderboardModal()));
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
    if (cell) cell.classList.add('correct-guess');
    launchConfetti();
    handleWin();
  } else if (cell) {
    dailyState.questionsAsked += 1;
    updateScoreDisplay();
    showWrongGuessModal();
  }
}

function buildGame(date, rand) {
  finalizeLastQuestionMarks();
  setGuessMode(false);

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
      renderLeaderboardModal(existingScore, existingColorBonus);
    }
  });
}

questionForm.addEventListener('submit', (e) => {
  e.preventDefault();
  askQuestion();
});

function toggleUnlimitedMode() {
  closeModal();

  if (gameMode === 'unlimited') {
    gameMode = 'daily';
    initDailyGame();
  } else {
    startRandomBoard();
  }
}

// Everything besides Score and Guess lives behind this single
// menu button, so the header doesn't turn into a row of five+ icons.
function renderMenuModal() {
  const wrap = document.createElement('div');
  wrap.className = 'menu-modal';
  wrap.innerHTML = '<h2>Menu</h2>';

  const list = document.createElement('div');
  list.className = 'menu-list';

  const canGiveUp = dailyState && !dailyState.scoreRecorded && !dailyState.quit;

  const items = [
    ['Give Up', () => { closeModal(); renderQuitConfirmModal(); }, !canGiveUp],
    ['Leaderboard', () => {
      if (!dailyState) return;
      closeModal();
      renderLeaderboardModal(dailyState.scoreRecorded ? dailyState.recordedScore : undefined, dailyState.recordedColorBonus);
    }],
    ['How to Play', () => { closeModal(); renderTutorialModal(() => {}); }],
    [gameMode === 'unlimited' ? 'Back to Daily Puzzle' : 'Unlimited Mode', () => { closeModal(); toggleUnlimitedMode(); }],
    ['Feedback', () => { closeModal(); renderFeedbackModal(); }],
  ];

  items.forEach(([label, onClick, disabled]) => {
    const btn = makeButton(label, onClick, 'secondary');
    btn.classList.add('menu-item');
    btn.disabled = Boolean(disabled);
    list.appendChild(btn);
  });

  wrap.appendChild(list);
  wrap.appendChild(makeButton('Close', closeModal));
  openModal(wrap);
}

menuBtn.addEventListener('click', renderMenuModal);

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
