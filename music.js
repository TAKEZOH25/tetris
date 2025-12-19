// Générateur de musique électronique chill
class ChillMusicGenerator {
    constructor() {
        this.audioContext = null;
        this.masterGain = null;
        this.isPlaying = false;
        this.volume = 0.6;
        this.schedulerInterval = null;
        this.nextChordTime = 0;
        this.chordDuration = 4; // secondes

        // Gamme pentatonique pour un son apaisant
        this.scale = [0, 2, 4, 7, 9];
        this.baseNote = 40; // E2
        this.chordProgression = [
            [0, 4, 7],   // Em
            [5, 9, 12],  // Am
            [7, 11, 14], // Bm
            [3, 7, 10],  // G
        ];
        this.currentChord = 0;

        // Nodes audio persistants
        this.compressor = null;
        this.reverbGain = null;
        this.delays = [];
    }

    init() {
        if (this.audioContext) return;

        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();

        // Master gain
        this.masterGain = this.audioContext.createGain();
        this.masterGain.gain.value = this.volume;
        this.masterGain.connect(this.audioContext.destination);

        // Compressor pour un son plus doux
        this.compressor = this.audioContext.createDynamicsCompressor();
        this.compressor.threshold.value = -24;
        this.compressor.knee.value = 30;
        this.compressor.ratio.value = 12;
        this.compressor.attack.value = 0.003;
        this.compressor.release.value = 0.25;
        this.compressor.connect(this.masterGain);

        // Reverb
        this.createReverb();
    }

    createReverb() {
        this.reverbGain = this.audioContext.createGain();
        this.reverbGain.gain.value = 0.4;
        this.reverbGain.connect(this.compressor);

        // Plusieurs delays pour simuler une reverb
        for (let i = 0; i < 3; i++) {
            const delay = this.audioContext.createDelay();
            delay.delayTime.value = 0.1 + i * 0.12;

            const feedback = this.audioContext.createGain();
            feedback.gain.value = 0.15 - i * 0.03;

            const filter = this.audioContext.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.value = 2500 - i * 500;

            delay.connect(filter);
            filter.connect(feedback);
            feedback.connect(delay);
            feedback.connect(this.reverbGain);

            this.delays.push(delay);
        }
    }

    midiToFreq(midi) {
        return 440 * Math.pow(2, (midi - 69) / 12);
    }

    getScaleNote(degree) {
        const octave = Math.floor(degree / this.scale.length);
        const noteIndex = ((degree % this.scale.length) + this.scale.length) % this.scale.length;
        return this.baseNote + octave * 12 + this.scale[noteIndex];
    }

    createPad(frequency, duration, startTime) {
        if (!this.audioContext || !this.isPlaying) return;

        const osc1 = this.audioContext.createOscillator();
        const osc2 = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        const filter = this.audioContext.createBiquadFilter();

        osc1.type = 'sine';
        osc1.frequency.value = frequency;

        osc2.type = 'triangle';
        osc2.frequency.value = frequency * 1.003;

        filter.type = 'lowpass';
        filter.frequency.value = 900;
        filter.Q.value = 0.8;

        // Envelope ADSR douce
        gainNode.gain.setValueAtTime(0, startTime);
        gainNode.gain.linearRampToValueAtTime(0.15, startTime + 0.8);
        gainNode.gain.setValueAtTime(0.15, startTime + duration * 0.5);
        gainNode.gain.linearRampToValueAtTime(0, startTime + duration);

        osc1.connect(filter);
        osc2.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(this.compressor);

        if (this.delays[0]) {
            gainNode.connect(this.delays[0]);
        }

        osc1.start(startTime);
        osc2.start(startTime);
        osc1.stop(startTime + duration + 0.5);
        osc2.stop(startTime + duration + 0.5);
    }

    createArpeggio(baseFreq, startTime) {
        if (!this.audioContext || !this.isPlaying) return;

        const notes = [0, 4, 7, 12, 7, 4, 0, 7];
        const noteLength = 0.25;

        notes.forEach((interval, i) => {
            const freq = baseFreq * Math.pow(2, interval / 12);
            this.createArpNote(freq, startTime + i * noteLength, noteLength * 0.7);
        });
    }

