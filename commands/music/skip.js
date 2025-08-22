const { SlashCommandBuilder } = require('discord.js');
const musicPlayer = require('../../utils/musicPlayer');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('skip')
        .setDescription('Passe à la musique suivante'),
    
    async execute(interaction) {
        const queue = musicPlayer.getQueue(interaction.guild.id);
        
        if (!queue.connection || queue.songs.length === 0) {
            return interaction.reply('❌ Aucune musique en cours de lecture !');
        }

        if (!interaction.member.voice.channel) {
            return interaction.reply('❌ Vous devez être dans un canal vocal !');
        }

        const skipped = musicPlayer.skip(interaction.guild.id);
        
        if (skipped) {
            await interaction.reply('⏭️ Musique passée !');
        } else {
            await interaction.reply('❌ Impossible de passer la musique.');
        }
    },
};