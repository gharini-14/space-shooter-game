const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// UI Elements
const scoreEl = document.getElementById('score');
const livesEl = document.getElementById('lives');
const waveEl = document.getElementById('wave');
const highScoreEl = document.getElementById('highScore');
const startScreen = document.getElementById('startScreen');
const gameOverScreen = document.getElementById('gameOverScreen');
const pauseScreen = document.getElementById('pauseScreen');
const waveScreen = document.getElementById('waveScreen');
const waveText = document.getElementById('waveText');
const finalScoreEl = document.getElementById('finalScore');
const startBtn = document.getElementById('startBtn');
const restartBtn = document.getElementById('restartBtn');
const resumeBtn = document.getElementById('resumeBtn');
const pauseBtn = document.getElementById('pauseBtn');

// Game State
const MAX_LIVES = 3;
let gameRunning = false;
let gamePaused = false;
let score = 0;
let lives = MAX_LIVES;
let frameCount = 0;
let wave = 1;
let screenShake = 0;

// ==================== COMBO SYSTEM ====================
let combo = 0;
let comboTimer = 0;
let comboMultiplier = 1;
const COMBO_WINDOW = 90;   // frames a kill has to land within to keep the combo alive (~1.5s at 60fps)
const COMBO_STEP = 5;      // kills needed per multiplier bump
const COMBO_STEP_AMOUNT = 0.5;
const COMBO_MAX_MULT = 4;
let scorePopups = [];

// High Score
let highScore = parseInt(localStorage.getItem('spaceShooterHighScore')) || 0;
highScoreEl.textContent = `🏆 High: ${highScore}`;

// Input
const keys = {};
document.addEventListener('keydown', (e) => {
    keys[e.key] = true;
    if (e.key === 'p' || e.key === 'P') togglePause();
});
document.addEventListener('keyup', (e) => keys[e.key] = false);

// ==================== PAUSE SYSTEM ====================
function togglePause() {
    if (!gameRunning) return;
    gamePaused = !gamePaused;
    if (gamePaused) {
        pauseScreen.classList.remove('hidden');
        pauseBtn.textContent = '▶️';
    } else {
        pauseScreen.classList.add('hidden');
        pauseBtn.textContent = '⏸️';
    }
}

pauseBtn.addEventListener('click', togglePause);

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

