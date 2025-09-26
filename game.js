// Canvas setup
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// Game state
let keys = {};
let bullets = [];
let enemies = [];
let bombs = [];
let powerUps = [];
let clouds = [];
let explosions = [];

let score = 0;
let health = 10;
let gameOver = false;

let lastBlackFleet = 0;
let lastNight = 0;
let inNight = false;
let nightTimer = 0;

let blackPowerActive = false;
let blackPowerTimer = 0;

let supportTurret = null;
let supportTimer = 0;

let bomberSpawned = false;

// Turret
const turret = {
    x: canvas.width / 2 - 20,
    y: canvas.height - 60,
    width: 40,
    height: 60,
    speed: 5,
    shootCooldown: 0
};

// Utility: Draw explosion
function drawExplosion(x, y, size) {
    ctx.fillStyle = "orange";
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fill();
}

// Clouds
function spawnCloud() {
    clouds.push({ x: canvas.width, y: Math.random() * 100, speed: 1 + Math.random() });
}

// Jets
function spawnJet(color = "blue") {
    enemies.push({
        x: Math.random() * (canvas.width - 40),
        y: -40,
        width: 40,
        height: 40,
        speed: 2,
        color: color,
        type: "jet"
    });
}

// Orange jet
function spawnOrangeJet() {
    enemies.push({
        x: Math.random() * (canvas.width - 40),
        y: -40,
        width: 40,
        height: 40,
        speed: 3,
        color: "orange",
        type: "jet"
    });
}

// Bomber
function spawnBomber() {
    enemies.push({
        x: -100,
        y: 100,
        width: 80,
        height: 40,
        speed: 2,
        color: "crimson",
        type: "bomber",
        bombCooldown: 0
    });
}

// Fleet of black jets
function spawnBlackFleet() {
    for (let i = 0; i < 3; i++) {
        enemies.push({
            x: canvas.width + i * 60,
            y: 50 + i * 40,
            width: 40,
            height: 40,
            speed: 3,
            color: "black",
            type: "fleet"
        });
    }
}

// Green Air Support Jet
function spawnGreenJet() {
    enemies.push({
        x: canvas.width,
        y: 150,
        width: 80,
        height: 60,
        speed: 5,
        color: "green",
        type: "ally"
    });
}

// Power-ups
function spawnPowerUp(type) {
    powerUps.push({
        x: Math.random() * (canvas.width - 20),
        y: -20,
        width: 20,
        height: 20,
        speed: 2,
        type: type
    });
}

// Shooting
function shoot(tur) {
    if (tur.shootCooldown <= 0) {
        bullets.push({
            x: tur.x + tur.width / 2 - 3,
            y: tur.y,
            width: 6,
            height: 12,
            speed: 6
        });
        tur.shootCooldown = 15;
    }
}

// Draw jet shape
function drawJet(e) {
    ctx.fillStyle = e.color;
    ctx.beginPath();
    ctx.moveTo(e.x + e.width / 2, e.y);
    ctx.lineTo(e.x, e.y + e.height);
    ctx.lineTo(e.x + e.width, e.y + e.height);
    ctx.closePath();
    ctx.fill();
}

// Draw turret shape
function drawTurret(t, color = "grey") {
    ctx.fillStyle = color;
    ctx.fillRect(t.x, t.y, t.width, t.height);
    ctx.fillStyle = "black";
    ctx.fillRect(t.x + t.width / 2 - 5, t.y - 20, 10, 20);
}

