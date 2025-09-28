const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

canvas.width = 800;
canvas.height = 600;

// Game state
let keys = {};
let bullets = [];
let enemies = [];
let powerUps = [];
let explosions = [];
let bombs = [];
let clouds = [];
let lastEnemySpawn = 0;
let lastPowerUpSpawn = 0;
let score = 0;
let health = 10;
let gameOver = false;
let shieldActive = false;
let shieldTimer = 0;
let lastBomberSpawn = 0;

// Player (turret)
let player = {
    x: canvas.width / 2 - 25,
    y: canvas.height - 60,
    width: 500,
    height: 600,
    speed: 50
};

// Handle key presses
document.addEventListener("keydown", (e) => {
    keys[e.code] = true;
    if (e.code === "Space" && !gameOver) {
        bullets.push({ x: player.x + player.width / 2 - 2, y: player.y, width: 4, height: 10 });
    }
});
document.addEventListener("keyup", (e) => keys[e.code] = false);

// Draw player turret with shield effect
function drawPlayer() {
    ctx.fillStyle = "green";
    ctx.fillRect(player.x, player.y, player.width, player.height);

    // Turret barrel
    ctx.fillStyle = "darkblue";
    ctx.fillRect(player.x + player.width / 2 - 5, player.y - 20, 10, 20);

    // Shield effect
    if (shieldActive) {
        ctx.beginPath();
        ctx.arc(player.x + player.width / 2, player.y + player.height / 2, 40, 0, Math.PI * 2);
        ctx.strokeStyle = "gold";
        ctx.lineWidth = 4;
        ctx.shadowColor = "yellow";
        ctx.shadowBlur = 20;
        ctx.stroke();
        ctx.shadowBlur = 0;
    }
}

// Draw bullets
function drawBullets() {
    ctx.fillStyle = "green";
    bullets.forEach(b => ctx.fillRect(b.x, b.y, b.width, b.height));
}

// Draw enemies
function drawEnemies() {
    enemies.forEach(e => {
        if (e.type === "jet") {
            ctx.fillStyle = "blue";
            drawJet(e.x, e.y, e.size);
        } else if (e.type === "blackJet") {
            ctx.fillStyle = "orange";
            drawJet(e.x, e.y, e.size);
        } else if (e.type === "greenBoss") {
            drawBigGreenJet(e.x, e.y);
        } else if (e.type === "yellowJet") {
            ctx.fillStyle = "yellow";
            drawJet(e.x, e.y, e.size);
        } else if (e.type === "bomber") {
            drawBomber(e.x, e.y);
        }
    });
}

// Draw small jet
function drawJet(x, y, size) {
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x - size / 2, y + size);
    ctx.lineTo(x + size / 2, y + size);
    ctx.closePath();
    ctx.fill();
}

// Draw BIG green boss jet
function drawBigGreenJet(x, y) {
    ctx.fillStyle = "limegreen";
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x - 40, y + 60);
    ctx.lineTo(x - 20, y + 60);
    ctx.lineTo(x - 10, y + 90);
    ctx.lineTo(x + 10, y + 90);
    ctx.lineTo(x + 20, y + 60);
    ctx.lineTo(x + 40, y + 60);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "darkgreen";
    ctx.fillRect(x - 10, y + 20, 20, 30);
}

// Draw bomber plane
function drawBomber(x, y) {
    ctx.fillStyle = "crimson";
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x - 40, y + 30);
    ctx.lineTo(x + 40, y + 30);
    ctx.closePath();
    ctx.fill();
}

// Draw bombs
function drawBombs() {
    ctx.fillStyle = "black";
    bombs.forEach(b => {
        ctx.beginPath();
        ctx.arc(b.x, b.y, 6, 0, Math.PI * 2);
        ctx.fill();
    });
}

// Draw power-ups
function drawPowerUps() {
    powerUps.forEach(p => {
        if (p.type === "shield") ctx.fillStyle = "gold";
        ctx.beginPath();
        ctx.arc(p.x, p.y, 10, 0, Math.PI * 2);
        ctx.fill();
    });
}

// Draw clouds
function drawClouds() {
    ctx.fillStyle = "white";
    clouds.forEach(c => {
        ctx.beginPath();
        ctx.arc(c.x, c.y, 20, 0, Math.PI * 2);
        ctx.arc(c.x + 30, c.y + 10, 25, 0, Math.PI * 2);
        ctx.arc(c.x - 30, c.y + 10, 25, 0, Math.PI * 2);
        ctx.fill();
    });
}

// Update bullets
function updateBullets() {
    bullets.forEach((b, bi) => {
        b.y -= 7;
        if (b.y < 0) bullets.splice(bi, 1);
    });
}

// Update enemies
function updateEnemies() {
    enemies.forEach((e, ei) => {
        if (e.type === "bomber") {
            e.x -= e.speed;

            // Drop a bomb occasionally
            if (Math.random() < 0.01) {
                bombs.push({ x: e.x, y: e.y + 30 });
            }

            if (e.x + 40 < 0) enemies.splice(ei, 1);
        } else {
            e.y += e.speed;

            if (e.type === "yellowJet" && e.y > canvas.height) {
                if (!shieldActive) health -= 1;
                enemies.splice(ei, 1);
            }

            if (e.y > canvas.height) enemies.splice(ei, 1);
        }
    });
}

