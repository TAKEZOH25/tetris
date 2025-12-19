/**
 * TETRIS - Logique du jeu principale
 * Couche 1: Hard Drop, Hold, Preview 3 pièces, 7-Bag
 */

// ===================
// ÉTAT DU JEU
// ===================
const GameState = {
    // Canvas et contextes
    canvas: null,
    ctx: null,
    nextCanvas: null,
    nextCtx: null,
    holdCanvas: null,
    holdCtx: null,

    // Plateau de jeu
    board: [],

    // Pièces
    currentPiece: null,
    nextPieces: [],      // Array de 3 pièces suivantes
    heldPiece: null,
    canHold: true,

    // Bag pour le randomizer 7-bag
    pieceBag: [],

    // Score et progression
    score: 0,
    lines: 0,
    level: 1,
    combo: 0,

    // États
    isRunning: false,
    isPaused: false,

    // Timing
    dropInterval: CONFIG.TIMING.BASE_DROP_INTERVAL,
    lastDropTime: 0,
    animationId: null,

    // Reset complet
    reset() {
        this.board = [];
        for (let row = 0; row < CONFIG.BOARD.ROWS; row++) {
            this.board[row] = new Array(CONFIG.BOARD.COLS).fill(0);
        }
        this.currentPiece = null;
        this.nextPieces = [];
        this.heldPiece = null;
        this.canHold = true;
        this.pieceBag = [];
        this.score = 0;
        this.lines = 0;
        this.level = 1;
        this.combo = 0;
        this.dropInterval = CONFIG.TIMING.BASE_DROP_INTERVAL;
        this.lastDropTime = 0;
    }
};

// ===================
// ÉLÉMENTS DOM (cache)
// ===================
const DOM = {
    score: null,
    lines: null,
    level: null,
    overlay: null,
    overlayTitle: null,
    overlayMessage: null,
    finalScore: null,
    holdBox: null,

    init() {
        this.score = document.getElementById('score');
        this.lines = document.getElementById('lines');
        this.level = document.getElementById('level');
        this.overlay = document.getElementById('gameOverlay');
        this.overlayTitle = document.getElementById('overlayTitle');
        this.overlayMessage = document.getElementById('overlayMessage');
        this.finalScore = document.getElementById('finalScore');
        this.holdBox = document.querySelector('.hold-box');
    }
};

// ===================
// SYSTÈME DE PIÈCES
// ===================
const PieceSystem = {
    /**
     * Créer une pièce à partir d'un type
     */
    create(type = null) {
        if (!type) {
            type = this.getNextFromBag();
        }

        const typeIndex = CONFIG.PIECE_TYPES.indexOf(type) + 1;
        const shape = Utils.deepClone(CONFIG.SHAPES[type]);

        return {
            type: type,
            typeIndex: typeIndex,
            shape: shape,
            x: Math.floor(CONFIG.BOARD.COLS / 2) - Math.floor(shape[0].length / 2),
            y: 0,
            rotation: 0
        };
    },

    /**
     * 7-Bag Randomizer - Distribution équitable des pièces
     */
    getNextFromBag() {
        if (GameState.pieceBag.length === 0) {
            GameState.pieceBag = Utils.shuffle([...CONFIG.PIECE_TYPES]);
        }
        return GameState.pieceBag.pop();
    },

    /**
     * Remplir la file des pièces suivantes
     */
    fillNextPieces() {
        while (GameState.nextPieces.length < CONFIG.PREVIEW.COUNT) {
            GameState.nextPieces.push(this.create());
        }
    },

    /**
     * Obtenir la prochaine pièce de la file
     */
    getNextPiece() {
        this.fillNextPieces();
        const piece = GameState.nextPieces.shift();
        this.fillNextPieces();
        return piece;
    },

    /**
     * Rotation de la matrice de forme
     */
    rotate(shape, clockwise = true) {
        const rows = shape.length;
        const cols = shape[0].length;
        const rotated = [];

        if (clockwise) {
            for (let col = 0; col < cols; col++) {
                rotated[col] = [];
                for (let row = rows - 1; row >= 0; row--) {
                    rotated[col].push(shape[row][col]);
                }
            }
        } else {
            for (let col = cols - 1; col >= 0; col--) {
                rotated[cols - 1 - col] = [];
                for (let row = 0; row < rows; row++) {
                    rotated[cols - 1 - col].push(shape[row][col]);
                }
            }
        }

        return rotated;
    }
};

