const gameBoard = document.getElementById('game');
const player = document.getElementById('player');
const scoreText = document.getElementById('score');
const progressBar = document.getElementById('progressBar');
const overlay = document.getElementById('gameOverlay');
const overlayTitle = document.getElementById('overlayTitle');
const overlayText = document.getElementById('overlayText');
const startButton = document.getElementById('startButton');
const howButton = document.getElementById('howButton');
const aboutButton = document.getElementById('aboutButton');
const menuBackButton = document.getElementById('menuBackButton');
const pauseButton = document.getElementById('pauseButton');
const restartButton = document.getElementById('restartButton');
const waterTank = document.getElementById('waterTank');
const dropLayer = document.getElementById('dropLayer');
const platforms = document.querySelectorAll('.platform');
const pollutionAreas = document.querySelectorAll('.pollution');

const dropPositions = [
    [12, 43], [23, 56], [31, 48], [43, 57], [50, 67],
    [58, 52], [67, 49], [76, 60], [84, 54], [91, 43],
    [18, 70], [25, 68], [38, 68], [47, 57], [64, 63],
    [72, 65], [82, 70], [55, 49], [35, 48], [88, 70]
];
let drops = [];

function createDrops() {
    dropLayer.innerHTML = '';
    dropPositions.forEach((position) => {
        const drop = document.createElement('div');
        drop.className = 'drop';
        drop.style.left = `${position[0]}%`;
        drop.style.bottom = `${position[1]}%`;
        dropLayer.appendChild(drop);
    });
    drops = document.querySelectorAll('.drop');
}

let playerX = 4;
let playerY = 38;
let playerVelocityX = 0;
let playerVelocityY = 0;
let isGrounded = true;
let isPollutionResetting = false;
let collected = 0;
let isRunning = false;
let isPaused = false;
let gameAnimation = null;
let lastFrameTime = 0;

const keys = {};
const gravity = 1100;
const jumpPower = 520;
const moveSpeed = 210;

function getBoardSize() {
    const board = gameBoard.getBoundingClientRect();
    return { width: board.width, height: board.height };
}

function getElementRect(element) {
    const boardRect = gameBoard.getBoundingClientRect();
    const rect = element.getBoundingClientRect();
    return {
        left: rect.left - boardRect.left,
        right: rect.right - boardRect.left,
        top: rect.top - boardRect.top,
        bottom: rect.bottom - boardRect.top,
        width: rect.width,
        height: rect.height
    };
}

function overlaps(first, second) {
    return first.left < second.right &&
        first.right > second.left &&
        first.top < second.bottom &&
        first.bottom > second.top;
}

function updatePlayerPosition() {
    const boardSize = getBoardSize();
    player.style.left = `${(playerX / 100) * boardSize.width}px`;
    player.style.bottom = `${(playerY / 100) * boardSize.height}px`;
}

function resetGame() {
    collected = 0;
    playerX = 4;
    playerY = 38;
    playerVelocityY = 0;
    isGrounded = true;
    isPaused = false;
    isRunning = false;

    scoreText.textContent = collected;
    progressBar.style.width = '0%';
    pauseButton.setAttribute('aria-label', 'Pause game');
    restartButton.classList.remove('show');
    createDrops();

    drops.forEach((drop) => {
        drop.style.display = '';
    });

    updatePlayerPosition();
    showStartMenu();

    if (gameAnimation) {
        cancelAnimationFrame(gameAnimation);
    }
}

