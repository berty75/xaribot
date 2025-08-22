const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const musicPlayer = require('../../utils/musicPlayer');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('nowplaying')
        .setDescription('Affiche la musique en cours de lecture'),
    
    async execute(interaction) {
        const queue = musicPlayer.getQueue(interaction.guild.id);
        
        if (!queue.songs || queue.songs.length === 0) {
            return interaction.reply('❌ Aucune musique en cours de lecture !');
        }

        const song = queue.songs[0];
        
        const embed = new EmbedBuilder()
            .setColor(0x00FF00)
            .setTitle('🎵 En cours de lecture')
            .setDescription(`**${song.title}**`)
            .addFields(
                { name: '⏱️ Durée', value: song.duration, inline: true },
                { name: '👤 Demandée par', value: song.requestedBy.username, inline: true },
                { name: '📋 File d\'attente', value: `${queue.songs.length} musique(s)`, inline: true }
            )
            .setTimestamp();

        if (song.thumbnail) {
            embed.setThumbnail(song.thumbnail);
        }

        await interaction.reply({ embeds: [embed] });
    },
};