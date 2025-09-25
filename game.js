const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

let player, missiles, jets, bombs, score, health, gameOver, explosions;
let powerUp, dualMode, powerTimer;
let blackPower, darkMode, blackTimer;
let greenPower;
let shieldPower, shieldActive, shieldTimer;
let clouds = [];
let stars = [];
let moon = { x: 80, y: 80, r: 40 };
let giantJet = null;

function init() {
  player = { x: canvas.width / 2, y: canvas.height - 40, width: 40, height: 30 };
  missiles = [];
  jets = [];
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

  shieldPower = null;
  shieldActive = false;
  shieldTimer = 0;

  clouds = [];
  for (let i = 0; i < 5; i++) {
    clouds.push({ x: Math.random() * canvas.width, y: Math.random() * 200, speed: 0.3 + Math.random() });
  }

  stars = [];
  for (let i = 0; i < 80; i++) {
    stars.push({ x: Math.random() * canvas.width, y: Math.random() * 200, r: Math.random() * 2 });
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
  const type = Math.random();
  if (type < 0.7) {
    jets.push({ x, y: 30, width: 50, height: 20, speed: Math.random() > 0.5 ? 2 : -2, dropped: false });
  } else {
    // Orange jet
    jets.push({ x: Math.random() * (canvas.width - 40), y: -30, width: 40, height: 20, color: "orange", vertical: true });
  }
}
setInterval(spawnJet, 3000);

// Power-ups
function spawnPowerUp() {
  if (gameOver) return;
  if (Math.random() < 0.4 && !powerUp) {
    powerUp = { x: Math.random() * (canvas.width - 20), y: 50, r: 10 };
  }
}
setInterval(spawnPowerUp, 12000);

function spawnBlackPowerUp() {
  if (gameOver) return;
  if (Math.random() < 0.4 && !blackPower) {
    blackPower = { x: Math.random() * (canvas.width - 20), y: 50, r: 12 };
  }
}
setInterval(spawnBlackPowerUp, 18000);

function spawnShieldPowerUp() {
  if (gameOver) return;
  if (Math.random() < 0.3 && !shieldPower) {
    shieldPower = { x: Math.random() * (canvas.width - 20), y: 50, r: 12 };
  }
}
setInterval(spawnShieldPowerUp, 20000);

// Bomber
function spawnBomber() {
  jets.push({
    x: -80,
    y: 80,
    width: 80,
    height: 40,
    color: "crimson",
    bomber: true,
    bombTimer: 0
  });
}

function checkBomberSpawn() {
  if (score > 0 && score % 20 === 0) {
    let already = jets.some(j => j.bomber);
    if (!already) spawnBomber();
  }
}

// Giant Jet
function spawnGiantJet() {
  giantJet = { x: canvas.width + 200, y: 120, width: 200, height: 80, speed: -6 };
}

function checkGiantJet() {
  if (score > 0 && score % 50 === 0 && !giantJet) {
    spawnGiantJet();
  }
}

// Explosion
function createExplosion(x, y, big = false) {
  explosions.push({ x, y, r: big ? 15 : 5, alpha: 1, grow: big ? 4 : 2 });
}

// Loop
function loop() {
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
    if (jet.bomber) {
      jet.x += 2;
      jet.bombTimer++;
      if (jet.bombTimer % 50 === 0 && jet.x > 0 && jet.x < canvas.width - jet.width) {
        bombs.push({ x: jet.x + jet.width / 2, y: jet.y + jet.height, r: 7 });
      }
    } else if (jet.vertical) {
      jet.y += 3;
      if (jet.y > canvas.height - 50) jets.splice(i, 1);
    } else {
      jet.x += jet.speed;
      if (jet.x < 0 || jet.x + jet.width > canvas.width) jet.speed *= -1;
      if (!jet.dropped && Math.random() < 0.002) {
        bombs.push({ x: jet.x + jet.width / 2, y: jet.y + jet.height, r: 5 });
        jet.dropped = true;
      }
    }
  });

  // Bombs
  bombs.forEach((b, i) => {
    b.y += 4;
    if (b.y > canvas.height - 50) {
      bombs.splice(i, 1);
      if (!shieldActive) {
        health--;
        if (health <= 0) gameOver = true;
      }
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
  if (shieldPower) {
    shieldPower.y += 2;
    if (shieldPower.y > canvas.height - 50) shieldPower = null;
    if (Math.abs(shieldPower.x - player.x) < 25 && Math.abs(shieldPower.y - player.y) < 20) {
      shieldActive = true;
      shieldTimer = 600;
      shieldPower = null;
    }
  }

  if (dualMode && --powerTimer <= 0) dualMode = false;
  if (darkMode && --blackTimer <= 0) darkMode = false;
  if (shieldActive && --shieldTimer <= 0) shieldActive = false;

  // Giant Jet
  if (giantJet) {
    giantJet.x += giantJet.speed;
    jets = []; // kills all jets
    if (giantJet.x + giantJet.width < 0) giantJet = null;
  }

  // Missile hits
  missiles.forEach((m, mi) => {
    jets.forEach((jet, ji) => {
      if (m.x > jet.x && m.x < jet.x + jet.width && m.y > jet.y && m.y < jet.y + jet.height) {
        createExplosion(jet.x + jet.width / 2, jet.y + jet.height / 2);
        jets.splice(ji, 1);
        missiles.splice(mi, 1);
        score++;
      }
    });
  });

  // Bomb hits
  bombs.forEach((b, bi) => {
    if (b.x > player.x - 20 && b.x < player.x + 20 && b.y > player.y - 20 && b.y < player.y + 20) {
      bombs.splice(bi, 1);
      if (!shieldActive) {
        health--;
        if (health <= 0) gameOver = true;
      }
    }
  });

  // Background
  ctx.fillStyle = darkMode ? "black" : "skyblue";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  if (darkMode) {
    // Stars
    ctx.fillStyle = "white";
    stars.forEach(star => {
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
      ctx.fill();
    });
    // Moon
    ctx.fillStyle = "lightyellow";
    ctx.beginPath();
    ctx.arc(moon.x, moon.y, moon.r, 0, Math.PI * 2);
    ctx.fill();
  }

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
  ctx.fillStyle = "darkgreen";
  ctx.fillRect(player.x - 15, player.y, 30, 20);
  ctx.fillRect(player.x - 5, player.y - 15, 10, 15);

  if (shieldActive) {
    ctx.strokeStyle = "gold";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(player.x, player.y, 30, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Missiles
  ctx.fillStyle = "red";
  missiles.forEach(m => {
    ctx.beginPath();
    ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2);
    ctx.fill();
  });

  // Jets
  jets.forEach(jet => {
    ctx.fillStyle = jet.color ? jet.color : (darkMode ? "red" : "gray");
    ctx.fillRect(jet.x + 15, jet.y, 20, 20);
    ctx.fillRect(jet.x, jet.y + 5, 50, 5);
    ctx.fillRect(jet.x + 20, jet.y + 20, 10, 10);
  });

  // Giant Jet
  if (giantJet) {
    ctx.fillStyle = "limegreen";
    ctx.fillRect(giantJet.x, giantJet.y, giantJet.width, giantJet.height);
  }

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
  if (shieldPower) {
    ctx.fillStyle = "gold";
    ctx.beginPath();
    ctx.arc(shieldPower.x, shieldPower.y, shieldPower.r, 0, Math.PI * 2);
    ctx.fill();
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
    `Score: ${score}`;

  // Hearts for Health
  for (let i = 0; i < health; i++) {
    ctx.fillStyle = "red";
    ctx.beginPath();
    ctx.arc(30 + i * 25, 30, 8, 0, Math.PI * 2);
    ctx.arc(40 + i * 25, 30, 8, 0, Math.PI * 2);
    ctx.moveTo(23 + i * 25, 32);
    ctx.lineTo(35 + i * 25, 50);
    ctx.lineTo(47 + i * 25, 32);
    ctx.fill();
  }

  // Check spawns
  checkBomberSpawn();
  checkGiantJet();

  requestAnimationFrame(loop);
}

loop();
