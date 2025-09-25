const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

canvas.width = 800;
canvas.height = 600;

// Game State
let turret, bullets, jets, explosions, clouds, powerups, score, health, gameOver, activePowerups, airSupportActive, airSupportTimer;

// Restart button
const restartBtn = document.getElementById("restartBtn");
restartBtn.addEventListener("click", startGame);

// Classes
class Turret {
  constructor() {
    this.x = canvas.width / 2;
    this.y = canvas.height - 60;
    this.width = 50;
    this.height = 60;
    this.color = "darkgreen";
    this.fireRate = 500; // ms
    this.lastShot = 0;
  }
  draw() {
    ctx.fillStyle = this.color;
    ctx.fillRect(this.x - 20, this.y, 40, 40); // base
    ctx.fillRect(this.x - 10, this.y - 20, 20, 20); // cannon
  }
  shoot() {
    const now = Date.now();
    if (now - this.lastShot > this.fireRate) {
      bullets.push(new Bullet(this.x, this.y - 30));
      if (activePowerups.includes("doubleTurret")) {
        bullets.push(new Bullet(this.x - 25, this.y - 30));
        bullets.push(new Bullet(this.x + 25, this.y - 30));
      }
      this.lastShot = now;
    }
  }
}

class Bullet {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.width = 5;
    this.height = 15;
    this.color = "yellow";
  }
  update() {
    this.y -= 6;
  }
  draw() {
    ctx.fillStyle = this.color;
    ctx.fillRect(this.x - 2, this.y, this.width, this.height);
  }
}

class Jet {
  constructor() {
    this.x = Math.random() * (canvas.width - 60);
    this.y = -40;
    this.width = 60;
    this.height = 30;
    this.color = "gray";
    this.speed = 2;
  }
  update() {
    this.y += this.speed;
    if (this.y > canvas.height) {
      health--;
      this.remove = true;
    }
  }
  draw() {
    ctx.fillStyle = this.color;
    ctx.fillRect(this.x, this.y, this.width, this.height);
    ctx.fillStyle = "black";
    ctx.fillRect(this.x + 20, this.y - 10, 20, 10); // cockpit
  }
}

class Explosion {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.radius = 0;
    this.maxRadius = 30;
  }
  update() {
    this.radius += 2;
    if (this.radius > this.maxRadius) this.remove = true;
  }
  draw() {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = "orange";
    ctx.fill();
  }
}

class Cloud {
  constructor() {
    this.x = Math.random() * canvas.width;
    this.y = Math.random() * 200;
    this.speed = 0.5;
  }
  update() {
    this.x -= this.speed;
    if (this.x < -50) this.x = canvas.width + 50;
  }
  draw() {
    ctx.fillStyle = "white";
    ctx.beginPath();
    ctx.arc(this.x, this.y, 20, 0, Math.PI * 2);
    ctx.arc(this.x + 25, this.y, 20, 0, Math.PI * 2);
    ctx.arc(this.x + 50, this.y, 20, 0, Math.PI * 2);
    ctx.fill();
  }
}

class Powerup {
  constructor(type) {
    this.x = Math.random() * (canvas.width - 30);
    this.y = -30;
    this.type = type;
    this.width = 20;
    this.height = 20;
  }
  update() {
    this.y += 2;
  }
  draw() {
    ctx.fillStyle = this.type === "doubleTurret" ? "yellow" : this.type === "nightMode" ? "black" : "blue";
    ctx.fillRect(this.x, this.y, this.width, this.height);
  }
}

function startGame() {
  turret = new Turret();
  bullets = [];
  jets = [];
  explosions = [];
  clouds = [new Cloud(), new Cloud(), new Cloud()];
  powerups = [];
  score = 0;
  health = 10;
  gameOver = false;
  activePowerups = [];
  airSupportActive = false;
  airSupportTimer = 0;
  restartBtn.style.display = "none";
  animate();
}

function spawnJets() {
  if (Math.random() < 0.02) jets.push(new Jet());
}

