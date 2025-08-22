const { SlashCommandBuilder } = require('discord.js');
const musicPlayer = require('../../utils/musicPlayer');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('play')
        .setDescription('Joue une musique depuis YouTube')
        .addStringOption(option =>
            option.setName('musique')
                .setDescription('Nom de la musique ou URL YouTube')
                .setRequired(true)),
    
    async execute(interaction) {
        const query = interaction.options.getString('musique');
        
        if (!interaction.member.voice.channel) {
            return interaction.reply('❌ Vous devez être dans un canal vocal !');
        }

        await musicPlayer.play(interaction, query);
    },
};