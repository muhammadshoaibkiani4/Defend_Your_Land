// game.js — final merged version (timestamp-based timing, freeze fixes, clouds, bomber, fleet, support turret, etc.)

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// ---- Game state ----
let keys = {};
let bullets = [];         // player bullets
let supportBullets = [];  // bullets from support turret
let jets = [];            // regular jets, bombers, fleet, giant
let bombs = [];           // falling bombs
let explosions = [];
let powerUps = [];        // only one active at a time (freeze fix)
let score = 0;
let health = 10;          // 0..10
let gameOver = false;

// Modes & timers (timestamp-based)
let lastNightTime = Date.now();
const NIGHT_INTERVAL_MS = 60_000; // 60s
const NIGHT_DURATION_MS = 10_000; // 10s
let nightStart = 0;
let nightMode = false;

let darkMode = false;     // black power-up effect (screen black + turret red)
let darkStart = 0;
const DARK_DURATION_MS = 10_000;

let shieldActive = false;
let shieldStart = 0;
const SHIELD_DURATION_MS = 10_000;

let dualMode = false;
let dualStart = 0;
const DUAL_DURATION_MS = 10_000;

let supportActive = false;
let supportStart = 0;
const SUPPORT_DURATION_MS = 10_000;

// spawn bookkeeping to avoid repeated spawns on same score
let lastBomberAt = -1;
let lastFleetAt = -1;
let lastSupportPowerSpawnScore = -1;
let lastGiantAt = -1;

// giant jet
let giantJet = null;
let lastGiantAnnounce = 0;

// clouds & visuals
let clouds = [];
for (let i = 0; i < 6; i++) clouds.push({ x: Math.random() * 800, y: 30 + Math.random() * 100, speed: 0.3 + Math.random()*0.8 });

// stars removed (per latest spec) — we use moon only in night

// Player turret (shape drawn later)
const turret = { x: canvas.width / 2, y: canvas.height - 60, width: 40, height: 30 };

// Input
document.addEventListener("keydown", (e) => { keys[e.code] = true; if (e.code === "Space") firePlayer(); });
document.addEventListener("keyup",   (e) => { keys[e.code] = false; });

// --- Helpers ---
function nowMs() { return Date.now(); }

function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

function dist2(ax, ay, bx, by) {
  const dx = ax - bx, dy = ay - by; return dx*dx + dy*dy;
}

// --- Fire ---
function firePlayer() {
  if (gameOver || nightMode) return;
  if (dualMode) {
    bullets.push({ x: turret.x - 12 + turret.width/2, y: turret.y, r: 4, speed: 8 });
    bullets.push({ x: turret.x + 12 + turret.width/2, y: turret.y, r: 4, speed: 8 });
  } else {
    bullets.push({ x: turret.x + turret.width/2, y: turret.y, r: 4, speed: 8 });
  }
}

// support turret fires automatically while supportActive
function supportFire() {
  if (!supportActive) return;
  // two shots from sides
  supportBullets.push({ x: turret.x - 24, y: turret.y + 4, r: 3, speed: 7 });
  supportBullets.push({ x: turret.x + turret.width + 24, y: turret.y + 4, r: 3, speed: 7 });
}

// --- Spawners ---
// Only spawn power-up if none exists (powerUps.length === 0)
function trySpawnPowerUpRegular() {
  if (gameOver || nightMode) return;
  if (powerUps.length > 0) return;
  const r = Math.random();
  if (r < 0.33) powerUps.push({ type: "dual", color: "blue", x: Math.random() * (canvas.width-40)+20, y: -10, r: 10 });
  else if (r < 0.66) powerUps.push({ type: "black", color: "black", x: Math.random() * (canvas.width-40)+20, y: -10, r: 12 });
  else powerUps.push({ type: "shield", color: "gold", x: Math.random() * (canvas.width-40)+20, y: -10, r: 12 });
}
setInterval(trySpawnPowerUpRegular, 12000);

