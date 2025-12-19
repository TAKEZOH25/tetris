/**
 * TETRIS - Système d'effets visuels
 * Couche 2: Animations, particules, feedback visuel
 */

// ===================
// SYSTÈME DE PARTICULES
// ===================
const ParticleSystem = {
    particles: [],
    canvas: null,
    ctx: null,

    /**
     * Initialiser le canvas de particules
     */
    init() {
        // Créer un canvas overlay pour les particules
        this.canvas = document.createElement('canvas');
        this.canvas.id = 'particleCanvas';
        this.canvas.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            z-index: 100;
        `;

        // l'ajouter au wrapper du jeu
        const wrapper = document.querySelector('.game-board-wrapper');
        if (wrapper) {
            wrapper.style.position = 'relative';
            wrapper.appendChild(this.canvas);
            this.canvas.width = 300;
            this.canvas.height = 600;
            this.ctx = this.canvas.getContext('2d');
        }

        // Démarrer la boucle de rendu
        this.animate();
    },

    /**
     * Créer des particules d'explosion
     */
    createExplosion(x, y, color, count = 15) {
        for (let i = 0; i < count; i++) {
            const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
            const speed = 2 + Math.random() * 4;

            this.particles.push({
                x: x,
                y: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                size: 3 + Math.random() * 4,
                color: color,
                alpha: 1,
                decay: 0.02 + Math.random() * 0.02,
                gravity: 0.1,
                type: 'explosion'
            });
        }
    },

    /**
     * Créer des particules de ligne effacée
     */
    createLineClear(row) {
        const { BLOCK_SIZE, COLS } = CONFIG.BOARD;
        const y = row * BLOCK_SIZE + BLOCK_SIZE / 2;

        const colors = ['#00ffff', '#ff00ff', '#ffff00', '#00ff00', '#ff6600'];

        for (let col = 0; col < COLS; col++) {
            const x = col * BLOCK_SIZE + BLOCK_SIZE / 2;
            const color = colors[Math.floor(Math.random() * colors.length)];

            // Particules vers le haut
            for (let i = 0; i < 3; i++) {
                this.particles.push({
                    x: x,
                    y: y,
                    vx: (Math.random() - 0.5) * 3,
                    vy: -2 - Math.random() * 4,
                    size: 2 + Math.random() * 3,
                    color: color,
                    alpha: 1,
                    decay: 0.015 + Math.random() * 0.015,
                    gravity: 0.05,
                    type: 'lineClear'
                });
            }
        }
    },

    /**
     * Créer l'effet Tetris (4 lignes)
     */
    createTetrisEffect() {
        const centerX = 150;
        const centerY = 300;
        const colors = ['#ff00ff', '#00ffff', '#ffff00', '#ff6600'];

        // Grande explosion centrale
        for (let i = 0; i < 50; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 3 + Math.random() * 8;
            const color = colors[Math.floor(Math.random() * colors.length)];

            this.particles.push({
                x: centerX,
                y: centerY,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                size: 4 + Math.random() * 6,
                color: color,
                alpha: 1,
                decay: 0.01,
                gravity: 0,
                type: 'tetris'
            });
        }

        // Étoiles qui montent
        for (let i = 0; i < 20; i++) {
            this.particles.push({
                x: Math.random() * 300,
                y: 600,
                vx: (Math.random() - 0.5) * 2,
                vy: -3 - Math.random() * 5,
                size: 3 + Math.random() * 4,
                color: '#ffffff',
                alpha: 1,
                decay: 0.008,
                gravity: 0,
                type: 'star'
            });
        }
    },

    /**
     * Créer des particules de combo
     */
    createComboEffect(combo) {
        const intensity = Math.min(combo, 10);
        const colors = ['#ff6600', '#ffaa00', '#ffff00'];

        for (let i = 0; i < intensity * 5; i++) {
            this.particles.push({
                x: 150,
                y: 100,
                vx: (Math.random() - 0.5) * (intensity * 0.8),
                vy: Math.random() * 3,
                size: 2 + Math.random() * 3,
                color: colors[Math.floor(Math.random() * colors.length)],
                alpha: 1,
                decay: 0.02,
                gravity: 0.1,
                type: 'combo'
            });
        }
    },

    /**
     * Créer des particules de hard drop
     */
    createHardDropEffect(x, y, width) {
        const startX = x * CONFIG.BOARD.BLOCK_SIZE;
        const startY = y * CONFIG.BOARD.BLOCK_SIZE;

        for (let i = 0; i < width * 4; i++) {
            const px = startX + (i / (width * 4)) * (width * CONFIG.BOARD.BLOCK_SIZE);

            this.particles.push({
                x: px,
                y: startY,
                vx: (Math.random() - 0.5) * 2,
                vy: -1 - Math.random() * 2,
                size: 2 + Math.random() * 2,
                color: '#ffffff',
                alpha: 0.8,
                decay: 0.04,
                gravity: 0.15,
                type: 'hardDrop'
            });
        }
    },

    /**
     * Mettre à jour les particules
     */
    update() {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];

            p.x += p.vx;
            p.y += p.vy;
            p.vy += p.gravity;
            p.alpha -= p.decay;

            if (p.alpha <= 0) {
                this.particles.splice(i, 1);
            }
        }
    },

    /**
     * Dessiner les particules
     */
    draw() {
        if (!this.ctx) return;

        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        for (const p of this.particles) {
            this.ctx.save();
            this.ctx.globalAlpha = p.alpha;
            this.ctx.fillStyle = p.color;

            if (p.type === 'star') {
                // Dessiner une étoile
                this.drawStar(p.x, p.y, p.size);
            } else {
                // Cercle normal
                this.ctx.beginPath();
                this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                this.ctx.fill();
            }

            this.ctx.restore();
        }
    },

    /**
     * Dessiner une étoile
     */
    drawStar(x, y, size) {
        const spikes = 4;
        const outerRadius = size;
        const innerRadius = size / 2;

        this.ctx.beginPath();
        for (let i = 0; i < spikes * 2; i++) {
            const radius = i % 2 === 0 ? outerRadius : innerRadius;
            const angle = (Math.PI * i) / spikes - Math.PI / 2;
            const px = x + Math.cos(angle) * radius;
            const py = y + Math.sin(angle) * radius;

            if (i === 0) {
                this.ctx.moveTo(px, py);
            } else {
                this.ctx.lineTo(px, py);
            }
        }
        this.ctx.closePath();
        this.ctx.fill();
    },

    /**
     * Boucle d'animation
     */
    animate() {
        this.update();
        this.draw();
        requestAnimationFrame(() => this.animate());
    }
};

// ===================
// SYSTÈME D'ANIMATIONS
// ===================
const AnimationSystem = {
    /**
     * Flash de l'écran
     */
    screenFlash(color = 'white', duration = 100) {
        const flash = document.createElement('div');
        flash.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: ${color};
            pointer-events: none;
            z-index: 9999;
            opacity: 0.3;
            animation: flashFade ${duration}ms ease-out forwards;
        `;

        document.body.appendChild(flash);
        setTimeout(() => flash.remove(), duration);
    },

    /**
     * Shake de l'écran
     */
    screenShake(intensity = 5, duration = 200) {
        const container = document.querySelector('.game-container');
        if (!container) return;

        const originalTransform = container.style.transform;
        const startTime = performance.now();

        const shake = (timestamp) => {
            const elapsed = timestamp - startTime;
            const progress = elapsed / duration;

            if (progress < 1) {
                const decay = 1 - progress;
                const offsetX = (Math.random() - 0.5) * intensity * decay;
                const offsetY = (Math.random() - 0.5) * intensity * decay;
                container.style.transform = `translate(${offsetX}px, ${offsetY}px)`;
                requestAnimationFrame(shake);
            } else {
                container.style.transform = originalTransform;
            }
        };

        requestAnimationFrame(shake);
    },

    /**
     * Animation de score popup
     */
    showScorePopup(text, x, y, color = '#ffffff') {
        const popup = document.createElement('div');
        popup.className = 'score-popup';
        popup.textContent = text;
        popup.style.cssText = `
            position: absolute;
            left: ${x}px;
            top: ${y}px;
            color: ${color};
            font-family: 'Orbitron', monospace;
            font-size: 1.2rem;
            font-weight: bold;
            text-shadow: 0 0 10px ${color}, 0 0 20px ${color};
            pointer-events: none;
            z-index: 200;
            animation: scorePopup 1s ease-out forwards;
            transform: translateX(-50%);
        `;

        const wrapper = document.querySelector('.game-board-wrapper');
        if (wrapper) {
            wrapper.appendChild(popup);
            setTimeout(() => popup.remove(), 1000);
        }
    },

    /**
     * Animation de texte central (TETRIS!, COMBO x5, etc.)
     */
    showCenterText(text, color = '#00ffff', duration = 1500) {
        const popup = document.createElement('div');
        popup.className = 'center-text-popup';
        popup.textContent = text;
        popup.style.cssText = `
            position: absolute;
            left: 50%;
            top: 50%;
            transform: translate(-50%, -50%) scale(0);
            color: ${color};
            font-family: 'Orbitron', monospace;
            font-size: 2rem;
            font-weight: bold;
            text-shadow: 0 0 20px ${color}, 0 0 40px ${color};
            pointer-events: none;
            z-index: 200;
            animation: centerTextPop ${duration}ms ease-out forwards;
            white-space: nowrap;
        `;

        const wrapper = document.querySelector('.game-board-wrapper');
        if (wrapper) {
            wrapper.appendChild(popup);
            setTimeout(() => popup.remove(), duration);
        }
    },

    /**
     * Animation de level up
     */
    showLevelUp(level) {
        this.screenFlash('#7b2fff', 150);
        this.showCenterText(`NIVEAU ${level}`, '#7b2fff', 2000);

        // Particules
        for (let i = 0; i < 30; i++) {
            setTimeout(() => {
                ParticleSystem.particles.push({
                    x: Math.random() * 300,
                    y: 600,
                    vx: (Math.random() - 0.5) * 2,
                    vy: -4 - Math.random() * 4,
                    size: 3 + Math.random() * 3,
                    color: '#7b2fff',
                    alpha: 1,
                    decay: 0.01,
                    gravity: 0.02,
                    type: 'levelUp'
                });
            }, i * 30);
        }
    }
};

