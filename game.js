/**
 * TETRIS - Logique du jeu principale
 * Utilise les fondations : CONFIG, GameEvents, Utils
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

    // Plateau de jeu
    board: [],

    // Pièces
    currentPiece: null,
    nextPiece: null,
    heldPiece: null,
    canHold: true,

    // Bag pour le randomizer 7-bag (préparé pour Couche 1)
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
        this.nextPiece = null;
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

    init() {
        this.score = document.getElementById('score');
        this.lines = document.getElementById('lines');
        this.level = document.getElementById('level');
        this.overlay = document.getElementById('gameOverlay');
        this.overlayTitle = document.getElementById('overlayTitle');
        this.overlayMessage = document.getElementById('overlayMessage');
        this.finalScore = document.getElementById('finalScore');
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
        // Si pas de type spécifié, utiliser le bag randomizer
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
     * 7-Bag Randomizer
     * Garantit une distribution équitable des pièces
     */
    getNextFromBag() {
        if (GameState.pieceBag.length === 0) {
            GameState.pieceBag = Utils.shuffle([...CONFIG.PIECE_TYPES]);
        }
        return GameState.pieceBag.pop();
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

                    // Hors limites
                    if (newX < 0 || newX >= CONFIG.BOARD.COLS || newY >= CONFIG.BOARD.ROWS) {
                        return true;
                    }

                    // Collision avec bloc existant
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

        // Bloc principal avec dégradé
        const gradient = ctx.createLinearGradient(
            x * size, y * size,
            x * size + size, y * size + size
        );
        gradient.addColorStop(0, color);
        gradient.addColorStop(1, Utils.shadeColor(color, -30));

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
    },

    /**
     * Dessiner le plateau complet
     */
    drawBoard() {
        const { ctx, canvas } = GameState;
        const { COLS, ROWS, BLOCK_SIZE } = CONFIG.BOARD;

        // Fond
        ctx.fillStyle = CONFIG.COLORS.BACKGROUND;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Grille
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

        // Blocs fixés
        for (let row = 0; row < ROWS; row++) {
            for (let col = 0; col < COLS; col++) {
                if (GameState.board[row][col]) {
                    this.drawBlock(ctx, col, row, CONFIG.COLOR_MAP[GameState.board[row][col]]);
                }
            }
        }

        // Pièce fantôme
        if (GameState.currentPiece && CONFIG.VISUALS.GHOST_OPACITY > 0) {
            this.drawGhostPiece();
        }

        // Pièce courante
        if (GameState.currentPiece) {
            this.drawPiece(ctx, GameState.currentPiece);
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
     * Dessiner une pièce
     */
    drawPiece(ctx, piece) {
        for (let row = 0; row < piece.shape.length; row++) {
            for (let col = 0; col < piece.shape[row].length; col++) {
                if (piece.shape[row][col]) {
                    this.drawBlock(
                        ctx,
                        piece.x + col,
                        piece.y + row,
                        CONFIG.COLOR_MAP[piece.shape[row][col]]
                    );
                }
            }
        }
    },

    /**
     * Dessiner la prochaine pièce
     */
    drawNextPiece() {
        const { nextCtx, nextCanvas, nextPiece } = GameState;

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

                        const gradient = nextCtx.createLinearGradient(x, y, x + size, y + size);
                        gradient.addColorStop(0, CONFIG.COLOR_MAP[shape[row][col]]);
                        gradient.addColorStop(1, Utils.shadeColor(CONFIG.COLOR_MAP[shape[row][col]], -30));

                        nextCtx.fillStyle = gradient;
                        nextCtx.fillRect(x + 1, y + 1, size - 2, size - 2);

                        nextCtx.fillStyle = 'rgba(255, 255, 255, 0.3)';
                        nextCtx.fillRect(x + 1, y + 1, size - 2, (size - 2) / 4);
                    }
                }
            }
        }
    }
};

