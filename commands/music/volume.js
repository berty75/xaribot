const { SlashCommandBuilder } = require('discord.js');
const musicPlayer = require('../../utils/musicPlayer');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('volume')
        .setDescription('Ajuste le volume de la musique')
        .addIntegerOption(option =>
            option.setName('niveau')
                .setDescription('Niveau de volume (1-100)')
                .setMinValue(1)
                .setMaxValue(100)
                .setRequired(true)),
    
    async execute(interaction) {
        const queue = musicPlayer.getQueue(interaction.guild.id);
        
        if (!queue.connection) {
            return interaction.reply('❌ Aucune musique en cours de lecture !');
        }

        if (!interaction.member.voice.channel) {
            return interaction.reply('❌ Vous devez être dans un canal vocal !');
        }

        const volume = interaction.options.getInteger('niveau');
        queue.volume = volume;

        await interaction.reply(`🔊 Volume réglé à ${volume}% !`);
    },
};