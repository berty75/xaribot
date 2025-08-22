const fs = require('fs');
const path = require('path');

class LevelSystem {
    constructor() {
        this.dataPath = path.join(__dirname, '../data/levels.json');
        this.loadData();
    }

    loadData() {
        try {
            if (fs.existsSync(this.dataPath)) {
                this.data = JSON.parse(fs.readFileSync(this.dataPath, 'utf8'));
            } else {
                this.data = {};
                this.saveData();
            }
        } catch (error) {
            console.error('Erreur chargement niveaux:', error);
            this.data = {};
        }
    }

    saveData() {
        try {
            fs.writeFileSync(this.dataPath, JSON.stringify(this.data, null, 2));
        } catch (error) {
            console.error('Erreur sauvegarde niveaux:', error);
        }
    }

    getUser(guildId, userId) {
        if (!this.data[guildId]) this.data[guildId] = {};
        if (!this.data[guildId][userId]) {
            this.data[guildId][userId] = {
                xp: 0,
                level: 0,
                messages: 0
            };
        }
        return this.data[guildId][userId];
    }

    addXP(guildId, userId, amount = 15) {
        const user = this.getUser(guildId, userId);
        user.xp += amount;
        user.messages++;
        
        const newLevel = Math.floor(user.xp / 100);
        const levelUp = newLevel > user.level;
        user.level = newLevel;
        
        this.saveData();
        return { levelUp, level: newLevel, xp: user.xp };
    }

    getLeaderboard(guildId, limit = 10) {
        if (!this.data[guildId]) return [];
        
        return Object.entries(this.data[guildId])
            .map(([userId, data]) => ({ userId, ...data }))
            .sort((a, b) => b.xp - a.xp)
            .slice(0, limit);
    }
}

module.exports = new LevelSystem();