// ===================
// SYSTÈME DE COLLISION
// ===================
const CollisionSystem = {
    /**
     * Vérifier si une position est valide
     */
    check(shape, x, y) {
        for (let row = 0; row < shape.length; row++) {
            for (let col = 0; col < shape[row].length; col++) {
                if (shape[row][col]) {
                    const newX = x + col;
                    const newY = y + row;

                    if (newX < 0 || newX >= CONFIG.BOARD.COLS || newY >= CONFIG.BOARD.ROWS) {
                        return true;
                    }

                    if (newY >= 0 && GameState.board[newY][newX]) {
                        return true;
                    }
                }
            }
        }
        return false;
    },

    /**
     * Trouver la position fantôme (où la pièce atterrirait)
     */
    getGhostY(piece) {
        let ghostY = piece.y;
        while (!this.check(piece.shape, piece.x, ghostY + 1)) {
            ghostY++;
        }
        return ghostY;
    }
};

// ===================
// SYSTÈME DE RENDU
// ===================
const RenderSystem = {
    /**
     * Dessiner un bloc
     */
    drawBlock(ctx, x, y, color, size = CONFIG.BOARD.BLOCK_SIZE) {
        const padding = 1;
        const innerSize = size - padding * 2;

        const gradient = ctx.createLinearGradient(
            x * size, y * size,
            x * size + size, y * size + size
        );
        gradient.addColorStop(0, color);
        gradient.addColorStop(1, Utils.shadeColor(color, -30));

        ctx.fillStyle = gradient;
        ctx.fillRect(x * size + padding, y * size + padding, innerSize, innerSize);

        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.fillRect(x * size + padding, y * size + padding, innerSize, innerSize / 4);

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.lineWidth = 1;
        ctx.strokeRect(x * size + padding + 1, y * size + padding + 1, innerSize - 2, innerSize - 2);

        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.fillRect(x * size + padding, y * size + size - padding - 3, innerSize, 3);
    },

    /**
     * Dessiner une pièce (générique, pour les previews)
     */
    drawPiecePreview(ctx, piece, offsetX, offsetY, size) {
        const shape = piece.shape;
        for (let row = 0; row < shape.length; row++) {
            for (let col = 0; col < shape[row].length; col++) {
                if (shape[row][col]) {
                    const x = offsetX + col * size;
                    const y = offsetY + row * size;

                    const gradient = ctx.createLinearGradient(x, y, x + size, y + size);
                    gradient.addColorStop(0, CONFIG.COLOR_MAP[shape[row][col]]);
                    gradient.addColorStop(1, Utils.shadeColor(CONFIG.COLOR_MAP[shape[row][col]], -30));

                    ctx.fillStyle = gradient;
                    ctx.fillRect(x + 1, y + 1, size - 2, size - 2);

                    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
                    ctx.fillRect(x + 1, y + 1, size - 2, (size - 2) / 4);
                }
            }
        }
    },

    /**
     * Dessiner le plateau complet
     */
    drawBoard() {
        const { ctx, canvas } = GameState;
        const { COLS, ROWS, BLOCK_SIZE } = CONFIG.BOARD;

        ctx.fillStyle = CONFIG.COLORS.BACKGROUND;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        if (CONFIG.VISUALS.GRID_ENABLED) {
            ctx.strokeStyle = CONFIG.COLORS.GRID;
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
        }

        for (let row = 0; row < ROWS; row++) {
            for (let col = 0; col < COLS; col++) {
                if (GameState.board[row][col]) {
                    this.drawBlock(ctx, col, row, CONFIG.COLOR_MAP[GameState.board[row][col]]);
                }
            }
        }

        if (GameState.currentPiece && CONFIG.VISUALS.GHOST_OPACITY > 0) {
            this.drawGhostPiece();
        }

        if (GameState.currentPiece) {
            this.drawCurrentPiece();
        }
    },

    /**
     * Dessiner la pièce fantôme
     */
    drawGhostPiece() {
        const piece = GameState.currentPiece;
        const ghostY = CollisionSystem.getGhostY(piece);

        if (ghostY !== piece.y) {
            GameState.ctx.globalAlpha = CONFIG.VISUALS.GHOST_OPACITY;
            for (let row = 0; row < piece.shape.length; row++) {
                for (let col = 0; col < piece.shape[row].length; col++) {
                    if (piece.shape[row][col]) {
                        this.drawBlock(
                            GameState.ctx,
                            piece.x + col,
                            ghostY + row,
                            CONFIG.COLOR_MAP[piece.shape[row][col]]
                        );
                    }
                }
            }
            GameState.ctx.globalAlpha = 1;
        }
    },

    /**
     * Dessiner la pièce courante
     */
    drawCurrentPiece() {
        const { ctx, currentPiece } = GameState;
        for (let row = 0; row < currentPiece.shape.length; row++) {
            for (let col = 0; col < currentPiece.shape[row].length; col++) {
                if (currentPiece.shape[row][col]) {
                    this.drawBlock(
                        ctx,
                        currentPiece.x + col,
                        currentPiece.y + row,
                        CONFIG.COLOR_MAP[currentPiece.shape[row][col]]
                    );
                }
            }
        }
    },

    /**
     * Dessiner les 3 prochaines pièces
     */
    drawNextPieces() {
        const { nextCtx, nextCanvas, nextPieces } = GameState;
        const size = 20;
        const spacing = 90;

        nextCtx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        nextCtx.fillRect(0, 0, nextCanvas.width, nextCanvas.height);

        nextPieces.forEach((piece, index) => {
            if (!piece) return;

            const shape = piece.shape;
            const pieceWidth = shape[0].length * size;
            const pieceHeight = shape.length * size;
            const offsetX = (nextCanvas.width - pieceWidth) / 2;
            const offsetY = 10 + index * spacing + (spacing - pieceHeight) / 2;

            this.drawPiecePreview(nextCtx, piece, offsetX, offsetY, size);
        });
    },

    /**
     * Dessiner la pièce en hold
     */
    drawHoldPiece() {
        const { holdCtx, holdCanvas, heldPiece, canHold } = GameState;
        const size = 20;

        holdCtx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        holdCtx.fillRect(0, 0, holdCanvas.width, holdCanvas.height);

        // Afficher l'état disabled
        if (DOM.holdBox) {
            if (!canHold) {
                DOM.holdBox.classList.add('disabled');
            } else {
                DOM.holdBox.classList.remove('disabled');
            }
        }

        if (heldPiece) {
            const shape = heldPiece.shape;
            const pieceWidth = shape[0].length * size;
            const pieceHeight = shape.length * size;
            const offsetX = (holdCanvas.width - pieceWidth) / 2;
            const offsetY = (holdCanvas.height - pieceHeight) / 2;

            // Rendre grisé si on ne peut pas hold
            if (!canHold) {
                holdCtx.globalAlpha = 0.5;
            }

            this.drawPiecePreview(holdCtx, heldPiece, offsetX, offsetY, size);

            holdCtx.globalAlpha = 1;
        }
    }
};

