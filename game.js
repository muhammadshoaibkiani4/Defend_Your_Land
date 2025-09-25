const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

canvas.width = 800;
canvas.height = 600;

let turret = { x: canvas.width / 2 - 25, y: canvas.height - 60, width: 50, height: 50, color: "green" };
let bullets = [];
let jets = [];
let bombers = [];
let bombs = [];
let powerUps = [];
let score = 0;
let health = 10;
let gameOver = false;

let lastJetSpawn = 0;
let lastBomberSpawn = 0;
let jetSpawnInterval = 1500;
let bomberSpawnInterval = 20000;
let lastTime = 0;

// Night cycle
let nightMode = false;
let lastNightStart = 0;
let nightDuration = 20000; // 20 sec
let nightInterval = 30000; // every 30 sec
let stars = [];

document.addEventListener("keydown", (e) => {
    if (e.code === "ArrowLeft" && turret.x > 0) turret.x -= 20;
    if (e.code === "ArrowRight" && turret.x < canvas.width - turret.width) turret.x += 20;
    if (e.code === "Space") bullets.push({ x: turret.x + turret.width / 2 - 2.5, y: turret.y, width: 5, height: 10 });
});

function spawnJet() {
    const colors = ["red", "blue", "orange"];
    let color = colors[Math.floor(Math.random() * colors.length)];
    jets.push({ x: Math.random() * (canvas.width - 40), y: -20, width: 40, height: 20, color });
}

function spawnBomber() {
    bombers.push({ x: -60, y: 100, width: 60, height: 30, color: "crimson", bombsDropped: 0 });
}

function spawnPowerUp() {
    powerUps.push({ x: Math.random() * (canvas.width - 20), y: -20, width: 20, height: 20, color: "green", type: "airSupport" });
}

function activatePowerUp(type) {
    if (type === "airSupport") {
        jets = [];
        bombers = [];
        ctx.fillStyle = "rgba(0,255,0,0.3)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
}

function drawTurret() {
    ctx.fillStyle = turret.color;
    ctx.fillRect(turret.x, turret.y, turret.width, turret.height);
}

function drawBullets() {
    ctx.fillStyle = "yellow";
    bullets.forEach((b) => ctx.fillRect(b.x, b.y, b.width, b.height));
}

function drawJets() {
    jets.forEach((jet) => {
        ctx.fillStyle = jet.color;
        ctx.fillRect(jet.x, jet.y, jet.width, jet.height);
    });
}

function drawBombers() {
    bombers.forEach((b) => {
        ctx.fillStyle = b.color;
        ctx.fillRect(b.x, b.y, b.width, b.height);
    });
    ctx.fillStyle = "black";
    bombs.forEach((bomb) => ctx.fillRect(bomb.x, bomb.y, bomb.width, bomb.height));
}

function drawPowerUps() {
    powerUps.forEach((p) => {
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x, p.y, p.width, p.height);
    });
}

function drawHUD() {
    ctx.fillStyle = "white";
    ctx.font = "20px Arial";
    ctx.fillText("Score: " + score, 10, 20);

    // Health Bar
    ctx.fillStyle = "red";
    for (let i = 0; i < health; i++) {
        ctx.fillRect(10 + i * 15, 40, 10, 10);
    }
}

function updateObjects(deltaTime) {
    bullets.forEach((b) => (b.y -= 5));
    jets.forEach((jet) => (jet.y += 2));
    bombers.forEach((b) => {
        b.x += 2;
        if (b.bombsDropped < 3 && Math.random() < 0.01) {
            bombs.push({ x: b.x + b.width / 2 - 5, y: b.y + b.height, width: 10, height: 20 });
            b.bombsDropped++;
        }
    });
    bombs.forEach((bomb) => (bomb.y += 3));
    powerUps.forEach((p) => (p.y += 2));

    // Remove off-screen objects
    bullets = bullets.filter((b) => b.y > 0);
    jets = jets.filter((jet) => jet.y < canvas.height);
    bombs = bombs.filter((bomb) => bomb.y < canvas.height);
    powerUps = powerUps.filter((p) => p.y < canvas.height);
}

function checkCollisions() {
    bullets.forEach((b, bi) => {
        jets.forEach((jet, ji) => {
            if (b.x < jet.x + jet.width && b.x + b.width > jet.x && b.y < jet.y + jet.height && b.y + b.height > jet.y) {
                jets.splice(ji, 1);
                bullets.splice(bi, 1);
                score += 10;
            }
        });
        bombers.forEach((bomber, boi) => {
            if (b.x < bomber.x + bomber.width && b.x + b.width > bomber.x && b.y < bomber.y + bomber.height && b.y + b.height > bomber.y) {
                bombers.splice(boi, 1);
                bullets.splice(bi, 1);
                score += 30;
            }
        });
    });

    bombs.forEach((bomb, bi) => {
        if (bomb.x < turret.x + turret.width && bomb.x + bomb.width > turret.x && bomb.y < turret.y + turret.height && bomb.y + bomb.height > turret.y) {
            bombs.splice(bi, 1);
            health--;
            if (health <= 0) gameOver = true;
        }
    });

    powerUps.forEach((p, pi) => {
        if (p.x < turret.x + turret.width && p.x + p.width > turret.x && p.y < turret.y + turret.height && p.y + p.height > turret.y) {
            activatePowerUp(p.type);
            powerUps.splice(pi, 1);
        }
    });
}

function drawBackground() {
    if (!nightMode) {
        // Daytime background
        ctx.fillStyle = "skyblue";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "green";
        ctx.fillRect(0, canvas.height - 100, canvas.width, 100);
    } else {
        // Nighttime background
        ctx.fillStyle = "black";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        stars.forEach((star) => {
            ctx.fillStyle = "white";
            ctx.fillRect(star.x, star.y, 2, 2);
        });
        ctx.fillStyle = "pink";
        ctx.font = "30px Arial";
        ctx.fillText("Rest yourself...", canvas.width / 2 - 100, canvas.height / 2);
    }
}

function gameLoop(timestamp) {
    let deltaTime = timestamp - lastTime;
    lastTime = timestamp;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawBackground();

    if (!gameOver) {
        if (!nightMode) {
            if (timestamp - lastJetSpawn > jetSpawnInterval) {
                spawnJet();
                lastJetSpawn = timestamp;
            }
            if (timestamp - lastBomberSpawn > bomberSpawnInterval) {
                spawnBomber();
                lastBomberSpawn = timestamp;
            }
            if (score > 0 && score % 50 === 0 && powerUps.length === 0) {
                spawnPowerUp();
            }
        }

        updateObjects(deltaTime);
        checkCollisions();

        drawTurret();
        drawBullets();
        drawJets();
        drawBombers();
        drawPowerUps();
        drawHUD();

        // Night cycle logic
        if (!nightMode && timestamp - lastNightStart > nightInterval) {
            nightMode = true;
            lastNightStart = timestamp;
            jets = [];
            bombers = [];
            bombs = [];
            health = Math.min(10, health + 2); // Heal turret
            stars = Array.from({ length: 50 }, () => ({ x: Math.random() * canvas.width, y: Math.random() * canvas.height }));
        }
        if (nightMode && timestamp - lastNightStart > nightDuration) {
            nightMode = false;
            lastNightStart = timestamp;
        }
    } else {
        ctx.fillStyle = "red";
        ctx.font = "40px Arial";
        ctx.fillText("Game Over", canvas.width / 2 - 100, canvas.height / 2);
    }

    requestAnimationFrame(gameLoop);
}

requestAnimationFrame(gameLoop);
