const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('warn')
        .setDescription('Avertit un membre')
        .addUserOption(option =>
            option.setName('membre')
                .setDescription('Le membre à avertir')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('raison')
                .setDescription('Raison de l\'avertissement')
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
    
    async execute(interaction) {
        const membre = interaction.options.getUser('membre');
        const raison = interaction.options.getString('raison');
        
        const embed = new EmbedBuilder()
            .setColor(0xFF9900)
            .setTitle('⚠️ Avertissement')
            .setDescription(`**Membre:** ${membre.tag}\n**Raison:** ${raison}\n**Modérateur:** ${interaction.user.tag}`)
            .setTimestamp();
        
        try {
            // Envoyer MP au membre
            await membre.send({ embeds: [embed] });
            
            // Répondre dans le canal
            await interaction.reply({ 
                content: `⚠️ ${membre.tag} a été averti.`,
                embeds: [embed]
            });
        } catch (error) {
            await interaction.reply(`⚠️ ${membre.tag} a été averti mais n'a pas pu recevoir le MP.`);
        }
    },
};