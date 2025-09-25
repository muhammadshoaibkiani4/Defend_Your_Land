const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

let player, missiles, jets, orangeJets, bombers, bombs, score, health, gameOver, explosions;
let powerUp, dualMode, powerTimer;
let blackPower, darkMode, blackTimer;
let greenPower, airSupport, airSupportTimer;
let clouds = [];

function init() {
  player = { x: canvas.width / 2, y: canvas.height - 40, width: 40, height: 30 };
  missiles = [];
  jets = [];
  orangeJets = [];
  bombers = [];
  bombs = [];
  explosions = [];
  score = 0;
  health = 10;
  gameOver = false;

  powerUp = null;
  dualMode = false;
  powerTimer = 0;

  blackPower = null;
  darkMode = false;
  blackTimer = 0;

  greenPower = null;
  airSupport = false;
  airSupportTimer = 0;

  clouds = [];
  for (let i = 0; i < 5; i++) {
    clouds.push({ x: Math.random() * canvas.width, y: Math.random() * 200, speed: 0.3 + Math.random() });
  }
}

init();

// Controls
let keys = {};
document.addEventListener("keydown", (e) => keys[e.code] = true);
document.addEventListener("keyup", (e) => keys[e.code] = false);

document.addEventListener("keydown", (e) => {
  if (e.code === "Space" && !gameOver) {
    if (dualMode) {
      missiles.push({ x: player.x - 15, y: player.y, r: 4 });
      missiles.push({ x: player.x + 15, y: player.y, r: 4 });
    } else {
      missiles.push({ x: player.x, y: player.y, r: 4 });
    }
  }
});

// ===================== SPAWNERS =====================
function spawnJet() {
  if (gameOver) return;
  const x = Math.random() * (canvas.width - 60);
  jets.push({ x, y: 30, width: 50, height: 20, speed: Math.random() > 0.5 ? 2 : -2, dropped: false });
}
setInterval(spawnJet, 3000);

function spawnOrangeJet() {
  if (gameOver) return;
  const x = Math.random() * (canvas.width - 60);
  orangeJets.push({ x, y: 30, width: 50, height: 20, speed: 1.5, dropped: false });
}
setInterval(spawnOrangeJet, 7000);

function spawnBomber() {
  if (gameOver) return;
  bombers.push({ 
    x: -60, 
    y: 100, 
    width: 60, 
    height: 25, 
    speed: 2, 
    bombsDropped: 0 
  });
}

// Power-ups
function spawnPowerUp() {
  if (gameOver) return;
  if (Math.random() < 0.4) {
    powerUp = { x: Math.random() * (canvas.width - 20), y: 50, r: 10 };
  }
}
setInterval(spawnPowerUp, 12000);

function spawnBlackPowerUp() {
  if (gameOver) return;
  if (Math.random() < 0.4) {
    blackPower = { x: Math.random() * (canvas.width - 20), y: 50, r: 12 };
  }
}
setInterval(spawnBlackPowerUp, 18000);

// Explosion animation
function createExplosion(x, y, big = false) {
  explosions.push({ x, y, r: big ? 15 : 5, alpha: 1, grow: big ? 4 : 2 });
}

// ====================
