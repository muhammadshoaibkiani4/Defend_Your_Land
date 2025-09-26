// game.js — timestamp-based timing
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// --- State ---
let keys = {};
let bullets = [];
let jets = [];
let bombs = [];
let explosions = [];
let powerUps = []; // unified active power-ups list (only one spawn at a time)
let score = 0;
let gameOver = false;
let turretHealth = 10;

let darkMode = false;   
let darkTimer = 0;

let shieldActive = false;
let shieldTimer = 0;

let nightMode = false;
let nightStartTime = 0;
let lastNight = Date.now();

let stars = [];
let moon = { x: 80, y: 80, r: 30 };

let giantJet = null;
let giantTriggered = false;

let supportActive = false;
let supportTimer = 0;
let supportBullets = [];
let supportFireCounter = 0;

let dualMode = false;
let dualTimer = 0;

let lastSupportScore = 0;

// Player turret
const turret = {
  x: canvas.width / 2 - 15,
  y: canvas.height - 40,
  width: 30,
  height: 30,
  color: "darkgreen",
};

// --- Init ---
function init() {
  bullets = [];
  jets = [];
  bombs = [];
  explosions = [];
  powerUps = [];
  score = 0;
  gameOver = false;
  turretHealth = 10;

  darkMode = false;
  darkTimer = 0;

  shieldActive = false;
  shieldTimer = 0;

  nightMode = false;
  nightStartTime = 0;
  lastNight = Date.now();

  stars = [];
  for (let i = 0; i < 60; i++) {
    stars.push({ x: Math.random() * canvas.width, y: Math.random() * (canvas.height * 0.45), r: Math.random() * 2 + 1 });
  }

  giantJet = null;
  giantTriggered = false;

  supportActive = false;
  supportTimer = 0;
  supportBullets = [];
  supportFireCounter = 0;

  dualMode = false;
  dualTimer = 0;

  lastSupportScore = 0;
}
init();

// --- Input ---
document.addEventListener("keydown", (e) => { keys[e.code] = true; if (e.code === "Space") firePlayer(); });
document.addEventListener("keyup", (e) => { keys[e.code] = false; });

// --- Shooting ---
function firePlayer() {
  if (gameOver || nightMode) return;
  if (dualMode) {
    bullets.push({ x: turret.x + 5, y: turret.y, r: 4, speed: 6 });
    bullets.push({ x: turret.x + turret.width - 5, y: turret.y, r: 4, speed: 6 });
  } else {
    bullets.push({ x: turret.x + turret.width / 2, y: turret.y, r: 4, speed: 6 });
  }
}

// --- Spawners ---
function spawnJet() {
  if (gameOver || nightMode) return;
  const t = Math.random();
  if (t < 0.7) {
    const x = Math.random() * (canvas.width - 60);
    jets.push({ x, y: 30, width: 50, height: 20, speed: Math.random() > 0.5 ? 2 : -2, dropped: false });
  } else {
    const x = Math.random() * (canvas.width - 40);
    jets.push({ x, y: -30, width: 40, height: 20, color: "orange", vertical: true, speed: 3 });
  }
}
setInterval(spawnJet, 3000);

function spawnBomber() {
  if (gameOver || nightMode) return;
  jets.push({ x: -80, y: 80, width: 80, height: 40, color: "crimson", bomber: true, bombTimer: 0 });
}

function spawnGiantJet() {
  if (gameOver || nightMode) return;
  giantJet = { x: canvas.width + 200, y: 110, width: 200, height: 80, speed: -6 };
}

function trySpawnRegularPowerUp() {
  if (gameOver || nightMode) return;
  if (powerUps.length > 0) return;
  const r = Math.random();
  if (r < 0.35) powerUps.push({ type: "dual", x: Math.random() * (canvas.width - 40), y: 50, r: 10, color: "blue" });
  else if (r < 0.7) powerUps.push({ type: "black", x: Math.random() * (canvas.width - 40), y: 50, r: 12, color: "black" });
  else powerUps.push({ type: "shield", x: Math.random() * (canvas.width - 40), y: 50, r: 12, color: "gold" });
}
setInterval(trySpawnRegularPowerUp, 12000);

function spawnSpecialGreen() {
  if (gameOver || nightMode) return;
  if (powerUps.length > 0) return;
  powerUps.push({ type: "support", x: Math.random() * (canvas.width - 40), y: 50, r: 12, color: "limegreen" });
}

// --- Explosions ---
function createExplosion(x, y, big = false) {
  explosions.push({ x, y, r: big ? 15 : 6, alpha: 1, grow: big ? 3 : 2 });
}

