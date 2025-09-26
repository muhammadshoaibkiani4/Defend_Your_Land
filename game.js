const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

canvas.width = 800;
canvas.height = 600;

let keys = {};
let bullets = [];
let jets = [];
let bombers = [];
let fleets = [];
let bombs = [];
let clouds = [];
let powerUps = [];

let score = 0;
let health = 100;
let gameOver = false;

// timers
let lastJetTime = 0;
let lastFleetTime = 0;
let lastNightTime = 0;
let night = false;

// support turret
let supportTurretActive = false;
let supportTurretEnd = 0;

// shield
let shieldActive = false;
let shieldEnd = 0;

// special effects
let explosions = [];

// turret definition
const turret = {
  x: canvas.width / 2 - 20,
  y: canvas.height - 60,
  width: 40,
  height: 60,
  speed: 5,
  draw() {
    ctx.fillStyle = "#444";
    ctx.fillRect(this.x, this.y, this.width, this.height);
    ctx.fillStyle = "#666";
    ctx.fillRect(this.x + 10, this.y - 20, 20, 20); // gun top
    ctx.fillStyle = "#333";
    ctx.fillRect(this.x + 15, this.y - 40, 10, 20); // barrel
    if (shieldActive) {
      ctx.strokeStyle = "gold";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(this.x + this.width / 2, this.y + this.height / 2, 50, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
};

// bullet
class Bullet {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.width = 5;
    this.height = 15;
    this.speed = 7;
  }
  update() {
    this.y -= this.speed;
  }
  draw() {
    ctx.fillStyle = "yellow";
    ctx.fillRect(this.x, this.y, this.width, this.height);
  }
}

// jet enemy
class Jet {
  constructor(x, y, color = "red") {
    this.x = x;
    this.y = y;
    this.width = 40;
    this.height = 40;
    this.color = color;
    this.speed = 2;
  }
  update() {
    this.y += this.speed;
  }
  draw() {
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.moveTo(this.x + this.width / 2, this.y);
    ctx.lineTo(this.x, this.y + this.height);
    ctx.lineTo(this.x + this.width, this.y + this.height);
    ctx.closePath();
    ctx.fill();
  }
}

// bomber enemy
class Bomber {
  constructor() {
    this.x = 0;
    this.y = 100;
    this.width = 60;
    this.height = 30;
    this.speed = 2;
    this.dropCooldown = 100;
    this.color = "crimson";
  }
  update() {
    this.x += this.speed;
    if (this.dropCooldown <= 0) {
      bombs.push(new Bomb(this.x + this.width / 2, this.y + this.height));
      this.dropCooldown = 200;
    } else {
      this.dropCooldown--;
    }
  }
  draw() {
    ctx.fillStyle = this.color;
    ctx.fillRect(this.x, this.y, this.width, this.height);
  }
}

// fleet of jets
class Fleet {
  constructor() {
    this.jets = [
      new Jet(canvas.width, 50, "black"),
      new Jet(canvas.width + 60, 100, "black"),
      new Jet(canvas.width + 120, 150, "black")
    ];
  }
  update() {
    this.jets.forEach(j => {
      j.x -= 3;
    });
  }
  draw() {
    this.jets.forEach(j => j.draw());
  }
}

// bomb dropped by bomber
class Bomb {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.radius = 6;
    this.speed = 4;
  }
  update() {
    this.y += this.speed;
    if (this.y > canvas.height - 30) {
      explosions.push({ x: this.x, y: this.y, radius: 0 });
      if (!shieldActive) health = Math.max(0, health - 10);
    }
  }
  draw() {
    ctx.fillStyle = "black";
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
  }
}

// explosion effect
function drawExplosions() {
  explosions.forEach((e, i) => {
    ctx.fillStyle = "orange";
    ctx.beginPath();
    ctx.arc(e.x, e.y, e.radius, 0, Math.PI * 2);
    ctx.fill();
    e.radius += 2;
    if (e.radius > 20) explosions.splice(i, 1);
  });
}

// powerUp
class PowerUp {
  constructor(x, y, type) {
    this.x = x;
    this.y = y;
    this.size = 20;
    this.type = type;
    this.speed = 2;
  }
  update() {
    this.y += this.speed;
  }
  draw() {
    ctx.fillStyle = this.type === "black" ? "black" : this.type === "green" ? "green" : "blue";
    ctx.fillRect(this.x, this.y, this.size, this.size);
  }
}

// cloud
class Cloud {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.speed = 1;
  }
  update() {
    this.x -= this.speed;
    if (this.x < -60) this.x = canvas.width + 60;
  }
  draw() {
    ctx.fillStyle = "white";
    ctx.beginPath();
    ctx.arc(this.x, this.y, 20, 0, Math.PI * 2);
    ctx.arc(this.x + 30, this.y + 10, 25, 0, Math.PI * 2);
    ctx.arc(this.x - 30, this.y + 10, 25, 0, Math.PI * 2);
    ctx.fill();
  }
}

// init clouds
for (let i = 0; i < 5; i++) {
  clouds.push(new Cloud(Math.random() * canvas.width, Math.random() * 100));
}

// game loop
function gameLoop(timestamp) {
  if (gameOver) {
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "red";
    ctx.font = "40px Arial";
    ctx.fillText("GAME OVER", canvas.width / 2 - 100, canvas.height / 2);
    return;
  }

  ctx.fillStyle = night ? "black" : "skyblue";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  if (night) {
    ctx.fillStyle = "grey";
    ctx.fillRect(0, canvas.height - 50, canvas.width, 50);
    ctx.fillStyle = "white";
    ctx.beginPath();
    ctx.arc(700, 80, 30, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "pink";
    ctx.font = "20px Arial";
    ctx.fillText("Rest yourself", canvas.width / 2 - 70, 50);
  } else {
    ctx.fillStyle = "green";
    ctx.fillRect(0, canvas.height - 50, canvas.width, 50);
  }

  clouds.forEach(c => { c.update(); c.draw(); });

  turret.draw();
  if (supportTurretActive) {
    ctx.fillStyle = "#666";
    ctx.fillRect(turret.x + 60, turret.y, 40, 60);
  }

  bullets.forEach((b, i) => {
    b.update(); b.draw();
    if (b.y < 0) bullets.splice(i, 1);
  });

  jets.forEach((j, i) => {
    j.update(); j.draw();
    if (j.y > canvas.height) {
      if (!shieldActive) health = Math.max(0, health - 5);
      jets.splice(i, 1);
    }
  });

  bombers.forEach((b, i) => { b.update(); b.draw(); });
  fleets.forEach((f, i) => { f.update(); f.draw(); });

  bombs.forEach((b, i) => { b.update(); b.draw(); });

  powerUps.forEach((p, i) => { p.update(); p.draw(); });

  drawExplosions();

  ctx.fillStyle = "red";
  ctx.fillRect(20, 20, health * 2, 20);
  ctx.strokeStyle = "black";
  ctx.strokeRect(20, 20, 200, 20);

  ctx.fillStyle = "black";
  ctx.font = "20px Arial";
  ctx.fillText("Score: " + score, canvas.width - 120, 40);

  requestAnimationFrame(gameLoop);
}

requestAnimationFrame(gameLoop);
