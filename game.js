// Configuration du jeu
const COLS = 10;
const ROWS = 20;
const BLOCK_SIZE = 30;
const COLORS = [
    null,
    '#00f5ff', // I - Cyan
    '#ffdd00', // O - Jaune
    '#aa00ff', // T - Violet
    '#00ff88', // S - Vert
    '#ff3366', // Z - Rouge
    '#ff8800', // L - Orange
    '#0088ff'  // J - Bleu
];

// Formes des pièces (tetrominos)
const SHAPES = [
    null,
    // I
    [
        [0, 0, 0, 0],
        [1, 1, 1, 1],
        [0, 0, 0, 0],
        [0, 0, 0, 0]
    ],
    // O
    [
        [2, 2],
        [2, 2]
    ],
    // T
    [
        [0, 3, 0],
        [3, 3, 3],
        [0, 0, 0]
    ],
    // S
    [
        [0, 4, 4],
        [4, 4, 0],
        [0, 0, 0]
    ],
    // Z
    [
        [5, 5, 0],
        [0, 5, 5],
        [0, 0, 0]
    ],
    // L
    [
        [0, 0, 6],
        [6, 6, 6],
        [0, 0, 0]
    ],
    // J
    [
        [7, 0, 0],
        [7, 7, 7],
        [0, 0, 0]
    ]
];

// État du jeu
let canvas, ctx, nextCanvas, nextCtx;
let board = [];
let currentPiece = null;
let nextPiece = null;
let score = 0;
let lines = 0;
let level = 1;
let gameRunning = false;
let gamePaused = false;
let dropInterval = 1000;
let lastDropTime = 0;
let animationId = null;

// Éléments DOM
const scoreEl = document.getElementById('score');
const linesEl = document.getElementById('lines');
const levelEl = document.getElementById('level');
const overlayEl = document.getElementById('gameOverlay');
const overlayTitleEl = document.getElementById('overlayTitle');
const overlayMessageEl = document.getElementById('overlayMessage');
const finalScoreEl = document.getElementById('finalScore');

// Initialisation
function init() {
    canvas = document.getElementById('gameBoard');
    ctx = canvas.getContext('2d');
    nextCanvas = document.getElementById('nextPiece');
    nextCtx = nextCanvas.getContext('2d');

    // Événements clavier
    document.addEventListener('keydown', handleKeyDown);

    // Initialiser le plateau
    resetBoard();
    drawBoard();
    drawNextPiece();
}

// Réinitialiser le plateau
function resetBoard() {
    board = [];
    for (let row = 0; row < ROWS; row++) {
        board[row] = new Array(COLS).fill(0);
    }
}

// Créer une nouvelle pièce
function createPiece() {
    const type = Math.floor(Math.random() * 7) + 1;
    const shape = SHAPES[type].map(row => [...row]);
    return {
        type,
        shape,
        x: Math.floor(COLS / 2) - Math.floor(shape[0].length / 2),
        y: 0
    };
}

// Dessiner un bloc
function drawBlock(ctx, x, y, color, size = BLOCK_SIZE) {
    const padding = 1;
    const innerSize = size - padding * 2;

    // Bloc principal avec dégradé
    const gradient = ctx.createLinearGradient(x * size, y * size, x * size + size, y * size + size);
    gradient.addColorStop(0, color);
    gradient.addColorStop(1, shadeColor(color, -30));

    ctx.fillStyle = gradient;
    ctx.fillRect(x * size + padding, y * size + padding, innerSize, innerSize);

    // Effet de brillance
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.fillRect(x * size + padding, y * size + padding, innerSize, innerSize / 4);

    // Bordure intérieure
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x * size + padding + 1, y * size + padding + 1, innerSize - 2, innerSize - 2);

    // Ombre
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.fillRect(x * size + padding, y * size + size - padding - 3, innerSize, 3);
}