// --- Game loop ---
function loop() {
  if (gameOver) {
    drawGameOver();
    return;
  }

  const now = Date.now();

  // Night cycle: every 60s
  if (!nightMode && now - lastNight >= 60000) {
    nightMode = true;
    nightStartTime = now;
    lastNight = now;
    jets = [];
    bombs = [];
    powerUps = [];
    turretHealth = Math.min(10, turretHealth + 1);
  }
  if (nightMode && now - nightStartTime >= 10000) {
    nightMode = false;
  }

  // Heal every second during night
  if (nightMode && (now - nightStartTime) % 1000 < 16) {
    turretHealth = Math.min(10, turretHealth + 1);
  }

  // Movement
  if (keys["ArrowLeft"] && turret.x > 0) turret.x -= 5;
  if (keys["ArrowRight"] && turret.x < canvas.width - turret.width) turret.x += 5;

  // Support turret bullets
  if (supportActive) {
    supportFireCounter++;
    if (supportFireCounter % 12 === 0) {
      supportBullets.push({ x: turret.x - 20, y: turret.y + 10, r: 3, speed: 5 });
      supportBullets.push({ x: turret.x + turret.width + 20, y: turret.y + 10, r: 3, speed: 5 });
    }
    supportTimer--;
    if (supportTimer <= 0) supportActive = false;
  }

  // Bullets
  bullets.forEach(b => b.y -= b.speed);
  bullets = bullets.filter(b => b.y > 0);
  supportBullets.forEach(b => b.y -= b.speed);
  supportBullets = supportBullets.filter(b => b.y > 0);

  // Jets
  jets.forEach(jet => {
    if (jet.bomber) {
      jet.x += 2;
      jet.bombTimer++;
      if (jet.bombTimer % 50 === 0) {
        bombs.push({ x: jet.x + jet.width / 2, y: jet.y + jet.height, r: 7 });
      }
    } else if (jet.vertical) {
      jet.y += jet.speed;
    } else {
      jet.x += jet.speed;
      if (!jet.dropped && Math.random() < 0.002) {
        bombs.push({ x: jet.x + jet.width / 2, y: jet.y + jet.height, r: 5 });
        jet.dropped = true;
      }
    }
  });
  jets = jets.filter(jet => !(jet.x < -120 || jet.x > canvas.width + 120 || jet.y > canvas.height + 50));

  // Giant jet
  if (giantJet) {
    giantJet.x += giantJet.speed;
    jets = [];
    if (giantJet.x + giantJet.width < -50) giantJet = null;
  }

  // Bombs
  bombs.forEach(b => b.y += 4);
  bombs = bombs.filter(b => b.y < canvas.height - 40);

  // Collisions bullets vs jets
  bullets.forEach((b, bi) => {
    jets.forEach((jet, ji) => {
      if (b.x > jet.x && b.x < jet.x + jet.width && b.y > jet.y && b.y < jet.y + jet.height) {
        createExplosion(jet.x + jet.width/2, jet.y + jet.height/2);
        jets.splice(ji, 1);
        bullets.splice(bi, 1);
        score++;
      }
    });
  });
  supportBullets.forEach((b, bi) => {
    jets.forEach((jet, ji) => {
      if (b.x > jet.x && b.x < jet.x + jet.width && b.y > jet.y && b.y < jet.y + jet.height) {
        createExplosion(jet.x + jet.width/2, jet.y + jet.height/2);
        jets.splice(ji, 1);
        supportBullets.splice(bi, 1);
        score++;
      }
    });
  });

  // Bombs hitting turret
  bombs.forEach((b, bi) => {
    if (b.x > turret.x && b.x < turret.x + turret.width && b.y > turret.y && b.y < turret.y + turret.height) {
      bombs.splice(bi, 1);
      if (!shieldActive) {
        turretHealth--;
        if (turretHealth <= 0) gameOver = true;
      }
    }
  });

  // Jets hitting turret
  jets.forEach((jet, ji) => {
    if (jet.x < turret.x + turret.width && jet.x + jet.width > turret.x && jet.y + jet.height > turret.y) {
      jets.splice(ji, 1);
      if (!shieldActive) {
        turretHealth--;
        if (turretHealth <= 0) gameOver = true;
      }
    }
  });

  // Power-ups
  powerUps.forEach(p => p.y += 2);
  powerUps = powerUps.filter(p => {
    if (p.x > turret.x - 25 && p.x < turret.x + turret.width + 25 &&
        p.y > turret.y - 25 && p.y < turret.y + turret.height + 25) {
      if (p.type === "dual") { dualMode = true; dualTimer = 600; }
      else if (p.type === "black") { darkMode = true; darkTimer = 600; }
      else if (p.type === "shield") { shieldActive = true; shieldTimer = 600; }
      else if (p.type === "support") { supportActive = true; supportTimer = 600; }
      return false;
    }
    return p.y < canvas.height;
  });

  // Timers
  if (dualMode && --dualTimer <= 0) dualMode = false;
  if (darkMode && --darkTimer <= 0) darkMode = false;
  if (shieldActive && --shieldTimer <= 0) shieldActive = false;

  // Score triggers
  if (score > 0 && score % 20 === 0 && score !== lastSupportScore) {
    spawnSpecialGreen();
    lastSupportScore = score;
  }
  if (!giantJet && score > 0 && score % 50 === 0 && !giantTriggered) {
    spawnGiantJet();
    giantTriggered = true;
  }
  if (score % 50 !== 0) giantTriggered = false;

  // Draw
  drawFrame();

  requestAnimationFrame(loop);
}

