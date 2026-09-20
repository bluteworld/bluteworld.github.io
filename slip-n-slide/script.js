// ---------------------------------------------------------------
// Slip n Slide
// The canvas is always 400x700 internally, however big it looks on
// screen, so every number below is in those units.
// ---------------------------------------------------------------

const WIDTH = 400; // the whole canvas
const HEIGHT = 700; // the playing surface, back edge to front edge

// A gutter runs all the way round the playing surface. They are cushions, not
// drop-offs: a blute that reaches one bounces back off it, so nothing ever
// leaves the board. The back gutter is deeper than the rest so a blute resting
// against the back rail isn't clipped by the top of the canvas.
//
// Only the surface is in board coordinates: y = 0 is the back edge and
// y = HEIGHT the front edge, for physics, scoring and everything else.
const GUTTER = 22; // the side and front cushions
const BACK_GUTTER = 40;
const PLAY_LEFT = GUTTER;
const PLAY_RIGHT = WIDTH - GUTTER;
const PLAY_WIDTH = PLAY_RIGHT - PLAY_LEFT;
const CANVAS_HEIGHT = HEIGHT + BACK_GUTTER + GUTTER;

const RADIUS = 26; // how big a blute is
const FRICTION = 0.975; // how fast blutes slow down (1 would be never)
const WALL_BOUNCE = 0.7; // speed kept coming off a cushion
const STOP_SPEED = 0.2; // below this, a blute counts as stopped
const MAX_PULL = 115; // longest useful drag
const POWER = 0.15; // turns drag length into starting speed
const SHOTS_PER_ROUND = 8;
const LAUNCH_Y = HEIGHT - 110;
const FLASH_FRAMES = 45; // how long a scored band stays lit, about 0.75s
const INK_SIZE = RADIUS * 1.45; // see measureInk below

// Scoring bands, measured down from the back edge at y = 0.
const BANDS = [
  { top: 0, bottom: 60, points: 4, label: "HANGER" },
  { top: 60, bottom: 165, points: 3, label: "3" },
  { top: 165, bottom: 270, points: 2, label: "2" },
  { top: 270, bottom: 375, points: 1, label: "1" },
];

// All lowercase .png so the paths survive a case-sensitive host.
const BLUTE_FILES = [
  "blushing.PNG",
  "glad.PNG",
  "glasses.png",
  "reluctant_agreement.PNG",
  "sighing.PNG",
  "excited.PNG",
  "i_dont_know.PNG",
  "photographer.png",
];

// A blute with outstretched arms fills less of its image box than a compact
// one, so sizing by the box makes the compact ones look bigger. Measure how
// much of the picture is actually drawn on and size by that instead. The
// result is the side of a square holding the same amount of ink.
function measureInk(img) {
  const probe = document.createElement("canvas");
  const pw = 64; // a small copy is plenty - we only need the ratio
  const ph = Math.max(1, Math.round((img.naturalHeight / img.naturalWidth) * pw));
  probe.width = pw;
  probe.height = ph;

  const probeCtx = probe.getContext("2d");
  probeCtx.drawImage(img, 0, 0, pw, ph);

  let opaque = 0;
  const { data } = probeCtx.getImageData(0, 0, pw, ph);
  for (let i = 3; i < data.length; i += 4) if (data[i] > 10) opaque++;

  return Math.sqrt(opaque) * (img.naturalWidth / pw);
}

const images = BLUTE_FILES.map((file) => {
  const img = new Image();
  // Measure once the pixels exist. If reading them is blocked - which happens
  // when the page is opened as a file:// URL instead of through a server -
  // drawBlute falls back to an estimate.
  img.addEventListener("load", () => {
    try {
      img.ink = measureInk(img);
    } catch {
      /* keep the fallback */
    }
  });
  img.src = `../blutes/${file}`;
  return img;
});

const canvas = document.getElementById("board");
canvas.width = WIDTH; // kept in step with the constants above, which win
canvas.height = CANVAS_HEIGHT;
const ctx = canvas.getContext("2d");
const scoreEl = document.getElementById("score");
const shotsEl = document.getElementById("shots");
const bestEl = document.getElementById("best");
const message = document.getElementById("message");
const againBtn = document.getElementById("againBtn");
const roundOverlay = document.getElementById("roundOverlay");
const roundScoreEl = document.getElementById("roundScore");
const roundNoteEl = document.getElementById("roundNote");