function showStartMenu() {
    overlay.className = 'game-overlay start-menu';
    overlay.innerHTML = `
        <div class="menu-brand"><img src="img/cw_logo_horizontal.png" alt="charity: water"></div>
        <div class="menu-title">
            <span class="menu-drop drop-left"></span>
            <span class="menu-drop drop-right"></span>
            <h1>DROP<br><strong>BY DROP</strong></h1>
            <p>Small drops make a big difference.</p>
        </div>
        <div class="menu-actions">
            <button id="startButtonLive" class="primary-button" type="button">PLAY</button>
            <button id="howButtonLive" class="menu-button" type="button">HOW TO PLAY</button>
            <button id="aboutButtonLive" class="menu-button" type="button">ABOUT charity: water</button>
            <button id="menuBackButtonLive" class="menu-button hidden-button" type="button">BACK TO MENU</button>
        </div>`;

    const playButton = document.getElementById('startButtonLive');
    const howButtonLive = document.getElementById('howButtonLive');
    const aboutButtonLive = document.getElementById('aboutButtonLive');
    const menuBackButtonLive = document.getElementById('menuBackButtonLive');

    playButton.addEventListener('click', () => {
        resetGame();
        startGame();
    });
    howButtonLive.addEventListener('click', () => {
        overlay.className = 'game-overlay start-menu how-screen';
        playButton.style.display = 'none';
        howButtonLive.style.display = 'none';
        aboutButtonLive.style.display = 'none';
        menuBackButtonLive.style.display = '';
        overlay.querySelector('.menu-title').innerHTML = '<h2>HOW TO PLAY</h2><p>Use arrow keys or the controls to move and jump. Collect 20 drops, avoid polluted water, and reach the tank.</p>';
    });
    aboutButtonLive.addEventListener('click', () => {
        window.open('https://www.charitywater.org/', '_blank', 'noopener,noreferrer');
    });
    menuBackButtonLive.addEventListener('click', showStartMenu);
}

function startGame() {
    overlay.className = 'game-overlay hidden';
    isRunning = true;
    isPaused = false;
    lastFrameTime = performance.now();
    gameAnimation = requestAnimationFrame(gameLoop);
}

function endGame(won) {
    isRunning = false;
    cancelAnimationFrame(gameAnimation);

    if (won) {
        overlay.className = 'game-overlay complete-screen';
        overlay.innerHTML = `
            <div class="end-copy">
                <h1>LEVEL COMPLETE!</h1>
                <div class="result-message">You helped bring clean water to the community.</div>
                <button id="nextButton" class="primary-button" type="button">NEXT LEVEL</button>
            </div>`;
        document.getElementById('nextButton').addEventListener('click', () => {
            resetGame();
            startGame();
        });
    } else {
        overlay.className = 'game-overlay game-over-screen';
        overlay.innerHTML = `
            <div class="sad-drop"></div>
            <div class="end-copy game-over-copy">
                <h1>GAME OVER</h1>
                <p>Keep going!<br>Every drop counts.</p>
                <button id="retryButton" class="primary-button" type="button">TRY AGAIN</button>
                <button id="backMenuButton" class="menu-button" type="button">BACK TO MENU</button>
            </div>`;
        document.getElementById('retryButton').addEventListener('click', () => {
            resetGame();
            startGame();
        });
        document.getElementById('backMenuButton').addEventListener('click', resetGame);
    }
}

function togglePause() {
    if (!isRunning) {
        return;
    }

    isPaused = !isPaused;
    pauseButton.setAttribute('aria-label', isPaused ? 'Resume game' : 'Pause game');

    if (!isPaused) {
        lastFrameTime = performance.now();
        gameAnimation = requestAnimationFrame(gameLoop);
    } else {
        cancelAnimationFrame(gameAnimation);
        overlay.className = 'game-overlay pause-screen';
        overlay.innerHTML = `
            <div class="end-copy game-over-copy">
                <h1>PAUSED</h1>
                <p>The water mission will wait.</p>
                <button id="resumeButton" class="primary-button" type="button">RESUME</button>
                <button id="pauseMenuButton" class="menu-button" type="button">BACK TO MENU</button>
            </div>`;
        document.getElementById('resumeButton').addEventListener('click', () => {
            overlay.className = 'game-overlay hidden';
            isPaused = false;
            lastFrameTime = performance.now();
            gameAnimation = requestAnimationFrame(gameLoop);
        });
        document.getElementById('pauseMenuButton').addEventListener('click', resetGame);
    }
}

