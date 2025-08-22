const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ban')
        .setDescription('Bannit un membre du serveur')
        .addUserOption(option =>
            option.setName('membre')
                .setDescription('Le membre à bannir')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('raison')
                .setDescription('Raison du bannissement')
                .setRequired(false))
        .addIntegerOption(option =>
            option.setName('duree')
                .setDescription('Durée en jours pour supprimer les messages (0-7)')
                .setMinValue(0)
                .setMaxValue(7)
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),
    
    async execute(interaction) {
        const membre = interaction.options.getUser('membre');
        const raison = interaction.options.getString('raison') || 'Aucune raison fournie';
        const duree = interaction.options.getInteger('duree') || 0;
        
        try {
            await interaction.guild.members.ban(membre, { 
                deleteMessageDays: duree, 
                reason: raison 
            });
            await interaction.reply(`🔨 ${membre.tag} a été banni. Raison: ${raison}`);
        } catch (error) {
            await interaction.reply('❌ Erreur lors du bannissement du membre.');
        }
    },
};