// --- Drawing (same as before, with night/day, stars, moon, hearts, etc.) ---
function drawFrame() {
  if (nightMode) {
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "white";
    stars.forEach(s => { ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.fill(); });
    ctx.fillStyle = "lightyellow";
    ctx.beginPath(); ctx.arc(moon.x, moon.y, moon.r, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "grey"; ctx.fillRect(0, canvas.height - 50, canvas.width, 50);
    ctx.fillStyle = "white"; ctx.font = "bold 28px Arial";
    ctx.fillText("Rest yourself...", canvas.width/2 - 110, canvas.height/2 - 20);
  } else {
    ctx.fillStyle = "skyblue";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "green";
    ctx.fillRect(0, canvas.height - 50, canvas.width, 50);
    ctx.fillStyle = "white";
    ctx.beginPath(); ctx.arc(80, 60, 20, 0, Math.PI * 2);
    ctx.arc(110, 60, 25, 0, Math.PI * 2); ctx.fill();
  }

  ctx.fillStyle = turret.color;
  ctx.fillRect(turret.x, turret.y, turret.width, turret.height);
  if (shieldActive) {
    ctx.strokeStyle = "gold"; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(turret.x+turret.width/2, turret.y+turret.height/2, 28, 0, Math.PI*2); ctx.stroke();
  }

  ctx.fillStyle = "red";
  bullets.forEach(b => { ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI*2); ctx.fill(); });
  ctx.fillStyle = "yellow";
  supportBullets.forEach(b => { ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI*2); ctx.fill(); });

  jets.forEach(jet => {
    ctx.fillStyle = jet.color || (darkMode ? "red" : "gray");
    ctx.fillRect(jet.x + 15, jet.y, 20, 20);
    ctx.fillRect(jet.x, jet.y + 5, 50, 5);
    ctx.fillRect(jet.x + 20, jet.y + 20, 10, 10);
  });

  if (giantJet) { ctx.fillStyle = "limegreen"; ctx.fillRect(giantJet.x, giantJet.y, giantJet.width, giantJet.height); }
  ctx.fillStyle = "black";
  bombs.forEach(b => { ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI*2); ctx.fill(); });
  powerUps.forEach(p => { ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI*2); ctx.fill(); });

  explosions.forEach((ex, i) => {
    ex.r += ex.grow; ex.alpha -= 0.03;
    ctx.fillStyle = `rgba(255,165,0,${Math.max(0, ex.alpha)})`;
    ctx.beginPath(); ctx.arc(ex.x, ex.y, ex.r, 0, Math.PI*2); ctx.fill();
    if (ex.alpha <= 0) explosions.splice(i, 1);
  });

  ctx.fillStyle = "white"; ctx.font = "18px Arial";
  ctx.fillText("Score: " + score, canvas.width - 120, 28);
  for (let i = 0; i < turretHealth; i++) {
    ctx.fillStyle = "red";
    const hx = 20 + i*24, hy = 20;
    ctx.beginPath();
    ctx.arc(hx, hy, 6, 0, Math.PI*2);
    ctx.arc(hx+8, hy, 6, 0, Math.PI*2);
    ctx.moveTo(hx-6, hy+4); ctx.lineTo(hx+4, hy+14); ctx.lineTo(hx+16, hy+4);
    ctx.closePath(); ctx.fill();
  }
  if (supportActive) {
    ctx.fillStyle = "lime"; ctx.font = "20px Arial";
    ctx.fillText("Support has arrived!", canvas.width/2 - 100, 50);
  }
}

function drawGameOver() {
  ctx.fillStyle = "rgba(0,0,0,0.6)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "red";
  ctx.font = "bold 48px Arial";
  ctx.fillText("GAME OVER", canvas.width / 2 - 150, canvas.height / 2);
}

requestAnimationFrame(loop);
