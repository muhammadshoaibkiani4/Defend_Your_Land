// game.js — updated: night healing fixed + proper jet shapes + support turret shooting
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
let lastNightHeal = 0; // <--- for gradual healing

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
Bullet.prototype.update = function () { this.y -= this.speed; };
Bullet.prototype.draw = function () {
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
  this.vx = opts.vx ?? 0;
  this.vy = opts.vy ?? (opts.vertical ? (opts.speed || 3) : (opts.speed || 2));
  this.type = opts.type || "jet";
  this.bombTimer = 0;
}
Jet.prototype.update = function () {
  this.x += this.vx;
  this.y += this.vy;
};
Jet.prototype.draw = function () {
  ctx.fillStyle = this.color || (darkActive ? "red" : "gray");
  ctx.beginPath();
  ctx.moveTo(this.x + this.width / 2, this.y);
  ctx.lineTo(this.x, this.y + this.height);
  ctx.lineTo(this.x + this.width, this.y + this.height);
  ctx.closePath();
  ctx.fill();
};

// bomber with triangle body
function Bomber() {
  this.x = -120;
  this.y = 100;
  this.width = 80;
  this.height = 60;
  this.speed = 2;
  this.color = "crimson";
  this.dropCooldown = 0;
}
Bomber.prototype.update = function () {
  this.x += this.speed;
  if (this.dropCooldown <= 0 && this.x > 0 && this.x < canvas.width - this.width) {
    bombs.push(new Bomb(this.x + this.width / 2, this.y + this.height));
    this.dropCooldown = 300;
  } else {
    this.dropCooldown--;
  }
};
Bomber.prototype.draw = function () {
  ctx.fillStyle = this.color;
  ctx.beginPath();
  ctx.moveTo(this.x + this.width / 2, this.y);
  ctx.lineTo(this.x, this.y + this.height);
  ctx.lineTo(this.x + this.width, this.y + this.height);
  ctx.closePath();
  ctx.fill();
};

function Bomb(x, y) {
  this.x = x;
  this.y = y;
  this.r = 6;
  this.speed = 4;
  this.exploded = false;
}
Bomb.prototype.update = function () {
  this.y += this.speed;
  if (this.y >= canvas.height - 50 - this.r && !this.exploded) {
    this.exploded = true;
    explosions.push({ x: this.x, y: canvas.height - 50, r: 0, life: 30 });
    if (!shieldActive) {
      health = Math.max(0, health - 1);
      if (health <= 0) triggerGameOver();
    }
  }
};
Bomb.prototype.draw = function () {
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
  this.type = type;
  this.speed = 2;
}
PowerUp.prototype.update = function () { this.y += this.speed; };
PowerUp.prototype.draw = function () {
  if (this.type === "dual") ctx.fillStyle = "blue";
  else if (this.type === "black") ctx.fillStyle = "black";
  else if (this.type === "shield") ctx.fillStyle = "gold";
  else if (this.type === "support") ctx.fillStyle = "limegreen";
  ctx.fillRect(this.x, this.y, this.size, this.size);
};

function Cloud(x, y) {
  this.x = x; this.y = y; this.speed = 0.5 + Math.random();
}
Cloud.prototype.update = function () {
  this.x += this.speed;
  if (this.x > canvas.width + 60) this.x = -80;
};
Cloud.prototype.draw = function () {
  ctx.fillStyle = "white";
  ctx.beginPath();
  ctx.arc(this.x, this.y, 18, 0, Math.PI * 2);
  ctx.arc(this.x + 22, this.y + 8, 22, 0, Math.PI * 2);
  ctx.arc(this.x - 22, this.y + 8, 22, 0, Math.PI * 2);
  ctx.fill();
};

// --- helpers ---
function triggerGameOver() {
  gameOver = true;
  explosions.push({ x: turret.x + turret.width / 2, y: turret.y + 10, r: 0, life: 80 });
}

// --- loop ---
function loop() {
  const now = Date.now();

  // --- night handling ---
  if (!nightActive && (now - lastNightAt) >= NIGHT_INTERVAL_MS) {
    nightActive = true;
    nightStartedAt = now;
    lastNightAt = now;
    lastNightHeal = now;
    jets = [];
    bombs = [];
    powerUps = [];
  }
  if (nightActive) {
    if (now - lastNightHeal >= 2000) { // heal every 2s
      health = Math.min(10, health + 1);
      lastNightHeal = now;
    }
    if (now - nightStartedAt >= NIGHT_DURATION_MS) {
      nightActive = false;
    }
  }

  // --- dark power, shield, etc timers ---
  if (darkActive && (now - darkStartedAt) >= DARK_MS) darkActive = false;
  if (dualActive && (now - dualStartedAt) >= DUAL_MS) dualActive = false;
  if (shieldActive && (now - shieldStartedAt) >= SHIELD_MS) shieldActive = false;
  if (supportActive && (now - supportStartedAt) >= SUPPORT_MS) supportActive = false;

  // movement, background, etc. (rest of your loop unchanged)...

  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);
