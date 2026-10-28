const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const overlay = document.getElementById('gameOverlay');

const WORLD_WIDTH = 2300;
const WORLD_HEIGHT = 720;
const GRAVITY = 1700;
const MOVE_SPEED = 310;
const JUMP_SPEED = 650;

let state = 'menu';
let collected = 0;
let cameraX = 0;
let lastTime = 0;
let animationId = 0;
const keys = {};

const player = {
    x: 120,
    y: 450,
    width: 62,
    height: 76,
    velocityX: 0,
    velocityY: 0,
    grounded: false,
    facing: 1
};

const platforms = [
    { x: 0, y: 526, width: 520, height: 194, dirt: true },
    { x: 760, y: 526, width: 1540, height: 194, dirt: true },
    { x: 330, y: 420, width: 220, height: 24, wood: true },
    { x: 520, y: 350, width: 260, height: 24, wood: true },
    { x: 760, y: 420, width: 220, height: 24, wood: true },
    { x: 980, y: 350, width: 230, height: 24, wood: true },
    { x: 1210, y: 440, width: 190, height: 24, wood: true },
    { x: 1400, y: 360, width: 220, height: 24, wood: true },
    { x: 1620, y: 420, width: 180, height: 24, wood: true },
    { x: 1800, y: 340, width: 220, height: 24, wood: true }
];

const tank = { x: 2070, y: 330, width: 155, height: 196 };
const pollution = { x: 520, y: 570, width: 240, height: 150 };

const dropPositions = [
    [260, 430], [390, 352], [590, 278], [700, 318], [820, 350],
    [930, 278], [1060, 310], [1180, 370], [1290, 260], [1450, 290],
    [1530, 355], [1690, 330], [1840, 272], [1920, 375], [1980, 300],
    [2120, 260], [2200, 430], [470, 480], [760, 480], [890, 430]
];
let drops = [];

function resetGame() {
    collected = 0;
    player.x = 120;
    player.y = 450;
    player.velocityX = 0;
    player.velocityY = 0;
    player.grounded = false;
    cameraX = 0;
    drops = dropPositions.map((position, index) => ({ x: position[0], y: position[1], collected: false, phase: index * 0.6 }));
}

function startGame() {
    resetGame();
    state = 'playing';
    overlay.className = 'game-overlay hidden';
    lastTime = performance.now();
    cancelAnimationFrame(animationId);
    animationId = requestAnimationFrame(gameLoop);
}

function showMenu() {
    state = 'menu';
    resetGame();
    overlay.className = 'game-overlay start-menu';
    overlay.innerHTML = `
        <div class="menu-brand"><img src="img/cw_logo_horizontal.png" alt="charity: water"></div>
        <div class="menu-title"><h1>DROP<br><strong>BY DROP</strong></h1><p>Small drops make a big difference.</p></div>
        <div class="menu-actions">
            <button id="menuPlayButton" class="primary-button" type="button">PLAY</button>
            <button id="howButton" class="menu-button" type="button">HOW TO PLAY</button>
            <a id="aboutButton" class="menu-button" href="https://www.charitywater.org/" target="_blank" rel="noopener">ABOUT charity: water</a>
        </div>`;
    document.getElementById('menuPlayButton').addEventListener('click', startGame);
    document.getElementById('howButton').addEventListener('click', showInstructions);
}

function showInstructions() {
    overlay.innerHTML = `
        <div class="menu-title instructions"><h1>HOW TO PLAY</h1>
        <p>Use A/D or the arrow keys to move. Press W, Space, or Up to jump.<br>Collect 20 drops and reach the water tank.</p></div>
        <div class="menu-actions"><button id="instructionsBack" class="primary-button" type="button">BACK</button></div>`;
    document.getElementById('instructionsBack').addEventListener('click', showMenu);
}

