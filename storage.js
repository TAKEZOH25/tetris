/**
 * TETRIS - Système de Persistance
 * Couche 5: LocalStorage, High Scores, Stats et Paramètres
 */

const StorageSystem = {
    KEY: 'tetris_pro_data',

    // Valeurs par défaut
    data: {
        highScores: [],
        stats: {
            gamesPlayed: 0,
            totalLines: 0,
            totalTime: 0, // en secondes
            bestScore: 0
        },
        settings: {
            musicVolume: 0.4,
            sfxVolume: 0.5,
            theme: 'dark'
        },
        lastGame: null // Sauvegarde de l'état pour reprise
    },

    /**
     * Charger les données depuis le localStorage
     */
    load() {
        const saved = localStorage.getItem(this.KEY);
        if (saved) {
            try {
                const parsed = JSON.parse(saved);

                // Fusionner les scores et le dernier jeu
                if (Array.isArray(parsed.highScores)) {
                    this.data.highScores = parsed.highScores;
                }
                this.data.lastGame = parsed.lastGame || null;

                // Fusionner les stats en gardant les défauts pour les nouveaux champs
                if (parsed.stats) {
                    this.data.stats = { ...this.data.stats, ...parsed.stats };
                }

                // Fusionner les settings
                if (parsed.settings) {
                    this.data.settings = { ...this.data.settings, ...parsed.settings };
                }

                // Nettoyage de sécurité : si une stat est NaN, on la remet à 0
                Object.keys(this.data.stats).forEach(key => {
                    if (isNaN(this.data.stats[key])) {
                        this.data.stats[key] = 0;
                    }
                });
            } catch (e) {
                console.error("Erreur de lecture du stockage:", e);
            }
        }
        return this.data;
    },

    /**
     * Sauvegarder les données actuelles
     */
    save() {
        localStorage.setItem(this.KEY, JSON.stringify(this.data));
    },

    /**
     * Ajouter un score au Top 10
     */
    addScore(score, lines, level) {
        const newEntry = {
            score,
            lines,
            level,
            date: new Date().toLocaleDateString()
        };

        this.data.highScores.push(newEntry);
        // Trier par score décroissant
        this.data.highScores.sort((a, b) => b.score - a.score);
        // Garder le Top 10
        this.data.highScores = this.data.highScores.slice(0, 10);

        // Mettre à jour le record
        if (score > this.data.stats.bestScore) {
            this.data.stats.bestScore = score;
        }

        this.save();
        return this.isNewHighScore(score);
    },

    isNewHighScore(score) {
        if (this.data.highScores.length < 10) return true;
        return score > this.data.highScores[this.data.highScores.length - 1].score;
    },

    /**
     * Mettre à jour les statistiques globales
     */
    updateStats(lines, timeSeconds) {
        this.data.stats.gamesPlayed++;
        this.data.stats.totalLines += lines;
        this.data.stats.totalTime += timeSeconds;
        this.save();
    },

    /**
     * Sauvegarder les réglages
     */
    saveSettings(settings) {
        this.data.settings = { ...this.data.settings, ...settings };
        this.save();
    },

    /**
     * Sauvegarder l'état de la partie en cours
     */
    saveGameState(gameState) {
        this.data.lastGame = gameState;
        this.save();
    },

    /**
     * Effacer la sauvegarde de la partie
     */
    clearLastGame() {
        this.data.lastGame = null;
        this.save();
    }
};

// Initialiser au chargement
StorageSystem.load();