// ==================== PLAYER (BIGGER & POWERFUL) ====================
const player = {
    x: canvas.width / 2 - 30,
    y: canvas.height - 100,
    width: 60,
    height: 60,
    speed: 8,
    color: '#00ff88',
    bullets: [],
    shootCooldown: 0,

    update() {
        if (keys['ArrowLeft'] && this.x > 0) this.x -= this.speed;
        if (keys['ArrowRight'] && this.x < canvas.width - this.width) this.x += this.speed;
        if (keys['ArrowUp'] && this.y > 0) this.y -= this.speed;
        if (keys['ArrowDown'] && this.y < canvas.height - this.height) this.y += this.speed;

        this.shoot();
        if (this.shootCooldown > 0) this.shootCooldown--;
    },

    shoot() {
        let cooldown = activePowerUp === 'RAPID_FIRE' ? 4 : 10;

        if (this.shootCooldown <= 0) {
            if (activePowerUp === 'RAPID_FIRE') {
                this.bullets.push(
                    { x: this.x + this.width/2 - 4, y: this.y, width: 8, height: 20, speed: 12, color: '#ff00ff', vx: 0 },
                    { x: this.x + 10, y: this.y + 10, width: 6, height: 18, speed: 11, color: '#ff66ff', vx: -1 },
                    { x: this.x + this.width - 16, y: this.y + 10, width: 6, height: 18, speed: 11, color: '#ff66ff', vx: 1 }
                );
            } else if (activePowerUp === 'SPREAD_SHOT') {
                this.bullets.push(
                    { x: this.x + this.width/2 - 4, y: this.y, width: 8, height: 20, speed: 12, color: '#ff6600', vx: 0 },
                    { x: this.x + this.width/2 - 4, y: this.y, width: 6, height: 18, speed: 10, color: '#ff8800', vx: -3 },
                    { x: this.x + this.width/2 - 4, y: this.y, width: 6, height: 18, speed: 10, color: '#ff8800', vx: 3 }
                );
            } else {
                // Double cannon for bigger ship
                this.bullets.push(
                    { x: this.x + 12, y: this.y, width: 8, height: 18, speed: 10, color: '#ffff00', vx: 0 },
                    { x: this.x + this.width - 20, y: this.y, width: 8, height: 18, speed: 10, color: '#ffff00', vx: 0 }
                );
            }
            this.shootCooldown = cooldown;
        }
    },

    draw() {
        const cx = this.x + this.width / 2;
        const topY = this.y;
        const botY = this.y + this.height;

        // Twin swept tail fins (behind the body)
        ctx.fillStyle = '#8a9099';
        ctx.beginPath();
        ctx.moveTo(cx - 8, this.y + this.height * 0.5);
        ctx.lineTo(cx - 30, botY + 10);
        ctx.lineTo(cx - 13, botY - 4);
        ctx.closePath();
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(cx + 8, this.y + this.height * 0.5);
        ctx.lineTo(cx + 30, botY + 10);
        ctx.lineTo(cx + 13, botY - 4);
        ctx.closePath();
        ctx.fill();

        // Red tips on the tail fins
        ctx.fillStyle = '#e63946';
        ctx.beginPath();
        ctx.moveTo(cx - 30, botY + 10);
        ctx.lineTo(cx - 24, botY + 9);
        ctx.lineTo(cx - 18, botY - 1);
        ctx.closePath();
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(cx + 30, botY + 10);
        ctx.lineTo(cx + 24, botY + 9);
        ctx.lineTo(cx + 18, botY - 1);
        ctx.closePath();
        ctx.fill();

        // Swept wings
        ctx.fillStyle = '#c7cbd1';
        ctx.beginPath();
        ctx.moveTo(cx - 6, this.y + this.height * 0.32);
        ctx.lineTo(this.x - this.width * 0.32, this.y + this.height * 0.52);
        ctx.lineTo(this.x - this.width * 0.12, this.y + this.height * 0.74);
        ctx.lineTo(cx - 9, this.y + this.height * 0.58);
        ctx.closePath();
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(cx + 6, this.y + this.height * 0.32);
        ctx.lineTo(this.x + this.width * 1.32, this.y + this.height * 0.52);
        ctx.lineTo(this.x + this.width * 1.12, this.y + this.height * 0.74);
        ctx.lineTo(cx + 9, this.y + this.height * 0.58);
        ctx.closePath();
        ctx.fill();

        // Red accent stripes along the wings
        ctx.strokeStyle = '#e63946';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(cx - 9, this.y + this.height * 0.36);
        ctx.lineTo(this.x - this.width * 0.28, this.y + this.height * 0.53);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(cx + 9, this.y + this.height * 0.36);
        ctx.lineTo(this.x + this.width * 1.28, this.y + this.height * 0.53);
        ctx.stroke();

        // Main fuselage - light grey gradient body
        const bodyGrad = ctx.createLinearGradient(this.x, topY, this.x, botY);
        bodyGrad.addColorStop(0, '#f2f3f5');
        bodyGrad.addColorStop(1, '#aeb2b8');
        ctx.fillStyle = bodyGrad;
        ctx.beginPath();
        ctx.moveTo(cx, topY);
        ctx.lineTo(cx + this.width * 0.2, this.y + this.height * 0.42);
        ctx.lineTo(cx + this.width * 0.15, botY);
        ctx.lineTo(cx - this.width * 0.15, botY);
        ctx.lineTo(cx - this.width * 0.2, this.y + this.height * 0.42);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#7d828a';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Nose accent stripe
        ctx.strokeStyle = '#e63946';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(cx, topY + 4);
        ctx.lineTo(cx, this.y + this.height * 0.3);
        ctx.stroke();

        // Cockpit canopy - dark glass with reddish glow
        const canopyGrad = ctx.createRadialGradient(
            cx, this.y + this.height * 0.26, 1,
            cx, this.y + this.height * 0.26, 13
        );
        canopyGrad.addColorStop(0, '#ff7a7a');
        canopyGrad.addColorStop(0.5, '#3a1030');
        canopyGrad.addColorStop(1, '#0d0510');
        ctx.fillStyle = canopyGrad;
        ctx.beginPath();
        ctx.ellipse(cx, this.y + this.height * 0.26, 7, 13, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#5c5f66';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Twin engine nozzles
        ctx.fillStyle = '#2b2d31';
        ctx.beginPath();
        ctx.arc(cx - 12, botY - 4, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(cx + 12, botY - 4, 7, 0, Math.PI * 2);
        ctx.fill();

        // Engine glow
        ctx.fillStyle = '#00ccff';
        ctx.shadowColor = '#00ccff';
        ctx.shadowBlur = 15;
        ctx.beginPath();
        ctx.arc(cx - 12, botY - 2, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(cx + 12, botY - 2, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Small red wingtip lights
        ctx.fillStyle = '#e63946';
        ctx.beginPath();
        ctx.arc(this.x - this.width * 0.12, this.y + this.height * 0.74, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(this.x + this.width * 1.12, this.y + this.height * 0.74, 3, 0, Math.PI * 2);
        ctx.fill();
    }
};

// ==================== ENEMY TYPES (SLOWER) ====================
const ENEMY_TYPES = {
    BASIC: { hp: 1, size: 35, speedMult: 0.7, colorBase: 300, points: 10 },
    FAST: { hp: 1, size: 28, speedMult: 1.3, colorBase: 180, points: 20 },
    TANK: { hp: 3, size: 50, speedMult: 0.4, colorBase: 0, points: 30 },
    ZIGZAG: { hp: 2, size: 32, speedMult: 0.8, colorBase: 60, points: 25 }
};

let enemies = [];
let enemySpawnRate = 100; // Much slower spawn

function spawnEnemy() {
    const types = Object.keys(ENEMY_TYPES);
    let typeIndex = Math.floor(Math.random() * types.length);
    if (score < 50) typeIndex = 0;
    else if (score < 150) typeIndex = Math.floor(Math.random() * 2);

    const typeKey = types[typeIndex];
    const type = ENEMY_TYPES[typeKey];
    const size = type.size;

    enemies.push({
        x: Math.random() * (canvas.width - size),
        y: -size,
        width: size,
        height: size,
        speed: (1 + Math.random() * 1 + score / 1000) * type.speedMult,
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
        ctx.fillRect(enemy.x + enemy.width/2 - 5, enemy.y + 10, 10, 10);
    }

    ctx.restore();
}

// ==================== POWER-UPS ====================
let powerUps = [];
let activePowerUp = null;
let powerUpTimer = 0;

const POWERUP_TYPES = {
    RAPID_FIRE: { color: '#ff00ff', duration: 400, symbol: '⚡' },
    SHIELD: { color: '#00ccff', duration: 800, symbol: '🛡️' },
    SPREAD_SHOT: { color: '#ff6600', duration: 400, symbol: '🔥' }
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

// ==================== COMBO DISPLAY ====================
function drawComboIndicator() {
    if (combo < 2) return;
    ctx.save();
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ff3366';
    ctx.font = 'bold 22px Arial';
    ctx.shadowColor = '#ff3366';
    ctx.shadowBlur = 12;
    const pulse = 1 + Math.sin(frameCount * 0.25) * 0.06;
    ctx.translate(canvas.width / 2, 90);
    ctx.scale(pulse, pulse);
    ctx.fillText(`COMBO x${combo}  (${comboMultiplier.toFixed(1)}x)`, 0, 0);
    ctx.restore();

    // combo timer bar so the player can see how long they have left
    const barWidth = 140;
    const barHeight = 5;
    const x = canvas.width / 2 - barWidth / 2;
    const y = 98;
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(x, y, barWidth, barHeight);
    ctx.fillStyle = '#ff3366';
    ctx.fillRect(x, y, barWidth * (comboTimer / COMBO_WINDOW), barHeight);
}

function drawScorePopups() {
    scorePopups.forEach(p => {
        ctx.save();
        ctx.globalAlpha = Math.max(p.life / 40, 0);
        ctx.fillStyle = p.color;
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(p.text, p.x, p.y);
        ctx.restore();
    });
}

// ==================== PARTICLES ====================
let particles = [];

function createExplosion(x, y, color) {
    for (let i = 0; i < 20; i++) {
        particles.push({
            x: x, y: y,
            vx: (Math.random() - 0.5) * 10,
            vy: (Math.random() - 0.5) * 10,
            size: Math.random() * 5 + 2,
            color: color,
            life: 40
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

// ==================== WAVE SYSTEM ====================
function showWave() {
    waveText.textContent = `WAVE ${wave}`;
    waveScreen.classList.remove('hidden');
    setTimeout(() => {
        waveScreen.classList.add('hidden');
    }, 2000);
}

function checkWaveProgression() {
    const newWave = Math.floor(score / 200) + 1;
    if (newWave > wave) {
        wave = newWave;
        waveEl.textContent = `Wave: ${wave}`;
        showWave();
        // Increase difficulty slightly per wave
        enemySpawnRate = Math.max(50, 100 - wave * 5);
    }
}

// ==================== SCREEN SHAKE ====================
function applyScreenShake() {
    if (screenShake > 0) {
        ctx.save();
        const dx = (Math.random() - 0.5) * screenShake;
        const dy = (Math.random() - 0.5) * screenShake;
        ctx.translate(dx, dy);
        screenShake *= 0.9;
        if (screenShake < 0.5) screenShake = 0;
    }
}

function releaseScreenShake() {
    if (screenShake > 0) ctx.restore();
}

// ==================== UI ====================
function updateUI() {
    scoreEl.textContent = `Score: ${score}`;
    waveEl.textContent = `Wave: ${wave}`;
    highScoreEl.textContent = `🏆 High: ${highScore}`;
}

function saveHighScore() {
    if (score > highScore) {
        highScore = score;
        localStorage.setItem('spaceShooterHighScore', highScore);
    }
}

// ==================== LIVES / HEARTS ====================
function createHeartsUI() {
    livesEl.innerHTML = '';
    for (let i = 0; i < MAX_LIVES; i++) {
        const span = document.createElement('span');
        span.className = 'heart';
        span.textContent = '❤️';
        livesEl.appendChild(span);
    }
}

function loseLife() {
    lives--;
    const hearts = livesEl.querySelectorAll('.heart');
    const heart = hearts[lives];
    if (heart) {
        heart.classList.add('breaking');
        setTimeout(() => {
            heart.classList.remove('breaking');
            heart.classList.add('lost');
            heart.textContent = '💔';
        }, 350);
    }
    if (lives <= 0) gameOver();
}

// ==================== COMBO HELPERS ====================
function registerKill(enemy) {
    combo++;
    comboTimer = COMBO_WINDOW;
    comboMultiplier = Math.min(COMBO_MAX_MULT, 1 + Math.floor(combo / COMBO_STEP) * COMBO_STEP_AMOUNT);

    const points = Math.round(enemy.points * comboMultiplier);
    score += points;

    const label = comboMultiplier > 1 ? `+${points} x${comboMultiplier.toFixed(1)}` : `+${points}`;
    scorePopups.push({
        x: enemy.x + enemy.width / 2,
        y: enemy.y,
        text: label,
        color: comboMultiplier > 1 ? '#ff3366' : '#ffff00',
        life: 40,
        vy: -1
    });

    screenShake = 3;
    createExplosion(enemy.x + enemy.width/2, enemy.y + enemy.height/2, enemy.color);
    updateUI();
}

function breakCombo() {
    combo = 0;
    comboTimer = 0;
    comboMultiplier = 1;
}

// ==================== GAME OVER / RESET ====================
function gameOver() {
    gameRunning = false;
    gamePaused = false;
    saveHighScore();
    finalScoreEl.innerHTML = `Score: ${score}<br>Wave: ${wave}<br><span style="color:#ffd700">🏆 High Score: ${highScore}</span>`;
    gameOverScreen.classList.remove('hidden');
    pauseBtn.classList.add('hidden');
}

function resetGame() {
    score = 0;
    lives = MAX_LIVES;
    frameCount = 0;
    wave = 1;
    enemies = [];
    particles = [];
    powerUps = [];
    player.bullets = [];
    activePowerUp = null;
    powerUpTimer = 0;
    enemySpawnRate = 100;
    player.x = canvas.width / 2 - 30;
    player.y = canvas.height - 100;
    breakCombo();
    scorePopups = [];
    createHeartsUI();
    updateUI();
}

// ==================== MAIN GAME LOOP ====================
function update() {
    if (!gameRunning || gamePaused) return;

    frameCount++;
    player.update();

    checkWaveProgression();

    if (frameCount % enemySpawnRate === 0) {
        spawnEnemy();
    }

    if (frameCount % 600 === 0) spawnPowerUp();

    player.bullets = player.bullets.filter(bullet => {
        bullet.y -= bullet.speed;
        if (bullet.vx) bullet.x += bullet.vx;
        return bullet.y > -bullet.height && bullet.x > -10 && bullet.x < canvas.width + 10;
    });

    enemies = enemies.filter(enemy => {
        enemy.y += enemy.speed;

        if (enemy.type === 'ZIGZAG') {
            enemy.angle += 0.08;
            enemy.x += Math.sin(enemy.angle) * 2;
            if (enemy.x < 0) enemy.x = 0;
            if (enemy.x > canvas.width - enemy.width) enemy.x = canvas.width - enemy.width;
        }

        if (checkCollision(player, enemy)) {
            if (activePowerUp === 'SHIELD') {
                createExplosion(enemy.x + enemy.width/2, enemy.y + enemy.height/2, '#00ccff');
                return false;
            }
            screenShake = 10;
            breakCombo();
            createExplosion(enemy.x + enemy.width/2, enemy.y + enemy.height/2, '#ff4444');
            createExplosion(player.x + player.width/2, player.y + player.height/2, '#00ff88');
            loseLife();
            updateUI();
            return false;
        }

        if (enemy.y > canvas.height) return false;

        for (let i = player.bullets.length - 1; i >= 0; i--) {
            if (checkCollision(player.bullets[i], enemy)) {
                enemy.hp--;
                createExplosion(player.bullets[i].x, player.bullets[i].y, '#ffff00');
                player.bullets.splice(i, 1);

                if (enemy.hp <= 0) {
                    registerKill(enemy);
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

    if (comboTimer > 0) {
        comboTimer--;
        if (comboTimer <= 0) {
            breakCombo();
        }
    }

    particles = particles.filter(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.life--;
        p.size *= 0.95;
        return p.life > 0;
    });

    scorePopups = scorePopups.filter(p => {
        p.y += p.vy;
        p.life--;
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
    applyScreenShake();

    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    drawStars();

    if (!gameRunning) {
        releaseScreenShake();
        return;
    }

    player.draw();

    if (activePowerUp === 'SHIELD') {
        ctx.strokeStyle = '#00ccff';
        ctx.lineWidth = 3;
        ctx.globalAlpha = 0.5 + Math.sin(frameCount * 0.1) * 0.3;
        ctx.beginPath();
        ctx.arc(player.x + player.width/2, player.y + player.height/2, 50, 0, Math.PI*2);
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
        ctx.globalAlpha = p.life / 40;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
    });
    ctx.globalAlpha = 1;

    drawScorePopups();
    drawActivePowerUpIndicator();
    drawComboIndicator();

    releaseScreenShake();
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
    pauseBtn.classList.remove('hidden');
    showWave();
});

restartBtn.addEventListener('click', () => {
    gameOverScreen.classList.add('hidden');
    resetGame();
    gameRunning = true;
    pauseBtn.classList.remove('hidden');
    showWave();
});

resumeBtn.addEventListener('click', () => {
    togglePause();
});

// Start the loop
gameLoop();
