const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// UI Elements
const scoreEl = document.getElementById('score');
const livesEl = document.getElementById('lives');
const highScoreEl = document.getElementById('highScore');
const startScreen = document.getElementById('startScreen');
const gameOverScreen = document.getElementById('gameOverScreen');
const finalScoreEl = document.getElementById('finalScore');
const startBtn = document.getElementById('startBtn');
const restartBtn = document.getElementById('restartBtn');

// Game State
let gameRunning = false;
let score = 0;
let lives = 3;
let frameCount = 0;

// High Score
let highScore = parseInt(localStorage.getItem('spaceShooterHighScore')) || 0;
highScoreEl.textContent = `🏆 High: ${highScore}`;

// Input
const keys = {};
document.addEventListener('keydown', (e) => {
    keys[e.key] = true;
});
document.addEventListener('keyup', (e) => keys[e.key] = false);

// ==================== MOBILE TOUCH CONTROLS ====================
let touchStartX = 0;
let touchStartY = 0;
let isTouching = false;

canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    touchStartX = touch.clientX;
    touchStartY = touch.clientY;
    isTouching = true;
}, { passive: false });

canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    if (!isTouching) return;
    const touch = e.touches[0];
    const dx = touch.clientX - touchStartX;
    const dy = touch.clientY - touchStartY;
    player.x += dx * 0.5;
    player.y += dy * 0.5;
    player.x = Math.max(0, Math.min(canvas.width - player.width, player.x));
    player.y = Math.max(0, Math.min(canvas.height - player.height, player.y));
    touchStartX = touch.clientX;
    touchStartY = touch.clientY;
}, { passive: false });

canvas.addEventListener('touchend', () => {
    isTouching = false;
});

canvas.style.touchAction = 'none';

// ==================== PLAYER ====================
const player = {
    x: canvas.width / 2 - 25,
    y: canvas.height - 80,
    width: 50,
    height: 50,
    speed: 6,
    color: '#00ff88',
    bullets: [],
    shootCooldown: 0,
    
    update() {
        // Movement
        if (keys['ArrowLeft'] && this.x > 0) this.x -= this.speed;
        if (keys['ArrowRight'] && this.x < canvas.width - this.width) this.x += this.speed;
        if (keys['ArrowUp'] && this.y > 0) this.y -= this.speed;
        if (keys['ArrowDown'] && this.y < canvas.height - this.height) this.y += this.speed;
        
        // AUTO-SHOOT — No need to press Space!
        this.shoot();
        
        // Shooting cooldown
        if (this.shootCooldown > 0) this.shootCooldown--;
    },
    
    shoot() {
        // Faster base shooting (was 10, now 8)
        let cooldown = activePowerUp === 'RAPID_FIRE' ? 3 : 8;
        
        if (this.shootCooldown <= 0) {
            if (activePowerUp === 'RAPID_FIRE') {
                this.bullets.push(
                    { x: this.x + this.width/2 - 3, y: this.y, width: 6, height: 15, speed: 10, color: '#ff00ff', vx: 0 },
                    { x: this.x + this.width/2 - 8, y: this.y + 5, width: 6, height: 15, speed: 10, color: '#ff00ff', vx: -0.5 },
                    { x: this.x + this.width/2 + 2, y: this.y + 5, width: 6, height: 15, speed: 10, color: '#ff00ff', vx: 0.5 }
                );
            } else if (activePowerUp === 'SPREAD_SHOT') {
                this.bullets.push(
                    { x: this.x + this.width/2 - 3, y: this.y, width: 6, height: 15, speed: 10, color: '#ff6600', vx: 0 },
                    { x: this.x + this.width/2 - 3, y: this.y, width: 6, height: 15, speed: 9, color: '#ff6600', vx: -2 },
                    { x: this.x + this.width/2 - 3, y: this.y, width: 6, height: 15, speed: 9, color: '#ff6600', vx: 2 }
                );
            } else {
                this.bullets.push({
                    x: this.x + this.width/2 - 3,
                    y: this.y,
                    width: 6,
                    height: 15,
                    speed: 10,
                    color: '#ffff00',
                    vx: 0
                });
            }
            this.shootCooldown = cooldown;
        }
    },
    
    draw() {
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.moveTo(this.x + this.width/2, this.y);
        ctx.lineTo(this.x + this.width, this.y + this.height);
        ctx.lineTo(this.x, this.y + this.height);
        ctx.closePath();
        ctx.fill();
        
        ctx.fillStyle = '#00ccff';
        ctx.beginPath();
        ctx.moveTo(this.x + 15, this.y + this.height);
        ctx.lineTo(this.x + this.width/2, this.y + this.height + 10);
        ctx.lineTo(this.x + 35, this.y + this.height);
        ctx.closePath();
        ctx.fill();
    }
};

