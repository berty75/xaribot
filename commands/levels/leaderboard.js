const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const levelSystem = require('../../utils/levelSystem');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('leaderboard')
        .setDescription('Affiche le classement des niveaux'),
    
    async execute(interaction) {
        const leaderboard = levelSystem.getLeaderboard(interaction.guild.id);
        
        if (leaderboard.length === 0) {
            return interaction.reply('Aucune donnée de niveau disponible !');
        }
        
        const embed = new EmbedBuilder()
            .setColor(0xFFD700)
            .setTitle('Classement des niveaux')
            .setTimestamp();
        
        let description = '';
        for (let i = 0; i < leaderboard.length; i++) {
            const user = leaderboard[i];
            const member = await interaction.guild.members.fetch(user.userId).catch(() => null);
            const username = member ? member.displayName : 'Utilisateur inconnu';
            
            const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`;
            description += `${medal} **${username}** - Niveau ${user.level} (${user.xp} XP)\n`;
        }
        
        embed.setDescription(description);
        await interaction.reply({ embeds: [embed] });
    },
};
