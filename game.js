const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

let player, missiles, jets, bombs, score, health, streak, gameOver, explosions;
let powerUp, dualMode, powerTimer;
let blackPower, darkMode, blackTimer;
let clouds = [];

function init() {
  player = { x: canvas.width / 2, y: canvas.height - 40, width: 40, height: 30 };
  missiles = [];
  jets = [];
  bombs = [];
  explosions = [];
  score = 0;
  health = 10;
  streak = 0;
  gameOver = false;

  powerUp = null;
  dualMode = false;
  powerTimer = 0;

  blackPower = null;
  darkMode = false;
  blackTimer = 0;

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

// Jet spawner
function spawnJet() {
  if (gameOver) return;
  const x = Math.random() * (canvas.width - 60);
  jets.push({ x, y: 30, width: 50, height: 20, speed: Math.random() > 0.5 ? 2 : -2, dropped: false });
}
setInterval(spawnJet, 2500);

// Power-up spawners
function spawnPowerUp() {
  if (gameOver) return;
  if (Math.random() < 0.3) {
    powerUp = { x: Math.random() * (canvas.width - 20), y: 50, r: 10 };
  }
}
setInterval(spawnPowerUp, 10000);

function spawnBlackPowerUp() {
  if (gameOver) return;
  if (Math.random() < 0.2) {
    blackPower = { x: Math.random() * (canvas.width - 20), y: 50, r: 10 };
  }
}
setInterval(spawnBlackPowerUp, 15000);

// Explosion animation
function createExplosion(x, y) {
  explosions.push({ x, y, r: 5, alpha: 1 });
}

// Game loop
function loop() {
  if (gameOver) return;

  // Move player
  if (keys["ArrowLeft"] && player.x > 30) player.x -= 5;
  if (keys["ArrowRight"] && player.x < canvas.width - 30) player.x += 5;

  // Missiles
  missiles.forEach((m, i) => {
    m.y -= darkMode ? 12 : 6; // faster in dark mode
    if (m.y < 0) missiles.splice(i, 1);
  });

  // Jets
  jets.forEach((jet, i) => {
    jet.x += jet.speed;
    if (jet.x < 0 || jet.x + jet.width > canvas.width) jet.speed *= -1;

    if (!jet.dropped && Math.random() < 0.002) {
      bombs.push({ x: jet.x + jet.width / 2, y: jet.y + jet.height, r: 5 });
      jet.dropped = true;
    }
  });

  // Bombs
  bombs.forEach((b, i) => {
    b.y += 4;
    if (b.y > canvas.height - 50) {
      bombs.splice(i, 1);
      health--;
      streak = 0;
      if (health <= 0) gameOver = true;
    }
  });

  // Power-ups falling
  if (powerUp) {
    powerUp.y += 2;
    if (powerUp.y > canvas.height - 50) powerUp = null;
    if (Math.abs(powerUp.x - player.x) < 25 && Math.abs(powerUp.y - player.y) < 20) {
      dualMode = true;
      powerTimer = 600;
      powerUp = null;
    }
  }
  if (blackPower) {
    blackPower.y += 2;
    if (blackPower.y > canvas.height - 50) blackPower = null;
    if (Math.abs(blackPower.x - player.x) < 25 && Math.abs(blackPower.y - player.y) < 20) {
      darkMode = true;
      blackTimer = 600;
      blackPower = null;
    }
  }

  // Power-up timers
  if (dualMode && --powerTimer <= 0) dualMode = false;
  if (darkMode && --blackTimer <= 0) darkMode = false;

  // Collisions
  missiles.forEach((m, mi) => {
    jets.forEach((jet, ji) => {
      if (m.x > jet.x && m.x < jet.x + jet.width &&
          m.y > jet.y && m.y < jet.y + jet.height) {
        createExplosion(jet.x + jet.width / 2, jet.y + jet.height / 2);
        jets.splice(ji, 1);
        missiles.splice(mi, 1);
        score++;
        streak++;
        if (streak >= 5) {
          jets = [];
          streak = 0;
        }
      }
    });
  });

  bombs.forEach((b, bi) => {
    if (b.x > player.x - 20 && b.x < player.x + 20 &&
        b.y > player.y - 20 && b.y < player.y + 20) {
      bombs.splice(bi, 1);
      health--;
      streak = 0;
      if (health <= 0) gameOver = true;
    }
  });

  // Explosions
  explosions.forEach((ex, i) => {
    ex.r += 2;
    ex.alpha -= 0.05;
    if (ex.alpha <= 0) explosions.splice(i, 1);
  });

  // Background
  ctx.fillStyle = darkMode ? "black" : "skyblue";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = darkMode ? "grey" : "green";
  ctx.fillRect(0, canvas.height - 50, canvas.width, 50);

  // Clouds
  if (!darkMode) {
    ctx.fillStyle = "white";
    clouds.forEach(cloud => {
      ctx.beginPath();
      ctx.arc(cloud.x, cloud.y, 20, 0, Math.PI * 2);
      ctx.arc(cloud.x + 25, cloud.y + 10, 25, 0, Math.PI * 2);
      ctx.arc(cloud.x - 25, cloud.y + 10, 25, 0, Math.PI * 2);
      ctx.fill();
      cloud.x += cloud.speed;
      if (cloud.x > canvas.width + 50) cloud.x = -50;
    });
  }

  // Turret
  ctx.fillStyle = darkMode ? "red" : "darkgreen";
  ctx.fillRect(player.x - 15, player.y, 30, 20); // base
  ctx.fillRect(player.x - 5, player.y - 15, 10, 15); // barrel

  // Missiles
  ctx.fillStyle = "red";
  missiles.forEach(m => {
    ctx.beginPath();
    ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2);
    ctx.fill();
  });

  // Jets (body + wings)
  ctx.fillStyle = darkMode ? "red" : "gray";
  jets.forEach(jet => {
    ctx.fillRect(jet.x + 15, jet.y, 20, 20); // body
    ctx.fillRect(jet.x, jet.y + 5, 50, 5);   // wings
    ctx.fillRect(jet.x + 20, jet.y + 20, 10, 10); // tail
  });

  // Bombs
  ctx.fillStyle = "black";
  bombs.forEach(b => {
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
    ctx.fill();
  });

  // Power-ups
  if (powerUp) {
    ctx.fillStyle = "blue";
    ctx.beginPath();
    ctx.arc(powerUp.x, powerUp.y, powerUp.r, 0, Math.PI * 2);
    ctx.fill();
  }
  if (blackPower) {
    ctx.fillStyle = "black";
    ctx.beginPath();
    ctx.arc(blackPower.x, blackPower.y, blackPower.r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Explosions
  explosions.forEach(ex => {
    ctx.fillStyle = `rgba(255,165,0,${ex.alpha})`;
    ctx.beginPath();
    ctx.arc(ex.x, ex.y, ex.r, 0, Math.PI * 2);
    ctx.fill();
  });

  // HUD
  document.getElementById("hud").textContent =
    `Score: ${score} | Streak: ${streak} ${dualMode ? "| BLUE POWER-UP" : ""} ${darkMode ? "| BLACK POWER-UP" : ""}`;

  // Health bar
  ctx.fillStyle = "black";
  ctx.fillRect(20, 20, 104, 14);
  ctx.fillStyle = "limegreen";
  ctx.fillRect(22, 22, health * 10, 10);

  requestAnimationFrame(loop);
}

loop();