let blutes = []; // every blute on the board, moving or resting
let current = null; // the blute waiting to be launched, if any
let shotsLeft = SHOTS_PER_ROUND;
let dragging = false; // a pointer is down
let aim = null; // { x, y } while dragging, otherwise null
let lastShot = null; // the blute most recently launched, until it settles
let flashBand = null; // band lit up because a blute just landed in it
let flashLeft = 0; // frames of that flash still to run
let roundOver = false;
let best = Number(localStorage.getItem("slipNSlideBest")) || 0; // this browser
let globalBest = 0; // the highest anyone has posted, once it loads

function draw() {
  // Paint the whole canvas in the page colour, so the strip above the back
  // edge reads as off the table, then shift into board coordinates where
  // y = 0 is the back edge.
  ctx.fillStyle = "#585931";
  ctx.fillRect(0, 0, WIDTH, CANVAS_HEIGHT);

  ctx.save();
  ctx.translate(0, BACK_GUTTER);

  // The gutter channel, then the playing surface inset inside it.
  ctx.fillStyle = "#474828";
  ctx.fillRect(0, -BACK_GUTTER, WIDTH, CANVAS_HEIGHT);

  ctx.fillStyle = "#f0e6c8";
  ctx.fillRect(PLAY_LEFT, 0, PLAY_WIDTH, HEIGHT);

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  for (const band of BANDS) {
    ctx.fillStyle = band.points % 2 ? "#e6d8b0" : "#ece0bd";
    ctx.fillRect(PLAY_LEFT, band.top, PLAY_WIDTH, band.bottom - band.top);

    // Light the band up briefly when a blute lands in it, fading out.
    if (band === flashBand && flashLeft > 0) {
      ctx.fillStyle = `rgba(126, 168, 84, ${0.65 * (flashLeft / FLASH_FRAMES)})`;
      ctx.fillRect(PLAY_LEFT, band.top, PLAY_WIDTH, band.bottom - band.top);
    }

    ctx.strokeStyle = "#ac9366";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(PLAY_LEFT, band.bottom);
    ctx.lineTo(PLAY_RIGHT, band.bottom);
    ctx.stroke();

    ctx.fillStyle = "rgba(122, 106, 74, 0.5)";
    ctx.font = `bold ${band.label === "HANGER" ? 20 : 34}px 'Bubblegum Sans', sans-serif`;
    ctx.fillText(band.label, WIDTH / 2, (band.top + band.bottom) / 2);
  }

  // The line you shoot from, lit the whole time you are dragging so it reads
  // as the track your blute runs along.
  const sliding = current && dragging;
  ctx.setLineDash([8, 8]);
  ctx.strokeStyle = sliding ? "rgba(126, 168, 84, 0.95)" : "rgba(172, 147, 102, 0.7)";
  ctx.lineWidth = sliding ? 3 : 2;
  ctx.beginPath();
  ctx.moveTo(PLAY_LEFT, LAUNCH_Y);
  ctx.lineTo(PLAY_RIGHT, LAUNCH_Y);
  ctx.stroke();
  ctx.setLineDash([]);

  // The cushion face all the way round, where the surface meets the gutter.
  // It goes down before the blutes so one resting against it sits on top.
  ctx.strokeStyle = "#8a6f42";
  ctx.lineWidth = 3;
  ctx.strokeRect(PLAY_LEFT, 0, PLAY_WIDTH, HEIGHT);

  for (const blute of blutes) drawBlute(blute);
  if (current && aim) drawAim();

  ctx.restore();
}

// The size a blute's picture is drawn at. Normalised by measured ink so every
// blute reads as the same size whatever shape its image box happens to be.
// 0.72 is the average ink-to-box ratio, used only until the measurement lands.
function drawSize(img) {
  if (!img.naturalWidth) return { w: RADIUS * 2, h: RADIUS * 2 };
  const ink = img.ink || Math.max(img.naturalWidth, img.naturalHeight) * 0.72;
  const scale = INK_SIZE / ink;
  return { w: img.naturalWidth * scale, h: img.naturalHeight * scale };
}

// A blute stands on its legs, so which band it counts as being in is decided
// by where its feet are, not by the middle of the picture.
function footY(blute) {
  return blute.y + drawSize(blute.image).h / 2;
}

function drawBlute(blute) {
  const img = blute.image;
  if (!img.complete || !img.naturalWidth) return; // not downloaded yet

  const { w, h } = drawSize(img);

  // A soft shadow makes it read as sitting on the table.
  ctx.fillStyle = "rgba(58, 46, 31, 0.18)";
  ctx.beginPath();
  ctx.ellipse(
    blute.x,
    blute.y + RADIUS * 0.75,
    RADIUS * 0.8,
    RADIUS * 0.3,
    0,
    0,
    Math.PI * 2,
  );
  ctx.fill();

  ctx.drawImage(img, blute.x - w / 2, blute.y - h / 2, w, h);
}