// Game Loop
function update() {
    if (gameOver) return;

    // Background
    if (inNight) {
        ctx.fillStyle = "black";
    } else if (blackPowerActive) {
        ctx.fillStyle = "black";
    } else {
        ctx.fillStyle = "skyblue";
    }
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Grass
    ctx.fillStyle = inNight || blackPowerActive ? "grey" : "green";
    ctx.fillRect(0, canvas.height - 40, canvas.width, 40);

    // Clouds
    clouds.forEach(cl => {
        ctx.fillStyle = "white";
        ctx.beginPath();
        ctx.arc(cl.x, cl.y, 20, 0, Math.PI * 2);
        ctx.fill();
        cl.x -= cl.speed;
    });
    clouds = clouds.filter(cl => cl.x > -50);

    // Controls
    if (keys["ArrowLeft"] && turret.x > 0) turret.x -= turret.speed;
    if (keys["ArrowRight"] && turret.x + turret.width < canvas.width) turret.x += turret.speed;
    if (keys[" "] && !inNight) shoot(turret);

    if (turret.shootCooldown > 0) turret.shootCooldown--;

    // Support turret
    if (supportTurret) {
        drawTurret(supportTurret, "darkgrey");
        if (keys[" "] && !inNight) shoot(supportTurret);
        if (--supportTimer <= 0) supportTurret = null;
    }

    // Bullets
    bullets.forEach(b => b.y -= b.speed);
    bullets = bullets.filter(b => b.y > 0);

    // Enemies
    enemies.forEach((e, idx) => {
        if (e.type === "bomber") {
            e.x += e.speed;
            if (--e.bombCooldown <= 0) {
                bombs.push({ x: e.x + e.width / 2, y: e.y + e.height, speed: 3 });
                e.bombCooldown = 60;
            }
        } else if (e.type === "fleet") {
            e.x -= e.speed;
        } else if (e.type === "ally") {
            e.x -= e.speed;
            enemies = enemies.filter(en => en.type !== "jet" && en.type !== "bomber" && en.type !== "fleet");
        } else {
            e.y += e.speed;
        }
        drawJet(e);
    });
    enemies = enemies.filter(e => e.y < canvas.height && e.x < canvas.width + 100);

    // Bombs
    bombs.forEach(b => {
        b.y += b.speed;
        ctx.fillStyle = "black";
        ctx.beginPath();
        ctx.arc(b.x, b.y, 5, 0, Math.PI * 2);
        ctx.fill();

        if (b.y >= canvas.height - 40) {
            explosions.push({ x: b.x, y: b.y, life: 20 });
            health--;
        }
    });
    bombs = bombs.filter(b => b.y < canvas.height);

    // Explosions
    explosions.forEach(ex => {
        drawExplosion(ex.x, ex.y, 20);
        ex.life--;
    });
    explosions = explosions.filter(ex => ex.life > 0);

    // Bullets hit enemies
    bullets.forEach((b, bi) => {
        enemies.forEach((e, ei) => {
            if (b.x < e.x + e.width &&
                b.x + b.width > e.x &&
                b.y < e.y + e.height &&
                b.y + b.height > e.y) {
                enemies.splice(ei, 1);
                bullets.splice(bi, 1);
                score++;
            }
        });
    });

    // PowerUps
    powerUps.forEach((p, i) => {
        p.y += p.speed;
        ctx.fillStyle = p.type === "green" ? "lime" : p.type === "black" ? "black" : "gold";
        ctx.fillRect(p.x, p.y, p.width, p.height);

        if (p.x < turret.x + turret.width &&
            p.x + p.width > turret.x &&
            p.y < turret.y + turret.height &&
            p.y + p.height > turret.y) {
            if (p.type === "green") {
                supportTurret = { x: turret.x + 60, y: turret.y, width: 40, height: 60, shootCooldown: 0 };
                supportTimer = 600;
            }
            if (p.type === "black") {
                blackPowerActive = true;
                blackPowerTimer = 600;
            }
            if (p.type === "gold") {
                // Shield powerup effect placeholder
            }
            powerUps.splice(i, 1);
        }
    });

    // Timers
    if (blackPowerActive && --blackPowerTimer <= 0) blackPowerActive = false;

    // Health check
    if (health <= 0) {
        explosions.push({ x: turret.x, y: turret.y, life: 50 });
        gameOver = true;
    }

    // Draw turret
    if (!gameOver) {
        drawTurret(turret, blackPowerActive ? "red" : "grey");
    }

    // HUD
    ctx.fillStyle = "black";
    ctx.font = "20px Arial";
    ctx.fillText("Score: " + score, 20, 30);

    ctx.fillStyle = "red";
    ctx.fillRect(20, 40, health * 20, 20);

    if (gameOver) {
        ctx.fillStyle = "red";
        ctx.font = "40px Arial";
        ctx.fillText("GAME OVER", canvas.width / 2 - 120, canvas.height / 2);
    }

    requestAnimationFrame(update);
}

// Spawners
setInterval(() => {
    if (!inNight) {
        spawnJet();
        if (Math.random() < 0.3) spawnOrangeJet();
    }
}, 1500);

setInterval(() => {
    spawnCloud();
}, 3000);

setInterval(() => {
    if (!inNight) spawnBomber();
}, 20000);

setInterval(() => {
    if (!inNight) spawnBlackFleet();
}, 20000);

setInterval(() => {
    if (!inNight) spawnPowerUp("green");
}, 20000);

setInterval(() => {
    if (!inNight) spawnPowerUp("black");
}, 30000);

setInterval(() => {
    if (!inNight) spawnPowerUp("gold");
}, 40000);

// Night cycle
setInterval(() => {
    inNight = true;
    nightTimer = 600;
    enemies = [];
}, 60000);

document.addEventListener("keydown", e => keys[e.key] = true);
document.addEventListener("keyup", e => keys[e.key] = false);

// Start
update();