function showPause() {
    state = 'paused';
    overlay.className = 'game-overlay state-screen';
    overlay.innerHTML = `
        <div class="state-panel"><h1>PAUSED</h1><p>The water mission will wait.</p>
        <button id="resumeButton" class="primary-button" type="button">RESUME</button>
        <button id="pauseMenuButton" class="menu-button" type="button">BACK TO MENU</button></div>`;
    document.getElementById('resumeButton').addEventListener('click', () => {
        state = 'playing';
        overlay.className = 'game-overlay hidden';
        lastTime = performance.now();
        animationId = requestAnimationFrame(gameLoop);
    });
    document.getElementById('pauseMenuButton').addEventListener('click', showMenu);
}

function showGameOver() {
    state = 'gameover';
    overlay.className = 'game-overlay state-screen game-over';
    overlay.innerHTML = `
        <div class="state-panel"><h1>GAME OVER</h1><p>Keep going!<br>Every drop counts.</p>
        <button id="retryButton" class="primary-button" type="button">TRY AGAIN</button>
        <button id="gameOverMenuButton" class="menu-button" type="button">BACK TO MENU</button></div>`;
    document.getElementById('retryButton').addEventListener('click', startGame);
    document.getElementById('gameOverMenuButton').addEventListener('click', showMenu);
}

function showComplete() {
    state = 'complete';
    overlay.className = 'game-overlay state-screen complete';
    overlay.innerHTML = `
        <div class="state-panel"><h1>LEVEL COMPLETE!</h1><p>You helped bring clean water to the community.</p>
        <button id="nextButton" class="primary-button" type="button">PLAY AGAIN</button></div>`;
    document.getElementById('nextButton').addEventListener('click', startGame);
}

function rectangleCollision(a, b) {
    return a.x < b.x + b.width && a.x + a.width > b.x &&
        a.y < b.y + b.height && a.y + a.height > b.y;
}

function update(deltaTime) {
    player.velocityX = 0;
    if (keys.ArrowLeft || keys.KeyA) {
        player.velocityX = -MOVE_SPEED;
        player.facing = -1;
    }
    if (keys.ArrowRight || keys.KeyD) {
        player.velocityX = MOVE_SPEED;
        player.facing = 1;
    }

    player.x += player.velocityX * deltaTime;
    player.x = Math.max(0, Math.min(WORLD_WIDTH - player.width, player.x));

    player.velocityY += GRAVITY * deltaTime;
    player.y += player.velocityY * deltaTime;
    player.grounded = false;

    for (const platform of platforms) {
        const previousBottom = player.y + player.height - player.velocityY * deltaTime;
        const currentBottom = player.y + player.height;
        const horizontalOverlap = player.x + player.width > platform.x && player.x < platform.x + platform.width;
        const crossedTop = previousBottom <= platform.y + 2 && currentBottom >= platform.y && player.velocityY >= 0;
        if (horizontalOverlap && crossedTop) {
            player.y = platform.y - player.height;
            player.velocityY = 0;
            player.grounded = true;
        }
    }

    for (const drop of drops) {
        if (!drop.collected) {
            const dropBox = { x: drop.x - 14, y: drop.y - 18, width: 28, height: 36 };
            if (rectangleCollision(player, dropBox)) {
                drop.collected = true;
                collected += 1;
            }
        }
    }

    if (rectangleCollision(player, pollution)) {
        showGameOver();
    }

    if (player.y > WORLD_HEIGHT + 100) {
        showGameOver();
    }

    if (collected === 20 && rectangleCollision(player, tank)) {
        showComplete();
    }

    const targetCamera = Math.max(0, Math.min(WORLD_WIDTH - canvas.width, player.x - canvas.width * 0.38));
    cameraX += (targetCamera - cameraX) * Math.min(1, deltaTime * 4);
}

function drawCloud(x, y, scale) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(0, 18, 24, 0, Math.PI * 2);
    ctx.arc(30, 0, 34, 0, Math.PI * 2);
    ctx.arc(68, 16, 27, 0, Math.PI * 2);
    ctx.arc(96, 22, 19, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
}

