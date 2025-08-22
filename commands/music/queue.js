const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const musicPlayer = require('../../utils/musicPlayer');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('queue')
        .setDescription('Affiche la file d\'attente musicale'),
    
    async execute(interaction) {
        const queue = musicPlayer.getQueue(interaction.guild.id);
        
        if (!queue.songs || queue.songs.length === 0) {
            return interaction.reply('❌ La file d\'attente est vide !');
        }

        const embed = new EmbedBuilder()
            .setColor(0x00FF00)
            .setTitle('🎵 File d\'attente musicale')
            .setTimestamp();

        let description = '';
        
        // Musique en cours
        if (queue.songs[0]) {
            description += `**🎵 En cours :**\n${queue.songs[0].title}\n\n`;
        }

        // Prochaines musiques
        if (queue.songs.length > 1) {
            description += '**📋 À venir :**\n';
            for (let i = 1; i < Math.min(queue.songs.length, 10); i++) {
                description += `${i}. ${queue.songs[i].title}\n`;
            }
            
            if (queue.songs.length > 10) {
                description += `\n... et ${queue.songs.length - 10} autre(s) musique(s)`;
            }
        }

        embed.setDescription(description);
        embed.setFooter({ text: `Total: ${queue.songs.length} musique(s)` });

        await interaction.reply({ embeds: [embed] });
    },
};