const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

let player, missiles, jets, bombs, score, health, streak, gameOver, powerUp, dualMode, powerTimer;
let clouds = [];

function init() {
  player = { x: canvas.width / 2, y: canvas.height - 40, width: 50, height: 30 };
  missiles = [];
  jets = [];
  bombs = [];
  score = 0;
  health = 10;
  streak = 0;
  gameOver = false;
  powerUp = null;
  dualMode = false;
  powerTimer = 0;

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
  if (e.code === "Enter" && gameOver) {
    init();
    loop();
  }
});

// Jet spawner
function spawnJet() {
  if (gameOver) return;
  const x = Math.random() * (canvas.width - 60);
  jets.push({ x, y: 30, width: 50, height: 20, speed: Math.random() > 0.5 ? 2 : -2, dropped: false });
}
setInterval(spawnJet, 2500);

// Power-up spawner
function spawnPowerUp() {
  if (gameOver) return;
  if (Math.random() < 0.3) { // 30% chance
    powerUp = { x: Math.random() * (canvas.width - 20), y: 50, r: 10 };
  }
}
setInterval(spawnPowerUp, 10000);

// Game loop
function loop() {
  if (gameOver) return;

  // Move player
  if (keys["ArrowLeft"] && player.x > 30) player.x -= 5;
  if (keys["ArrowRight"] && player.x < canvas.width - 30) player.x += 5;

  // Move missiles
  missiles.forEach((m, i) => {
    m.y -= 6;
    if (m.y < 0) missiles.splice(i, 1);
  });

  // Move jets
  jets.forEach((jet, i) => {
    jet.x += jet.speed;
    if (jet.x < 0 || jet.x + jet.width > canvas.width) jet.speed *= -1;

    if (!jet.dropped && Math.random() < 0.002) {
      bombs.push({ x: jet.x + jet.width / 2, y: jet.y + jet.height, r: 5 });
      jet.dropped = true;
    }
  });

  // Move bombs
  bombs.forEach((b, i) => {
    b.y += 4;
    if (b.y > canvas.height - 50) {
      bombs.splice(i, 1);
      health--;
      streak = 0;
      if (health <= 0) gameOver = true;
    }
  });

  // Power-up movement
  if (powerUp) {
    powerUp.y += 2;
    if (powerUp.y > canvas.height - 50) powerUp = null;
    // Pickup detection
    if (Math.abs(powerUp.x - player.x) < 25 && Math.abs(powerUp.y - player.y) < 20) {
      dualMode = true;
      powerTimer = 600; // ~10 seconds at 60 FPS
      powerUp = null;
    }
  }

  // Decrease power-up timer
  if (dualMode) {
    powerTimer--;
    if (powerTimer <= 0) dualMode = false;
  }

  // Missile-Jet collision
  missiles.forEach((m, mi) => {
    jets.forEach((jet, ji) => {
      if (m.x > jet.x && m.x < jet.x + jet.width &&
          m.y > jet.y && m.y < jet.y + jet.height) {
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

  // Bomb-Player collision
  bombs.forEach((b, bi) => {
    if (b.x > player.x - 20 && b.x < player.x + 20 &&
        b.y > player.y - 20 && b.y < player.y + 20) {
      bombs.splice(bi, 1);
      health--;
      streak = 0;
      if (health <= 0) gameOver = true;
    }
  });

  // Draw background (sky + grass)
  let sky = ctx.createLinearGradient(0, 0, 0, canvas.height);
  sky.addColorStop(0, "#87CEEB");
  sky.addColorStop(1, "#2e4e1f");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Grass
  ctx.fillStyle = "#2E8B57";
  ctx.fillRect(0, canvas.height - 50, canvas.width, 50);

  // Clouds
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

  // Player turret
  ctx.fillStyle = dualMode ? "gold" : "darkgreen";
  ctx.beginPath();
  ctx.moveTo(player.x, player.y);
  ctx.lineTo(player.x - 25, player.y + 30);
  ctx.lineTo(player.x + 25, player.y + 30);
  ctx.closePath();
  ctx.fill();

  // Missiles
  ctx.fillStyle = "red";
  missiles.forEach(m => {
    ctx.beginPath();
    ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2);
    ctx.fill();
  });

  // Jets
  ctx.fillStyle = "gray";
  jets.forEach(jet => {
    ctx.beginPath();
    ctx.moveTo(jet.x, jet.y + jet.height);
    ctx.lineTo(jet.x + jet.width / 2, jet.y);
    ctx.lineTo(jet.x + jet.width, jet.y + jet.height);
    ctx.closePath();
    ctx.fill();
  });

  // Bombs
  ctx.fillStyle = "black";
  bombs.forEach(b => {
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
    ctx.fill();
  });

  // Power-up
  if (powerUp) {
    ctx.fillStyle = "blue";
    ctx.beginPath();
    ctx.arc(powerUp.x, powerUp.y, powerUp.r, 0, Math.PI * 2);
    ctx.fill();
  }

  // HUD
  document.getElementById("hud").textContent =
    `Score: ${score} | Streak: ${streak} ${dualMode ? "| POWER-UP ACTIVE" : ""}`;

  // Health bar
  ctx.fillStyle = "black";
  ctx.fillRect(20, 20, 104, 14);
  ctx.fillStyle = "limegreen";
  ctx.fillRect(22, 22, health * 10, 10);

  // Power-up timer bar
  if (dualMode) {
    ctx.fillStyle = "orange";
    ctx.fillRect(canvas.width - 120, 20, powerTimer / 5, 10);
  }

  // Game over
  if (!gameOver) requestAnimationFrame(loop);
  else {
    ctx.fillStyle = "red";
    ctx.font = "40px Arial Black";
    ctx.fillText("GAME OVER", canvas.width / 2 - 120, canvas.height / 2);
    ctx.fillStyle = "white";
    ctx.font = "20px Arial";
    ctx.fillText("Press Enter to Restart", canvas.width / 2 - 110, canvas.height / 2 + 40);
  }
}

loop();
