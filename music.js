/**
 * TETRIS - Système Audio (Musique Suno & SFX Synthétisés)
 * Couche 4: Playlist aléatoire et effets sonores
 */

class AudioSystem {
    constructor() {
        this.audioContext = null;
        this.masterGain = null;

        // Playlist Suno
        this.playlist = [
            'Aurora Drift.mp3',
            'City Lights Fade.mp3',
            'Side Streets of Reflections.mp3'
        ];
        this.currentTrack = null;
        this.musicVolume = 0.4;
        this.sfxVolume = 0.5;
        this.isPlaying = false;
    }

    init() {
        if (this.audioContext) return;
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();

        // Master gain pour Global Volume
        this.masterGain = this.audioContext.createGain();
        this.masterGain.connect(this.audioContext.destination);
    }

    // ===================
    // GESTION MUSIQUE
    // ===================

    startMusic() {
        this.init();
        if (this.currentTrack) {
            this.currentTrack.play();
            this.isPlaying = true;
            return;
        }

        // Choisir une piste aléatoire
        const randomIndex = Math.floor(Math.random() * this.playlist.length);
        this.playTrack(this.playlist[randomIndex]);
    }

    playTrack(filename) {
        if (this.currentTrack) {
            this.currentTrack.pause();
            this.currentTrack = null;
        }

        this.currentTrack = new Audio(filename);
        this.currentTrack.volume = this.musicVolume;

        // Quand la piste finit, on en joue une autre au hasard
        this.currentTrack.onended = () => {
            const nextIndex = Math.floor(Math.random() * this.playlist.length);
            this.playTrack(this.playlist[nextIndex]);
        };

        this.currentTrack.play().catch(e => console.warn("Auto-play bloqué:", e));
        this.isPlaying = true;
    }

    stopMusic() {
        if (this.currentTrack) {
            this.currentTrack.pause();
        }
        this.isPlaying = false;
    }

    toggle() {
        if (this.isPlaying) {
            this.stopMusic();
        } else {
            this.startMusic();
        }
        return this.isPlaying;
    }

    // ===================
    // EFFETS SONORES (Synthétisés)
    // ===================

    playSFX(type) {
        if (!this.audioContext) this.init();
        if (this.audioContext.state === 'suspended') this.audioContext.resume();

        const now = this.audioContext.currentTime;
        const gain = this.audioContext.createGain();
        gain.connect(this.masterGain);
        gain.gain.setValueAtTime(this.sfxVolume, now);

        switch (type) {
            case 'move':
                this.createSynthNote(440, 0.05, 'triangle', 0.1, gain);
                break;
            case 'rotate':
                this.createSynthNote(660, 0.08, 'sine', 0.15, gain);
                break;
            case 'lock':
                this.createSynthNote(220, 0.15, 'square', 0.2, gain, 100);
                break;
            case 'clear':
                this.createArpeggio([440, 554, 659, 880], 0.4, gain);
                break;
            case 'tetris':
                this.createArpeggio([440, 554, 659, 880, 1108], 0.6, gain, true);
                break;
            case 'levelup':
                this.createArpeggio([220, 440, 880], 1.0, gain);
                break;
            case 'gameover':
                this.createSynthNote(110, 1.0, 'sawtooth', 0.5, gain, 50);
                break;
        }
    }

    createSynthNote(freq, duration, type, volume, masterGain, slideTo = null) {
        const osc = this.audioContext.createOscillator();
        const g = this.audioContext.createGain();
        const now = this.audioContext.currentTime;

        osc.type = type;
        osc.frequency.setValueAtTime(freq, now);
        if (slideTo) {
            osc.frequency.exponentialRampToValueAtTime(slideTo, now + duration);
        }

        g.gain.setValueAtTime(volume, now);
        g.gain.exponentialRampToValueAtTime(0.0001, now + duration);

        osc.connect(g);
        g.connect(masterGain);

        osc.start(now);
        osc.stop(now + duration);
    }

    createArpeggio(notes, duration, masterGain, sweep = false) {
        const now = this.audioContext.currentTime;
        const noteLen = duration / notes.length;

        notes.forEach((freq, i) => {
            const osc = this.audioContext.createOscillator();
            const g = this.audioContext.createGain();
            const startTime = now + (i * noteLen);

            osc.type = sweep ? 'triangle' : 'sine';
            osc.frequency.setValueAtTime(freq, startTime);

            g.gain.setValueAtTime(0.2, startTime);
            g.gain.exponentialRampToValueAtTime(0.0001, startTime + noteLen);

            osc.connect(g);
            g.connect(masterGain);

            osc.start(startTime);
            osc.stop(startTime + noteLen);
        });
    }
}

// Instance globale
const chillMusic = new AudioSystem();