// ===================
// INDICATEURS VISUELS
// ===================
const VisualIndicators = {
    comboElement: null,
    levelGlowTimeout: null,

    /**
     * Initialiser les indicateurs
     */
    init() {
        // Créer l'indicateur de combo
        this.comboElement = document.createElement('div');
        this.comboElement.id = 'comboIndicator';
        this.comboElement.style.cssText = `
            position: absolute;
            top: 10px;
            left: 50%;
            transform: translateX(-50%) scale(0);
            font-family: 'Orbitron', monospace;
            font-size: 1.5rem;
            font-weight: bold;
            color: #ff6600;
            text-shadow: 0 0 10px #ff6600, 0 0 20px #ff6600;
            pointer-events: none;
            z-index: 150;
            transition: transform 0.2s ease-out, opacity 0.2s ease-out;
            opacity: 0;
        `;

        const wrapper = document.querySelector('.game-board-wrapper');
        if (wrapper) {
            wrapper.appendChild(this.comboElement);
        }
    },

    /**
     * Afficher le combo
     */
    showCombo(combo) {
        if (!this.comboElement) return;

        if (combo > 1) {
            this.comboElement.textContent = `COMBO x${combo}`;
            this.comboElement.style.transform = 'translateX(-50%) scale(1)';
            this.comboElement.style.opacity = '1';

            // Changer la couleur selon l'intensité
            const hue = Math.max(0, 60 - combo * 10); // De jaune à rouge
            this.comboElement.style.color = `hsl(${hue}, 100%, 50%)`;
            this.comboElement.style.textShadow = `0 0 10px hsl(${hue}, 100%, 50%), 0 0 20px hsl(${hue}, 100%, 50%)`;

            // Cacher après un délai
            clearTimeout(this.hideComboTimeout);
            this.hideComboTimeout = setTimeout(() => {
                this.comboElement.style.transform = 'translateX(-50%) scale(0)';
                this.comboElement.style.opacity = '0';
            }, 1500);
        }
    },

    /**
     * Effet de glow sur le plateau quand le niveau monte
     */
    levelGlow() {
        const canvas = document.getElementById('gameBoard');
        if (!canvas) return;

        canvas.style.boxShadow = '0 0 30px #7b2fff, 0 0 60px #7b2fff, inset 0 0 30px rgba(123, 47, 255, 0.3)';

        clearTimeout(this.levelGlowTimeout);
        this.levelGlowTimeout = setTimeout(() => {
            canvas.style.boxShadow = '';
        }, 1000);
    }
};

