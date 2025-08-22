const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('clear')
        .setDescription('Supprime des messages')
        .addIntegerOption(option =>
            option.setName('nombre')
                .setDescription('Nombre de messages à supprimer (1-100)')
                .setMinValue(1)
                .setMaxValue(100)
                .setRequired(true))
        .addUserOption(option =>
            option.setName('utilisateur')
                .setDescription('Supprimer seulement les messages de cet utilisateur')
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
    
    async execute(interaction) {
        const nombre = interaction.options.getInteger('nombre');
        const utilisateur = interaction.options.getUser('utilisateur');
        
        try {
            const messages = await interaction.channel.messages.fetch({ limit: nombre });
            
            let messagesToDelete = messages;
            if (utilisateur) {
                messagesToDelete = messages.filter(msg => msg.author.id === utilisateur.id);
            }
            
            await interaction.channel.bulkDelete(messagesToDelete, true);
            
            const count = messagesToDelete.size;
            const userText = utilisateur ? ` de ${utilisateur.tag}` : '';
            
            await interaction.reply({ 
                content: `🗑️ ${count} message(s) supprimé(s)${userText}.`,
                ephemeral: true 
            });
        } catch (error) {
            await interaction.reply({ 
                content: '❌ Erreur lors de la suppression des messages.',
                ephemeral: true 
            });
        }
    },
};