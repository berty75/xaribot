const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('mute')
        .setDescription('Met un membre en sourdine (timeout)')
        .addUserOption(option =>
            option.setName('membre')
                .setDescription('Le membre à muter')
                .setRequired(true))
        .addIntegerOption(option =>
            option.setName('duree')
                .setDescription('Durée en minutes (1-10080 = 7 jours max)')
                .setMinValue(1)
                .setMaxValue(10080)
                .setRequired(true))
        .addStringOption(option =>
            option.setName('raison')
                .setDescription('Raison du mute')
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
    
    async execute(interaction) {
        const membre = interaction.options.getMember('membre');
        const duree = interaction.options.getInteger('duree');
        const raison = interaction.options.getString('raison') || 'Aucune raison fournie';
        
        try {
            const timeout = new Date(Date.now() + duree * 60 * 1000);
            await membre.timeout(timeout, raison);
            
            await interaction.reply(`🔇 ${membre.user.tag} a été mis en sourdine pour ${duree} minute(s). Raison: ${raison}`);
        } catch (error) {
            await interaction.reply('❌ Erreur lors de la mise en sourdine du membre.');
        }
    },
};