function drawBackground() {
    const sky = ctx.createLinearGradient(0, 0, 0, WORLD_HEIGHT);
    sky.addColorStop(0, '#70bce5');
    sky.addColorStop(0.58, '#b4ddef');
    sky.addColorStop(1, '#f5c277');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, WORLD_HEIGHT * 2, WORLD_HEIGHT);

    drawCloud(140 - cameraX * 0.12, 105, 1.15);
    drawCloud(620 - cameraX * 0.12, 70, 1.35);
    drawCloud(1080 - cameraX * 0.12, 130, 0.85);
    drawCloud(1750 - cameraX * 0.12, 80, 1.25);

    ctx.fillStyle = '#91aeb1';
    ctx.beginPath();
    ctx.moveTo(-100, 420);
    for (let x = -100; x <= 2300; x += 220) {
        ctx.lineTo(x + 110, 250 + (x % 440 === 0 ? 35 : 0));
        ctx.lineTo(x + 220, 420);
    }
    ctx.lineTo(2400, 540);
    ctx.lineTo(-100, 540);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#d2c2a0';
    ctx.beginPath();
    ctx.moveTo(0, 430);
    ctx.lineTo(180, 360); ctx.lineTo(340, 430);
    ctx.lineTo(520, 320); ctx.lineTo(720, 430);
    ctx.lineTo(920, 350); ctx.lineTo(1120, 430);
    ctx.lineTo(1320, 300); ctx.lineTo(1540, 430);
    ctx.lineTo(1760, 340); ctx.lineTo(1980, 430);
    ctx.lineTo(2300, 350); ctx.lineTo(2300, 530); ctx.lineTo(0, 530);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#ead7ad';
    ctx.fillRect(850, 380, 180, 80);
    ctx.fillRect(1050, 390, 130, 70);
    ctx.fillRect(1550, 370, 170, 90);
    ctx.fillStyle = '#b97c55';
    ctx.fillRect(850, 380, 180, 12);
    ctx.fillRect(1050, 390, 130, 12);
    ctx.fillRect(1550, 370, 170, 12);
}

function drawPlatform(platform) {
    if (platform.dirt) {
        ctx.fillStyle = '#72bf38';
        ctx.fillRect(platform.x, platform.y, platform.width, 9);
        ctx.fillStyle = '#a86b3d';
        ctx.fillRect(platform.x, platform.y + 9, platform.width, platform.height);
        ctx.fillStyle = '#75462e';
        for (let y = platform.y + 38; y < platform.y + platform.height; y += 34) {
            ctx.fillRect(platform.x + 18, y, 8, 22);
            ctx.fillRect(platform.x + 150, y, 8, 22);
        }
        ctx.strokeStyle = '#6e452d';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(platform.x, platform.y + 40);
        ctx.lineTo(platform.x + platform.width, platform.y + 40);
        ctx.stroke();
    } else {
        ctx.fillStyle = '#7ebc42';
        ctx.fillRect(platform.x, platform.y, platform.width, 10);
        ctx.fillStyle = '#8b5a36';
        ctx.fillRect(platform.x, platform.y + 10, platform.width, platform.height);
        ctx.fillStyle = '#5e3a27';
        ctx.fillRect(platform.x, platform.y + 10, platform.width, 5);
        ctx.strokeStyle = '#65432d';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(platform.x + 20, platform.y + 14);
        ctx.lineTo(platform.x + platform.width - 20, platform.y + 14);
        ctx.stroke();
    }
}

