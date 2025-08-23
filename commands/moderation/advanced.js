const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('mod')
        .setDescription('Commandes de modération avancées')
        .addSubcommand(subcommand =>
            subcommand
                .setName('slowmode')
                .setDescription('Définir le mode lent')
                .addIntegerOption(option =>
                    option.setName('seconds')
                        .setDescription('Secondes entre chaque message (0 pour désactiver)')
                        .setRequired(true)
                        .setMinValue(0)
                        .setMaxValue(21600)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('lock')
                .setDescription('Verrouiller le canal')
                .addChannelOption(option =>
                    option.setName('channel')
                        .setDescription('Canal à verrouiller (actuel par défaut)')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('unlock')
                .setDescription('Déverrouiller le canal')
                .addChannelOption(option =>
                    option.setName('channel')
                        .setDescription('Canal à déverrouiller (actuel par défaut)')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('massban')
                .setDescription('Bannissement de masse')
                .addStringOption(option =>
                    option.setName('user_ids')
                        .setDescription('IDs des utilisateurs séparés par des espaces')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('reason')
                        .setDescription('Raison du bannissement')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('history')
                .setDescription('Historique des sanctions')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('Utilisateur à vérifier')
                        .setRequired(true)))
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        
        switch (subcommand) {
            case 'slowmode':
                return this.handleSlowmode(interaction);
            case 'lock':
                return this.handleLock(interaction);
            case 'unlock':
                return this.handleUnlock(interaction);
            case 'massban':
                return this.handleMassban(interaction);
            case 'history':
                return this.handleHistory(interaction);
        }
    },

    async handleSlowmode(interaction) {
        const seconds = interaction.options.getInteger('seconds');
        
        try {
            await interaction.channel.setRateLimitPerUser(seconds);
            
            const embed = new EmbedBuilder()
                .setTitle('Mode lent modifié')
                .setDescription(seconds === 0 ? 'Mode lent désactivé' : `Mode lent défini à ${seconds} seconde(s)`)
                .setColor(0x00FF00);
                
            await interaction.reply({ embeds: [embed] });
        } catch (error) {
            await interaction.reply({
                content: 'Erreur lors de la modification du mode lent.',
                ephemeral: true
            });
        }
    },

    async handleLock(interaction) {
        const channel = interaction.options.getChannel('channel') || interaction.channel;
        
        try {
            await channel.permissionOverwrites.edit(interaction.guild.id, {
                SendMessages: false,
                AddReactions: false
            });
            
            const embed = new EmbedBuilder()
                .setTitle('Canal verrouillé')
                .setDescription(`${channel} a été verrouillé`)
                .setColor(0xFF0000);
                
            await interaction.reply({ embeds: [embed] });
        } catch (error) {
            await interaction.reply({
                content: 'Erreur lors du verrouillage du canal.',
                ephemeral: true
            });
        }
    },

    async handleUnlock(interaction) {
        const channel = interaction.options.getChannel('channel') || interaction.channel;
        
        try {
            await channel.permissionOverwrites.edit(interaction.guild.id, {
                SendMessages: null,
                AddReactions: null
            });
            
            const embed = new EmbedBuilder()
                .setTitle('Canal déverrouillé')
                .setDescription(`${channel} a été déverrouillé`)
                .setColor(0x00FF00);
                
            await interaction.reply({ embeds: [embed] });
        } catch (error) {
            await interaction.reply({
                content: 'Erreur lors du déverrouillage du canal.',
                ephemeral: true
            });
        }
    },

    async handleMassban(interaction) {
        const userIds = interaction.options.getString('user_ids').split(' ');
        const reason = interaction.options.getString('reason') || 'Bannissement de masse';
        
        if (userIds.length > 10) {
            return interaction.reply({
                content: 'Maximum 10 utilisateurs par commande.',
                ephemeral: true
            });
        }
        
        await interaction.deferReply();
        
        const results = [];
        
        for (const userId of userIds) {
            try {
                const user = await interaction.client.users.fetch(userId);
                await interaction.guild.members.ban(user, { reason });
                results.push(`✅ ${user.tag} banni`);
            } catch (error) {
                results.push(`❌ ${userId} - Erreur: ${error.message}`);
            }
        }
        
        const embed = new EmbedBuilder()
            .setTitle('Bannissement de masse')
            .setDescription(results.join('\n'))
            .setColor(0xFF6B35);
            
        await interaction.editReply({ embeds: [embed] });
    },

    async handleHistory(interaction) {
        // Cette fonctionnalité nécessiterait une base de données pour stocker l'historique
        // Pour l'instant, simulation
        const user = interaction.options.getUser('user');
        
        const embed = new EmbedBuilder()
            .setTitle(`Historique de ${user.tag}`)
            .setDescription('Fonctionnalité en développement - nécessite une base de données')
            .addFields(
                { name: 'Avertissements', value: '0', inline: true },
                { name: 'Mutes', value: '0', inline: true },
                { name: 'Bannissements', value: '0', inline: true }
            )
            .setColor(0x0099FF);
            
        await interaction.reply({ embeds: [embed] });
    }
};