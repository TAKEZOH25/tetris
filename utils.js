/**
 * TETRIS - Fonctions utilitaires
 * Fonctions partagées entre les modules
 */

const Utils = {
    /**
     * Assombrir ou éclaircir une couleur
     * @param {string} color - Couleur hex (#RRGGBB)
     * @param {number} percent - Pourcentage (-100 à 100)
     * @returns {string} - Nouvelle couleur hex
     */
    shadeColor(color, percent) {
        const num = parseInt(color.replace('#', ''), 16);
        const amt = Math.round(2.55 * percent);
        const R = Math.min(255, Math.max(0, (num >> 16) + amt));
        const G = Math.min(255, Math.max(0, (num >> 8 & 0x00FF) + amt));
        const B = Math.min(255, Math.max(0, (num & 0x0000FF) + amt));
        return '#' + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1);
    },

    /**
     * Cloner profondément un objet/array
     * @param {*} obj - Objet à cloner
     * @returns {*} - Clone profond
     */
    deepClone(obj) {
        if (obj === null || typeof obj !== 'object') return obj;
        if (Array.isArray(obj)) return obj.map(item => Utils.deepClone(item));
        const clone = {};
        for (let key in obj) {
            if (obj.hasOwnProperty(key)) {
                clone[key] = Utils.deepClone(obj[key]);
            }
        }
        return clone;
    },

    /**
     * Générer un nombre aléatoire entre min et max (inclus)
     * @param {number} min
     * @param {number} max
     * @returns {number}
     */
    randomInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    },

    /**
     * Mélanger un array (Fisher-Yates)
     * @param {Array} array
     * @returns {Array} - Nouvel array mélangé
     */
    shuffle(array) {
        const result = [...array];
        for (let i = result.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [result[i], result[j]] = [result[j], result[i]];
        }
        return result;
    },

    /**
     * Formater un nombre avec séparateurs
     * @param {number} num
     * @returns {string}
     */
    formatNumber(num) {
        return num.toLocaleString('fr-FR');
    },

    /**
     * Formater un temps en mm:ss ou mm:ss.ms
     * @param {number} ms - Millisecondes
     * @param {boolean} showMs - Afficher les millisecondes
     * @returns {string}
     */
    formatTime(ms, showMs = false) {
        const totalSeconds = Math.floor(ms / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        const milliseconds = Math.floor((ms % 1000) / 10);

        const timeStr = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        return showMs ? `${timeStr}.${milliseconds.toString().padStart(2, '0')}` : timeStr;
    },

    /**
     * Limiter une valeur entre min et max
     * @param {number} value
     * @param {number} min
     * @param {number} max
     * @returns {number}
     */
    clamp(value, min, max) {
        return Math.min(Math.max(value, min), max);
    },

    /**
     * Lerp (interpolation linéaire)
     * @param {number} start
     * @param {number} end
     * @param {number} t - Facteur (0-1)
     * @returns {number}
     */
    lerp(start, end, t) {
        return start + (end - start) * t;
    },

    /**
     * Easing functions pour les animations
     */
    easing: {
        linear: t => t,
        easeInQuad: t => t * t,
        easeOutQuad: t => t * (2 - t),
        easeInOutQuad: t => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
        easeInCubic: t => t * t * t,
        easeOutCubic: t => (--t) * t * t + 1,
        easeInOutCubic: t => t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1,
        easeOutElastic: t => {
            const p = 0.3;
            return Math.pow(2, -10 * t) * Math.sin((t - p / 4) * (2 * Math.PI) / p) + 1;
        },
        easeOutBounce: t => {
            if (t < 1 / 2.75) return 7.5625 * t * t;
            if (t < 2 / 2.75) return 7.5625 * (t -= 1.5 / 2.75) * t + 0.75;
            if (t < 2.5 / 2.75) return 7.5625 * (t -= 2.25 / 2.75) * t + 0.9375;
            return 7.5625 * (t -= 2.625 / 2.75) * t + 0.984375;
        }
    },

    /**
     * Debounce une fonction
     * @param {function} func
     * @param {number} wait - Délai en ms
     * @returns {function}
     */
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    /**
     * Throttle une fonction
     * @param {function} func
     * @param {number} limit - Délai minimum entre appels en ms
     * @returns {function}
     */
    throttle(func, limit) {
        let inThrottle;
        return function (...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    },

    /**
     * Vérifier si une touche correspond à une action
     * @param {string} keyCode - Code de la touche
     * @param {string[]} keys - Liste des touches pour cette action
     * @returns {boolean}
     */
    isKeyMatch(keyCode, keys) {
        return keys.includes(keyCode);
    },

    /**
     * Générer un ID unique
     * @returns {string}
     */
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    },

    /**
     * Storage helper avec fallback
     */
    storage: {
        get(key, defaultValue = null) {
            try {
                const item = localStorage.getItem(key);
                return item ? JSON.parse(item) : defaultValue;
            } catch (e) {
                console.warn('LocalStorage non disponible');
                return defaultValue;
            }
        },
        set(key, value) {
            try {
                localStorage.setItem(key, JSON.stringify(value));
                return true;
            } catch (e) {
                console.warn('LocalStorage non disponible');
                return false;
            }
        },
        remove(key) {
            try {
                localStorage.removeItem(key);
                return true;
            } catch (e) {
                return false;
            }
        }
    }
};

// Freeze pour éviter les modifications
Object.freeze(Utils);
Object.freeze(Utils.easing);
Object.freeze(Utils.storage);