    createArpNote(frequency, startTime, duration) {
        if (!this.audioContext || !this.isPlaying) return;

        const osc = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        const filter = this.audioContext.createBiquadFilter();

        osc.type = 'sine';
        osc.frequency.value = frequency;

        filter.type = 'lowpass';
        filter.frequency.value = 2000;

        gainNode.gain.setValueAtTime(0.001, startTime);
        gainNode.gain.exponentialRampToValueAtTime(0.1, startTime + 0.03);
        gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

        osc.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(this.compressor);

        if (this.delays[1]) {
            gainNode.connect(this.delays[1]);
        }

        osc.start(startTime);
        osc.stop(startTime + duration + 0.2);
    }

    createBass(frequency, startTime, duration) {
        if (!this.audioContext || !this.isPlaying) return;

        const osc = this.audioContext.createOscillator();
        const osc2 = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        const filter = this.audioContext.createBiquadFilter();

        osc.type = 'sine';
        osc.frequency.value = frequency / 2;

        osc2.type = 'triangle';
        osc2.frequency.value = frequency / 2;

        filter.type = 'lowpass';
        filter.frequency.value = 250;

        gainNode.gain.setValueAtTime(0.001, startTime);
        gainNode.gain.exponentialRampToValueAtTime(0.25, startTime + 0.1);
        gainNode.gain.setValueAtTime(0.2, startTime + duration * 0.4);
        gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

        osc.connect(filter);
        osc2.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(this.compressor);

        osc.start(startTime);
        osc2.start(startTime);
        osc.stop(startTime + duration + 0.2);
        osc2.stop(startTime + duration + 0.2);
    }

    createSubBass(frequency, startTime, duration) {
        if (!this.audioContext || !this.isPlaying) return;

        const osc = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();

        osc.type = 'sine';
        osc.frequency.value = frequency / 4;

        gainNode.gain.setValueAtTime(0.001, startTime);
        gainNode.gain.exponentialRampToValueAtTime(0.15, startTime + 0.2);
        gainNode.gain.setValueAtTime(0.12, startTime + duration * 0.6);
        gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

        osc.connect(gainNode);
        gainNode.connect(this.masterGain);

        osc.start(startTime);
        osc.stop(startTime + duration + 0.3);
    }

    // Scheduler qui tourne régulièrement
    scheduler() {
        if (!this.isPlaying || !this.audioContext) return;

        const currentTime = this.audioContext.currentTime;
        const scheduleAhead = 0.2; // Planifier 200ms à l'avance

        // Si c'est le moment de programmer le prochain accord
        while (this.nextChordTime < currentTime + scheduleAhead) {
            this.scheduleChord(this.nextChordTime);
            this.nextChordTime += this.chordDuration;
        }
    }

    scheduleChord(time) {
        if (!this.isPlaying) return;

        const chord = this.chordProgression[this.currentChord];
        const rootNote = this.getScaleNote(Math.floor(chord[0] / 2));
        const rootFreq = this.midiToFreq(rootNote);

        // Pad (accord)
        chord.forEach(interval => {
            const noteFreq = rootFreq * Math.pow(2, interval / 12);
            this.createPad(noteFreq, this.chordDuration, time);
        });

        // Bass
        this.createBass(rootFreq, time, this.chordDuration);

        // Sub bass
        this.createSubBass(rootFreq, time, this.chordDuration);

        // Arpège parfois
        if (this.currentChord % 2 === 0) {
            this.createArpeggio(rootFreq * 2, time + 0.5);
        }

        // Arpège décalé
        if (this.currentChord === 1 || this.currentChord === 3) {
            this.createArpeggio(rootFreq * 2, time + 2);
        }

        this.currentChord = (this.currentChord + 1) % this.chordProgression.length;
    }

    start() {
        if (this.isPlaying) return;

        this.init();

        if (this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }

        this.isPlaying = true;
        this.nextChordTime = this.audioContext.currentTime;

        // Démarrer le scheduler
        this.schedulerInterval = setInterval(() => this.scheduler(), 100);

        // Lancer immédiatement
        this.scheduler();
    }

    stop() {
        this.isPlaying = false;

        if (this.schedulerInterval) {
            clearInterval(this.schedulerInterval);
            this.schedulerInterval = null;
        }
    }

    toggle() {
        if (this.isPlaying) {
            this.stop();
        } else {
            this.start();
        }
        return this.isPlaying;
    }

    setVolume(value) {
        this.volume = Math.max(0, Math.min(1, value));
        if (this.masterGain) {
            this.masterGain.gain.value = this.volume;
        }
    }
}

// Instance globale
const chillMusic = new ChillMusicGenerator();