// Update bombs
function updateBombs() {
    bombs.forEach((b, bi) => {
        b.y += 4;

        if (b.y > canvas.height) {
            if (!shieldActive) health -= 1;
            bombs.splice(bi, 1);
        }
    });
}

// Update power-ups
function updatePowerUps() {
    powerUps.forEach((p, pi) => {
        p.y += 2;

        if (p.x < player.x + player.width &&
            p.x + 10 > player.x &&
            p.y < player.y + player.height &&
            p.y + 10 > player.y) {

            if (p.type === "shield") {
                shieldActive = true;
                shieldTimer = Date.now();
            }
            powerUps.splice(pi, 1);
        }

        if (p.y > canvas.height) powerUps.splice(pi, 1);
    });
}

// Update shield timer
function updateShield() {
    if (shieldActive && Date.now() - shieldTimer > 10000) {
        shieldActive = false;
    }
}

// Draw score and health bar
function drawHUD() {
    ctx.fillStyle = "black";
    ctx.font = "20px Arial";
    ctx.fillText("Score: " + score, 20, 30);

    ctx.fillStyle = "red";
    ctx.fillRect(20, 50, 100, 15);
    ctx.fillStyle = "lime";
    ctx.fillRect(20, 50, (health / 10) * 100, 15);
    ctx.strokeStyle = "black";
    ctx.strokeRect(20, 50, 100, 15);
}

// Collision detection
function handleCollisions() {
    enemies.forEach((e, ei) => {
        bullets.forEach((b, bi) => {
            if (b.x < e.x + e.size &&
                b.x + b.width > e.x &&
                b.y < e.y + e.size &&
                b.y + b.height > e.y) {
                score += 1;
                bullets.splice(bi, 1);
                enemies.splice(ei, 1);
            }
        });

        if (player.x < e.x + e.size &&
            player.x + player.width > e.x &&
            player.y < e.y + e.size &&
            player.y + player.height > e.y) {
            if (!shieldActive) health -= 1;
            enemies.splice(ei, 1);
        }
    });

    bombs.forEach((b, bi) => {
        if (b.x > player.x && b.x < player.x + player.width &&
            b.y > player.y && b.y < player.y + player.height) {
            if (!shieldActive) health -= 1;
            bombs.splice(bi, 1);
        }
    });
}

// Spawn enemies
function spawnEnemies() {
    if (Date.now() - lastEnemySpawn > 1000) {
        const x = Math.random() * (canvas.width - 30) + 15;
        const typeChance = Math.random();

        if (score % 50 === 0 && score !== 0) {
            enemies.push({ x: canvas.width, y: 50, size: 80, speed: 2, type: "greenBoss" });
        } else if (typeChance < 0.3) {
            enemies.push({ x, y: -20, size: 30, speed: 2, type: "jet" });
        } else if (typeChance < 0.6) {
            enemies.push({ x, y: -20, size: 30, speed: 3, type: "orangeJet" });
        } else {
            enemies.push({ x, y: -20, size: 30, speed: 4, type: "yellowJet" });
        }

        lastEnemySpawn = Date.now();
    }

    // Spawn bomber every 20 points
    if (score % 20 === 0 && score !== 0 && Date.now() - lastBomberSpawn > 10000) {
        enemies.push({ x: canvas.width + 40, y: 100, size: 60, speed: 2, type: "bomber" });
        lastBomberSpawn = Date.now();
    }
}

// Spawn power-ups
function spawnPowerUps() {
    if (Date.now() - lastPowerUpSpawn > 15000) {
        const x = Math.random() * (canvas.width - 20) + 10;
        powerUps.push({ x, y: -20, type: "shield" });
        lastPowerUpSpawn = Date.now();
    }
}

// Spawn clouds
function spawnClouds() {
    if (clouds.length < 5 && Math.random() < 0.01) {
        clouds.push({ x: canvas.width, y: Math.random() * 150 + 20, speed: 1 });
    }
    clouds.forEach((c, ci) => {
        c.x -= c.speed;
        if (c.x < -60) clouds.splice(ci, 1);
    });
}

// Update player movement
function updatePlayer() {
    if (keys["ArrowLeft"] && player.x > 0) player.x -= player.speed;
    if (keys["ArrowRight"] && player.x < canvas.width - player.width) player.x += player.speed;
}

// Main game loop
function gameLoop() {
    if (gameOver) {
        ctx.fillStyle = "red";
        ctx.font = "40px Arial";
        ctx.fillText("GAME OVER", canvas.width / 2 - 120, canvas.height / 2);
        return;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Background
    ctx.fillStyle = "skyblue";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "green";
    ctx.fillRect(0, canvas.height - 50, canvas.width, 50);

    drawClouds();
    spawnClouds();

    updatePlayer();
    updateBullets();
    updateEnemies();
    updateBombs();
    updatePowerUps();
    updateShield();
    handleCollisions();
    spawnEnemies();
    spawnPowerUps();

    drawPlayer();
    drawBullets();
    drawEnemies();
    drawBombs();
    drawPowerUps();
    drawHUD();

    if (health <= 0) {
        gameOver = true;
    }

    requestAnimationFrame(gameLoop);
}

gameLoop();
