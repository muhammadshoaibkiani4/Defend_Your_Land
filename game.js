const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

let player = { x: canvas.width / 2, y: canvas.height - 40, width: 50, height: 30 };
let missiles = [];
let jets = [];
let bombs = [];
let score = 0;
let health = 3;
let streak = 0;
let gameOver = false;

// Controls
let keys = {};
document.addEventListener("keydown", (e) => keys[e.code] = true);
document.addEventListener("keyup", (e) => keys[e.code] = false);

document.addEventListener("keydown", (e) => {
  if (e.code === "Space" && !gameOver) {
    missiles.push({ x: player.x, y: player.y, r: 4 });
  }
  if (e.code === "Enter" && gameOver) restartGame();
});

function restartGame() {
  score = 0;
  health = 3;
  streak = 0;
  missiles = [];
  jets = [];
  bombs = [];
  gameOver = false;
  loop();
}

// Jet spawner
function spawnJet() {
  const x = Math.random() * (canvas.width - 60);
  jets.push({ x, y: 30, width: 50, height: 20, speed: Math.random() > 0.5 ? 2 : -2 });
}
setInterval(spawnJet, 2000);

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

    // Drop bombs
    if (Math.random() < 0.01) {
      bombs.push({ x: jet.x + jet.width / 2, y: jet.y + jet.height, r: 5 });
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
          jets = []; // nuke wipes out all jets
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

  // Draw scene
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Sky + Grass
  ctx.fillStyle = "#87ceeb";
  ctx.fillRect(0, 0, canvas.width, canvas.height - 50);
  ctx.fillStyle = "#228B22";
  ctx.fillRect(0, canvas.height - 50, canvas.width, 50);

  // Player (turret)
  ctx.fillStyle = "darkgreen";
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

  // HUD
  document.getElementById("hud").textContent =
    `Score: ${score} | Health: ${health} | Streak: ${streak}`;

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
