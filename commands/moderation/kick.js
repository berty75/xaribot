const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('kick')
        .setDescription('Expulse un membre du serveur')
        .addUserOption(option =>
            option.setName('membre')
                .setDescription('Le membre à expulser')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('raison')
                .setDescription('Raison de l\'expulsion')
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),
    
    async execute(interaction) {
        const membre = interaction.options.getUser('membre');
        const raison = interaction.options.getString('raison') || 'Aucune raison fournie';
        
        try {
            await interaction.guild.members.kick(membre, raison);
            await interaction.reply(`✅ ${membre.tag} a été expulsé. Raison: ${raison}`);
        } catch (error) {
            await interaction.reply('❌ Erreur lors de l\'expulsion du membre.');
        }
    },
};