// Assombrir/éclaircir une couleur
function shadeColor(color, percent) {
    const num = parseInt(color.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = (num >> 16) + amt;
    const G = (num >> 8 & 0x00FF) + amt;
    const B = (num & 0x0000FF) + amt;
    return '#' + (0x1000000 +
        (R < 255 ? (R < 1 ? 0 : R) : 255) * 0x10000 +
        (G < 255 ? (G < 1 ? 0 : G) : 255) * 0x100 +
        (B < 255 ? (B < 1 ? 0 : B) : 255)
    ).toString(16).slice(1);
}

// Dessiner le plateau
function drawBoard() {
    // Fond avec grille
    ctx.fillStyle = '#0a0a1a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Grille
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    for (let x = 0; x <= COLS; x++) {
        ctx.beginPath();
        ctx.moveTo(x * BLOCK_SIZE, 0);
        ctx.lineTo(x * BLOCK_SIZE, canvas.height);
        ctx.stroke();
    }
    for (let y = 0; y <= ROWS; y++) {
        ctx.beginPath();
        ctx.moveTo(0, y * BLOCK_SIZE);
        ctx.lineTo(canvas.width, y * BLOCK_SIZE);
        ctx.stroke();
    }

    // Blocs fixés
    for (let row = 0; row < ROWS; row++) {
        for (let col = 0; col < COLS; col++) {
            if (board[row][col]) {
                drawBlock(ctx, col, row, COLORS[board[row][col]]);
            }
        }
    }

    // Pièce courante
    if (currentPiece) {
        drawPiece(ctx, currentPiece);
        drawGhostPiece();
    }
}

// Dessiner la pièce fantôme (prévisualisation)
function drawGhostPiece() {
    if (!currentPiece) return;

    let ghostY = currentPiece.y;
    while (!collision(currentPiece.shape, currentPiece.x, ghostY + 1)) {
        ghostY++;
    }

    if (ghostY !== currentPiece.y) {
        ctx.globalAlpha = 0.3;
        for (let row = 0; row < currentPiece.shape.length; row++) {
            for (let col = 0; col < currentPiece.shape[row].length; col++) {
                if (currentPiece.shape[row][col]) {
                    drawBlock(ctx, currentPiece.x + col, ghostY + row, COLORS[currentPiece.shape[row][col]]);
                }
            }
        }
        ctx.globalAlpha = 1;
    }
}

// Dessiner une pièce
function drawPiece(ctx, piece, offsetX = 0, offsetY = 0) {
    for (let row = 0; row < piece.shape.length; row++) {
        for (let col = 0; col < piece.shape[row].length; col++) {
            if (piece.shape[row][col]) {
                drawBlock(ctx, piece.x + col + offsetX, piece.y + row + offsetY, COLORS[piece.shape[row][col]]);
            }
        }
    }
}

// Dessiner la prochaine pièce
function drawNextPiece() {
    nextCtx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    nextCtx.fillRect(0, 0, nextCanvas.width, nextCanvas.height);

    if (nextPiece) {
        const size = 25;
        const shape = nextPiece.shape;
        const offsetX = (nextCanvas.width - shape[0].length * size) / 2;
        const offsetY = (nextCanvas.height - shape.length * size) / 2;

        for (let row = 0; row < shape.length; row++) {
            for (let col = 0; col < shape[row].length; col++) {
                if (shape[row][col]) {
                    const x = offsetX + col * size;
                    const y = offsetY + row * size;

                    // Bloc simplifié pour la prévisualisation
                    const gradient = nextCtx.createLinearGradient(x, y, x + size, y + size);
                    gradient.addColorStop(0, COLORS[shape[row][col]]);
                    gradient.addColorStop(1, shadeColor(COLORS[shape[row][col]], -30));

                    nextCtx.fillStyle = gradient;
                    nextCtx.fillRect(x + 1, y + 1, size - 2, size - 2);

                    nextCtx.fillStyle = 'rgba(255, 255, 255, 0.3)';
                    nextCtx.fillRect(x + 1, y + 1, size - 2, (size - 2) / 4);
                }
            }
        }
    }
}

// Vérifier les collisions
function collision(shape, x, y) {
    for (let row = 0; row < shape.length; row++) {
        for (let col = 0; col < shape[row].length; col++) {
            if (shape[row][col]) {
                const newX = x + col;
                const newY = y + row;

                if (newX < 0 || newX >= COLS || newY >= ROWS) {
                    return true;
                }

                if (newY >= 0 && board[newY][newX]) {
                    return true;
                }
            }
        }
    }
    return false;
}

// Rotation de la pièce
function rotate(shape) {
    const rows = shape.length;
    const cols = shape[0].length;
    const rotated = [];

    for (let col = 0; col < cols; col++) {
        rotated[col] = [];
        for (let row = rows - 1; row >= 0; row--) {
            rotated[col].push(shape[row][col]);
        }
    }

    return rotated;
}

// Fixer la pièce sur le plateau
function lockPiece() {
    for (let row = 0; row < currentPiece.shape.length; row++) {
        for (let col = 0; col < currentPiece.shape[row].length; col++) {
            if (currentPiece.shape[row][col]) {
                const y = currentPiece.y + row;
                const x = currentPiece.x + col;

                if (y < 0) {
                    gameOver();
                    return;
                }

                board[y][x] = currentPiece.shape[row][col];
            }
        }
    }

    clearLines();
    spawnPiece();
}

// Effacer les lignes complètes
function clearLines() {
    let linesCleared = 0;

    for (let row = ROWS - 1; row >= 0; row--) {
        if (board[row].every(cell => cell !== 0)) {
            board.splice(row, 1);
            board.unshift(new Array(COLS).fill(0));
            linesCleared++;
            row++; // Revérifier cette ligne
        }
    }

    if (linesCleared > 0) {
        // Système de score
        const points = [0, 100, 300, 500, 800];
        score += points[linesCleared] * level;
        lines += linesCleared;

        // Augmenter le niveau tous les 10 lignes
        const newLevel = Math.floor(lines / 10) + 1;
        if (newLevel > level) {
            level = newLevel;
            dropInterval = Math.max(100, 1000 - (level - 1) * 100);
        }

        updateUI();
    }
}

// Mettre à jour l'interface
function updateUI() {
    scoreEl.textContent = score.toLocaleString();
    linesEl.textContent = lines;
    levelEl.textContent = level;
}

// Faire apparaître une nouvelle pièce
function spawnPiece() {
    currentPiece = nextPiece || createPiece();
    nextPiece = createPiece();

    // Vérifier game over
    if (collision(currentPiece.shape, currentPiece.x, currentPiece.y)) {
        gameOver();
        return;
    }

    drawNextPiece();
}

// Descendre la pièce
function dropPiece() {
    if (!collision(currentPiece.shape, currentPiece.x, currentPiece.y + 1)) {
        currentPiece.y++;
    } else {
        lockPiece();
    }
}

// Toggle musique
function toggleMusic() {
    const isPlaying = chillMusic.toggle();
    const btn = document.getElementById('musicBtn');
    const icon = document.getElementById('musicIcon');
    const text = document.getElementById('musicText');

    if (isPlaying) {
        btn.classList.add('active');
        icon.textContent = '🎵';
        text.textContent = 'Musique ON';
    } else {
        btn.classList.remove('active');
        icon.textContent = '🔇';
        text.textContent = 'Musique OFF';
    }
}

// Gestion des touches
function handleKeyDown(e) {
    if (e.code === 'Space') {
        e.preventDefault();
        if (!gameRunning) {
            startGame();
        } else {
            togglePause();
        }
        return;
    }

    // Toggle musique avec M
    if (e.code === 'KeyM') {
        e.preventDefault();
        toggleMusic();
        return;
    }

    if (!gameRunning || gamePaused || !currentPiece) return;

    switch (e.code) {
        case 'ArrowLeft':
            e.preventDefault();
            if (!collision(currentPiece.shape, currentPiece.x - 1, currentPiece.y)) {
                currentPiece.x--;
            }
            break;

        case 'ArrowRight':
            e.preventDefault();
            if (!collision(currentPiece.shape, currentPiece.x + 1, currentPiece.y)) {
                currentPiece.x++;
            }
            break;

        case 'ArrowDown':
            e.preventDefault();
            dropPiece();
            score += 1;
            updateUI();
            break;

        case 'ArrowUp':
            e.preventDefault();
            const rotated = rotate(currentPiece.shape);
            // Wall kick simple
            let kick = 0;
            if (collision(rotated, currentPiece.x, currentPiece.y)) {
                if (!collision(rotated, currentPiece.x - 1, currentPiece.y)) {
                    kick = -1;
                } else if (!collision(rotated, currentPiece.x + 1, currentPiece.y)) {
                    kick = 1;
                } else if (!collision(rotated, currentPiece.x - 2, currentPiece.y)) {
                    kick = -2;
                } else if (!collision(rotated, currentPiece.x + 2, currentPiece.y)) {
                    kick = 2;
                } else {
                    break; // Impossible de tourner
                }
            }
            currentPiece.shape = rotated;
            currentPiece.x += kick;
            break;
    }

    drawBoard();
}

// Démarrer le jeu
function startGame() {
    resetBoard();
    score = 0;
    lines = 0;
    level = 1;
    dropInterval = 1000;
    gameRunning = true;
    gamePaused = false;

    updateUI();

    nextPiece = createPiece();
    spawnPiece();

    overlayEl.classList.add('hidden');

    lastDropTime = performance.now();
    gameLoop();
}

// Pause
function togglePause() {
    gamePaused = !gamePaused;

    if (gamePaused) {
        overlayTitleEl.textContent = 'PAUSE';
        overlayMessageEl.textContent = 'Appuyez sur ESPACE pour continuer';
        finalScoreEl.textContent = '';
        overlayEl.classList.remove('hidden');
    } else {
        overlayEl.classList.add('hidden');
        lastDropTime = performance.now();
        gameLoop();
    }
}

// Game Over
function gameOver() {
    gameRunning = false;
    cancelAnimationFrame(animationId);

    overlayTitleEl.textContent = 'GAME OVER';
    overlayMessageEl.textContent = 'Appuyez sur ESPACE pour rejouer';
    finalScoreEl.textContent = `Score: ${score.toLocaleString()}`;
    overlayEl.classList.remove('hidden');
}

// Boucle de jeu
function gameLoop(timestamp = 0) {
    if (!gameRunning || gamePaused) return;

    const deltaTime = timestamp - lastDropTime;

    if (deltaTime > dropInterval) {
        dropPiece();
        lastDropTime = timestamp;
    }

    drawBoard();
    animationId = requestAnimationFrame(gameLoop);
}

// Initialiser le jeu au chargement
document.addEventListener('DOMContentLoaded', init);