// ===================
// SYSTÈME DE SCORE
// ===================
const ScoreSystem = {
    add(points) {
        GameState.score += points;
        GameEvents.emit(EVENTS.SCORE_UPDATE, { score: GameState.score });
    },

    calculateLineScore(linesCleared) {
        const basePoints = CONFIG.SCORING.LINES[linesCleared] || 0;
        return basePoints * GameState.level;
    },

    handleCombo(linesCleared) {
        if (linesCleared > 0) {
            GameState.combo++;
            if (GameState.combo > 1) {
                const comboBonus = CONFIG.SCORING.COMBO_MULTIPLIER * GameState.combo * GameState.level;
                this.add(comboBonus);
                GameEvents.emit(EVENTS.COMBO, { combo: GameState.combo });
            }
        } else {
            GameState.combo = 0;
        }
    }
};

// ===================
// SYSTÈME DE JEU
// ===================
const GameSystem = {
    init() {
        // Canvas principal
        GameState.canvas = document.getElementById('gameBoard');
        GameState.ctx = GameState.canvas.getContext('2d');

        // Canvas des pièces suivantes
        GameState.nextCanvas = document.getElementById('nextPiece');
        GameState.nextCtx = GameState.nextCanvas.getContext('2d');

        // Canvas du hold
        GameState.holdCanvas = document.getElementById('holdPiece');
        GameState.holdCtx = GameState.holdCanvas.getContext('2d');

        // DOM
        DOM.init();

        // Événements
        document.addEventListener('keydown', InputSystem.handleKeyDown);
        document.addEventListener('keyup', InputSystem.handleKeyUp);

        this.setupEventListeners();

        // État initial
        GameState.reset();
        RenderSystem.drawBoard();
        RenderSystem.drawNextPieces();
        RenderSystem.drawHoldPiece();

        console.log('🎮 Tetris v1.1 - Couche 1 (Hard Drop, Hold, Preview 3)');
    },

    setupEventListeners() {
        GameEvents.on(EVENTS.LINES_CLEAR, (data) => {
            if (data.count === 4) {
                GameEvents.emit(EVENTS.TETRIS);
                console.log('🎯 TETRIS!');
            }
        });

        GameEvents.on(EVENTS.LEVEL_UP, (data) => {
            console.log(`📈 Niveau ${data.level}!`);
        });

        GameEvents.on(EVENTS.PIECE_HARD_DROP, (data) => {
            console.log(`⬇️ Hard Drop: +${data.points} points`);
        });
    },

    start() {
        GameState.reset();
        GameState.isRunning = true;
        GameState.isPaused = false;

        this.updateUI();

        // Remplir les pièces suivantes
        PieceSystem.fillNextPieces();
        this.spawnPiece();

        // Dessiner les previews
        RenderSystem.drawNextPieces();
        RenderSystem.drawHoldPiece();

        DOM.overlay.classList.add('hidden');

        GameEvents.emit(EVENTS.GAME_START);

        GameState.lastDropTime = performance.now();
        this.gameLoop();
    },

    spawnPiece() {
        GameState.currentPiece = PieceSystem.getNextPiece();
        GameState.canHold = true;

        if (CollisionSystem.check(GameState.currentPiece.shape, GameState.currentPiece.x, GameState.currentPiece.y)) {
            this.gameOver();
            return;
        }

        RenderSystem.drawNextPieces();
        RenderSystem.drawHoldPiece();
        GameEvents.emit(EVENTS.PIECE_SPAWN, { piece: GameState.currentPiece });
    },

    /**
     * Soft Drop - descendre d'une case
     */
    dropPiece() {
        if (!CollisionSystem.check(GameState.currentPiece.shape, GameState.currentPiece.x, GameState.currentPiece.y + 1)) {
            GameState.currentPiece.y++;
            return true;
        } else {
            this.lockPiece();
            return false;
        }
    },

    /**
     * Hard Drop - descendre instantanément
     */
    hardDrop() {
        const piece = GameState.currentPiece;
        const startY = piece.y;
        const ghostY = CollisionSystem.getGhostY(piece);

        // Calculer les points (2 points par cellule)
        const cellsDropped = ghostY - startY;
        const points = cellsDropped * CONFIG.SCORING.HARD_DROP;

        // Déplacer la pièce
        piece.y = ghostY;

        // Ajouter les points
        ScoreSystem.add(points);

        GameEvents.emit(EVENTS.PIECE_HARD_DROP, {
            cells: cellsDropped,
            points: points
        });

        // Verrouiller immédiatement
        this.lockPiece();

        this.updateUI();
    },

    /**
     * Hold - mettre une pièce en réserve
     */
    holdPiece() {
        if (!GameState.canHold) return;

        const currentType = GameState.currentPiece.type;

        if (GameState.heldPiece) {
            // Échanger avec la pièce en hold
            const heldType = GameState.heldPiece.type;
            GameState.heldPiece = PieceSystem.create(currentType);
            GameState.currentPiece = PieceSystem.create(heldType);
        } else {
            // Mettre en hold et prendre la pièce suivante
            GameState.heldPiece = PieceSystem.create(currentType);
            GameState.currentPiece = PieceSystem.getNextPiece();
        }

        // Empêcher de hold à nouveau jusqu'à la prochaine pièce
        GameState.canHold = false;

        // Vérifier game over
        if (CollisionSystem.check(GameState.currentPiece.shape, GameState.currentPiece.x, GameState.currentPiece.y)) {
            this.gameOver();
            return;
        }

        RenderSystem.drawHoldPiece();
        RenderSystem.drawNextPieces();

        GameEvents.emit(EVENTS.PIECE_HOLD, { held: GameState.heldPiece.type });
    },

    lockPiece() {
        const piece = GameState.currentPiece;

        for (let row = 0; row < piece.shape.length; row++) {
            for (let col = 0; col < piece.shape[row].length; col++) {
                if (piece.shape[row][col]) {
                    const y = piece.y + row;
                    const x = piece.x + col;

                    if (y < 0) {
                        this.gameOver();
                        return;
                    }

                    GameState.board[y][x] = piece.shape[row][col];
                }
            }
        }

        GameEvents.emit(EVENTS.PIECE_LOCK, { piece });

        this.clearLines();
        this.spawnPiece();
    },

    clearLines() {
        let linesCleared = 0;
        const { ROWS, COLS } = CONFIG.BOARD;

        for (let row = ROWS - 1; row >= 0; row--) {
            if (GameState.board[row].every(cell => cell !== 0)) {
                GameState.board.splice(row, 1);
                GameState.board.unshift(new Array(COLS).fill(0));
                linesCleared++;
                row++;
            }
        }

        if (linesCleared > 0) {
            const points = ScoreSystem.calculateLineScore(linesCleared);
            ScoreSystem.add(points);
            ScoreSystem.handleCombo(linesCleared);

            GameState.lines += linesCleared;

            const newLevel = Math.floor(GameState.lines / CONFIG.SCORING.LINES_PER_LEVEL) + 1;
            if (newLevel > GameState.level) {
                GameState.level = newLevel;
                GameState.dropInterval = Math.max(
                    CONFIG.TIMING.MIN_DROP_INTERVAL,
                    CONFIG.TIMING.BASE_DROP_INTERVAL - (GameState.level - 1) * CONFIG.TIMING.SPEED_INCREMENT
                );
                GameEvents.emit(EVENTS.LEVEL_UP, { level: GameState.level });
            }

            GameEvents.emit(EVENTS.LINES_CLEAR, { count: linesCleared, total: GameState.lines });

            this.updateUI();
        } else {
            ScoreSystem.handleCombo(0);
        }
    },

    togglePause() {
        GameState.isPaused = !GameState.isPaused;

        if (GameState.isPaused) {
            DOM.overlayTitle.textContent = 'PAUSE';
            DOM.overlayMessage.textContent = 'Appuyez sur P pour continuer';
            DOM.finalScore.textContent = '';
            DOM.overlay.classList.remove('hidden');
            GameEvents.emit(EVENTS.GAME_PAUSE);
        } else {
            DOM.overlay.classList.add('hidden');
            GameState.lastDropTime = performance.now();
            GameEvents.emit(EVENTS.GAME_RESUME);
            this.gameLoop();
        }
    },

    gameOver() {
        GameState.isRunning = false;
        cancelAnimationFrame(GameState.animationId);

        DOM.overlayTitle.textContent = 'GAME OVER';
        DOM.overlayMessage.textContent = 'Appuyez sur ESPACE pour rejouer';
        DOM.finalScore.textContent = `Score: ${Utils.formatNumber(GameState.score)}`;
        DOM.overlay.classList.remove('hidden');

        GameEvents.emit(EVENTS.GAME_OVER, {
            score: GameState.score,
            lines: GameState.lines,
            level: GameState.level
        });
    },

    updateUI() {
        DOM.score.textContent = Utils.formatNumber(GameState.score);
        DOM.lines.textContent = GameState.lines;
        DOM.level.textContent = GameState.level;

        GameEvents.emit(EVENTS.UI_UPDATE, {
            score: GameState.score,
            lines: GameState.lines,
            level: GameState.level
        });
    },

    gameLoop(timestamp = 0) {
        if (!GameState.isRunning || GameState.isPaused) return;

        const deltaTime = timestamp - GameState.lastDropTime;

        if (deltaTime > GameState.dropInterval) {
            this.dropPiece();
            GameState.lastDropTime = timestamp;
        }

        RenderSystem.drawBoard();
        GameState.animationId = requestAnimationFrame((t) => this.gameLoop(t));
    }
};

