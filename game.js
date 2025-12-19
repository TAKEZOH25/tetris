/**
 * TETRIS - Logique du jeu principale
 * Couche 2: DAS/ARR, Soft Drop variable, SRS (Super Rotation System)
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
    startTime: 0,
    totalSessionTime: 0, // Temps accumulé dans la session actuelle

    // Lock Delay (Couche 2)
    lockDelayTimeout: null,
    lockMoveCount: 0,
    isLocking: false,
    gridEffects: [],     // Liste des effets visuels sur la grille (ex: lock flash)

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

        // Reset lock delay
        this.lockMoveCount = 0;
        this.isLocking = false;
        if (this.lockDelayTimeout) {
            clearTimeout(this.lockDelayTimeout);
            this.lockDelayTimeout = null;
        }
        this.gridEffects = [];
        this.totalSessionTime = 0;
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
        this.resumeBtn = document.getElementById('resumeBtn');
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
     * Dessiner un flash de cellule (Lock Flash)
     */
    drawGridEffects() {
        const { ctx, gridEffects } = GameState;
        const size = CONFIG.BOARD.BLOCK_SIZE;
        const now = performance.now();

        for (let i = gridEffects.length - 1; i >= 0; i--) {
            const effect = gridEffects[i];
            const elapsed = now - effect.startTime;
            const progress = elapsed / effect.duration;

            if (progress >= 1) {
                gridEffects.splice(i, 1);
                continue;
            }

            const alpha = (1 - progress) * 0.8;
            ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
            ctx.fillRect(
                effect.x * size,
                effect.y * size,
                size,
                size
            );
        }
    },

    /**
     * Dessiner une pièce (générique, pour les previews)
     */
    drawPiecePreview(ctx, piece, offsetX, offsetY, size) {
        const shape = piece.shape;
        ctx.save();

        for (let row = 0; row < shape.length; row++) {
            for (let col = 0; col < shape[row].length; col++) {
                if (shape[row][col]) {
                    const x = offsetX + col * size;
                    const y = offsetY + row * size;

                    // Effet de lueur locale (subtile)
                    ctx.shadowBlur = 10;
                    ctx.shadowColor = CONFIG.COLOR_MAP[shape[row][col]];

                    const gradient = ctx.createLinearGradient(x, y, x + size, y + size);
                    gradient.addColorStop(0, CONFIG.COLOR_MAP[shape[row][col]]);
                    gradient.addColorStop(1, Utils.shadeColor(CONFIG.COLOR_MAP[shape[row][col]], -30));

                    ctx.fillStyle = gradient;
                    ctx.fillRect(x + 1, y + 1, size - 2, size - 2);

                    // Reflet
                    ctx.shadowBlur = 0; // Désamorcer pour le reflet
                    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
                    ctx.fillRect(x + 1, y + 1, size - 2, (size - 2) / 4);
                }
            }
        }
        ctx.restore();
    },

    /**
     * Mettre à jour l'affichage des High Scores
     */
    drawHighScores(currentScore = null) {
        const container = document.getElementById('highScoresList');
        if (!container) return;

        const scores = StorageSystem.data.highScores;
        container.innerHTML = '';

        if (scores.length === 0) {
            container.innerHTML = '<div class="score-entry"><span class="pts">Aucun record pour le moment</span></div>';
            return;
        }

        scores.forEach((entry, index) => {
            const isLatest = entry.score === currentScore;
            const div = document.createElement('div');
            div.className = `score-entry ${isLatest ? 'new-record' : ''}`;
            div.innerHTML = `
                <span class="rank">${index + 1}.</span>
                <span class="pts">${Utils.formatNumber(entry.score)}</span>
                <span class="date">${entry.date}</span>
            `;
            container.appendChild(div);
        });
    },

    /**
     * Mettre à jour l'affichage des Stats Globales
     */
    drawStats() {
        const stats = StorageSystem.data.stats;
        const els = {
            games: document.getElementById('statGames'),
            lines: document.getElementById('statLines'),
            best: document.getElementById('statBest')
        };

        if (els.games) els.games.textContent = Utils.formatNumber(stats.gamesPlayed);
        if (els.lines) els.lines.textContent = Utils.formatNumber(stats.totalLines);
        if (els.best) els.best.textContent = Utils.formatNumber(stats.bestScore);
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

        // Dessiner les effets de grille (Lock Flash, etc.)
        this.drawGridEffects();
    },

    /**
     * Dessiner la pièce fantôme
     */
    drawGhostPiece() {
        const piece = GameState.currentPiece;
        const ghostY = CollisionSystem.getGhostY(piece);

        if (ghostY !== piece.y) {
            // Opacité pulsante pour un effet "laser" actif
            const pulse = 0.1 * Math.sin(performance.now() / 200);
            GameState.ctx.globalAlpha = CONFIG.VISUALS.GHOST_OPACITY + pulse;

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
        const size = CONFIG.PREVIEW.BLOCK_SIZE;
        const count = CONFIG.PREVIEW.COUNT;

        // Calculer l'espacement dynamiquement
        const spacing = nextCanvas.height / count;

        // Effacer proprement le canvas pour éviter l'accumulation
        nextCtx.clearRect(0, 0, nextCanvas.width, nextCanvas.height);
        nextCtx.fillStyle = '#050510'; // Fond solide pour la boîte
        nextCtx.fillRect(0, 0, nextCanvas.width, nextCanvas.height);

        // On ne dessine que le nombre de pièces configuré
        nextPieces.slice(0, count).forEach((piece, index) => {
            if (!piece) return;

            const shape = piece.shape;
            const pieceWidth = shape[0].length * size;
            const pieceHeight = shape.length * size;

            // Centrage horizontal et vertical dans sa section
            const offsetX = (nextCanvas.width - pieceWidth) / 2;
            const offsetY = (index * spacing) + (spacing - pieceHeight) / 2;

            this.drawPiecePreview(nextCtx, piece, offsetX, offsetY, size);
        });
    },

    /**
     * Dessiner la pièce en hold
     */
    drawHoldPiece() {
        const { holdCtx, holdCanvas, heldPiece, canHold } = GameState;
        const size = 20;

        // Effacer proprement le canvas
        holdCtx.clearRect(0, 0, holdCanvas.width, holdCanvas.height);
        holdCtx.fillStyle = '#050510';
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

        // Charger les records et stats dans l'overlay
        RenderSystem.drawHighScores();
        RenderSystem.drawStats();

        // Charger les préférences (Volume Musique)
        if (typeof chillMusic !== 'undefined' && StorageSystem.data.settings.musicVolume) {
            chillMusic.musicVolume = StorageSystem.data.settings.musicVolume;
        }

        // Initialiser le système d'input (DAS/ARR)
        InputSystem.init();

        // Gérer le bouton de reprise
        if (DOM.resumeBtn) {
            if (StorageSystem.data.lastGame) {
                DOM.resumeBtn.classList.remove('hidden');
                DOM.resumeBtn.onclick = () => this.resume();
            } else {
                DOM.resumeBtn.classList.add('hidden');
            }
        }

        this.setupEventListeners();

        // État initial
        GameState.reset();
        RenderSystem.drawBoard();
        RenderSystem.drawNextPieces();
        RenderSystem.drawHoldPiece();

        console.log('🎮 Tetris v2.0 - Couche 2 (DAS/ARR, Soft Drop, SRS)');
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
        StorageSystem.clearLastGame(); // Nouvelle partie, on efface la reprise possible
        if (DOM.resumeBtn) DOM.resumeBtn.classList.add('hidden');
        InputSystem.reset();  // Reset DAS/ARR state
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
        GameState.startTime = performance.now();
        GameState.lastDropTime = performance.now();
        this.gameLoop();
    },

    resume() {
        const lastGame = StorageSystem.data.lastGame;
        if (!lastGame) return;

        GameState.reset();
        GameState.board = lastGame.board;
        GameState.score = lastGame.score;
        GameState.level = lastGame.level;
        GameState.lines = lastGame.lines;

        if (lastGame.heldPiece) {
            GameState.heldPiece = PieceSystem.create(lastGame.heldPiece);
        }

        // Restaurer la file d'attente
        if (lastGame.nextPieces) {
            GameState.nextPieces = lastGame.nextPieces.map(type => PieceSystem.create(type));
        }
        if (lastGame.pieceBag) {
            GameState.pieceBag = lastGame.pieceBag;
        }

        GameState.isRunning = true;
        GameState.isPaused = false;

        this.updateUI();
        PieceSystem.fillNextPieces();
        this.spawnPiece();

        DOM.overlay.classList.add('hidden');
        if (DOM.resumeBtn) DOM.resumeBtn.classList.add('hidden');

        GameEvents.emit(EVENTS.GAME_START);
        GameState.startTime = performance.now();
        GameState.lastDropTime = performance.now();
        this.gameLoop();
    },

    spawnPiece() {
        GameState.currentPiece = PieceSystem.getNextPiece();
        GameState.canHold = true;

        // Reset lock delay state for new piece
        GameState.lockMoveCount = 0;
        GameState.isLocking = false;

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
        const piece = GameState.currentPiece;
        if (!piece) return false;

        if (!CollisionSystem.check(piece.shape, piece.x, piece.y + 1)) {
            piece.y++;
            // Si on descend, on peut potentiellement réinitialiser le lock delay si on était en train de locker
            if (GameState.isLocking) {
                this.resetLockDelay();
            }
            return true;
        } else {
            // Touche le sol : démarrer le lock delay s'il n'est pas déjà actif
            if (!GameState.isLocking) {
                this.startLockDelay();
            }
            return false;
        }
    },

    /**
     * Gère le délai avant verrouillage
     */
    startLockDelay() {
        if (GameState.isLocking) return;

        GameState.isLocking = true;
        GameState.lockDelayTimeout = setTimeout(() => {
            if (GameState.isLocking && GameState.isRunning && !GameState.isPaused) {
                this.lockPiece();
            }
        }, CONFIG.TIMING.LOCK_DELAY);
    },

    /**
     * Réinitialise le délai de verrouillage (Extended Placement)
     */
    resetLockDelay() {
        if (!GameState.isLocking) return;

        // Vérifier si la pièce est toujours au sol
        const onGround = CollisionSystem.check(
            GameState.currentPiece.shape,
            GameState.currentPiece.x,
            GameState.currentPiece.y + 1
        );

        if (!onGround) {
            // Plus au sol (ex: tombée dans un trou après un wall kick ou mouvement)
            GameState.isLocking = false;
            if (GameState.lockDelayTimeout) {
                clearTimeout(GameState.lockDelayTimeout);
                GameState.lockDelayTimeout = null;
            }
            return;
        }

        // Toujours au sol : réinitialiser le timer si on n'a pas dépassé le max de mouvements
        if (GameState.lockMoveCount < CONFIG.TIMING.LOCK_MOVES_MAX) {
            GameState.lockMoveCount++;

            if (GameState.lockDelayTimeout) {
                clearTimeout(GameState.lockDelayTimeout);
            }

            GameState.lockDelayTimeout = setTimeout(() => {
                if (GameState.isLocking && GameState.isRunning && !GameState.isPaused) {
                    this.lockPiece();
                }
            }, CONFIG.TIMING.LOCK_DELAY);
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
        if (!piece) return;

        // Arrêter tout timer de lock en cours
        GameState.isLocking = false;
        if (GameState.lockDelayTimeout) {
            clearTimeout(GameState.lockDelayTimeout);
            GameState.lockDelayTimeout = null;
        }

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

                    // Ajouter un effet de flash
                    GameState.gridEffects.push({
                        x: x,
                        y: y,
                        startTime: performance.now(),
                        duration: 300,
                        type: 'lock'
                    });

                    // Particules de contact
                    if (typeof ParticleSystem !== 'undefined') {
                        const color = CONFIG.COLOR_MAP[piece.shape[row][col]];
                        ParticleSystem.createLandingEffect(x, y, color);
                    }
                }
            }
        }

        GameEvents.emit(EVENTS.PIECE_LOCK, { piece });

        // Sauvegarder l'état pour reprise éventuelle (Layer 5.4)
        StorageSystem.saveGameState({
            board: GameState.board,
            score: GameState.score,
            level: GameState.level,
            lines: GameState.lines,
            heldPiece: GameState.heldPiece ? GameState.heldPiece.type : null,
            nextPieces: GameState.nextPieces.map(p => p.type),
            pieceBag: GameState.pieceBag
        });

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

            GameEvents.emit(EVENTS.LINES_CLEAR, {
                count: linesCleared,
                total: GameState.lines,
                points: points
            });

            this.updateUI();
        } else {
            ScoreSystem.handleCombo(0);
        }
    },

    togglePause() {
        GameState.isPaused = !GameState.isPaused;

        if (GameState.isPaused) {
            GameState.totalSessionTime += (performance.now() - GameState.startTime) / 1000;
            DOM.overlayTitle.textContent = 'PAUSE';
            DOM.overlayMessage.textContent = 'Appuyez sur P pour continuer';
            DOM.finalScore.textContent = '';
            DOM.overlay.classList.remove('hidden');
            GameEvents.emit(EVENTS.GAME_PAUSE);
        } else {
            DOM.overlay.classList.add('hidden');
            GameState.startTime = performance.now();
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

        // Calculer le temps final
        const sessionSeconds = (performance.now() - GameState.startTime) / 1000;
        GameState.totalSessionTime += sessionSeconds;

        // PERSISTANCE (Layer 5)
        // Enregistrer le score et les stats
        const isHigher = StorageSystem.addScore(GameState.score, GameState.lines, GameState.level);
        StorageSystem.updateStats(GameState.lines, Math.floor(GameState.totalSessionTime));
        StorageSystem.clearLastGame(); // Partie finie, on oublie l'état de reprise

        // Afficher le leaderboard et les stats à jour
        RenderSystem.drawHighScores(GameState.score);
        RenderSystem.drawStats();
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

        // Mise à jour du système d'input (DAS/ARR + Soft Drop)
        InputSystem.update(timestamp);

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
// SYSTÈME D'INPUT (DAS/ARR + Soft Drop)
// ===================
const InputSystem = {
    // État des touches
    keysDown: new Set(),

    // DAS (Delayed Auto Shift) state
    das: {
        direction: null,      // 'left' ou 'right'
        startTime: 0,         // Quand la touche a été pressée
        dasActive: false,     // DAS delay passé?
        lastArrTime: 0        // Dernier mouvement ARR
    },

    // Soft Drop state
    softDrop: {
        active: false,
        lastDropTime: 0
    },

    // Initialisation
    init() {
        document.addEventListener('keydown', (e) => this.handleKeyDown(e));
        document.addEventListener('keyup', (e) => this.handleKeyUp(e));
    },

    // Mise à jour appelée chaque frame
    update(timestamp) {
        if (!GameState.isRunning || GameState.isPaused || !GameState.currentPiece) return;

        // Gérer DAS/ARR pour mouvement horizontal
        this.updateDAS(timestamp);

        // Gérer Soft Drop continu
        this.updateSoftDrop(timestamp);
    },

    // DAS/ARR pour mouvement horizontal fluide
    updateDAS(timestamp) {
        if (!this.das.direction) return;

        const piece = GameState.currentPiece;
        const dx = this.das.direction === 'left' ? -1 : 1;
        const elapsed = timestamp - this.das.startTime;

        // Phase DAS: attendre le délai initial
        if (!this.das.dasActive) {
            if (elapsed >= CONFIG.TIMING.DAS_DELAY) {
                this.das.dasActive = true;
                this.das.lastArrTime = timestamp;
                // Premier mouvement après DAS
                if (!CollisionSystem.check(piece.shape, piece.x + dx, piece.y)) {
                    piece.x += dx;
                    GameEvents.emit(EVENTS.PIECE_MOVE, { direction: this.das.direction });
                    GameSystem.resetLockDelay();
                }
            }
            return;
        }

        // Phase ARR: mouvements répétés
        const arrElapsed = timestamp - this.das.lastArrTime;
        if (arrElapsed >= CONFIG.TIMING.ARR_DELAY) {
            if (!CollisionSystem.check(piece.shape, piece.x + dx, piece.y)) {
                piece.x += dx;
                GameEvents.emit(EVENTS.PIECE_MOVE, { direction: this.das.direction });
                GameSystem.resetLockDelay();
                this.das.lastArrTime = timestamp;
            }
        }
    },

    // Soft Drop continu
    updateSoftDrop(timestamp) {
        if (!this.softDrop.active) return;

        const elapsed = timestamp - this.softDrop.lastDropTime;
        if (elapsed >= CONFIG.TIMING.SOFT_DROP_INTERVAL) {
            if (GameSystem.dropPiece()) {
                ScoreSystem.add(CONFIG.SCORING.SOFT_DROP);
                GameEvents.emit(EVENTS.PIECE_SOFT_DROP);
            }
            this.softDrop.lastDropTime = timestamp;
        }
    },

    // Démarrer le mouvement horizontal (pour DAS)
    startHorizontalMove(direction) {
        const piece = GameState.currentPiece;
        if (!piece) return;

        const dx = direction === 'left' ? -1 : 1;

        // Mouvement immédiat
        if (!CollisionSystem.check(piece.shape, piece.x + dx, piece.y)) {
            piece.x += dx;
            GameEvents.emit(EVENTS.PIECE_MOVE, { direction });
            GameSystem.resetLockDelay();
            RenderSystem.drawBoard();
        }

        // Initialiser DAS
        this.das.direction = direction;
        this.das.startTime = performance.now();
        this.das.dasActive = false;
        this.das.lastArrTime = 0;
    },

    // Arrêter le mouvement horizontal
    stopHorizontalMove(direction) {
        if (this.das.direction === direction) {
            // Vérifier si l'autre direction est encore pressée
            const oppositeDir = direction === 'left' ? 'right' : 'left';
            const oppositeKeys = oppositeDir === 'left'
                ? ['ArrowLeft', 'KeyA']
                : ['ArrowRight', 'KeyD'];

            const hasOpposite = oppositeKeys.some(key => this.keysDown.has(key));

            if (hasOpposite) {
                // Basculer vers l'autre direction
                this.startHorizontalMove(oppositeDir);
            } else {
                // Réinitialiser DAS
                this.das.direction = null;
                this.das.dasActive = false;
            }
        }
    },

    // Gestion keydown
    handleKeyDown(e) {
        const code = e.code;

        // Éviter les répétitions clavier natives
        if (this.keysDown.has(code)) return;
        this.keysDown.add(code);

        // Espace - Start ou Hard Drop
        if (code === 'Space') {
            e.preventDefault();
            if (!GameState.isRunning) {
                GameSystem.start();
            } else if (!GameState.isPaused && GameState.currentPiece) {
                GameSystem.hardDrop();
            }
            return;
        }

        // M - Musique
        if (code === 'KeyM' || e.key === 'm' || e.key === 'M') {
            e.preventDefault();
            toggleMusic();
            return;
        }

        // P ou Escape - Pause
        if (code === 'KeyP' || code === 'Escape' || e.key === 'p' || e.key === 'P') {
            e.preventDefault();
            if (GameState.isRunning) {
                GameSystem.togglePause();
            }
            return;
        }



        // Ignorer si pas en jeu ou en pause
        if (!GameState.isRunning || GameState.isPaused || !GameState.currentPiece) return;

        switch (code) {
            // Hold
            case 'KeyC':
            case 'ShiftLeft':
            case 'ShiftRight':
                e.preventDefault();
                GameSystem.holdPiece();
                break;

            // Gauche (avec DAS)
            case 'ArrowLeft':
            case 'KeyA':
                e.preventDefault();
                this.startHorizontalMove('left');
                break;

            // Droite (avec DAS)
            case 'ArrowRight':
            case 'KeyD':
                e.preventDefault();
                this.startHorizontalMove('right');
                break;

            // Soft Drop (maintenu)
            case 'ArrowDown':
            case 'KeyS':
                e.preventDefault();
                // Premier drop immédiat
                if (GameSystem.dropPiece()) {
                    ScoreSystem.add(CONFIG.SCORING.SOFT_DROP);
                }
                // Activer le soft drop continu
                this.softDrop.active = true;
                this.softDrop.lastDropTime = performance.now();
                RenderSystem.drawBoard();
                break;

            // Rotation horaire
            case 'ArrowUp':
            case 'KeyW':
            case 'KeyX':
                e.preventDefault();
                this.tryRotateSRS(true);
                RenderSystem.drawBoard();
                break;

            // Rotation anti-horaire
            case 'KeyZ':
                e.preventDefault();
                this.tryRotateSRS(false);
                RenderSystem.drawBoard();
                break;
        }
    },

    // Gestion keyup
    handleKeyUp(e) {
        const code = e.code;
        this.keysDown.delete(code);

        // Arrêter DAS si touche direction relâchée
        if (['ArrowLeft', 'KeyA'].includes(code)) {
            this.stopHorizontalMove('left');
        }
        if (['ArrowRight', 'KeyD'].includes(code)) {
            this.stopHorizontalMove('right');
        }

        // Arrêter soft drop
        if (['ArrowDown', 'KeyS'].includes(code)) {
            this.softDrop.active = false;
        }
    },

    // SRS (Super Rotation System) avec wall kicks
    tryRotateSRS(clockwise = true) {
        const piece = GameState.currentPiece;
        if (!piece) return false;

        const currentRotation = piece.rotation;
        const newRotation = clockwise
            ? (currentRotation + 1) % 4
            : (currentRotation + 3) % 4;

        // Obtenir la shape pivotée
        const rotated = PieceSystem.rotate(piece.shape, clockwise);

        // Déterminer quelle table de wall kicks utiliser
        let kickTable;
        if (piece.type === 'I') {
            kickTable = CONFIG.SRS_WALL_KICKS.I;
        } else if (piece.type === 'O') {
            kickTable = CONFIG.SRS_WALL_KICKS.O;
        } else {
            kickTable = CONFIG.SRS_WALL_KICKS.JLSTZ;
        }

        // Clé de transition
        const transitionKey = `${currentRotation}->${newRotation}`;
        const kicks = kickTable[transitionKey] || [[0, 0]];

        // Essayer chaque wall kick
        for (const [dx, dy] of kicks) {
            // Note: dans Tetris, dy positif = vers le haut (on inverse)
            if (!CollisionSystem.check(rotated, piece.x + dx, piece.y - dy)) {
                piece.shape = rotated;
                piece.x += dx;
                piece.y -= dy;
                piece.rotation = newRotation;
                GameEvents.emit(EVENTS.PIECE_ROTATE, { clockwise, kick: [dx, dy] });
                GameSystem.resetLockDelay();
                return true;
            }
        }

        return false;
    },

    // Reset (pour nouvelle partie)
    reset() {
        this.keysDown.clear();
        this.das.direction = null;
        this.das.dasActive = false;
        this.softDrop.active = false;
    }
};

// ===================
// MUSIQUE
// ===================
function toggleMusic() {
    const isPlaying = chillMusic.toggle();

    // Feedback visuel sur le raccourci M dans la liste des contrôles
    const musicControl = document.querySelector('.control-item.clickable[onclick="toggleMusic()"]');
    if (musicControl) {
        if (isPlaying) {
            musicControl.classList.add('active');
        } else {
            musicControl.classList.remove('active');
        }
    }

    GameEvents.emit(EVENTS.MUSIC_TOGGLE, { playing: isPlaying });

    // Sauvegarder la préférence de volume/état (Layer 5.3)
    StorageSystem.saveSettings({ musicVolume: chillMusic.musicVolume, musicPlaying: isPlaying });
}

// ===================
// INITIALISATION
// ===================
document.addEventListener('DOMContentLoaded', () => {
    GameSystem.init();
});