// Spawn jets (normal horizontal or orange vertical)
function spawnJet() {
  if (gameOver || nightMode) return;
  const t = Math.random();
  if (t < 0.7) {
    const x = Math.random() * (canvas.width - 60);
    jets.push({ type: "jet", x, y: 30, width: 50, height: 20, speed: Math.random()>0.5?2:-2, dropped:false, color:null });
  } else {
    // orange vertical
    const x = Math.random() * (canvas.width - 40);
    jets.push({ type: "jet", x, y: -40, width: 40, height: 20, vertical:true, speed: 3, color: "orange" });
  }
}
setInterval(() => { if (!nightMode && !gameOver) spawnJet(); }, 1300);

// Bomber spawn logic handled by score checker (every 20 points)
function spawnBomber() {
  if (gameOver || nightMode) return;
  jets.push({ type: "bomber", x: -100, y: 80, width: 80, height: 40, speed: 2.2, bombTimer: 0, color: "crimson" });
}

// Fleet of 3 black jets spawn (every 30 points)
function spawnFleet() {
  if (gameOver || nightMode) return;
  const dir = Math.random() < 0.5 ? "left" : "down";
  // place them off-screen to the right if moving left, or top if moving down
  if (dir === "left") {
    const startX = canvas.width + 40;
    for (let i=0;i<3;i++){
      jets.push({ type:"fleet", fleetId:i, x:startX + i*40, y:50 + i*25, width:50, height:20, dir:"left", speed:3, color:"black" });
    }
  } else {
    const startY = -60;
    const baseX = 100 + Math.random() * (canvas.width-200);
    for (let i=0;i<3;i++){
      jets.push({ type:"fleet", fleetId:i, x: baseX + i*40, y: startY - i*30, width:50, height:20, dir:"down", speed:2.5, color:"black" });
    }
  }
}

// Giant green jet spawn (at 50 points). Shape like other jets but bigger.
function spawnGiantJet() {
  if (gameOver || nightMode) return;
  giantJet = { type: "giant", x: canvas.width + 200, y: 90, width: 160, height: 60, speed: -5, color: "limegreen", announced: false, announceAt: nowMs() };
  // show "Air support has arrived" on spawn; announcement logic in draw
  lastGiantAnnounce = nowMs();
}

// Special green support power-up should appear at multiples of 20 (spawned through loop logic when score crosses)
function spawnSupportPowerUp() {
  if (gameOver || nightMode) return;
  if (powerUps.length > 0) return;
  powerUps.push({ type: "support", color: "limegreen", x: Math.random() * (canvas.width-40)+20, y: -10, r: 12 });
}

// --- Utility explosion ---
function createExplosion(x,y,big=false) {
  explosions.push({ x, y, r: big?16:6, alpha:1, grow: big?3:2 });
}