// ===================
// SYSTÈME DE SCORE
// ===================
const ScoreSystem = {
    /**
     * Ajouter des points
     */
    add(points) {
        GameState.score += points;
        GameEvents.emit(EVENTS.SCORE_UPDATE, { score: GameState.score });
    },

    /**
     * Calculer les points pour les lignes
     */
    calculateLineScore(linesCleared) {
        const basePoints = CONFIG.SCORING.LINES[linesCleared] || 0;
        return basePoints * GameState.level;
    },

    /**
     * Gérer le combo
     */
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
    /**
     * Initialiser le jeu
     */
    init() {
        // Canvas
        GameState.canvas = document.getElementById('gameBoard');
        GameState.ctx = GameState.canvas.getContext('2d');
        GameState.nextCanvas = document.getElementById('nextPiece');
        GameState.nextCtx = GameState.nextCanvas.getContext('2d');

        // DOM
        DOM.init();

        // Événements
        document.addEventListener('keydown', InputSystem.handleKeyDown);
        document.addEventListener('keyup', InputSystem.handleKeyUp);

        // Écouter les événements du jeu
        this.setupEventListeners();

        // État initial
        GameState.reset();
        RenderSystem.drawBoard();
        RenderSystem.drawNextPiece();

        console.log('🎮 Tetris initialisé avec les fondations v1.0');
    },

    /**
     * Configurer les écouteurs d'événements
     */
    setupEventListeners() {
        GameEvents.on(EVENTS.LINES_CLEAR, (data) => {
            if (data.count === 4) {
                GameEvents.emit(EVENTS.TETRIS);
            }
        });

        GameEvents.on(EVENTS.LEVEL_UP, (data) => {
            console.log(`📈 Niveau ${data.level}!`);
        });
    },

    /**
     * Démarrer une partie
     */
    start() {
        GameState.reset();
        GameState.isRunning = true;
        GameState.isPaused = false;

        this.updateUI();

        // Créer les premières pièces
        GameState.nextPiece = PieceSystem.create();
        this.spawnPiece();

        // Cacher l'overlay
        DOM.overlay.classList.add('hidden');

        // Émettre l'événement
        GameEvents.emit(EVENTS.GAME_START);

        // Lancer la boucle
        GameState.lastDropTime = performance.now();
        this.gameLoop();
    },

    /**
     * Faire apparaître une nouvelle pièce
     */
    spawnPiece() {
        GameState.currentPiece = GameState.nextPiece;
        GameState.nextPiece = PieceSystem.create();
        GameState.canHold = true;

        // Vérifier game over
        if (CollisionSystem.check(GameState.currentPiece.shape, GameState.currentPiece.x, GameState.currentPiece.y)) {
            this.gameOver();
            return;
        }

        RenderSystem.drawNextPiece();
        GameEvents.emit(EVENTS.PIECE_SPAWN, { piece: GameState.currentPiece });
    },

    /**
     * Descendre la pièce d'une case
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
     * Verrouiller la pièce sur le plateau
     */
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

    /**
     * Effacer les lignes complètes
     */
    clearLines() {
        let linesCleared = 0;
        const { ROWS, COLS } = CONFIG.BOARD;

        for (let row = ROWS - 1; row >= 0; row--) {
            if (GameState.board[row].every(cell => cell !== 0)) {
                GameState.board.splice(row, 1);
                GameState.board.unshift(new Array(COLS).fill(0));
                linesCleared++;
                row++; // Revérifier cette ligne
            }
        }

        if (linesCleared > 0) {
            // Score
            const points = ScoreSystem.calculateLineScore(linesCleared);
            ScoreSystem.add(points);

            // Combo
            ScoreSystem.handleCombo(linesCleared);

            // Lignes totales
            GameState.lines += linesCleared;

            // Level up
            const newLevel = Math.floor(GameState.lines / CONFIG.SCORING.LINES_PER_LEVEL) + 1;
            if (newLevel > GameState.level) {
                GameState.level = newLevel;
                GameState.dropInterval = Math.max(
                    CONFIG.TIMING.MIN_DROP_INTERVAL,
                    CONFIG.TIMING.BASE_DROP_INTERVAL - (GameState.level - 1) * CONFIG.TIMING.SPEED_INCREMENT
                );
                GameEvents.emit(EVENTS.LEVEL_UP, { level: GameState.level });
            }

            // Événement
            GameEvents.emit(EVENTS.LINES_CLEAR, { count: linesCleared, total: GameState.lines });

            this.updateUI();
        } else {
            ScoreSystem.handleCombo(0);
        }
    },

    /**
     * Pause/Resume
     */
    togglePause() {
        GameState.isPaused = !GameState.isPaused;

        if (GameState.isPaused) {
            DOM.overlayTitle.textContent = 'PAUSE';
            DOM.overlayMessage.textContent = 'Appuyez sur ESPACE pour continuer';
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

    /**
     * Game Over
     */
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

    /**
     * Mettre à jour l'interface
     */
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

    /**
     * Boucle de jeu principale
     */
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

        // Espace - Start / Pause
        if (code === 'Space') {
            e.preventDefault();
            if (!GameState.isRunning) {
                GameSystem.start();
            } else {
                GameSystem.togglePause();
            }
            return;
        }

        // Musique
        if (code === 'KeyM') {
            e.preventDefault();
            toggleMusic();
            return;
        }

        // Ignorer si pas en jeu ou en pause
        if (!GameState.isRunning || GameState.isPaused || !GameState.currentPiece) return;

        const piece = GameState.currentPiece;

        switch (code) {
            case 'ArrowLeft':
            case 'KeyA':
                e.preventDefault();
                if (!CollisionSystem.check(piece.shape, piece.x - 1, piece.y)) {
                    piece.x--;
                    GameEvents.emit(EVENTS.PIECE_MOVE, { direction: 'left' });
                }
                break;

            case 'ArrowRight':
            case 'KeyD':
                e.preventDefault();
                if (!CollisionSystem.check(piece.shape, piece.x + 1, piece.y)) {
                    piece.x++;
                    GameEvents.emit(EVENTS.PIECE_MOVE, { direction: 'right' });
                }
                break;

            case 'ArrowDown':
            case 'KeyS':
                e.preventDefault();
                if (GameSystem.dropPiece()) {
                    ScoreSystem.add(CONFIG.SCORING.SOFT_DROP);
                }
                break;

            case 'ArrowUp':
            case 'KeyW':
            case 'KeyX':
                e.preventDefault();
                InputSystem.tryRotate(true);
                break;

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

    /**
     * Tenter une rotation avec wall kicks
     */
    tryRotate(clockwise = true) {
        const piece = GameState.currentPiece;
        const rotated = PieceSystem.rotate(piece.shape, clockwise);

        // Wall kicks simples
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
// MUSIQUE (interface avec music.js)
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