function startRound() {
  blutes = [];
  shotsLeft = SHOTS_PER_ROUND;
  lastShot = null;
  flashBand = null;
  flashLeft = 0;
  roundOver = false;
  roundOverlay.hidden = true;
  loadNextBlute();
  message.textContent = "Slide side to side, pull down for power, let go.";
  updateHud();
}

function loadNextBlute() {
  const index = SHOTS_PER_ROUND - shotsLeft;
  current = {
    x: WIDTH / 2,
    y: LAUNCH_Y,
    vx: 0,
    vy: 0,
    image: images[index % images.length],
  };
  blutes.push(current);
  // The message is left alone so the score from the shot that just landed
  // stays up while you line the next one up.
  dragging = false;
  aim = null;
}

// Slide along the launch line to your finger, kept clear of the cushions.
function placeAt(point) {
  current.x = Math.min(
    Math.max(point.x, PLAY_LEFT + RADIUS),
    PLAY_RIGHT - RADIUS,
  );
}

// One gesture, two jobs. The blute always sits at your finger's x, above or
// below the line, and how far below the line you pull sets the power.
//
// Because the blute tracks your finger exactly, pull() is left with no
// sideways component, so a shot flies straight up the board. The exception is
// at the cushions: drag past one and the blute stops at the rail while your
// finger keeps going, and that gap angles the shot back in off the wall.
function track(point) {
  placeAt(point);
  aim = point;
}

function launch(dx, dy) {
  current.vx = dx * POWER;
  current.vy = dy * POWER;
  lastShot = current; // remember it so we can report where it ends up
  current = null;
  shotsLeft -= 1;
}

// Called once everything has come to rest after a shot.
function resolveShot() {
  const band = bandFor(footY(lastShot));
  if (band) {
    flashBand = band;
    flashLeft = FLASH_FRAMES;
    message.textContent = `${band.points} point${band.points === 1 ? "" : "s"}!`;
  } else {
    message.textContent = "Short of the scoring zone.";
  }
  lastShot = null;
}

// Screen pixels -> the fixed 400x700 board space.
function toBoard(event) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (event.clientX - rect.left) * (WIDTH / rect.width),
    // Subtract the back gutter so this comes back in board coordinates.
    y: (event.clientY - rect.top) * (CANVAS_HEIGHT / rect.height) - BACK_GUTTER,
  };
}

// The drag, as a vector pointing from your finger to the blute,
// so pulling back and down sends the blute forward and up.
function pull() {
  let dx = current.x - aim.x;
  // Forwards only. Dragging from above the blute would send it back down the
  // board, so flatten that to a sideways shot instead of letting it happen.
  let dy = Math.min(current.y - aim.y, 0);
  const length = Math.hypot(dx, dy);
  if (length > MAX_PULL) {
    dx = (dx / length) * MAX_PULL;
    dy = (dy / length) * MAX_PULL;
  }
  return { dx, dy };
}

canvas.addEventListener("pointerdown", (event) => {
  if (!current) return;
  // Keep receiving move/up events even when the drag leaves the canvas.
  // The browser releases this automatically on pointerup.
  canvas.setPointerCapture(event.pointerId);
  dragging = true;
  track(toBoard(event));
});

canvas.addEventListener("pointermove", (event) => {
  if (!current || !dragging) return;
  track(toBoard(event));
});

canvas.addEventListener("pointerup", () => {
  if (!current || !dragging) return;
  dragging = false;
  if (!aim) return;
  const { dx, dy } = pull();
  aim = null;
  if (Math.hypot(dx, dy) < 8) return; // a tap, not a shot
  launch(dx, dy);
});

// An interrupted drag shouldn't leave the aim stuck on screen.
canvas.addEventListener("pointercancel", () => {
  dragging = false;
  aim = null;
});

function drawAim() {
  const { dx, dy } = pull();
  if (!dx && !dy) return; // still sliding along the line, nothing aimed yet
  ctx.strokeStyle = "rgba(88, 89, 49, 0.85)";
  ctx.lineWidth = 4;
  ctx.setLineDash([6, 6]);
  ctx.beginPath();
  ctx.moveTo(current.x, current.y);
  ctx.lineTo(current.x + dx * 1.6, current.y + dy * 1.6);
  ctx.stroke();
  ctx.setLineDash([]);
}
function update() {
  for (const blute of blutes) {
    blute.x += blute.vx;
    blute.y += blute.vy;
    blute.vx *= FRICTION;
    blute.vy *= FRICTION;

    if (Math.hypot(blute.vx, blute.vy) < STOP_SPEED) {
      blute.vx = 0;
      blute.vy = 0;
    }
  }

  collide();

  // Off a cushion and back onto the surface. This runs after collide so a
  // blute shoved into a rail by another one is put back before it is drawn.
  for (const blute of blutes) bounceOffRails(blute);
}

