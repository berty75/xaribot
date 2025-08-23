const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, PermissionFlagsBits } = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ticket')
        .setDescription('Système de tickets de support')
        .addSubcommand(subcommand =>
            subcommand
                .setName('setup')
                .setDescription('Configurer le système de tickets')
                .addChannelOption(option =>
                    option.setName('category')
                        .setDescription('Catégorie où créer les tickets')
                        .addChannelTypes(ChannelType.GuildCategory)
                        .setRequired(true))
                .addRoleOption(option =>
                    option.setName('support_role')
                        .setDescription('Rôle des modérateurs support')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('close')
                .setDescription('Fermer ce ticket'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('add')
                .setDescription('Ajouter un utilisateur au ticket')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('Utilisateur à ajouter')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('remove')
                .setDescription('Retirer un utilisateur du ticket')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('Utilisateur à retirer')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('stats')
                .setDescription('Statistiques des tickets'))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        
        switch (subcommand) {
            case 'setup':
                return await this.setupTickets(interaction);
            case 'close':
                return await this.closeTicket(interaction);
            case 'add':
                return await this.addUserToTicket(interaction);
            case 'remove':
                return await this.removeUserFromTicket(interaction);
            case 'stats':
                return await this.showStats(interaction);
        }
    },

    async setupTickets(interaction) {
        const category = interaction.options.getChannel('category');
        const supportRole = interaction.options.getRole('support_role');

        // Sauvegarder la configuration
        const config = {
            guildId: interaction.guild.id,
            categoryId: category.id,
            supportRoleId: supportRole.id,
            setupBy: interaction.user.id,
            setupAt: Date.now()
        };
        
        this.saveTicketConfig(config);

        const embed = new EmbedBuilder()
            .setTitle('Support Tickets')
            .setDescription('Cliquez sur le bouton ci-dessous pour créer un ticket de support.')
            .addFields(
                { name: 'Comment ça marche ?', value: '1. Cliquez sur "Créer un Ticket"\n2. Un salon privé sera créé\n3. Décrivez votre problème\n4. Un modérateur vous aidera', inline: false }
            )
            .setColor(0x00FF00)
            .setFooter({ text: 'Les tickets sont privés et sécurisés' });

        const button = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('create_ticket')
                    .setLabel('Créer un Ticket')
                    .setEmoji('🎫')
                    .setStyle(ButtonStyle.Primary)
            );

        await interaction.reply({ embeds: [embed], components: [button] });

        // Sauvegarder l'ID du message pour les redémarrages
        const message = await interaction.fetchReply();
        config.messageId = message.id;
        config.channelId = interaction.channel.id;
        this.saveTicketConfig(config);

        // Créer un collector permanent pour les tickets
        const filter = i => i.customId === 'create_ticket';
        const collector = interaction.channel.createMessageComponentCollector({ filter });

        collector.on('collect', async i => {
            await this.createTicket(i, category, supportRole);
        });
    },

    async createTicket(interaction, category, supportRole) {
        // Vérifier si l'utilisateur a déjà un ticket ouvert
        const existingTicket = interaction.guild.channels.cache.find(
            ch => ch.name === `ticket-${interaction.user.id}` && 
                  ch.type === ChannelType.GuildText && 
                  !ch.name.includes('-closed') &&
                  !ch.name.includes('archived')
        );

        if (existingTicket) {
            return interaction.reply({
                content: `Vous avez déjà un ticket ouvert : ${existingTicket}`,
                flags: 64 // Ephemeral flag
            });
        }

        try {
            // Créer le salon de ticket
            const ticketChannel = await interaction.guild.channels.create({
                name: `ticket-${interaction.user.id}`,
                type: ChannelType.GuildText,
                parent: category.id,
                topic: `Ticket de ${interaction.user.tag} - Créé le ${new Date().toLocaleDateString('fr-FR')}`,
                permissionOverwrites: [
                    {
                        id: interaction.guild.id, // @everyone
                        deny: [PermissionFlagsBits.ViewChannel]
                    },
                    {
                        id: interaction.user.id, // Créateur du ticket
                        allow: [
                            PermissionFlagsBits.ViewChannel,
                            PermissionFlagsBits.SendMessages,
                            PermissionFlagsBits.ReadMessageHistory,
                            PermissionFlagsBits.AttachFiles
                        ]
                    },
                    {
                        id: supportRole.id, // Rôle support
                        allow: [
                            PermissionFlagsBits.ViewChannel,
                            PermissionFlagsBits.SendMessages,
                            PermissionFlagsBits.ReadMessageHistory,
                            PermissionFlagsBits.ManageMessages,
                            PermissionFlagsBits.AttachFiles
                        ]
                    }
                ]
            });

            // Message d'accueil dans le ticket
            const welcomeEmbed = new EmbedBuilder()
                .setTitle('Ticket de Support')
                .setDescription(`Bonjour ${interaction.user},\n\nMerci d'avoir ouvert un ticket de support. Un membre de notre équipe vous aidera bientôt.\n\n**Veuillez décrire votre problème en détail.**`)
                .addFields(
                    { name: 'Conseils', value: '• Soyez précis dans votre description\n• Joignez des captures d\'écran si nécessaire\n• Mentionnez les étapes que vous avez déjà essayées', inline: false }
                )
                .setColor(0x00AAFF)
                .setTimestamp();

            const ticketButtons = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('close_ticket')
                        .setLabel('Fermer le Ticket')
                        .setEmoji('🔒')
                        .setStyle(ButtonStyle.Danger),
                    new ButtonBuilder()
                        .setCustomId('claim_ticket')
                        .setLabel('Prendre en Charge')
                        .setEmoji('✋')
                        .setStyle(ButtonStyle.Secondary)
                );

            await ticketChannel.send({
                content: `${interaction.user} ${supportRole}`,
                embeds: [welcomeEmbed],
                components: [ticketButtons]
            });

            // Sauvegarder les données du ticket
            const ticketData = {
                id: ticketChannel.id,
                userId: interaction.user.id,
                guildId: interaction.guild.id,
                createdAt: Date.now(),
                status: 'open',
                claimedBy: null,
                messages: 0
            };
            
            this.saveTicket(ticketData);

            // Répondre à l'utilisateur
            await interaction.reply({
                content: `Votre ticket a été créé : ${ticketChannel}`,
                flags: 64 // Ephemeral flag
            });

            // Gérer les interactions dans le ticket
            this.setupTicketCollectors(ticketChannel);

        } catch (error) {
            console.error('Erreur lors de la création du ticket:', error);
            await interaction.reply({
                content: 'Une erreur est survenue lors de la création du ticket. Contactez un administrateur.',
                flags: 64 // Ephemeral flag
            });
        }
    },

    setupTicketCollectors(ticketChannel) {
        // Collector pour les boutons avec gestion d'erreur améliorée
        const filter = i => {
            return ['close_ticket', 'claim_ticket'].includes(i.customId) && 
                   i.channel.id === ticketChannel.id;
        };
        
        const collector = ticketChannel.createMessageComponentCollector({ 
            filter, 
            time: 0 // Pas de timeout
        });
    
        collector.on('collect', async i => {
            try {
                if (i.customId === 'close_ticket') {
                    await this.closeTicketProcess(i, ticketChannel);
                } else if (i.customId === 'claim_ticket') {
                    await this.claimTicket(i, ticketChannel);
                }
            } catch (error) {
                console.error('Erreur collector ticket:', error);
                try {
                    await i.reply({
                        content: 'Erreur temporaire. Utilisez `/ticket close` à la place.',
                        flags: 64
                    });
                } catch (replyError) {
                    console.error('Erreur reply:', replyError);
                }
            }
        });
    
        collector.on('error', error => {
            console.error('Erreur collector:', error);
        });
    
        // Compter les messages dans le ticket
        const messageCollector = ticketChannel.createMessageCollector({
            filter: m => !m.author.bot
        });
        
        messageCollector.on('collect', message => {
            this.incrementMessageCount(ticketChannel.id);
        });
    },

    async closeTicket(interaction) {
        // Vérifier si on est dans un ticket
        if (!interaction.channel.name.startsWith('ticket-')) {
            return interaction.reply({
                content: 'Cette commande ne peut être utilisée que dans un ticket.',
                flags: 64
            });
        }

        await this.closeTicketProcess(interaction, interaction.channel);
    },

    async addUserToTicket(interaction) {
        // Vérifier si on est dans un ticket
        if (!interaction.channel.name.startsWith('ticket-')) {
            return interaction.reply({
                content: 'Cette commande ne peut être utilisée que dans un ticket.',
                flags: 64
            });
        }

        const user = interaction.options.getUser('user');
        
        try {
            await interaction.channel.permissionOverwrites.create(user.id, {
                ViewChannel: true,
                SendMessages: true,
                ReadMessageHistory: true,
                AttachFiles: true
            });

            const embed = new EmbedBuilder()
                .setTitle('Utilisateur ajouté')
                .setDescription(`${user} a été ajouté au ticket.`)
                .setColor(0x00FF00)
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });
        } catch (error) {
            console.error('Erreur lors de l\'ajout de l\'utilisateur:', error);
            await interaction.reply({
                content: 'Erreur lors de l\'ajout de l\'utilisateur au ticket.',
                flags: 64
            });
        }
    },

    async removeUserFromTicket(interaction) {
        // Vérifier si on est dans un ticket
        if (!interaction.channel.name.startsWith('ticket-')) {
            return interaction.reply({
                content: 'Cette commande ne peut être utilisée que dans un ticket.',
                flags: 64
            });
        }

        const user = interaction.options.getUser('user');
        
        try {
            await interaction.channel.permissionOverwrites.delete(user.id);

            const embed = new EmbedBuilder()
                .setTitle('Utilisateur retiré')
                .setDescription(`${user} a été retiré du ticket.`)
                .setColor(0xFF0000)
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });
        } catch (error) {
            console.error('Erreur lors du retrait de l\'utilisateur:', error);
            await interaction.reply({
                content: 'Erreur lors du retrait de l\'utilisateur du ticket.',
                flags: 64
            });
        }
    },

    async claimTicket(interaction, ticketChannel) {
        const ticketData = this.getTicketData(ticketChannel.id);
        
        if (ticketData.claimedBy) {
            return interaction.reply({
                content: 'Ce ticket est déjà pris en charge.',
                flags: 64
            });
        }

        ticketData.claimedBy = interaction.user.id;
        ticketData.claimedAt = Date.now();
        this.saveTicketData(ticketChannel.id, ticketData);

        const embed = new EmbedBuilder()
            .setTitle('Ticket pris en charge')
            .setDescription(`${interaction.user} a pris en charge ce ticket.`)
            .setColor(0x00FF00)
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    },

    async closeTicketProcess(interaction, ticketChannel) {
        const ticketData = this.getTicketData(ticketChannel.id);
        
        const confirmEmbed = new EmbedBuilder()
            .setTitle('Fermeture du ticket')
            .setDescription('Êtes-vous sûr de vouloir fermer ce ticket ?')
            .setColor(0xFFAA00);

        const confirmButtons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('confirm_close')
                    .setLabel('Confirmer')
                    .setStyle(ButtonStyle.Danger),
                new ButtonBuilder()
                    .setCustomId('cancel_close')
                    .setLabel('Annuler')
                    .setStyle(ButtonStyle.Secondary)
            );

        await interaction.reply({
            embeds: [confirmEmbed],
            components: [confirmButtons]
        });

        const confirmFilter = i => ['confirm_close', 'cancel_close'].includes(i.customId);
        const confirmCollector = interaction.channel.createMessageComponentCollector({
            filter: confirmFilter,
            time: 30000
        });

        confirmCollector.on('collect', async i => {
            if (i.customId === 'confirm_close') {
                await this.finalizeTicketClose(i, ticketChannel, ticketData);
            } else {
                await i.update({
                    content: 'Fermeture annulée.',
                    embeds: [],
                    components: []
                });
            }
        });
    },

    async finalizeTicketClose(interaction, ticketChannel, ticketData) {
        try {
            // Créer un transcript avant la fermeture
            const messages = await ticketChannel.messages.fetch({ limit: 100 });
            const transcript = messages
                .reverse()
                .map(m => `[${new Date(m.createdTimestamp).toLocaleString('fr-FR')}] ${m.author.tag}: ${m.content}`)
                .join('\n');

            // Sauvegarder le transcript
            const transcriptData = {
                ticketId: ticketChannel.id,
                userId: ticketData.userId,
                closedBy: interaction.user.id,
                closedAt: Date.now(),
                transcript,
                messageCount: ticketData.messages || 0,
                duration: Date.now() - ticketData.createdAt
            };
            
            this.saveTranscript(transcriptData);

            // Envoyer un MP à l'utilisateur avec le transcript
            try {
                const user = await interaction.client.users.fetch(ticketData.userId);
                const transcriptEmbed = new EmbedBuilder()
                    .setTitle('Ticket fermé')
                    .setDescription(`Votre ticket sur ${interaction.guild.name} a été fermé.`)
                    .addFields(
                        { name: 'Durée', value: this.formatDuration(transcriptData.duration), inline: true },
                        { name: 'Messages échangés', value: `${ticketData.messages || 0}`, inline: true }
                    )
                    .setColor(0x00AA00)
                    .setTimestamp();

                await user.send({ embeds: [transcriptEmbed] });
            } catch (error) {
                console.log('Impossible d\'envoyer le MP à l\'utilisateur');
            }

            await interaction.update({
                content: `Ticket fermé par ${interaction.user}. Le salon sera supprimé dans 10 secondes.`,
                embeds: [],
                components: []
            });

            // Supprimer le salon après 10 secondes
            setTimeout(async () => {
                try {
                    await ticketChannel.delete();
                } catch (error) {
                    console.error('Erreur lors de la suppression du ticket:', error);
                }
            }, 10000);

        } catch (error) {
            console.error('Erreur lors de la fermeture du ticket:', error);
            await interaction.update({
                content: 'Erreur lors de la fermeture du ticket.',
                embeds: [],
                components: []
            });
        }
    },

    async showStats(interaction) {
        const stats = this.getTicketStats(interaction.guild.id);
        
        const embed = new EmbedBuilder()
            .setTitle('Statistiques des Tickets')
            .addFields(
                { name: 'Tickets ouverts', value: `${stats.open || 0}`, inline: true },
                { name: 'Tickets fermés', value: `${stats.closed || 0}`, inline: true },
                { name: 'Total', value: `${stats.total || 0}`, inline: true },
                { name: 'Temps moyen de résolution', value: stats.avgDuration || 'N/A', inline: true },
                { name: 'Messages moyens par ticket', value: `${stats.avgMessages || 0}`, inline: true }
            )
            .setColor(0x0099FF)
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    },

    // Méthodes utilitaires
    saveTicketConfig(config) {
        const filePath = path.join(__dirname, '../../data/ticket-config.json');
        let configs = [];
        
        try {
            configs = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        } catch (error) {
            configs = [];
        }
        
        const existingIndex = configs.findIndex(c => c.guildId === config.guildId);
        if (existingIndex !== -1) {
            configs[existingIndex] = config;
        } else {
            configs.push(config);
        }
        
        fs.writeFileSync(filePath, JSON.stringify(configs, null, 2));
    },

    saveTicket(ticketData) {
        const filePath = path.join(__dirname, '../../data/tickets.json');
        let tickets = [];
        
        try {
            tickets = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        } catch (error) {
            tickets = [];
        }
        
        tickets.push(ticketData);
        fs.writeFileSync(filePath, JSON.stringify(tickets, null, 2));
    },

    getTicketData(ticketId) {
        const filePath = path.join(__dirname, '../../data/tickets.json');
        try {
            const tickets = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            return tickets.find(t => t.id === ticketId) || {};
        } catch (error) {
            return {};
        }
    },

    saveTicketData(ticketId, data) {
        const filePath = path.join(__dirname, '../../data/tickets.json');
        try {
            let tickets = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            const index = tickets.findIndex(t => t.id === ticketId);
            if (index !== -1) {
                tickets[index] = data;
                fs.writeFileSync(filePath, JSON.stringify(tickets, null, 2));
            }
        } catch (error) {
            console.error('Erreur lors de la sauvegarde:', error);
        }
    },

    saveTranscript(transcriptData) {
        const filePath = path.join(__dirname, '../../data/transcripts.json');
        let transcripts = [];
        
        try {
            transcripts = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        } catch (error) {
            transcripts = [];
        }
        
        transcripts.push(transcriptData);
        fs.writeFileSync(filePath, JSON.stringify(transcripts, null, 2));
    },

    formatDuration(ms) {
        const hours = Math.floor(ms / (60 * 60 * 1000));
        const minutes = Math.floor((ms % (60 * 60 * 1000)) / (60 * 1000));
        return `${hours}h ${minutes}m`;
    },

    incrementMessageCount(ticketId) {
        const filePath = path.join(__dirname, '../../data/tickets.json');
        try {
            let tickets = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            const ticket = tickets.find(t => t.id === ticketId);
            if (ticket) {
                ticket.messages = (ticket.messages || 0) + 1;
                fs.writeFileSync(filePath, JSON.stringify(tickets, null, 2));
            }
        } catch (error) {
            console.error('Erreur lors de l\'incrémentation des messages:', error);
        }
    },

    getTicketStats(guildId) {
        const filePath = path.join(__dirname, '../../data/tickets.json');
        try {
            const tickets = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            const guildTickets = tickets.filter(t => t.guildId === guildId);
            
            const open = guildTickets.filter(t => t.status === 'open').length;
            const closed = guildTickets.filter(t => t.status === 'closed').length;
            const total = guildTickets.length;
            
            return { open, closed, total, avgDuration: 'N/A', avgMessages: 0 };
        } catch (error) {
            return { open: 0, closed: 0, total: 0, avgDuration: 'N/A', avgMessages: 0 };
        }
    }
};