/**
 * TETRIS - Système d'événements
 * Permet aux modules de communiquer entre eux
 */

class EventEmitter {
    constructor() {
        this.events = {};
    }

    /**
     * S'abonner à un événement
     * @param {string} event - Nom de l'événement
     * @param {function} callback - Fonction à appeler
     * @returns {function} - Fonction pour se désabonner
     */
    on(event, callback) {
        if (!this.events[event]) {
            this.events[event] = [];
        }
        this.events[event].push(callback);

        // Retourne une fonction pour se désabonner
        return () => this.off(event, callback);
    }

    /**
     * S'abonner une seule fois
     * @param {string} event - Nom de l'événement
     * @param {function} callback - Fonction à appeler
     */
    once(event, callback) {
        const wrapper = (data) => {
            callback(data);
            this.off(event, wrapper);
        };
        this.on(event, wrapper);
    }

    /**
     * Se désabonner d'un événement
     * @param {string} event - Nom de l'événement
     * @param {function} callback - Fonction à retirer
     */
    off(event, callback) {
        if (!this.events[event]) return;
        this.events[event] = this.events[event].filter(cb => cb !== callback);
    }

    /**
     * Émettre un événement
     * @param {string} event - Nom de l'événement
     * @param {*} data - Données à transmettre
     */
    emit(event, data = null) {
        if (!this.events[event]) return;
        this.events[event].forEach(callback => {
            try {
                callback(data);
            } catch (error) {
                console.error(`Erreur dans l'événement "${event}":`, error);
            }
        });
    }

    /**
     * Supprimer tous les abonnements d'un événement
     * @param {string} event - Nom de l'événement
     */
    clear(event) {
        if (event) {
            delete this.events[event];
        } else {
            this.events = {};
        }
    }
}

// Instance globale pour le jeu
const GameEvents = new EventEmitter();

// ===================
// LISTE DES ÉVÉNEMENTS DISPONIBLES
// ===================
const EVENTS = {
    // Cycle de vie du jeu
    GAME_START: 'game:start',
    GAME_PAUSE: 'game:pause',
    GAME_RESUME: 'game:resume',
    GAME_OVER: 'game:over',
    GAME_RESTART: 'game:restart',

    // Pièces
    PIECE_SPAWN: 'piece:spawn',
    PIECE_MOVE: 'piece:move',
    PIECE_ROTATE: 'piece:rotate',
    PIECE_LOCK: 'piece:lock',
    PIECE_HOLD: 'piece:hold',
    PIECE_HARD_DROP: 'piece:hardDrop',

    // Scoring
    LINES_CLEAR: 'lines:clear',
    SCORE_UPDATE: 'score:update',
    LEVEL_UP: 'level:up',
    COMBO: 'combo:hit',
    BACK_TO_BACK: 'backToBack:hit',
    TETRIS: 'tetris:hit',

    // Audio
    MUSIC_TOGGLE: 'music:toggle',
    SFX_PLAY: 'sfx:play',
    VOLUME_CHANGE: 'volume:change',

    // Visuels
    ANIMATION_START: 'animation:start',
    ANIMATION_END: 'animation:end',
    SCREEN_SHAKE: 'screen:shake',
    PARTICLES_SPAWN: 'particles:spawn',

    // UI
    UI_UPDATE: 'ui:update',
    OVERLAY_SHOW: 'overlay:show',
    OVERLAY_HIDE: 'overlay:hide'
};

// Rendre la liste immutable
Object.freeze(EVENTS);
