const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const levelSystem = require('../../utils/levelSystem');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('level')
        .setDescription('Affiche le niveau d\'un utilisateur')
        .addUserOption(option =>
            option.setName('utilisateur')
                .setDescription('Utilisateur à vérifier')
                .setRequired(false)),
    
    async execute(interaction) {
        const user = interaction.options.getUser('utilisateur') || interaction.user;
        const userData = levelSystem.getUser(interaction.guild.id, user.id);
        
        const xpForNext = (userData.level + 1) * 100;
        const progress = userData.xp - (userData.level * 100);
        const needed = xpForNext - userData.xp;
        
        const embed = new EmbedBuilder()
            .setColor(0x00FF00)
            .setTitle(`Niveau de ${user.displayName}`)
            .setThumbnail(user.displayAvatarURL())
            .addFields(
                { name: 'Niveau', value: userData.level.toString(), inline: true },
                { name: 'XP Total', value: userData.xp.toString(), inline: true },
                { name: 'Messages', value: userData.messages.toString(), inline: true },
                { name: 'Progression', value: `${progress}/100 XP`, inline: true },
                { name: 'Prochain niveau', value: `${needed} XP restants`, inline: true }
            )
            .setTimestamp();
        
        await interaction.reply({ embeds: [embed] });
    },
};
