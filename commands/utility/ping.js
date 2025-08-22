const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Teste la latence du bot'),
    
    async execute(interaction) {
        await interaction.reply('🏓 Pong !');
    },
};