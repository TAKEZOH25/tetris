/**
 * TETRIS - Configuration centralisée
 * Toutes les constantes et paramètres du jeu
 */

const CONFIG = {
    // ===================
    // DIMENSIONS DU JEU
    // ===================
    BOARD: {
        COLS: 10,
        ROWS: 20,
        BLOCK_SIZE: 30,
        VISIBLE_ROWS: 20,
        BUFFER_ROWS: 2  // Lignes cachées au-dessus
    },

    // ===================
    // COULEURS DES PIÈCES
    // ===================
    COLORS: {
        I: '#00f5ff',  // Cyan
        O: '#ffdd00',  // Jaune
        T: '#aa00ff',  // Violet
        S: '#00ff88',  // Vert
        Z: '#ff3366',  // Rouge
        L: '#ff8800',  // Orange
        J: '#0088ff',  // Bleu
        GHOST: 'rgba(255, 255, 255, 0.2)',
        GRID: 'rgba(255, 255, 255, 0.05)',
        BACKGROUND: '#0a0a1a'
    },

    // Mapping index -> couleur pour compatibilité
    COLOR_MAP: [
        null,
        '#00f5ff',  // 1 = I
        '#ffdd00',  // 2 = O
        '#aa00ff',  // 3 = T
        '#00ff88',  // 4 = S
        '#ff3366',  // 5 = Z
        '#ff8800',  // 6 = L
        '#0088ff'   // 7 = J
    ],

    // ===================
    // FORMES DES PIÈCES (TETROMINOS)
    // ===================
    SHAPES: {
        I: [
            [0, 0, 0, 0],
            [1, 1, 1, 1],
            [0, 0, 0, 0],
            [0, 0, 0, 0]
        ],
        O: [
            [2, 2],
            [2, 2]
        ],
        T: [
            [0, 3, 0],
            [3, 3, 3],
            [0, 0, 0]
        ],
        S: [
            [0, 4, 4],
            [4, 4, 0],
            [0, 0, 0]
        ],
        Z: [
            [5, 5, 0],
            [0, 5, 5],
            [0, 0, 0]
        ],
        L: [
            [0, 0, 6],
            [6, 6, 6],
            [0, 0, 0]
        ],
        J: [
            [7, 0, 0],
            [7, 7, 7],
            [0, 0, 0]
        ]
    },

    // Liste ordonnée pour le bag randomizer
    PIECE_TYPES: ['I', 'O', 'T', 'S', 'Z', 'L', 'J'],

    // Mapping index -> type
    PIECE_INDEX_MAP: [null, 'I', 'O', 'T', 'S', 'Z', 'L', 'J'],

    // ===================
    // VITESSE & TIMING
    // ===================
    TIMING: {
        // Vitesse de base (ms entre chaque descente)
        BASE_DROP_INTERVAL: 1000,
        // Réduction par niveau (ms)
        SPEED_INCREMENT: 80,
        // Vitesse minimale (ms)
        MIN_DROP_INTERVAL: 50,
        // Soft drop (quand on appuie bas)
        SOFT_DROP_INTERVAL: 50,
        // Lock delay (délai avant verrouillage)
        LOCK_DELAY: 500,
        // Nombre max de mouvements pendant lock delay
        LOCK_MOVES_MAX: 15,
        // DAS (Delayed Auto Shift) - délai initial
        DAS_DELAY: 170,
        // ARR (Auto Repeat Rate) - vitesse de répétition
        ARR_DELAY: 50
    },

    // ===================
    // SCORING
    // ===================
    SCORING: {
        // Points par nombre de lignes (1, 2, 3, 4)
        LINES: [0, 100, 300, 500, 800],
        // Bonus Tetris (4 lignes)
        TETRIS_BONUS: 1.5,
        // Points soft drop (par cellule)
        SOFT_DROP: 1,
        // Points hard drop (par cellule)
        HARD_DROP: 2,
        // Multiplicateur combo (par combo consécutif)
        COMBO_MULTIPLIER: 50,
        // Multiplicateur Back-to-Back
        BACK_TO_BACK_MULTIPLIER: 1.5,
        // Lignes pour monter de niveau
        LINES_PER_LEVEL: 10
    },

    // ===================
    // CONTRÔLES (touches par défaut)
    // ===================
    CONTROLS: {
        MOVE_LEFT: ['ArrowLeft', 'KeyA'],
        MOVE_RIGHT: ['ArrowRight', 'KeyD'],
        SOFT_DROP: ['ArrowDown', 'KeyS'],
        HARD_DROP: ['Space'],
        ROTATE_CW: ['ArrowUp', 'KeyW', 'KeyX'],  // Sens horaire
        ROTATE_CCW: ['KeyZ', 'ControlLeft'],     // Sens anti-horaire
        HOLD: ['KeyC', 'ShiftLeft'],
        PAUSE: ['Escape', 'KeyP'],
        MUSIC: ['KeyM'],
        RESTART: ['KeyR']
    },

    // ===================
    // PREVIEW (pièces suivantes)
    // ===================
    PREVIEW: {
        COUNT: 3,           // Nombre de pièces à afficher
        BLOCK_SIZE: 20,     // Taille des blocs dans la preview
        SPACING: 10         // Espacement entre les previews
    },

    // ===================
    // AUDIO
    // ===================
    AUDIO: {
        MUSIC_VOLUME: 0.3,
        SFX_VOLUME: 0.5,
        ENABLED: true
    },

    // ===================
    // VISUELS
    // ===================
    VISUALS: {
        GHOST_OPACITY: 0.3,
        GRID_ENABLED: true,
        ANIMATIONS_ENABLED: true,
        PARTICLES_ENABLED: true,
        SCREEN_SHAKE_ENABLED: true
    },

    // ===================
    // MODES DE JEU
    // ===================
    GAME_MODES: {
        MARATHON: {
            name: 'Marathon',
            goal: 'level',
            target: 15
        },
        SPRINT: {
            name: 'Sprint',
            goal: 'lines',
            target: 40
        },
        ULTRA: {
            name: 'Ultra',
            goal: 'time',
            target: 120  // secondes
        },
        ENDLESS: {
            name: 'Infini',
            goal: null,
            target: null
        }
    }
};

// Rendre la config immutable (évite les modifications accidentelles)
Object.freeze(CONFIG);
Object.freeze(CONFIG.BOARD);
Object.freeze(CONFIG.COLORS);
Object.freeze(CONFIG.COLOR_MAP);
Object.freeze(CONFIG.SHAPES);
Object.freeze(CONFIG.TIMING);
Object.freeze(CONFIG.SCORING);
Object.freeze(CONFIG.CONTROLS);
Object.freeze(CONFIG.PREVIEW);
Object.freeze(CONFIG.AUDIO);
Object.freeze(CONFIG.VISUALS);
Object.freeze(CONFIG.GAME_MODES);