// ===================
// SYSTÈME D'INPUT
// ===================
const InputSystem = {
    keysDown: {},

    handleKeyDown(e) {
        const code = e.code;

        // Espace - Start ou Hard Drop
        if (code === 'Space') {
            e.preventDefault();
            if (!GameState.isRunning) {
                GameSystem.start();
            } else if (!GameState.isPaused && GameState.currentPiece) {
                // Hard Drop en jeu
                GameSystem.hardDrop();
            }
            return;
        }

        // P ou Escape - Pause
        if (code === 'KeyP' || code === 'Escape') {
            e.preventDefault();
            if (GameState.isRunning) {
                GameSystem.togglePause();
            }
            return;
        }

        // M - Musique
        if (code === 'KeyM') {
            e.preventDefault();
            toggleMusic();
            return;
        }

        // Ignorer si pas en jeu ou en pause
        if (!GameState.isRunning || GameState.isPaused || !GameState.currentPiece) return;

        const piece = GameState.currentPiece;

        switch (code) {
            // Hold
            case 'KeyC':
            case 'ShiftLeft':
            case 'ShiftRight':
                e.preventDefault();
                GameSystem.holdPiece();
                break;

            // Gauche
            case 'ArrowLeft':
            case 'KeyA':
                e.preventDefault();
                if (!CollisionSystem.check(piece.shape, piece.x - 1, piece.y)) {
                    piece.x--;
                    GameEvents.emit(EVENTS.PIECE_MOVE, { direction: 'left' });
                }
                break;

            // Droite
            case 'ArrowRight':
            case 'KeyD':
                e.preventDefault();
                if (!CollisionSystem.check(piece.shape, piece.x + 1, piece.y)) {
                    piece.x++;
                    GameEvents.emit(EVENTS.PIECE_MOVE, { direction: 'right' });
                }
                break;

            // Soft Drop
            case 'ArrowDown':
            case 'KeyS':
                e.preventDefault();
                if (GameSystem.dropPiece()) {
                    ScoreSystem.add(CONFIG.SCORING.SOFT_DROP);
                }
                break;

            // Rotation horaire
            case 'ArrowUp':
            case 'KeyW':
            case 'KeyX':
                e.preventDefault();
                InputSystem.tryRotate(true);
                break;

            // Rotation anti-horaire
            case 'KeyZ':
                e.preventDefault();
                InputSystem.tryRotate(false);
                break;
        }

        RenderSystem.drawBoard();
    },

    handleKeyUp(e) {
        delete InputSystem.keysDown[e.code];
    },

    tryRotate(clockwise = true) {
        const piece = GameState.currentPiece;
        const rotated = PieceSystem.rotate(piece.shape, clockwise);

        const kicks = [0, -1, 1, -2, 2];

        for (const kick of kicks) {
            if (!CollisionSystem.check(rotated, piece.x + kick, piece.y)) {
                piece.shape = rotated;
                piece.x += kick;
                piece.rotation = (piece.rotation + (clockwise ? 1 : 3)) % 4;
                GameEvents.emit(EVENTS.PIECE_ROTATE, { clockwise });
                return true;
            }
        }

        return false;
    }
};

// ===================
// MUSIQUE
// ===================
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

    GameEvents.emit(EVENTS.MUSIC_TOGGLE, { playing: isPlaying });
}

// ===================
// INITIALISATION
// ===================
document.addEventListener('DOMContentLoaded', () => {
    GameSystem.init();
});
