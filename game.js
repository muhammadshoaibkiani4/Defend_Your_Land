const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

canvas.width = 800;
canvas.height = 600;

let keys = {};
let bullets = [];
let jets = [];
let bombs = [];
let powerUps = [];
let boss = null;

let score = 0;
let health = 10;
let gameOver = false;
let bossDefeated = false;

// Timers
let jetSpawnTimer = 0;
let bomberSpawnTimer = 0;
let fleetSpawnTimer = 0;
let nightTimer = 0;
let powerUpSpawnTimer = 0;

// Assets
function drawTurret(x, y, shielded) {
  ctx.fillStyle = shielded ? "gold" : "green";
  ctx.fillRect(x - 20, y - 20, 40, 40); 
  ctx.fillStyle = "gray";
  ctx.fillRect(x - 5, y - 40, 10, 20);
}

function drawJet(jet) {
  ctx.fillStyle = jet.color;
  ctx.beginPath();
  ctx.moveTo(jet.x, jet.y);
  ctx.lineTo(jet.x - 15, jet.y + 30);
  ctx.lineTo(jet.x + 15, jet.y + 30);
  ctx.closePath();
  ctx.fill();
}

function drawBoss(boss) {
  ctx.fillStyle = "red";
  ctx.beginPath();
  ctx.moveTo(boss.x, boss.y);
  ctx.lineTo(boss.x - 50, boss.y + 50);
  ctx.lineTo(boss.x + 50, boss.y + 50);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "black";
  ctx.fillRect(boss.x - 10, boss.y + 20, 20, 30);
}

function drawHealthBar() {
  ctx.fillStyle = "black";
  ctx.fillRect(20, 20, 200, 20);
  ctx.fillStyle = "lime";
  ctx.fillRect(20, 20, (health / 10) * 200, 20);
  ctx.strokeStyle = "white";
  ctx.strokeRect(20, 20, 200, 20);
}

function drawBossHealthBar() {
  if (boss) {
    ctx.fillStyle = "black";
    ctx.fillRect(canvas.width / 2 - 150, 20, 300, 20);
    ctx.fillStyle = "red";
    ctx.fillRect(
      canvas.width / 2 - 150,
      20,
      (boss.health / 20) * 300,
      20
    );
    ctx.strokeStyle = "white";
    ctx.strokeRect(canvas.width / 2 - 150, 20, 300, 20);
  }
}

function spawnJet() {
  let colors = ["blue", "orange", "yellow"];
  let color = colors[Math.floor(Math.random() * colors.length)];
  jets.push({
    x: Math.random() * (canvas.width - 30) + 15,
    y: -30,
    width: 30,
    height: 30,
    color: color,
    speed: 2,
  });
}

function spawnBoss() {
  boss = {
    x: canvas.width / 2,
    y: 50,
    width: 100,
    height: 50,
    color: "red",
    health: 20,
  };
}

function resetGame() {
  keys = {};
  bullets = [];
  jets = [];
  bombs = [];
  powerUps = [];
  boss = null;

  score = 0;
  health = 10;
  gameOver = false;
  bossDefeated = false;

  document.getElementById("restartBtn").style.display = "none";
}

// Player
let player = {
  x: canvas.width / 2,
  y: canvas.height - 60,
  speed: 5,
  shielded: false,
};

function update() {
  if (gameOver || bossDefeated) return;

  // Player movement
  if (keys["ArrowLeft"] && player.x > 20) player.x -= player.speed;
  if (keys["ArrowRight"] && player.x < canvas.width - 20) player.x += player.speed;

  // Bullets
  bullets.forEach((bullet, i) => {
    bullet.y -= bullet.speed;
    if (bullet.y < 0) bullets.splice(i, 1);

    // Jets collision
    jets.forEach((jet, j) => {
      if (
        bullet.x > jet.x - 15 &&
        bullet.x < jet.x + 15 &&
        bullet.y > jet.y &&
        bullet.y < jet.y + 30
      ) {
        bullets.splice(i, 1);
        jets.splice(j, 1);
        score++;
      }
    });

    // Boss collision
    if (boss) {
      if (
        bullet.x > boss.x - 50 &&
        bullet.x < boss.x + 50 &&
        bullet.y > boss.y &&
        bullet.y < boss.y + 50
      ) {
        bullets.splice(i, 1);
        boss.health--;
        if (boss.health <= 0) {
          bossDefeated = true;
          document.getElementById("restartBtn").style.display = "block";
        }
      }
    }
  });

  // Jets movement
  jets.forEach((jet, j) => {
    jet.y += jet.speed;
    if (jet.y > canvas.height) {
      // Orange and yellow jets deal damage if they reach ground
      if (jet.color === "orange" || jet.color === "yellow") {
        if (!player.shielded) health--;
      }
      jets.splice(j, 1);
    }

    if (
      jet.x > player.x - 20 &&
      jet.x < player.x + 20 &&
      jet.y + 30 > player.y - 20
    ) {
      if (!player.shielded) health--;
      jets.splice(j, 1);
    }
  });

  // Spawn jets
  jetSpawnTimer++;
  if (jetSpawnTimer > 60) {
    spawnJet();
    jetSpawnTimer = 0;
  }

  // Boss appears at 500 points
  if (score >= 500 && !boss) {
    spawnBoss();
  }

  // Check game over
  if (health <= 0) {
    gameOver = true;
    document.getElementById("restartBtn").style.display = "block";
  }
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Background
  ctx.fillStyle = "skyblue";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "green";
  ctx.fillRect(0, canvas.height - 50, canvas.width, 50);

  // Player
  drawTurret(player.x, player.y, player.shielded);

  // Bullets
  ctx.fillStyle = "red";
  bullets.forEach((bullet) => {
    ctx.fillRect(bullet.x - 2, bullet.y, 4, 10);
  });

  // Jets
  jets.forEach((jet) => drawJet(jet));

  // Boss
  if (boss) {
    drawBoss(boss);
    drawBossHealthBar();
  }

  // Health
  drawHealthBar();

  // Score
  ctx.fillStyle = "black";
  ctx.font = "20px Arial";
  ctx.fillText("Score: " + score, canvas.width - 120, 40);

  // Game over / Victory
  if (gameOver) {
    ctx.fillStyle = "red";
    ctx.font = "40px Arial";
    ctx.fillText("GAME OVER", canvas.width / 2 - 120, canvas.height / 2);
  }
  if (bossDefeated) {
    ctx.fillStyle = "lime";
    ctx.font = "40px Arial";
    ctx.fillText("VICTORY!", canvas.width / 2 - 100, canvas.height / 2);
  }
}

function gameLoop() {
  update();
  draw();
  requestAnimationFrame(gameLoop);
}

document.addEventListener("keydown", (e) => {
  keys[e.key] = true;
  if (e.key === " " && !gameOver && !bossDefeated) {
    bullets.push({ x: player.x, y: player.y - 30, speed: 7 });
  }
});

document.addEventListener("keyup", (e) => {
  keys[e.key] = false;
});

// Restart button
document.getElementById("restartBtn").addEventListener("click", resetGame);

gameLoop();
