/**
 * TETRIS - Gestionnaire de musique (Suno Edition)
 * Joue le fichier Aurora Drift.mp3
 */
class MusicPlayer {
    constructor() {
        this.audio = new Audio('Aurora Drift.mp3');
        this.audio.loop = true;
        this.isPlaying = false;
        this.volume = 0.5;
        this.audio.volume = this.volume;
    }

    /**
     * Démarrer la musique
     */
    start() {
        if (this.isPlaying) return;

        // La lecture peut échouer si l'utilisateur n'a pas encore interagi
        this.audio.play()
            .then(() => {
                this.isPlaying = true;
                console.log('🎵 Lecture de Aurora Drift.mp3');
            })
            .catch(err => {
                console.warn('🔇 Lecture auto bloquée ou fichier manquant:', err);
            });
    }

    /**
     * Arrêter la musique
     */
    stop() {
        this.audio.pause();
        this.isPlaying = false;
    }

    /**
     * Basculer l'état (Play/Pause)
     */
    toggle() {
        if (this.isPlaying) {
            this.stop();
        } else {
            this.start();
        }
        return this.isPlaying;
    }

    /**
     * Régler le volume (0.0 à 1.0)
     */
    setVolume(value) {
        this.volume = Math.max(0, Math.min(1, value));
        this.audio.volume = this.volume;
    }
}

// Instance globale (on garde le même nom pour la compatibilité avec game.js)
const chillMusic = new MusicPlayer();