function drawPlayer() {
    ctx.save();
    ctx.translate(player.x + player.width / 2, player.y + player.height / 2);
    ctx.scale(player.facing, 1);

    ctx.strokeStyle = '#16324f';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(-18, 20); ctx.lineTo(-28, 34);
    ctx.moveTo(18, 20); ctx.lineTo(28, 34);
    ctx.moveTo(-22, 4); ctx.lineTo(-34, 14);
    ctx.moveTo(22, 4); ctx.lineTo(34, 14);
    ctx.stroke();

    ctx.fillStyle = '#2096df';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(0, -38);
    ctx.bezierCurveTo(-31, -16, -34, 28, 0, 34);
    ctx.bezierCurveTo(34, 28, 31, -16, 0, -38);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#16324f';
    ctx.beginPath(); ctx.arc(-11, 0, 3.5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(11, 0, 3.5, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#16324f';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0, 9, 7, 0.15, Math.PI - 0.15); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.75)';
    ctx.beginPath(); ctx.arc(-13, -15, 8, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
}

function drawDrop(drop) {
    const bob = Math.sin(performance.now() * 0.003 + drop.phase) * 7;
    ctx.save();
    ctx.translate(drop.x, drop.y + bob);
    ctx.shadowColor = '#b9e8ff';
    ctx.shadowBlur = 18;
    ctx.fillStyle = '#32a9ff';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, -21);
    ctx.bezierCurveTo(-18, 0, -16, 22, 0, 24);
    ctx.bezierCurveTo(16, 22, 18, 0, 0, -21);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.ellipse(-6, -5, 4, 7, -0.4, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
}

function drawTank() {
    ctx.fillStyle = '#173b63';
    ctx.fillRect(tank.x - 10, tank.y + 150, 14, 46);
    ctx.fillRect(tank.x + tank.width - 4, tank.y + 150, 14, 46);
    ctx.fillStyle = '#0a5fa5';
    ctx.fillRect(tank.x, tank.y, tank.width, tank.height);
    ctx.strokeStyle = '#174b77';
    ctx.lineWidth = 7;
    ctx.strokeRect(tank.x, tank.y, tank.width, tank.height);
    ctx.fillStyle = '#0d75c1';
    ctx.fillRect(tank.x + 10, tank.y + 35, tank.width - 20, 8);
    ctx.fillRect(tank.x + 10, tank.y + 92, tank.width - 20, 8);
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.moveTo(tank.x + 77, tank.y + 75);
    ctx.bezierCurveTo(tank.x + 48, tank.y + 112, tank.x + 47, tank.y + 145, tank.x + 77, tank.y + 150);
    ctx.bezierCurveTo(tank.x + 107, tank.y + 145, tank.x + 106, tank.y + 112, tank.x + 77, tank.y + 75); ctx.fill();
}

function drawPollution() {
    ctx.fillStyle = '#263b4e';
    ctx.fillRect(pollution.x, pollution.y, pollution.width, pollution.height);
    ctx.fillStyle = '#9abf42';
    for (let x = pollution.x; x < pollution.x + pollution.width; x += 30) {
        ctx.beginPath(); ctx.arc(x, pollution.y + 8 + (x % 60 === 0 ? 4 : 0), 18, Math.PI, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = '#7d8d8e';
    ctx.save(); ctx.translate(600, 625); ctx.rotate(-0.7); ctx.fillRect(-20, -8, 40, 16); ctx.restore();
    ctx.fillStyle = '#d6c9ad';
    ctx.save(); ctx.translate(690, 650); ctx.rotate(0.5); ctx.fillRect(-18, -10, 36, 20); ctx.restore();
    ctx.fillStyle = '#717c7d';
    ctx.beginPath(); ctx.ellipse(560, 650, 28, 18, 0.2, 0, Math.PI * 2); ctx.fill();
}

function drawTree(x, y, scale) {
    ctx.save(); ctx.translate(x, y); ctx.scale(scale, scale);
    ctx.fillStyle = '#7b5030'; ctx.fillRect(-8, -40, 16, 70);
    ctx.fillStyle = '#4d9d50';
    ctx.beginPath(); ctx.arc(-28, -52, 34, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(18, -58, 42, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(42, -34, 30, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
}

function drawHUD() {
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = 'rgba(22,50,79,.86)';
    ctx.beginPath(); ctx.roundRect(22, 18, 260, 85, 12); ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 18px Verdana'; ctx.fillText('Water Collected', 78, 48);
    ctx.font = 'bold 24px Verdana'; ctx.fillText(`${collected} / 20`, 78, 76);
    ctx.fillStyle = '#2e9df7'; ctx.beginPath(); ctx.arc(49, 50, 20, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.moveTo(49, 31); ctx.bezierCurveTo(35, 48, 37, 63, 49, 68); ctx.bezierCurveTo(61, 63, 63, 48, 49, 31); ctx.fill();
    ctx.fillStyle = '#17425b'; ctx.beginPath(); ctx.roundRect(35, 82, 235, 12, 6); ctx.fill();
    ctx.fillStyle = '#2e9df7'; ctx.beginPath(); ctx.roundRect(35, 82, 235 * collected / 20, 12, 6); ctx.fill();

    ctx.fillStyle = 'rgba(31,78,120,.9)'; ctx.beginPath(); ctx.roundRect(canvas.width - 194, 18, 110, 52, 10); ctx.fill();
    ctx.fillStyle = '#ffffff'; ctx.font = 'bold 22px Verdana'; ctx.textAlign = 'center'; ctx.fillText('Level 1', canvas.width - 139, 51); ctx.textAlign = 'left';
    ctx.fillStyle = '#1d3450'; ctx.beginPath(); ctx.arc(canvas.width - 58, 44, 28, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffffff'; ctx.fillRect(canvas.width - 66, 34, 6, 20); ctx.fillRect(canvas.width - 56, 34, 6, 20);
    ctx.restore();
}

function drawWorld() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save(); ctx.translate(-cameraX, 0); ctx.scale(canvas.width / 1280, canvas.height / 720);
    drawBackground();
    drawPlatform({ x: 0, y: 526, width: 520, height: 194, dirt: true });
    platforms.slice(1).forEach(drawPlatform);
    drawPollution();
    drawTank();
    drawTree(280, 490, 0.8); drawTree(850, 500, 0.65); drawTree(1450, 500, 0.75); drawTree(1750, 490, 0.8);
    for (const drop of drops) if (!drop.collected) drawDrop(drop);
    drawPlayer();
    ctx.restore();
    drawHUD();
}

function gameLoop(time) {
    if (state !== 'playing') return;
    const deltaTime = Math.min((time - lastTime) / 1000, 0.032);
    lastTime = time;
    update(deltaTime);
    drawWorld();
    if (state === 'playing') animationId = requestAnimationFrame(gameLoop);
}

function jump() {
    if (state === 'playing' && player.grounded) {
        player.velocityY = -JUMP_SPEED;
        player.grounded = false;
    }
}

window.addEventListener('keydown', (event) => {
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'Space', 'KeyA', 'KeyD', 'KeyW'].includes(event.code)) event.preventDefault();
    keys[event.code] = true;
    if (!event.repeat && (event.code === 'Space' || event.code === 'ArrowUp' || event.code === 'KeyW')) jump();
});

window.addEventListener('keyup', (event) => { keys[event.code] = false; });

function bindHoldButton(id, key) {
    const button = document.getElementById(id);
    if (!button) return;
    const press = (event) => { event.preventDefault(); keys[key] = true; };
    const release = (event) => { event.preventDefault(); keys[key] = false; };
    button.addEventListener('pointerdown', press);
    button.addEventListener('pointerup', release);
    button.addEventListener('pointerleave', release);
    button.addEventListener('pointercancel', release);
}

bindHoldButton('leftButton', 'ArrowLeft');
bindHoldButton('rightButton', 'ArrowRight');
const jumpButton = document.getElementById('jumpButton');
jumpButton.addEventListener('pointerdown', (event) => { event.preventDefault(); jump(); });

document.getElementById('pauseButton').addEventListener('click', () => {
    if (state === 'playing') showPause();
});

document.getElementById('restartButton').addEventListener('click', startGame);

resetGame();
showMenu();
drawWorld();
