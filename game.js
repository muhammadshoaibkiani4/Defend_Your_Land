const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

let player, missiles, jets, orangeJets, bombs, score, health, streak, gameOver, explosions;
let powerUp, dualMode, powerTimer;
let blackPower, darkMode, blackTimer;
let clouds = [];

function init() {
  player = { x: canvas.width / 2, y: canvas.height - 40, width: 40, height: 30 };
  missiles = [];
  jets = [];
  orangeJets = []; // NEW orange jets
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
setInterval(spawnJet, 3000);

// Orange jet spawner (NEW)
function spawnOrangeJet() {
  if (gameOver) return;
  const x = Math.random() * (canvas.width - 60);
  orangeJets.push({ x, y: 30, width: 50, height: 20, speed: 2 });
}
setInterval(spawnOrangeJet, 5000);

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

// Game loop
function loop() {
  // Stop rendering after game over (only final explosion + text)
  if (gameOver) {
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (explosions.length === 0) {
      createExplosion(player.x, player.y, true);
    }

    explosions.forEach((ex, i) => {
      ex.r += ex.grow;
      ex.alpha -= 0.05;
      if (ex.alpha <= 0) explosions.splice(i, 1);

      ctx.fillStyle = `rgba(255,69,0,${ex.alpha})`;
      ctx.beginPath();
      ctx.arc(ex.x, ex.y, ex.r, 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.fillStyle = "red";
    ctx.font = "bold 40px Arial";
    ctx.fillText("GAME OVER", canvas.width / 2 - 120, canvas.height / 2);
    return;
  }

  // Player movement
  if (keys["ArrowLeft"] && player.x > 30) player.x -= 5;
  if (keys["ArrowRight"] && player.x < canvas.width - 30) player.x += 5;

  // Missiles
  missiles.forEach((m, i) => {
    m.y -= darkMode ? 12 : 6;
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

  // Orange jets (straight down)
  orangeJets.forEach((jet, i) => {
    jet.y += jet.speed;
    if (jet.y > canvas.height - 50) {
      orangeJets.splice(i, 1);
      health--;
      streak = 0;
      if (health <= 0) gameOver = true;
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

  // Power-up collisions
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

  if (dualMode && --powerTimer <= 0) dualMode = false;
  if (darkMode && --blackTimer <= 0) darkMode = false;

  // Missile hits normal jets
  missiles.forEach((m, mi) => {
    jets.forEach((jet, ji) => {
      if (m.x > jet.x && m.x < jet.x + jet.width && m.y > jet.y && m.y < jet.y + jet.height) {
        createExplosion(jet.x + jet.width / 2, jet.y + jet.height / 2);
        jets.splice(ji, 1);
        missiles.splice(mi, 1);
        score++;
        streak++;
        if (streak >= 5) {
          jets = [];
          orangeJets = [];
          streak = 0;
        }
      }
    });
  });

  // Missile hits orange jets
  missiles.forEach((m, mi) => {
    orangeJets.forEach((jet, ji) => {
      if (m.x > jet.x && m.x < jet.x + jet.width && m.y > jet.y && m.y < jet.y + jet.height) {
        createExplosion(jet.x + jet.width / 2, jet.y + jet.height / 2);
        orangeJets.splice(ji, 1);
        missiles.splice(mi, 1);
        score++;
        streak++;
        if (streak >= 5) {
          jets = [];
          orangeJets = [];
          streak = 0;
        }
      }
    });
  });

  // Bomb hits
  bombs.forEach((b, bi) => {
    if (b.x > player.x - 20 && b.x < player.x + 20 && b.y > player.y - 20 && b.y < player.y + 20) {
      bombs.splice(bi, 1);
      health--;
      streak = 0;
      if (health <= 0) gameOver = true;
    }
  });

  // Background
  ctx.fillStyle = darkMode ? "black" : "skyblue";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = darkMode ? "grey" : "green";
  ctx.fillRect(0, canvas.height - 50, canvas.width, 50);

  // Title
  ctx.fillStyle = "white";
  ctx.font = "bold 28px Arial";
  ctx.fillText("DEFEND YOUR LAND", canvas.width / 2 - 150, 40);

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

  // Jets
  ctx.fillStyle = darkMode ? "red" : "gray";
  jets.forEach(jet => {
    ctx.fillRect(jet.x + 15, jet.y, 20, 20);
    ctx.fillRect(jet.x, jet.y + 5, 50, 5);
    ctx.fillRect(jet.x + 20, jet.y + 20, 10, 10);
  });

  // Orange Jets (NEW)
  ctx.fillStyle = "orange";
  orangeJets.forEach(jet => {
    ctx.fillRect(jet.x + 15, jet.y, 20, 20);
    ctx.fillRect(jet.x, jet.y + 5, 50, 5);
    ctx.fillRect(jet.x + 20, jet.y + 20, 10, 10);
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
    ctx.strokeStyle = "white";
    ctx.stroke();
  }

  // Explosions
  explosions.forEach((ex, i) => {
    ex.r += ex.grow || 2;
    ex.alpha -= 0.05;
    if (ex.alpha <= 0) explosions.splice(i, 1);
    ctx.fillStyle = `rgba(255,165,0,${ex.alpha})`;
    ctx.beginPath();
    ctx.arc(ex.x, ex.y, ex.r, 0, Math.PI * 2);
    ctx.fill();
  });

  // HUD
  document.getElementById("hud").textContent =
    `Score: ${score} | Health: ${health} | Streak: ${streak} ${dualMode ? "| BLUE POWER-UP" : ""} ${darkMode ? "| BLACK POWER-UP" : ""}`;

  // Health bar
  ctx.fillStyle = "black";
  ctx.fillRect(20, 20, 104, 14);
  ctx.fillStyle = "limegreen";
  ctx.fillRect(22, 22, health * 10, 10);

  requestAnimationFrame(loop);
}

loop();