// ==================== ENEMY TYPES ====================
const ENEMY_TYPES = {
    BASIC: { hp: 1, size: 40, speedMult: 1, colorBase: 300, points: 10 },
    FAST: { hp: 1, size: 30, speedMult: 2, colorBase: 180, points: 20 },
    TANK: { hp: 3, size: 55, speedMult: 0.5, colorBase: 0, points: 30 },
    ZIGZAG: { hp: 2, size: 35, speedMult: 1, colorBase: 60, points: 25 }
};

let enemies = [];
let enemySpawnRate = 80; // Was 60 — slower spawn rate

function spawnEnemy() {
    const types = Object.keys(ENEMY_TYPES);
    let typeIndex = Math.floor(Math.random() * types.length);
    if (score < 100) typeIndex = 0;
    
    const typeKey = types[typeIndex];
    const type = ENEMY_TYPES[typeKey];
    const size = type.size;
    
    enemies.push({
        x: Math.random() * (canvas.width - size),
        y: -size,
        width: size,
        height: size,
        // SLOWER ENEMIES — reduced base speed and score multiplier
        speed: (1.5 + Math.random() * 1.5 + score / 800) * type.speedMult,
        color: `hsl(${type.colorBase + Math.random() * 40}, 100%, 50%)`,
        hp: type.hp,
        maxHp: type.hp,
        type: typeKey,
        points: type.points,
        angle: 0
    });
}

function drawEnemy(enemy) {
    ctx.save();
    
    if (enemy.maxHp > 1) {
        const barWidth = enemy.width;
        ctx.fillStyle = '#333';
        ctx.fillRect(enemy.x, enemy.y - 10, barWidth, 4);
        ctx.fillStyle = '#ff0000';
        ctx.fillRect(enemy.x, enemy.y - 10, barWidth * (enemy.hp / enemy.maxHp), 4);
    }
    
    ctx.fillStyle = enemy.color;
    
    if (enemy.type === 'FAST') {
        ctx.beginPath();
        ctx.moveTo(enemy.x + enemy.width/2, enemy.y);
        ctx.lineTo(enemy.x + enemy.width, enemy.y + enemy.height/2);
        ctx.lineTo(enemy.x + enemy.width/2, enemy.y + enemy.height);
        ctx.lineTo(enemy.x, enemy.y + enemy.height/2);
        ctx.closePath();
        ctx.fill();
    } else if (enemy.type === 'TANK') {
        ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height);
        ctx.strokeStyle = '#ff4444';
        ctx.lineWidth = 3;
        ctx.strokeRect(enemy.x, enemy.y, enemy.width, enemy.height);
    } else if (enemy.type === 'ZIGZAG') {
        ctx.translate(enemy.x + enemy.width/2, enemy.y + enemy.height/2);
        ctx.rotate(enemy.angle);
        ctx.beginPath();
        ctx.moveTo(0, -enemy.height/2);
        ctx.lineTo(enemy.width/2, enemy.height/2);
        ctx.lineTo(-enemy.width/2, enemy.height/2);
        ctx.closePath();
        ctx.fill();
    } else {
        ctx.beginPath();
        ctx.moveTo(enemy.x, enemy.y);
        ctx.lineTo(enemy.x + enemy.width, enemy.y);
        ctx.lineTo(enemy.x + enemy.width/2, enemy.y + enemy.height);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#ff0000';
        ctx.fillRect(enemy.x + 15, enemy.y + 10, 10, 10);
    }
    
    ctx.restore();
}

// ==================== POWER-UPS ====================
let powerUps = [];
let activePowerUp = null;
let powerUpTimer = 0;