// The cushions. A blute never leaves the board: it comes off the rail with
// its direction reversed and a bit of its speed gone.
function bounceOffRails(blute) {
  if (blute.x - RADIUS < PLAY_LEFT) {
    blute.x = PLAY_LEFT + RADIUS;
    blute.vx = Math.abs(blute.vx) * WALL_BOUNCE;
  } else if (blute.x + RADIUS > PLAY_RIGHT) {
    blute.x = PLAY_RIGHT - RADIUS;
    blute.vx = -Math.abs(blute.vx) * WALL_BOUNCE;
  }

  if (blute.y - RADIUS < 0) {
    blute.y = RADIUS;
    blute.vy = Math.abs(blute.vy) * WALL_BOUNCE;
  } else if (blute.y + RADIUS > HEIGHT) {
    blute.y = HEIGHT - RADIUS;
    blute.vy = -Math.abs(blute.vy) * WALL_BOUNCE;
  }
}

function allStopped() {
  return blutes.every((b) => b.vx === 0 && b.vy === 0);
}

function collide() {
  for (let i = 0; i < blutes.length; i++) {
    for (let j = i + 1; j < blutes.length; j++) {
      bounce(blutes[i], blutes[j]);
    }
  }
}

function bounce(a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const distance = Math.hypot(dx, dy);
  if (distance === 0 || distance >= RADIUS * 2) return;

  // Unit vector pointing from a to b.
  const nx = dx / distance;
  const ny = dy / distance;

  // Shove them apart so they are touching, not overlapping.
  const overlap = (RADIUS * 2 - distance) / 2;
  a.x -= nx * overlap;
  a.y -= ny * overlap;
  b.x += nx * overlap;
  b.y += ny * overlap;

  // How fast they are closing along that line.
  const closing = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny;
  if (closing <= 0) return; // already moving apart, leave them alone

  // Equal weights, so they just trade that part of their speed.
  a.vx -= closing * nx;
  a.vy -= closing * ny;
  b.vx += closing * nx;
  b.vy += closing * ny;
}

function bandFor(y) {
  return BANDS.find((band) => y >= band.top && y < band.bottom);
}

function score() {
  let total = 0;
  for (const blute of blutes) {
    if (blute === current) continue; // not thrown yet
    const band = bandFor(footY(blute));
    if (band) total += band.points;
  }
  return total;
}

function updateHud() {
  scoreEl.textContent = `Score: ${score()}`;
  shotsEl.textContent = `Blutes left: ${shotsLeft}`;
  // Show whichever is higher, so the number still makes sense while the
  // global best is still loading, or if it never arrives.
  bestEl.textContent = `Best: ${Math.max(globalBest, best)}`;
}

// Ask the server for the highest score anyone has posted.
function refreshGlobalBest() {
  return getGlobalBest()
    .then((top) => {
      globalBest = top;
      updateHud();
    })
    .catch(() => {
      /* offline - the HUD keeps showing the local best */
    });
}

function endRound() {
  roundOver = true;
  const total = score();

  const beatWorld = total > globalBest;
  const beatOwn = total > best;

  if (beatOwn) {
    best = total;
    localStorage.setItem("slipNSlideBest", best);
    // Only post when you improve, so the list holds one row per player.
    submitScore(getPlayerUUID(), total)
      .then(refreshGlobalBest)
      .catch(() => {
        /* the score still counts locally */
      });
  }

  roundScoreEl.textContent = `${total} point${total === 1 ? "" : "s"}`;
  roundNoteEl.textContent = beatWorld
    ? "A new world best!"
    : beatOwn
      ? "Your best yet."
      : `Your best ${best} · world best ${Math.max(globalBest, best)}`;

  message.textContent = "";
  roundOverlay.hidden = false;
  updateHud();
}

function frame() {
    update(); 

    if (!current && !roundOver && allStopped()) {
        if (lastShot) resolveShot();
        if (shotsLeft > 0) {
            loadNextBlute();
        } else {
            endRound();
        }
    }

    if (flashLeft > 0) flashLeft--;
    draw();
    updateHud();
    requestAnimationFrame(frame);
}


againBtn.addEventListener("click", startRound);

refreshGlobalBest();

startRound();
frame();
