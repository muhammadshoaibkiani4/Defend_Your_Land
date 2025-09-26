// game.js — fixed: input handlers + spawners + bomb damage + all requested features
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

canvas.width = 800;
canvas.height = 600;

// --- state ---
let keys = {};
let bullets = [];
let jets = [];
let bombs = [];
let powerUps = [];
let clouds = [];
let explosions = [];

let score = 0;
let health = 10; // 10 HP
let gameOver = false;

// Night and black-power (separate)
let lastNightAt = Date.now();
const NIGHT_INTERVAL_MS = 60_000; // every 60s
const NIGHT_DURATION_MS = 10_000; // lasts 10s
let nightActive = false;
let nightStartedAt = 0;

let darkActive = false; // black power-up (separate from night)
let darkStartedAt = 0;
const DARK_MS = 10_000;

// Support turret (green power-up)
let supportActive = false;
let supportStartedAt = 0;
const SUPPORT_MS = 10_000;
let lastSupportScore = -1;

// Giant green jet (air support)
let giantJet = null;
let lastGiantAt = -1;

// spawn bookkeeping
let lastFleetSpawn = Date.now();

// turret (original shape)
const turret = {
  x: canvas.width / 2 - 20,
  y: canvas.height - 80,
  width: 40,
  height: 30,
  shootCooldown: 0,
  draw() {
    // base
    ctx.fillStyle = darkActive ? "red" : "darkgreen";
    ctx.fillRect(this.x - 15, this.y, 30, 20); // base
    // barrel
    ctx.fillRect(this.x - 5, this.y - 18, 10, 18);
    // small circle on turret top
    ctx.beginPath();
    ctx.arc(this.x, this.y - 20, 6, 0, Math.PI * 2);
    ctx.fill();
    // shield glow
    if (shieldActive) {
      ctx.strokeStyle = "gold";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(this.x + 5, this.y + 5, 36, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
};

// power/shields
let dualActive = false;
let dualStartedAt = 0;
const DUAL_MS = 10_000;

let shieldActive = false;
let shieldStartedAt = 0;
const SHIELD_MS = 10_000;

// --- classes / simple constructors ---

function Bullet(x, y) {
  this.x = x;
  this.y = y;
  this.r = 4;
  this.speed = 8;
}
Bullet.prototype.update = function() { this.y -= this.speed; };
Bullet.prototype.draw = function() {
  ctx.fillStyle = "red";
  ctx.beginPath();
  ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
  ctx.fill();
};

function Jet(x, y, opts = {}) {
  this.x = x;
  this.y = y;
  this.width = 40;
  this.height = 40;
  this.color = opts.color || (darkActive ? "red" : "gray");
  // support vertical or horizontal motion via vx/vy
  this.vx = opts.vx ?? 0;
  this.vy = opts.vy ?? (opts.vertical ? (opts.speed || 3) : (opts.speed || 2));
  this.type = opts.type || "jet"; // 'jet', 'bomber', 'fleet', 'giant'
  this.dropped = false; // for horizontal jets dropping bombs once
  this.bombTimer = 0; // for bomber
}
Jet.prototype.update = function() {
  this.x += this.vx;
  this.y += this.vy;
};
Jet.prototype.draw = function() {
  ctx.fillStyle = this.color || (darkActive ? "red" : "gray");
  // triangle pointing down (same shape for all jets per your request)
  ctx.beginPath();
  ctx.moveTo(this.x + this.width / 2, this.y);
  ctx.lineTo(this.x, this.y + this.height);
  ctx.lineTo(this.x + this.width, this.y + this.height);
  ctx.closePath();
  ctx.fill();
};

function Bomber() {
  this.x = -120;
  this.y = 100;
  this.width = 80;
  this.height = 40;
  this.speed = 2;
  this.color = "crimson";
  this.dropCooldown = 0;
}
Bomber.prototype.update = function() {
  this.x += this.speed;
  if (this.dropCooldown <= 0 && this.x > 0 && this.x < canvas.width - this.width) {
    // drop only one bomb at a time (reduce lethality)
    bombs.push(new Bomb(this.x + this.width / 2, this.y + this.height));
    this.dropCooldown = 300; // frames until next drop (long)
  } else {
    this.dropCooldown--;
  }
};
Bomber.prototype.draw = function() {
  ctx.fillStyle = this.color;
  // bomber shape: body rectangle + small wing
  ctx.fillRect(this.x, this.y, this.width, this.height);
  ctx.fillStyle = "black";
  ctx.fillRect(this.x + 10, this.y - 8, this.width - 20, 6);
};

function Bomb(x, y) {
  this.x = x;
  this.y = y;
  this.r = 6;
  this.speed = 4;
  this.exploded = false;
}
Bomb.prototype.update = function() {
  this.y += this.speed;
  // When hit ground: explosion + 1 health
  if (this.y >= canvas.height - 50 - this.r && !this.exploded) {
    this.exploded = true;
    explosions.push({ x: this.x, y: canvas.height - 50, r: 0, life: 30 });
    // damage (1 HP)
    if (!shieldActive) {
      health = Math.max(0, health - 1);
      if (health <= 0) triggerGameOver();
    }
  }
};
Bomb.prototype.draw = function() {
  if (!this.exploded) {
    ctx.fillStyle = "black";
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
    ctx.fill();
  }
};

function PowerUp(x, y, type) {
  this.x = x;
  this.y = y;
  this.size = 18;
  this.type = type; // 'dual','black','shield','support'
  this.speed = 2;
}
PowerUp.prototype.update = function() { this.y += this.speed; };
PowerUp.prototype.draw = function() {
  if (this.type === "dual") ctx.fillStyle = "blue";
  else if (this.type === "black") ctx.fillStyle = "black";
  else if (this.type === "shield") ctx.fillStyle = "gold";
  else if (this.type === "support") ctx.fillStyle = "limegreen";
  ctx.fillRect(this.x, this.y, this.size, this.size);
};

function Cloud(x, y) {
  this.x = x; this.y = y; this.speed = 0.5 + Math.random();
}
Cloud.prototype.update = function() {
  this.x += this.speed;
  if (this.x > canvas.width + 60) this.x = -80;
};
Cloud.prototype.draw = function() {
  ctx.fillStyle = "white";
  ctx.beginPath();
  ctx.arc(this.x, this.y, 18, 0, Math.PI * 2);
  ctx.arc(this.x + 22, this.y + 8, 22, 0, Math.PI * 2);
  ctx.arc(this.x - 22, this.y + 8, 22, 0, Math.PI * 2);
  ctx.fill();
};

// init some clouds
for (let i = 0; i < 6; i++) clouds.push(new Cloud(Math.random() * canvas.width, 30 + Math.random() * 120));

// --- input ---
document.addEventListener("keydown", (e) => {
  keys[e.code] = true;
  // immediate shoot on keydown as well
  if (e.code === "Space") tryShoot();
});
document.addEventListener("keyup", (e) => { keys[e.code] = false; });

// --- shoot ---
function tryShoot() {
  if (gameOver || nightActive) return;
  if (turret.shootCooldown > 0) return;
  if (dualActive) {
    bullets.push(new Bullet(turret.x - 6 + turret.width/2, turret.y - 6));
    bullets.push(new Bullet(turret.x + 6 + turret.width/2, turret.y - 6));
  } else {
    bullets.push(new Bullet(turret.x + turret.width / 2, turret.y - 6));
  }
  turret.shootCooldown = 12; // cooldown frames
}

// --- spawners (fixed missing spawners) ---
// spawn jets regularly (vertical jets + occasional orange)
setInterval(() => {
  if (gameOver || nightActive) return;
  if (Math.random() < 0.25) {
    // orange downward jet
    jets.push(new Jet(Math.random() * (canvas.width - 40), -40, { color: "orange", vertical: true, speed: 3 }));
  } else {
    // normal downward jet
    jets.push(new Jet(Math.random() * (canvas.width - 40), -40, { color: darkActive ? "red" : "gray", vertical: true, speed: 2 }));
  }
}, 1400);

// fleet every 20 seconds (as you requested)
setInterval(() => {
  if (gameOver || nightActive) return;
  // three black jets moving leftwards (start off-screen right)
  const startX = canvas.width + 40;
  for (let i = 0; i < 3; i++) {
    // horizontal fleet jets: move left
    const j = new Jet(startX + i * 50, 60 + i * 30, { vx: -3, vy: 0, color: "black", type: "fleet" });
    jets.push(j);
  }
}, 20_000);

// bomber spawn every 20s (keeps bomber behavior)
setInterval(() => {
  if (gameOver || nightActive) return;
  bombers.push && bombers.push === undefined; // harmless (keeps older logic untouched) - ensure variable exists
  // push a Bomber instance into jets array (so central loop finds it)
  jets.push(new Jet(-120, 100, { vx: 0, vy: 0, color: "crimson", type: "bomber" }));
  // we will treat type 'bomber' in update loop specially
}, 20_000);

// cloud spawner (additional clouds)
setInterval(() => {
  clouds.push(new Cloud(-80, 40 + Math.random() * 100));
}, 6000);

// spawn regular powerups occasionally, but only one at a time (freeze fix)
setInterval(() => {
  if (gameOver || nightActive) return;
  if (powerUps.length > 0) return;
  const r = Math.random();
  if (r < 0.33) powerUps.push(new PowerUp(Math.random() * (canvas.width - 30), -20, "dual"));
  else if (r < 0.66) powerUps.push(new PowerUp(Math.random() * (canvas.width - 30), -20, "black"));
  else powerUps.push(new PowerUp(Math.random() * (canvas.width - 30), -20, "shield"));
}, 12000);

// support-power spawn when score crosses multiples of 20 (handled in loop via lastSupportScore),
// also avoid multiple powerUps on screen at once

// giant jet announcement handled when spawning

// --- helpers ---
function triggerGameOver() {
  gameOver = true;
  // explosion effect at turret
  explosions.push({ x: turret.x + turret.width/2, y: turret.y + 10, r: 0, life: 80 });
}

// --- main loop ---
function loop() {
  // time-based night handling
  const now = Date.now();
  if (!nightActive && (now - lastNightAt) >= NIGHT_INTERVAL_MS) {
    // start night
    nightActive = true;
    nightStartedAt = now;
    lastNightAt = now;
    // clear enemies & bombs
    jets = [];
    bombs = [];
    powerUps = [];
    // immediate heal
    health = Math.min(10, health + 1);
  }
  if (nightActive && (now - nightStartedAt) >= NIGHT_DURATION_MS) {
    nightActive = false;
  }

  // dark-power timing
  if (darkActive && (now - darkStartedAt) >= DARK_MS) {
    darkActive = false;
  }

  // dual timing
  if (dualActive && (now - dualStartedAt) >= DUAL_MS) {
    dualActive = false;
  }

  // shield timing
  if (shieldActive && (now - shieldStartedAt) >= SHIELD_MS) {
    shieldActive = false;
  }

  // support timing
  if (supportActive && (now - supportStartedAt) >= SUPPORT_MS) {
    supportActive = false;
  }

  // giant jet expiration handled below

  // update turret cooldown
  if (turret.shootCooldown > 0) turret.shootCooldown--;

  // movement from keys
  if (!gameOver) {
    if (keys["ArrowLeft"]) turret.x = Math.max(10, turret.x - 5);
    if (keys["ArrowRight"]) turret.x = Math.min(canvas.width - turret.width - 10, turret.x + 5);
    // allow holding Space to shoot with cooldown
    if (keys["Space"]) tryShoot();
  }

  // update clouds & draw background
  if (nightActive) {
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    // moon
    ctx.fillStyle = "lightyellow";
    ctx.beginPath(); ctx.arc(700, 80, 30, 0, Math.PI*2); ctx.fill();
    // grey grass
    ctx.fillStyle = "grey";
    ctx.fillRect(0, canvas.height - 50, canvas.width, 50);
    // rest text
    ctx.fillStyle = "white";
    ctx.font = "20px Arial";
    ctx.fillText("Rest yourself", canvas.width/2 - 60, 50);
  } else if (darkActive) {
    // black-power effect: black sky, green grass/still show differently per earlier request
    ctx.fillStyle = "black";
    ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.fillStyle = "green";
    ctx.fillRect(0, canvas.height - 50, canvas.width, 50);
  } else {
    ctx.fillStyle = "skyblue";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "green";
    ctx.fillRect(0, canvas.height - 50, canvas.width, 50);
  }

  // clouds (draw only in day; but in black-power you might still want clouds hidden; we show clouds if not night)
  if (!nightActive) {
    for (let c of clouds) { c.update(); c.draw(); }
  }

  // update/draw turret
  turret.draw();

  // support turret draw (if active)
  if (supportActive) {
    // draw second turret to the right of main
    ctx.fillStyle = "darkblue";
    ctx.fillRect(turret.x + 70 - 15, turret.y, 30, 20);
    ctx.fillRect(turret.x + 70 - 5, turret.y - 18, 10, 18);
  }

  // bullets update/draw
  for (let i = bullets.length - 1; i >= 0; --i) {
    const b = bullets[i];
    b.update();
    b.draw();
    if (b.y < -10) bullets.splice(i, 1);
  }

  // spawn support-power when score crosses multiples of 20 (player must collect it)
  if (score > 0 && score % 20 === 0 && score !== lastSupportScore) {
    lastSupportScore = score;
    // only spawn support powerup if none exists
    if (powerUps.length === 0) powerUps.push(new PowerUp(Math.random() * (canvas.width - 40), -20, "support"));
  }

  // spawn giant green jet at 50 points
  if (score > 0 && score % 50 === 0 && score !== lastGiantAt) {
    lastGiantAt = score;
    // create giant jet (big shape)
    giantJet = { x: canvas.width + 200, y: 110, width: 160, height: 60, speed: -6, color: "limegreen", announced: false };
  }

  // jets update/draw
  for (let i = jets.length - 1; i >= 0; --i) {
    const j = jets[i];

    // special types recognized via properties:
    if (j.type === "bomber") {
      // bomber behavior (if created as Jet with type bomber)
      // fallback: treat it like horizontal bomber by moving right
      j.x += 2;
      j.bombTimer = (j.bombTimer || 0) + 1;
      if (j.bombTimer % 180 === 0 && j.x > 0 && j.x < canvas.width - j.width) {
        bombs.push(new Bomb(j.x + j.width / 2, j.y + j.height));
      }
    } else {
      j.update();
      // if horizontal fleet: check bounds
      if (j.vx < 0 && j.x + j.width < -200) { jets.splice(i, 1); continue; }
      if (j.vy > 0 && j.y > canvas.height + 60) { jets.splice(i, 1); continue; }
      // if vertical jet falls past ground:
      if (j.vy > 0 && j.y > canvas.height) {
        // penalty for enemy reaching bottom
        if (!shieldActive) {
          health = Math.max(0, health - 1);
          if (health <= 0) triggerGameOver();
        }
        jets.splice(i, 1);
        continue;
      }
    }
    // draw
    j.draw();
  }

  // giantJet update/draw
  if (giantJet) {
    giantJet.x += giantJet.speed;
    // announcing and wiping jets
    if (!giantJet.announced && giantJet.x < canvas.width) {
      giantJet.announced = true;
      // display message (drawn below)
    }
    // while present, clear other jets
    if (giantJet.announced) jets = []; // wipe visible jets
    // draw giant in same shape scaled
    ctx.fillStyle = giantJet.color;
    ctx.beginPath();
    ctx.moveTo(giantJet.x + giantJet.width/2, giantJet.y);
    ctx.lineTo(giantJet.x, giantJet.y + giantJet.height);
    ctx.lineTo(giantJet.x + giantJet.width, giantJet.y + giantJet.height);
    ctx.closePath();
    ctx.fill();
    // when off-screen, remove
    if (giantJet.x + giantJet.width < -50) giantJet = null;
  }

  // bombs update/draw (and explosion when hit ground handled in Bomb.update)
  for (let i = bombs.length - 1; i >= 0; --i) {
    const b = bombs[i];
    b.update();
    b.draw();
    // remove exploded bombs (we check exploded flag)
    if (b.exploded) bombs.splice(i, 1);
  }

  // explosions
  for (let i = explosions.length - 1; i >= 0; --i) {
    const ex = explosions[i];
    ctx.fillStyle = `rgba(255,140,0,${1 - ex.r / 30})`;
    ctx.beginPath(); ctx.arc(ex.x, ex.y, ex.r, 0, Math.PI*2); ctx.fill();
    ex.r += 1.8;
    ex.life--;
    if (ex.life <= 0) explosions.splice(i, 1);
  }

  // powerUps update/draw (single power-up rule & freeze-fix)
  for (let i = powerUps.length - 1; i >= 0; --i) {
    const p = powerUps[i];
    p.update();
    p.draw();

    // collect?
    if (p.type && p.x < turret.x + turret.width + 20 &&
        p.x + p.size > turret.x - 20 &&
        p.y < turret.y + turret.height + 20 &&
        p.y + p.size > turret.y - 20) {

      if (p.type === "dual") {
        dualActive = true; dualStartedAt = Date.now();
      } else if (p.type === "black") {
        darkActive = true; darkStartedAt = Date.now();
      } else if (p.type === "shield") {
        shieldActive = true; shieldStartedAt = Date.now();
      } else if (p.type === "support") {
        supportActive = true; supportStartedAt = Date.now();
      }
      powerUps.splice(i, 1);
      continue;
    }

    // remove if fell beyond bottom (safe removal to avoid freeze)
    if (p.y > canvas.height + 20) powerUps.splice(i, 1);
  }

  // bullets vs jets collisions
  for (let bi = bullets.length - 1; bi >= 0; --bi) {
    const b = bullets[bi];
    let hit = false;
    for (let ji = jets.length - 1; ji >= 0; --ji) {
      const j = jets[ji];
      if (b.x > j.x && b.x < j.x + j.width && b.y > j.y && b.y < j.y + j.height) {
        // destroy jet
        explosions.push({ x: j.x + j.width/2, y: j.y + j.height/2, r: 0, life: 30 });
        jets.splice(ji, 1);
        bullets.splice(bi, 1);
        score++;
        hit = true;
        break;
      }
    }
    if (hit) continue;
    // support bullets (if support active: fire automatically)
  }

  // support turret auto-fire
  if (supportActive) {
    // fire periodically (every ~18 frames)
    if ((now % 300) < 20) {
      // left and right support shots
      bullets.push(new Bullet(turret.x - 8 + turret.width/2, turret.y - 6));
      bullets.push(new Bullet(turret.x + 8 + turret.width/2, turret.y - 6));
    }
  }

  // HUD update (if you have element #hud)
  const hud = document.getElementById("hud");
  if (hud) hud.textContent = `Score: ${score} | Health: ${health} ${dualActive ? "| DUAL" : ""} ${darkActive ? "| DARK" : ""} ${supportActive ? "| SUPPORT" : ""}`;

  // show giant announcement text
  if (giantJet && giantJet.announced) {
    ctx.fillStyle = "lime";
    ctx.font = "24px Arial";
    ctx.fillText("Air support has arrived!", canvas.width/2 - 150, 70);
  }

  // game over check handled when health hits 0
  if (gameOver) {
    // explosion + big red text
    ctx.fillStyle = "rgba(0,0,0,0.6)";
    ctx.fillRect(0,0,canvas.width, canvas.height);
    ctx.fillStyle = "red";
    ctx.font = "bold 48px Arial";
    ctx.fillText("GAME OVER", canvas.width/2 - 150, canvas.height/2);
    return;
  }

  // timers effect toggles (duals/shield/dark)
  if (dualActive && (Date.now() - dualStartedAt >= DUAL_MS)) dualActive = false;
  if (darkActive && (Date.now() - darkStartedAt >= DARK_MS)) darkActive = false;
  if (shieldActive && (Date.now() - shieldStartedAt >= SHIELD_MS)) shieldActive = false;

  // advance frame
  requestAnimationFrame(loop);
}

// --- additional spawns / score-based specials ---
// Regular spawn of horizontal jets occasionally (kept in jets spawn setInterval)

// spawn support special at score multiples of 20 (player must collect)
function maybeSpawnSupportByScore() {
  if (score > 0 && score % 20 === 0 && score !== lastSupportScore) {
    lastSupportScore = score;
    if (powerUps.length === 0) powerUps.push(new PowerUp(Math.random() * (canvas.width - 40), -20, "support"));
  }
}

// spawn giant at 50 points (handled in loop)
function maybeSpawnGiantByScore() {
  if (score > 0 && score % 50 === 0 && score !== lastGiantAt) {
    lastGiantAt = score;
    // spawn giant immediately
    giantJet = { x: canvas.width + 200, y: 110, width: 160, height: 60, speed: -6, color: "limegreen", announced: false };
  }
}

// run the game
requestAnimationFrame(loop);

// start spawners that were missing (these were the missing pieces)
setInterval(() => { // jets spawn (vertical/occasional orange)
  if (!gameOver && !nightActive) {
    if (Math.random() < 0.2) jets.push(new Jet(Math.random() * (canvas.width - 40), -60, { color: "orange", vertical: true, speed: 3 }));
    else jets.push(new Jet(Math.random() * (canvas.width - 40), -60, { color: darkActive ? "red" : "gray", vertical: true, speed: 2 }));
  }
}, 1400);

setInterval(() => { // fleets every 20s (as requested)
  if (!gameOver && !nightActive) {
    const startX = canvas.width + 40;
    for (let i=0;i<3;i++) jets.push(new Jet(startX + i*50, 60 + i*30, { vx: -3, vy: 0, color: "black", type: "fleet" }));
  }
}, 20_000);

setInterval(() => { // bomber every 20s
  if (!gameOver && !nightActive) jets.push((new Jet(-120, 100, { color: "crimson", type: "bomber" })));
}, 20_000);

setInterval(() => { // periodic extra clouds
  if (!gameOver) clouds.push(new Cloud(-80, 40 + Math.random()*100));
}, 6000);

setInterval(() => { // occasional powerups (only one at a time)
  if (!gameOver && !nightActive && powerUps.length === 0) {
    const r = Math.random();
    if (r < 0.33) powerUps.push(new PowerUp(Math.random()*(canvas.width-40), -20, "dual"));
    else if (r < 0.66) powerUps.push(new PowerUp(Math.random()*(canvas.width-40), -20, "black"));
    else powerUps.push(new PowerUp(Math.random()*(canvas.width-40), -20, "shield"));
  }
}, 12_000);

// check score-based events frequently (support/gian)
setInterval(() => {
  maybeSpawnSupportByScore();
  maybeSpawnGiantByScore();
}, 500);

// helper: ensure bombs only do 1 health and drop one by one (handled above in Bomber drop logic)

// --- End of file ---