const POWERUP_TYPES = {
    RAPID_FIRE: { color: '#ff00ff', duration: 300, symbol: '⚡' },
    // LONGER SHIELD — was 400, now 600 (10 seconds at 60fps)
    SHIELD: { color: '#00ccff', duration: 600, symbol: '🛡️' },
    SPREAD_SHOT: { color: '#ff6600', duration: 300, symbol: '🔥' }
};

function spawnPowerUp() {
    const types = Object.keys(POWERUP_TYPES);
    const type = types[Math.floor(Math.random() * types.length)];
    const size = 30;
    powerUps.push({
        x: Math.random() * (canvas.width - size),
        y: -size,
        width: size,
        height: size,
        speed: 2,
        type: type,
        ...POWERUP_TYPES[type]
    });
}

function drawPowerUp(p) {
    ctx.shadowColor = p.color;
    ctx.shadowBlur = 20;
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.beginPath();
    ctx.arc(p.x + p.width/2, p.y + p.height/2, p.width/2, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = p.color;
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.font = '20px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(p.symbol, p.x + p.width/2, p.y + p.height/2);
    ctx.shadowBlur = 0;
}

function activatePowerUp(type) {
    activePowerUp = type;
    powerUpTimer = POWERUP_TYPES[type].duration;
    createExplosion(player.x + player.width/2, player.y + player.height/2, POWERUP_TYPES[type].color);
}

function drawActivePowerUpIndicator() {
    if (!activePowerUp) return;
    const p = POWERUP_TYPES[activePowerUp];
    const barWidth = 200;
    const barHeight = 10;
    const x = canvas.width/2 - barWidth/2;
    const y = 50;
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(x, y, barWidth, barHeight);
    const fillWidth = (powerUpTimer / p.duration) * barWidth;
    ctx.fillStyle = p.color;
    ctx.fillRect(x, y, fillWidth, barHeight);
    ctx.fillStyle = '#fff';
    ctx.font = '14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`${p.symbol} ${activePowerUp.replace('_', ' ')}`, canvas.width/2, y - 5);
}

// ==================== PARTICLES ====================
let particles = [];

function createExplosion(x, y, color) {
    for (let i = 0; i < 15; i++) {
        particles.push({
            x: x, y: y,
            vx: (Math.random() - 0.5) * 8,
            vy: (Math.random() - 0.5) * 8,
            size: Math.random() * 4 + 2,
            color: color,
            life: 30
        });
    }
}

// ==================== STARS ====================
const stars = [];
for (let i = 0; i < 100; i++) {
    stars.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: Math.random() * 2 + 0.5,
        speed: Math.random() * 2 + 0.5
    });
}

function drawStars() {
    ctx.fillStyle = '#fff';
    stars.forEach(star => {
        ctx.globalAlpha = Math.random() * 0.5 + 0.3;
        ctx.fillRect(star.x, star.y, star.size, star.size);
    });
    ctx.globalAlpha = 1;
}

// ==================== COLLISION ====================
function checkCollision(rect1, rect2) {
    return rect1.x < rect2.x + rect2.width &&
           rect1.x + rect1.width > rect2.x &&
           rect1.y < rect2.y + rect2.height &&
           rect1.y + rect1.height > rect2.y;
}

// ==================== UI ====================
function updateUI() {
    scoreEl.textContent = `Score: ${score}`;
    let hearts = '';
    for (let i = 0; i < lives; i++) hearts += '❤️';
    livesEl.textContent = `Lives: ${hearts}`;
    highScoreEl.textContent = `🏆 High: ${highScore}`;
}

function saveHighScore() {
    if (score > highScore) {
        highScore = score;
        localStorage.setItem('spaceShooterHighScore', highScore);
    }
}

// ==================== GAME OVER / RESET ====================
function gameOver() {
    gameRunning = false;
    saveHighScore();
    finalScoreEl.innerHTML = `Score: ${score}<br><span style="color:#ffd700">🏆 High Score: ${highScore}</span>`;
    gameOverScreen.classList.remove('hidden');
}

function resetGame() {
    score = 0;
    lives = 3;
    frameCount = 0;
    enemies = [];
    particles = [];
    powerUps = [];
    player.bullets = [];
    activePowerUp = null;
    powerUpTimer = 0;
    enemySpawnRate = 80; // Reset to slower spawn
    player.x = canvas.width / 2 - 25;
    player.y = canvas.height - 80;
    updateUI();
}