// --- Collisions & damage helpers ---
function rectsIntersect(ax,ay,aw,ah, bx,by,bw,bh) {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

// --- Main loop (timestamp-based) ---
let lastSupportFire = 0;
function loop() {
  if (gameOver) {
    drawGameOver();
    return;
  }

  const now = nowMs();

  // NIGHT scheduling (every 60s for 10s)
  if (!nightMode && now - lastNightTime >= NIGHT_INTERVAL_MS) {
    nightMode = true;
    nightStart = now;
    lastNightTime = now;
    // clear active enemies and powerups
    jets = [];
    bombs = [];
    powerUps = [];
    // heal immediately a bit
    health = clamp(health + 1, 0, 10);
  }
  if (nightMode && now - nightStart >= NIGHT_DURATION_MS) {
    nightMode = false;
    // reset nightStart handled via lastNightTime
  }
  // heal during night once per second
  if (nightMode && Math.floor((now - nightStart)/1000) !== Math.floor((now - nightStart - 16)/1000)) {
    // this condition triggers roughly once per second while nightMode
    health = clamp(health + 1, 0, 10);
  }

  // DARK (black power-up) timing
  if (darkMode && now - darkStart >= DARK_DURATION_MS) {
    darkMode = false;
  }

  // SHIELD timing
  if (shieldActive && now - shieldStart >= SHIELD_DURATION_MS) {
    shieldActive = false;
  }

  // DUAL timing
  if (dualMode && now - dualStart >= DUAL_DURATION_MS) {
    dualMode = false;
  }

  // SUPPORT turret timing
  if (supportActive && now - supportStart >= SUPPORT_DURATION_MS) {
    supportActive = false;
  }

  // Movement input
  if (keys["ArrowLeft"] && turret.x > 10) turret.x -= 5;
  if (keys["ArrowRight"] && turret.x < canvas.width - turret.width - 10) turret.x += 5;

  // Clouds only move in day
  if (!nightMode) {
    for (let c of clouds) {
      c.x += c.speed;
      if (c.x > canvas.width + 60) c.x = -80;
    }
  }

  // spawn checks tied to score thresholds (avoid repeating on same score)
  if (score > 0 && score % 20 === 0 && score !== lastBomberAt) {
    spawnBomber();
    lastBomberAt = score;
  }
  if (score > 0 && score % 30 === 0 && score !== lastFleetAt) {
    spawnFleet();
    lastFleetAt = score;
  }
  if (score > 0 && score % 20 === 0 && score !== lastSupportPowerSpawnScore) {
    // spawn support power-up (special green) at score multiples of 20 (player must collect to activate support turret)
    spawnSupportPowerUp();
    lastSupportPowerSpawnScore = score;
  }
  if (score > 0 && score % 50 === 0 && score !== lastGiantAt) {
    spawnGiantJet();
    lastGiantAt = score;
  }

  // Update bullets arrays
  for (let i = bullets.length-1; i >= 0; --i) {
    bullets[i].y -= bullets[i].speed;
    if (bullets[i].y < -10) bullets.splice(i,1);
  }
  for (let i = supportBullets.length-1; i >= 0; --i) {
    supportBullets[i].y -= supportBullets[i].speed;
    if (supportBullets[i].y < -10) supportBullets.splice(i,1);
  }

  // jets update
  for (let i = jets.length-1; i >= 0; --i) {
    const j = jets[i];
    if (j.type === "bomber") {
      j.x += j.speed;
      j.bombTimer = (j.bombTimer || 0) + 1;
      if (j.bombTimer % 60 === 0 && j.x > 0 && j.x < canvas.width - j.width) {
        bombs.push({ x: j.x + j.width/2, y: j.y + j.height, r: 7 });
      }
      if (j.x > canvas.width + 200) jets.splice(i,1);
    } else if (j.type === "jet" && j.vertical) {
      // orange jet descends
      j.y += j.speed;
      if (j.y > canvas.height + 50) jets.splice(i,1);
    } else if (j.type === "fleet") {
      if (j.dir === "left") j.x -= j.speed;
      else j.y += j.speed;
      // remove if off-screen
      if (j.x < -200 || j.y > canvas.height + 100) jets.splice(i,1);
    } else {
      // regular horizontal jets
      j.x += j.speed;
      // bounce
      if (j.x < -120 || j.x > canvas.width + 120) jets.splice(i,1);
      if (!j.dropped && Math.random() < 0.002) {
        bombs.push({ x: j.x + j.width/2, y: j.y + j.height, r: 5 });
        j.dropped = true;
      }
    }
  }

  // giant jet movement
  if (giantJet) {
    giantJet.x += giantJet.speed;
    // when giant jet enters screen, announce and wipe jets continuously
    if (!giantJet.announced && giantJet.x < canvas.width) {
      giantJet.announced = true;
      lastGiantAnnounce = now;
    }
    // wipe jets while giant exists
    if (giantJet.announced) jets = [];
    if (giantJet.x + giantJet.width < -50) giantJet = null;
  }

  // bombs update and collisions with turret
  for (let i = bombs.length-1; i >= 0; --i) {
    bombs[i].y += 4;
    const b = bombs[i];
    // collision with turret (simple bounding)
    if (rectsIntersect(b.x - b.r, b.y - b.r, b.r*2, b.r*2, turret.x, turret.y, turret.width, turret.height)) {
      bombs.splice(i,1);
      if (!shieldActive) {
        health = clamp(health - 1, 0, 10);
        if (health <= 0) gameOver = true;
      }
      continue;
    }
    // else remove bombs if below canvas bottom
    if (b.y > canvas.height + 40) bombs.splice(i,1);
  }

  // bullets vs jets collisions
  for (let bi = bullets.length-1; bi >= 0; --bi) {
    const b = bullets[bi];
    let hit = false;
    for (let ji = jets.length-1; ji >= 0; --ji) {
      const j = jets[ji];
      if (b.x > j.x && b.x < j.x + j.width && b.y > j.y && b.y < j.y + j.height) {
        createExplosion(j.x + j.width/2, j.y + j.height/2);
        jets.splice(ji,1);
        bullets.splice(bi,1);
        score++;
        hit = true;
        break;
      }
    }
    if (hit) continue;
    // support bullets also collide
  }
  for (let bi = supportBullets.length-1; bi >= 0; --bi) {
    const b = supportBullets[bi];
    for (let ji = jets.length-1; ji >= 0; --ji) {
      const j = jets[ji];
      if (b.x > j.x && b.x < j.x + j.width && b.y > j.y && b.y < j.y + j.height) {
        createExplosion(j.x + j.width/2, j.y + j.height/2);
        jets.splice(ji,1);
        supportBullets.splice(bi,1);
        score++;
        break;
      }
    }
  }

  // jets hitting turret (collision)
  for (let ji = jets.length-1; ji >= 0; --ji) {
    const j = jets[ji];
    if (rectsIntersect(j.x, j.y, j.width, j.height, turret.x, turret.y, turret.width, turret.height)) {
      jets.splice(ji,1);
      if (!shieldActive) {
        health = clamp(health - 1, 0, 10);
        if (health <= 0) gameOver = true;
      }
    }
  }

  // Power-ups update — FIX: only one powerUp exists and we filter safely
  powerUps.forEach(p => p.y += 2);
  powerUps = powerUps.filter(p => {
    // collected?
    if (rectsIntersect(p.x - p.r, p.y - p.r, p.r*2, p.r*2, turret.x - 10, turret.y - 10, turret.width + 20, turret.height + 20)) {
      if (p.type === "dual") { dualMode = true; dualStart = now; }
      else if (p.type === "black") { darkMode = true; darkStart = now; }
      else if (p.type === "shield") { shieldActive = true; shieldStart = now; }
      else if (p.type === "support") { supportActive = true; supportStart = now; }
      return false; // remove on collect
    }
    // remove if off-screen
    if (p.y > canvas.height + 20) return false;
    return true;
  });

  // support turret auto-fire
  if (supportActive && now - lastSupportFire >= 300) { // fire every 300ms
    supportFire();
    lastSupportFire = now;
  }

  // Draw everything
  draw();

  // schedule next frame
  requestAnimationFrame(loop);
}

// --- Drawing ---
function draw() {
  // background depending on nightMode or darkMode
  if (nightMode) {
    ctx.fillStyle = "black";
    ctx.fillRect(0,0,canvas.width,canvas.height);
    // moon
    ctx.fillStyle = "lightyellow";
    ctx.beginPath(); ctx.arc(100,80,30,0,Math.PI*2); ctx.fill();
    // grey grass
    ctx.fillStyle = "grey";
    ctx.fillRect(0, canvas.height - 50, canvas.width, 50);
    // rest text
    ctx.fillStyle = "white";
    ctx.font = "bold 28px Arial";
    ctx.fillText("Rest yourself...", canvas.width/2 - 110, canvas.height/2 - 20);
  } else if (darkMode) { // black power-up effect (separate from night)
    ctx.fillStyle = "black";
    ctx.fillRect(0,0,canvas.width,canvas.height);
    // grass grey when darkMode? Keep green per request; only turret red happens
    ctx.fillStyle = "green";
    ctx.fillRect(0, canvas.height - 50, canvas.width, 50);
  } else {
    // day
    ctx.fillStyle = "skyblue";
    ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.fillStyle = "green";
    ctx.fillRect(0, canvas.height - 50, canvas.width, 50);
    // clouds (moving)
    ctx.fillStyle = "white";
    for (let c of clouds) {
      ctx.beginPath();
      ctx.arc(c.x, c.y, 20, 0, Math.PI*2);
      ctx.arc(c.x+25, c.y+10, 25, 0, Math.PI*2);
      ctx.arc(c.x-25, c.y+10, 25, 0, Math.PI*2);
      ctx.fill();
    }
  }

  // giant announcement text (Air support has arrived) when giant spawns
  if (giantJet && giantJet.announced) {
    ctx.fillStyle = "lime";
    ctx.font = "22px Arial";
    ctx.fillText("Air support has arrived!", canvas.width/2 - 130, 60);
  }

  // draw turret (proper shape: base + barrel)
  // turret color depends on darkMode or normal
  const turretColor = darkMode ? "red" : "darkgreen";
  ctx.fillStyle = turretColor;
  // base
  ctx.fillRect(turret.x - 15, turret.y, 30, 20);
  // barrel
  ctx.fillRect(turret.x - 5, turret.y - 18, 10, 18);
  // small top circle
  ctx.beginPath();
  ctx.arc(turret.x, turret.y - 20, 6, 0, Math.PI*2);
  ctx.fill();

  // support turret draw (if active) — place to right of player
  if (supportActive) {
    const sx = turret.x + 70;
    const sy = turret.y;
    ctx.fillStyle = "darkblue";
    ctx.fillRect(sx - 15, sy, 30, 20);
    ctx.fillRect(sx - 5, sy - 12, 10, 12);
  }

  // draw player bullets
  ctx.fillStyle = "red";
  for (let b of bullets) {
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r, 0, Math.PI*2);
    ctx.fill();
  }

  // draw support bullets
  ctx.fillStyle = "yellow";
  for (let b of supportBullets) {
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r, 0, Math.PI*2);
    ctx.fill();
  }

  // draw jets (use same shape as before)
  for (let j of jets) {
    ctx.fillStyle = j.color ? j.color : (darkMode ? "red" : "gray");
    ctx.fillRect(j.x + 15, j.y, 20, 20);
    ctx.fillRect(j.x, j.y + 5, 50, 5);
    ctx.fillRect(j.x + 20, j.y + 20, 10, 10);
    // bomber additional drawing (no outline per request)
    // (we already set color crimson)
  }

  // draw giant jet (bigger, same shape)
  if (giantJet) {
    ctx.fillStyle = giantJet.color;
    // scale up the same shape
    ctx.fillRect(giantJet.x + 40, giantJet.y, 60, 30);
    ctx.fillRect(giantJet.x, giantJet.y + 8, giantJet.width, 8);
    ctx.fillRect(giantJet.x + 50, giantJet.y + 40, 20, 20);
  }

  // bombs
  ctx.fillStyle = "black";
  for (let b of bombs) {
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r, 0, Math.PI*2);
    ctx.fill();
  }

  // power-ups (only one usually)
  for (let p of powerUps) {
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI*2);
    ctx.fill();
    if (p.type === "black") { ctx.strokeStyle = "white"; ctx.stroke(); }
  }

  // explosions
  for (let i = explosions.length-1; i >= 0; --i) {
    const ex = explosions[i];
    ex.r += ex.grow;
    ex.alpha -= 0.03;
    ctx.fillStyle = `rgba(255,165,0,${Math.max(0, ex.alpha)})`;
    ctx.beginPath(); ctx.arc(ex.x, ex.y, ex.r, 0, Math.PI*2); ctx.fill();
    if (ex.alpha <= 0) explosions.splice(i,1);
  }

  // HUD: score and health bar
  ctx.fillStyle = "white";
  ctx.font = "18px Arial";
  ctx.fillText("Score: " + score, canvas.width - 120, 28);

  // health bar at top-left
  ctx.fillStyle = "black";
  ctx.fillRect(20, 20, 104, 14);
  ctx.fillStyle = "limegreen";
  ctx.fillRect(22, 22, health * 10, 10);

  // support text when active (also displayed near top)
  if (supportActive) {
    ctx.fillStyle = "lime";
    ctx.font = "18px Arial";
    ctx.fillText("Support has arrived!", canvas.width/2 - 80, 50);
  }
}

// draw Game Over screen
function drawGameOver() {
  ctx.fillStyle = "rgba(0,0,0,0.6)";
  ctx.fillRect(0,0,canvas.width,canvas.height);
  ctx.fillStyle = "red";
  ctx.font = "bold 48px Arial";
  ctx.fillText("GAME OVER", canvas.width/2 - 150, canvas.height/2);
}

// --- periodic spawners that are not score-based are already set ---
// but ensure only one power-up at a time via trySpawnPowerUpRegular

// Start main loop
requestAnimationFrame(loop);
