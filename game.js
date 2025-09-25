const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

canvas.width = 800;
canvas.height = 600;

let score = 0;
let health = 10;
let gameOver = false;

class Turret {
    constructor() {
        this.x = canvas.width / 2;
        this.y = canvas.height - 50;
        this.width = 40;
        this.height = 40;
        this.color = "green";
        this.speed = 6;
    }

    draw() {
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x - this.width / 2, this.y - this.height / 2, this.width, this.height);
    }
}

class Bullet {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 5;
        this.height = 10;
        this.speed = 8;
    }

    update() {
        this.y -= this.speed;
    }

    draw() {
        ctx.fillStyle = "yellow";
        ctx.fillRect(this.x, this.y, this.width, this.height);
    }
}

class Enemy {
    constructor(type) {
        this.type = type;
        this.x = Math.random() * (canvas.width - 40) + 20;
        this.y = 0;
        this.width = 40;
        this.height = 30;
        this.speed = 2 + Math.random() * 2;
        this.direction = Math.random() > 0.5 ? 1 : -1; // for zig-zag
        this.bombCooldown = 0;
    }

    update() {
        if (this.type === "zigzag") {
            this.x += this.direction * 3;
            if (this.x <= 0 || this.x + this.width >= canvas.width) {
                this.direction *= -1;
            }
        }
        this.y += this.speed;

        // Drop bombs for bomber type
        if (this.type === "bomber" && Math.random() < 0.01 && this.bombCooldown <= 0) {
            bombs.push(new Bomb(this.x + this.width / 2, this.y + this.height));
            this.bombCooldown = 100; // cooldown
        } else {
            this.bombCooldown--;
        }
    }

    draw() {
        ctx.fillStyle = this.type === "basic" ? "red" :
                        this.type === "zigzag" ? "orange" : "purple";
        ctx.fillRect(this.x, this.y, this.width, this.height);
    }
}

class Bomb {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.radius = 6;
        this.speed = 4;
    }

    update() {
        this.y += this.speed;
    }

    draw() {
        ctx.fillStyle = "black";
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
    }
}

let turret = new Turret();
let bullets = [];
let enemies = [];
let bombs = [];
let keys = {};

function spawnEnemy() {
    const rand = Math.random();
    let type = "basic";
    if (rand < 0.3) type = "zigzag";
    else if (rand < 0.6) type = "bomber";
    enemies.push(new Enemy(type));
}

function detectCollisions() {
    bullets.forEach((bullet, bIndex) => {
        enemies.forEach((enemy, eIndex) => {
            if (
                bullet.x < enemy.x + enemy.width &&
                bullet.x + bullet.width > enemy.x &&
                bullet.y < enemy.y + enemy.height &&
                bullet.y + bullet.height > enemy.y
            ) {
                bullets.splice(bIndex, 1);
                enemies.splice(eIndex, 1);
                score++;
            }
        });
    });

    bombs.forEach((bomb, bombIndex) => {
        if (
            bomb.x > turret.x - turret.width / 2 &&
            bomb.x < turret.x + turret.width / 2 &&
            bomb.y > turret.y - turret.height / 2 &&
            bomb.y < turret.y + turret.height / 2
        ) {
            bombs.splice(bombIndex, 1);
            health--;
            if (health <= 0) {
                gameOver = true;
            }
        }
    });

    enemies.forEach((enemy, eIndex) => {
        if (enemy.y + enemy.height >= canvas.height) {
            enemies.splice(eIndex, 1);
            health--;
            if (health <= 0) {
                gameOver = true;
            }
        }
    });
}

function update() {
    if (gameOver) return;

    if (keys["ArrowLeft"] && turret.x - turret.width / 2 > 0) {
        turret.x -= turret.speed;
    }
    if (keys["ArrowRight"] && turret.x + turret.width / 2 < canvas.width) {
        turret.x += turret.speed;
    }

    bullets.forEach((bullet, index) => {
        bullet.update();
        if (bullet.y < 0) bullets.splice(index, 1);
    });

    enemies.forEach((enemy) => enemy.update());
    bombs.forEach((bomb, index) => {
        bomb.update();
        if (bomb.y > canvas.height) bombs.splice(index, 1);
    });

    detectCollisions();
}

function draw() {
    ctx.fillStyle = "#87CEEB"; // sky blue
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "green"; // ground
    ctx.fillRect(0, canvas.height - 50, canvas.width, 50);

    turret.draw();
    bullets.forEach((bullet) => bullet.draw());
    enemies.forEach((enemy) => enemy.draw());
    bombs.forEach((bomb) => bomb.draw());

    ctx.fillStyle = "black";
    ctx.font = "20px Arial";
    ctx.fillText("Score: " + score, 20, 30);
    ctx.fillText("Health: " + health, 20, 60);

    if (gameOver) {
        ctx.fillStyle = "red";
        ctx.font = "40px Arial";
        ctx.fillText("GAME OVER", canvas.width / 2 - 100, canvas.height / 2);
    }
}

function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

setInterval(spawnEnemy, 2000);
gameLoop();

document.addEventListener("keydown", (e) => {
    keys[e.key] = true;
    if (e.key === " ") {
        bullets.push(new Bullet(turret.x, turret.y - turret.height / 2));
    }
});

document.addEventListener("keyup", (e) => {
    keys[e.key] = false;
});