function spawnPowerups() {
  if (Math.random() < 0.002) {
    const types = ["doubleTurret", "nightMode", "airSupport"];
    const type = types[Math.floor(Math.random() * types.length)];
    powerups.push(new Powerup(type));
  }
}

function drawHUD() {
  ctx.fillStyle = "red";
  ctx.fillRect(20, 20, health * 20, 20);
  ctx.strokeStyle = "white";
  ctx.strokeRect(20, 20, 200, 20);

  ctx.fillStyle = "white";
  ctx.font = "20px Courier New";
  ctx.fillText("Score: " + score, canvas.width - 150, 40);
}

function gameOverScreen() {
  explosions.push(new Explosion(turret.x, turret.y));
  ctx.fillStyle = "red";
  ctx.font = "40px Courier New";
  ctx.fillText("GAME OVER", canvas.width / 2 - 120, canvas.height / 2);
  restartBtn.style.display = "inline-block";
}

function animate() {
  if (gameOver) {
    gameOverScreen();
    return;
  }

  // BG
  ctx.fillStyle = activePowerups.includes("nightMode") ? "black" : "skyblue";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = activePowerups.includes("nightMode") ? "grey" : "green";
  ctx.fillRect(0, canvas.height - 100, canvas.width, 100);

  clouds.forEach(c => { c.update(); c.draw(); });

  // Entities
  turret.draw();
  bullets.forEach(b => { b.update(); b.draw(); });
  jets.forEach(j => { j.update(); j.draw(); });
  explosions.forEach(e => { e.update(); e.draw(); });
  powerups.forEach(p => { p.update(); p.draw(); });

  // Collisions
  bullets.forEach(b => {
    jets.forEach(j => {
      if (b.x < j.x + j.width && b.x + b.width > j.x && b.y < j.y + j.height && b.y + b.height > j.y) {
        j.remove = true;
        b.remove = true;
        explosions.push(new Explosion(j.x + j.width / 2, j.y + j.height / 2));
        score++;
      }
    });
  });

  powerups.forEach(p => {
    if (turret.x < p.x + p.width && turret.x + turret.width > p.x && turret.y < p.y + p.height && turret.y + turret.height > p.y) {
      if (p.type === "doubleTurret") {
        activePowerups.push("doubleTurret");
        setTimeout(() => activePowerups = activePowerups.filter(a => a !== "doubleTurret"), 10000);
      } else if (p.type === "nightMode") {
        activePowerups.push("nightMode");
        turret.fireRate = 250;
        setTimeout(() => {
          activePowerups = activePowerups.filter(a => a !== "nightMode");
          turret.fireRate = 500;
        }, 10000);
      } else if (p.type === "airSupport") {
        airSupportActive = true;
        airSupportTimer = Date.now();
      }
      p.remove = true;
    }
  });

  if (airSupportActive) {
    jets.forEach(j => { j.remove = true; explosions.push(new Explosion(j.x, j.y)); });
    ctx.fillStyle = "lightgreen";
    ctx.fillText("AIR SUPPORT ACTIVE!", canvas.width / 2 - 100, 80);
    if (Date.now() - airSupportTimer > 5000) airSupportActive = false;
  }

  // Clean up
  bullets = bullets.filter(b => !b.remove && b.y > 0);
  jets = jets.filter(j => !j.remove);
  explosions = explosions.filter(e => !e.remove);
  powerups = powerups.filter(p => !p.remove);

  // Spawn
  spawnJets();
  spawnPowerups();

  drawHUD();

  if (health <= 0) {
    gameOver = true;
  } else {
    requestAnimationFrame(animate);
  }
}

// Controls
window.addEventListener("keydown", e => {
  if (e.code === "ArrowLeft" && turret.x > 40) turret.x -= 20;
  if (e.code === "ArrowRight" && turret.x < canvas.width - 40) turret.x += 20;
  if (e.code === "Space") turret.shoot();
});

startGame();
