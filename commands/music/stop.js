const { SlashCommandBuilder } = require('discord.js');
const musicPlayer = require('../../utils/musicPlayer');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('stop')
        .setDescription('Arrête la musique et vide la file d\'attente'),
    
    async execute(interaction) {
        const queue = musicPlayer.getQueue(interaction.guild.id);
        
        if (!queue.connection) {
            return interaction.reply('❌ Aucune musique en cours de lecture !');
        }

        if (!interaction.member.voice.channel) {
            return interaction.reply('❌ Vous devez être dans un canal vocal !');
        }

        musicPlayer.stop(interaction.guild.id);
        await interaction.reply('⏹️ Musique arrêtée et file d\'attente vidée !');
    },
};