function updatePlayer(deltaTime) {
    const boardSize = getBoardSize();
    const playerRectSize = getElementRect(player);
    const playerWidthPercent = (playerRectSize.width / boardSize.width) * 100;
    playerVelocityX = 0;

    if (keys.ArrowLeft || keys.KeyA) {
        playerVelocityX = -moveSpeed;
        player.style.transform = 'rotate(45deg) scaleX(-1)';
    } else if (keys.ArrowRight || keys.KeyD) {
        playerVelocityX = moveSpeed;
        player.style.transform = 'rotate(45deg)';
    }

    playerX += (playerVelocityX / boardSize.width) * 100 * deltaTime;

    if (playerX < 0) {
        playerX = 0;
    }
    if (playerX > 100 - playerWidthPercent) {
        playerX = 100 - playerWidthPercent;
    }

    updatePlayerPosition();

    let standingOnPlatform = null;
    const currentRect = getElementRect(player);

    platforms.forEach((platform) => {
        const platformRect = getElementRect(platform);
        const overlapsHorizontally = currentRect.right > platformRect.left &&
            currentRect.left < platformRect.right;
        const closeToTop = Math.abs(currentRect.bottom - platformRect.top) < 10;

        if (overlapsHorizontally && closeToTop) {
            standingOnPlatform = platformRect;
        }
    });

    if (isGrounded && standingOnPlatform) {
        playerY = ((boardSize.height - standingOnPlatform.top - currentRect.height) / boardSize.height) * 100;
        playerVelocityY = 0;
    } else {
        isGrounded = false;
        playerVelocityY -= gravity * deltaTime;
        playerY += (playerVelocityY / boardSize.height) * 100 * deltaTime;

        updatePlayerPosition();
        const fallingRect = getElementRect(player);

        platforms.forEach((platform) => {
            const platformRect = getElementRect(platform);
            const overlapsHorizontally = fallingRect.right > platformRect.left &&
                fallingRect.left < platformRect.right;
            const crossedTop = fallingRect.bottom >= platformRect.top &&
                playerVelocityY <= 0;

            if (overlapsHorizontally && crossedTop && fallingRect.top < platformRect.top) {
                playerY = ((boardSize.height - platformRect.top - fallingRect.height) / boardSize.height) * 100;
                playerVelocityY = 0;
                isGrounded = true;
            }
        });
    }

    if (playerY < 0) {
        resetAfterPollution();
    }

    updatePlayerPosition();
}

function collectDrops() {
    drops.forEach((drop) => {
        if (drop.style.display === 'none') {
            return;
        }

        if (overlaps(getElementRect(player), getElementRect(drop))) {
            drop.style.display = 'none';
            collected += 1;
            scoreText.textContent = collected;
            progressBar.style.width = `${(collected / 20) * 100}%`;
        }
    });
}

function resetAfterPollution() {
    if (isPollutionResetting) {
        return;
    }

    isPollutionResetting = true;
    collected = 0;
    scoreText.textContent = collected;
    progressBar.style.width = '0%';
    playerX = 4;
    playerY = 38;
    playerVelocityX = 0;
    playerVelocityY = 0;
    isGrounded = true;
    keys.ArrowLeft = false;
    keys.ArrowRight = false;
    keys.KeyA = false;
    keys.KeyD = false;

    drops.forEach((drop) => {
        drop.style.display = '';
    });
    updatePlayerPosition();

    window.setTimeout(() => {
        isPollutionResetting = false;
    }, 500);
}

function checkHazards() {
    const playerRect = getElementRect(player);

    pollutionAreas.forEach((area) => {
        if (overlaps(playerRect, getElementRect(area))) {
            resetAfterPollution();
        }
    });

    if (playerY < -3) {
        resetAfterPollution();
    }
}

function checkWin() {
    if (collected === 20 && overlaps(getElementRect(player), getElementRect(waterTank))) {
        endGame(true);
    }
}

function gameLoop(frameTime) {
    if (!isRunning || isPaused) {
        return;
    }

    const deltaTime = Math.min((frameTime - lastFrameTime) / 1000, 0.032);
    lastFrameTime = frameTime;

    updatePlayer(deltaTime);
    collectDrops();
    checkHazards();
    checkWin();

    if (isRunning) {
        gameAnimation = requestAnimationFrame(gameLoop);
    }
}

window.addEventListener('keydown', (event) => {
    if (['ArrowLeft', 'ArrowRight', 'Space', 'KeyA', 'KeyD', 'KeyW', 'ArrowUp'].includes(event.code)) {
        event.preventDefault();
    }

    keys[event.code] = true;

    // A fresh jump key press starts one jump. Holding it does not repeat.
    const isJumpKey = event.code === 'KeyW' || event.code === 'Space' || event.code === 'ArrowUp';
    if (isJumpKey && !event.repeat && isRunning && !isPaused && isGrounded) {
        playerVelocityY = jumpPower;
        isGrounded = false;
    }
});

window.addEventListener('keyup', (event) => {
    keys[event.code] = false;
});

pauseButton.addEventListener('click', togglePause);
restartButton.addEventListener('click', () => {
    resetGame();
    startGame();
});

resetGame();