// ==================== MAIN GAME LOOP ====================
function update() {
    if (!gameRunning) return;
    
    frameCount++;
    player.update();
    
    // Slower enemy spawn (was 60, now 80)
    if (frameCount % enemySpawnRate === 0) {
        spawnEnemy();
        if (enemySpawnRate > 30) enemySpawnRate--; // Slower difficulty ramp
    }
    
    if (frameCount % 500 === 0) spawnPowerUp();
    
    player.bullets = player.bullets.filter(bullet => {
        bullet.y -= bullet.speed;
        if (bullet.vx) bullet.x += bullet.vx;
        return bullet.y > -bullet.height && bullet.x > -10 && bullet.x < canvas.width + 10;
    });
    
    enemies = enemies.filter(enemy => {
        enemy.y += enemy.speed;
        
        if (enemy.type === 'ZIGZAG') {
            enemy.angle += 0.1;
            enemy.x += Math.sin(enemy.angle) * 3;
            if (enemy.x < 0) enemy.x = 0;
            if (enemy.x > canvas.width - enemy.width) enemy.x = canvas.width - enemy.width;
        }
        
        if (checkCollision(player, enemy)) {
            if (activePowerUp === 'SHIELD') {
                createExplosion(enemy.x + enemy.width/2, enemy.y + enemy.height/2, '#00ccff');
                return false;
            }
            lives--;
            createExplosion(enemy.x + enemy.width/2, enemy.y + enemy.height/2, '#ff4444');
            createExplosion(player.x + player.width/2, player.y + player.height/2, '#00ff88');
            updateUI();
            if (lives <= 0) gameOver();
            return false;
        }
        
        if (enemy.y > canvas.height) return false;
        
        for (let i = player.bullets.length - 1; i >= 0; i--) {
            if (checkCollision(player.bullets[i], enemy)) {
                enemy.hp--;
                createExplosion(player.bullets[i].x, player.bullets[i].y, '#ffff00');
                player.bullets.splice(i, 1);
                
                if (enemy.hp <= 0) {
                    score += enemy.points;
                    createExplosion(enemy.x + enemy.width/2, enemy.y + enemy.height/2, enemy.color);
                    updateUI();
                    return false;
                }
            }
        }
        
        return true;
    });
    
    powerUps = powerUps.filter(p => {
        p.y += p.speed;
        if (checkCollision(player, p)) {
            activatePowerUp(p.type);
            return false;
        }
        return p.y < canvas.height + 50;
    });
    
    if (powerUpTimer > 0) {
        powerUpTimer--;
        if (powerUpTimer <= 0) activePowerUp = null;
    }
    
    particles = particles.filter(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.life--;
        p.size *= 0.95;
        return p.life > 0;
    });
    
    stars.forEach(star => {
        star.y += star.speed;
        if (star.y > canvas.height) {
            star.y = 0;
            star.x = Math.random() * canvas.width;
        }
    });
}

function draw() {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    drawStars();
    
    if (!gameRunning) return;
    
    player.draw();
    
    if (activePowerUp === 'SHIELD') {
        ctx.strokeStyle = '#00ccff';
        ctx.lineWidth = 3;
        ctx.globalAlpha = 0.5 + Math.sin(frameCount * 0.1) * 0.3;
        ctx.beginPath();
        ctx.arc(player.x + player.width/2, player.y + player.height/2, 45, 0, Math.PI*2);
        ctx.stroke();
        ctx.globalAlpha = 1;
    }
    
    player.bullets.forEach(bullet => {
        ctx.fillStyle = bullet.color;
        ctx.shadowColor = bullet.color;
        ctx.shadowBlur = 10;
        ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
        ctx.shadowBlur = 0;
    });
    
    enemies.forEach(drawEnemy);
    powerUps.forEach(drawPowerUp);
    
    particles.forEach(p => {
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.life / 30;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
    });
    ctx.globalAlpha = 1;
    
    drawActivePowerUpIndicator();
}

function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

// ==================== BUTTON HANDLERS ====================
startBtn.addEventListener('click', () => {
    startScreen.classList.add('hidden');
    resetGame();
    gameRunning = true;
});

restartBtn.addEventListener('click', () => {
    gameOverScreen.classList.add('hidden');
    resetGame();
    gameRunning = true;
});

// Start the loop
gameLoop();