// ===================
// INTÉGRATION AVEC LE JEU
// ===================
function initVisualEffects() {
    ParticleSystem.init();
    VisualIndicators.init();

    // Ajouter les styles d'animation
    const style = document.createElement('style');
    style.textContent = `
        @keyframes flashFade {
            from { opacity: 0.5; }
            to { opacity: 0; }
        }

        @keyframes scorePopup {
            0% {
                opacity: 1;
                transform: translateX(-50%) translateY(0) scale(1);
            }
            100% {
                opacity: 0;
                transform: translateX(-50%) translateY(-50px) scale(1.5);
            }
        }

        @keyframes centerTextPop {
            0% {
                opacity: 0;
                transform: translate(-50%, -50%) scale(0);
            }
            20% {
                opacity: 1;
                transform: translate(-50%, -50%) scale(1.2);
            }
            30% {
                transform: translate(-50%, -50%) scale(1);
            }
            70% {
                opacity: 1;
                transform: translate(-50%, -50%) scale(1);
            }
            100% {
                opacity: 0;
                transform: translate(-50%, -50%) scale(0.8);
            }
        }

        .game-board-wrapper {
            position: relative;
        }

        #gameBoard {
            transition: box-shadow 0.3s ease;
        }
    `;
    document.head.appendChild(style);

    // Écouter les événements du jeu
    GameEvents.on(EVENTS.LINES_CLEAR, (data) => {
        // Créer les particules pour chaque ligne
        const { ROWS } = CONFIG.BOARD;
        for (let row = ROWS - data.count; row < ROWS; row++) {
            ParticleSystem.createLineClear(row);
        }

        // Shake proportionnel au nombre de lignes
        AnimationSystem.screenShake(data.count * 2, 150 + data.count * 50);
    });

    GameEvents.on(EVENTS.TETRIS, () => {
        ParticleSystem.createTetrisEffect();
        AnimationSystem.screenFlash('#00ffff', 200);
        AnimationSystem.screenShake(10, 400);
        AnimationSystem.showCenterText('TETRIS!', '#00ffff', 2000);
    });

    GameEvents.on(EVENTS.COMBO, (data) => {
        ParticleSystem.createComboEffect(data.combo);
        VisualIndicators.showCombo(data.combo);

        if (data.combo >= 5) {
            AnimationSystem.showCenterText(`COMBO x${data.combo}!`, '#ff6600', 1000);
        }
    });

    GameEvents.on(EVENTS.LEVEL_UP, (data) => {
        AnimationSystem.showLevelUp(data.level);
        VisualIndicators.levelGlow();
    });

    GameEvents.on(EVENTS.PIECE_HARD_DROP, (data) => {
        if (GameState.currentPiece) {
            const piece = GameState.currentPiece;
            ParticleSystem.createHardDropEffect(piece.x, piece.y, piece.shape[0].length);
        }
    });

    GameEvents.on(EVENTS.SCORE_UPDATE, (data) => {
        // Animation subtile du score
        const scoreEl = document.getElementById('score');
        if (scoreEl) {
            scoreEl.style.transform = 'scale(1.1)';
            setTimeout(() => {
                scoreEl.style.transform = 'scale(1)';
            }, 100);
        }
    });

    console.log('✨ Effets visuels initialisés');
}

// Initialiser au chargement
document.addEventListener('DOMContentLoaded', () => {
    // Attendre que le jeu soit prêt
    setTimeout(initVisualEffects, 100);
});
