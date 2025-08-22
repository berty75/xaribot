const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('giveaway')
        .setDescription('Gérer les giveaways')
        .addSubcommand(subcommand =>
            subcommand
                .setName('start')
                .setDescription('Démarrer un nouveau giveaway')
                .addStringOption(option =>
                    option.setName('duration')
                        .setDescription('Durée (ex: 1h, 30m, 2d)')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('prize')
                        .setDescription('Prix à gagner')
                        .setRequired(true))
                .addIntegerOption(option =>
                    option.setName('winners')
                        .setDescription('Nombre de gagnants')
                        .setRequired(false)
                        .setMinValue(1)
                        .setMaxValue(10))
                .addStringOption(option =>
                    option.setName('description')
                        .setDescription('Description du giveaway')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('end')
                .setDescription('Terminer un giveaway manuellement')
                .addStringOption(option =>
                    option.setName('message_id')
                        .setDescription('ID du message du giveaway')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('reroll')
                .setDescription('Retirer un nouveau gagnant')
                .addStringOption(option =>
                    option.setName('message_id')
                        .setDescription('ID du message du giveaway')
                        .setRequired(true))
                .addIntegerOption(option =>
                    option.setName('winners')
                        .setDescription('Nombre de nouveaux gagnants')
                        .setRequired(false)
                        .setMinValue(1)
                        .setMaxValue(10)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('list')
                .setDescription('Afficher la liste des giveaways')
                .addStringOption(option =>
                    option.setName('status')
                        .setDescription('Filtrer par statut')
                        .setRequired(false)
                        .addChoices(
                            { name: 'Actifs', value: 'active' },
                            { name: 'Terminés', value: 'ended' },
                            { name: 'Tous', value: 'all' }
                        )))
        .setDefaultMemberPermissions('0x20'),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        
        switch (subcommand) {
            case 'start':
                return this.handleStart(interaction);
            case 'end':
                return this.handleEnd(interaction);
            case 'reroll':
                return this.handleReroll(interaction);
            case 'list':
                return this.handleList(interaction);
        }
    },

    // === GIVEAWAY START ===
    async handleStart(interaction) {
        const duration = interaction.options.getString('duration');
        const prize = interaction.options.getString('prize');
        const winners = interaction.options.getInteger('winners') || 1;
        const description = interaction.options.getString('description') || 'Réagissez avec 🎉 pour participer !';

        // Parser la durée
        const durationMs = this.parseDuration(duration);
        if (!durationMs) {
            return interaction.reply({
                content: '❌ Format de durée invalide ! Utilisez : 1h, 30m, 2d, etc.',
                ephemeral: true
            });
        }

        const endTime = Date.now() + durationMs;
        const endTimestamp = Math.floor(endTime / 1000);

        // Créer l'embed
        const embed = new EmbedBuilder()
            .setTitle('🎉 GIVEAWAY 🎉')
            .setDescription(description)
            .addFields(
                { name: '🎁 Prix', value: prize, inline: true },
                { name: '👥 Gagnants', value: `${winners}`, inline: true },
                { name: '⏰ Se termine', value: `<t:${endTimestamp}:R>`, inline: true },
                { name: '🎲 Participation', value: 'Réagissez avec 🎉 pour participer !', inline: false }
            )
            .setColor(0xFF6B6B)
            .setFooter({ text: `Organisé par ${interaction.user.username}` })
            .setTimestamp();

        const message = await interaction.reply({
            embeds: [embed],
            fetchReply: true
        });

        // Ajouter la réaction
        await message.react('🎉');

        // Sauvegarder le giveaway
        const giveaway = {
            id: message.id,
            channelId: interaction.channel.id,
            guildId: interaction.guild.id,
            organizerId: interaction.user.id,
            prize,
            winners,
            description,
            endTime,
            ended: false,
            createdAt: Date.now()
        };

        this.saveGiveaway(giveaway);

        // Programmer la fin automatique
        setTimeout(() => {
            this.autoEndGiveaway(interaction.client, giveaway.id);
        }, durationMs);
    },

    // === GIVEAWAY END ===
    async handleEnd(interaction) {
        const messageId = interaction.options.getString('message_id');
        
        const filePath = path.join(__dirname, '../../data/giveaways.json');
        const giveaways = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        
        const giveaway = giveaways.find(g => g.id === messageId && !g.ended);
        
        if (!giveaway) {
            return interaction.reply({
                content: '❌ Giveaway introuvable ou déjà terminé !',
                ephemeral: true
            });
        }

        const result = await this.endGiveaway(interaction.client, giveaway);
        
        if (result.success) {
            giveaway.ended = true;
            giveaway.endedAt = Date.now();
            giveaway.winners = result.winners;
            
            fs.writeFileSync(filePath, JSON.stringify(giveaways, null, 2));
            
            return interaction.reply({
                content: '✅ Giveaway terminé avec succès !',
                ephemeral: true
            });
        } else {
            return interaction.reply({
                content: `❌ Erreur : ${result.error}`,
                ephemeral: true
            });
        }
    },

    // === GIVEAWAY REROLL ===
    async handleReroll(interaction) {
        const messageId = interaction.options.getString('message_id');
        const winnersCount = interaction.options.getInteger('winners') || 1;
        
        const filePath = path.join(__dirname, '../../data/giveaways.json');
        const giveaways = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        
        const giveaway = giveaways.find(g => g.id === messageId);
        
        if (!giveaway) {
            return interaction.reply({
                content: '❌ Giveaway introuvable !',
                ephemeral: true
            });
        }

        if (!giveaway.ended) {
            return interaction.reply({
                content: '❌ Ce giveaway n\'est pas encore terminé !',
                ephemeral: true
            });
        }

        try {
            const channel = await interaction.client.channels.fetch(giveaway.channelId);
            const message = await channel.messages.fetch(giveaway.id);
            
            const reaction = message.reactions.cache.get('🎉');
            if (!reaction) {
                return interaction.reply({
                    content: '❌ Aucune réaction trouvée !',
                    ephemeral: true
                });
            }
            
            const users = await reaction.users.fetch();
            const participants = users.filter(user => !user.bot);
            
            if (participants.size === 0) {
                return interaction.reply({
                    content: '❌ Aucun participant trouvé !',
                    ephemeral: true
                });
            }
            
            const previousWinners = giveaway.winners || [];
            const availableParticipants = participants.filter(user => !previousWinners.includes(user.id));
            
            if (availableParticipants.size === 0) {
                return interaction.reply({
                    content: '❌ Aucun nouveau participant disponible !',
                    ephemeral: true
                });
            }
            
            const participantArray = Array.from(availableParticipants.values());
            const actualWinnersCount = Math.min(winnersCount, participantArray.length);
            const selectedWinners = [];
            
            for (let i = 0; i < actualWinnersCount; i++) {
                const randomIndex = Math.floor(Math.random() * participantArray.length);
                selectedWinners.push(participantArray.splice(randomIndex, 1)[0]);
            }
            
            const winnerMentions = selectedWinners.map(winner => `<@${winner.id}>`).join(', ');
            
            const embed = new EmbedBuilder()
                .setTitle('🎲 NOUVEAU TIRAGE 🎲')
                .setDescription(`**Prix :** ${giveaway.prize}`)
                .addFields(
                    { name: '🏆 Nouveau(x) Gagnant(s)', value: winnerMentions, inline: false },
                    { name: '🎯 Type', value: 'Reroll', inline: true },
                    { name: '👥 Participants disponibles', value: `${availableParticipants.size}`, inline: true }
                )
                .setColor(0xFFAA00)
                .setTimestamp();
            
            await channel.send({ embeds: [embed] });
            
            await channel.send({
                content: `🎲 Nouveau tirage ! Félicitations ${winnerMentions} ! Vous avez gagné **${giveaway.prize}** !`,
                allowedMentions: { users: selectedWinners.map(w => w.id) }
            });
            
            if (!giveaway.rerolls) giveaway.rerolls = [];
            giveaway.rerolls.push({
                date: Date.now(),
                winners: selectedWinners.map(w => w.id),
                rerolledBy: interaction.user.id
            });
            
            fs.writeFileSync(filePath, JSON.stringify(giveaways, null, 2));
            
            return interaction.reply({
                content: `✅ Nouveau tirage effectué ! ${actualWinnersCount} nouveau(x) gagnant(s).`,
                ephemeral: true
            });
            
        } catch (error) {
            console.error('Erreur reroll:', error);
            return interaction.reply({
                content: '❌ Erreur lors du reroll.',
                ephemeral: true
            });
        }
    },

    // === GIVEAWAY LIST ===
    async handleList(interaction) {
        const status = interaction.options.getString('status') || 'active';
        
        const filePath = path.join(__dirname, '../../data/giveaways.json');
        let giveaways = [];
        
        try {
            giveaways = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        } catch (error) {
            giveaways = [];
        }
        
        giveaways = giveaways.filter(g => g.guildId === interaction.guild.id);
        
        if (status === 'active') {
            giveaways = giveaways.filter(g => !g.ended && g.endTime > Date.now());
        } else if (status === 'ended') {
            giveaways = giveaways.filter(g => g.ended || g.endTime <= Date.now());
        }
        
        if (giveaways.length === 0) {
            const statusText = status === 'active' ? 'actifs' : status === 'ended' ? 'terminés' : '';
            return interaction.reply({
                content: `❌ Aucun giveaway ${statusText} trouvé.`,
                ephemeral: true
            });
        }
        
        const embed = new EmbedBuilder()
            .setTitle('📋 Liste des Giveaways')
            .setColor(0x00AAFF)
            .setTimestamp();
        
        giveaways.sort((a, b) => b.createdAt - a.createdAt);
        const displayGiveaways = giveaways.slice(0, 10);
        
        let description = '';
        
        for (const giveaway of displayGiveaways) {
            const channel = `<#${giveaway.channelId}>`;
            const organizer = `<@${giveaway.organizerId}>`;
            const isActive = !giveaway.ended && giveaway.endTime > Date.now();
            const statusEmoji = isActive ? '🟢' : '🔴';
            const endTimestamp = Math.floor(giveaway.endTime / 1000);
            
            let giveawayInfo = `${statusEmoji} **${giveaway.prize}**\n`;
            giveawayInfo += `└ ${channel} • ${organizer} • `;
            
            if (isActive) {
                giveawayInfo += `Se termine <t:${endTimestamp}:R>`;
            } else {
                giveawayInfo += `Terminé <t:${endTimestamp}:R>`;
            }
            
            giveawayInfo += `\n└ ID: \`${giveaway.id}\`\n\n`;
            description += giveawayInfo;
        }
        
        embed.setDescription(description);
        
        const totalActive = giveaways.filter(g => !g.ended && g.endTime > Date.now()).length;
        const totalEnded = giveaways.filter(g => g.ended || g.endTime <= Date.now()).length;
        
        embed.addFields(
            { name: '📊 Statistiques', value: `🟢 Actifs: ${totalActive}\n🔴 Terminés: ${totalEnded}`, inline: true }
        );
        
        if (giveaways.length > 10) {
            embed.setFooter({ text: `Affichage de 10/${giveaways.length} giveaways` });
        }
        
        return interaction.reply({ embeds: [embed], ephemeral: true });
    },

    // === UTILITAIRES ===
    parseDuration(duration) {
        const match = duration.match(/^(\d+)([smhd])$/);
        if (!match) return null;

        const value = parseInt(match[1]);
        const unit = match[2];

        const multipliers = {
            s: 1000,
            m: 60 * 1000,
            h: 60 * 60 * 1000,
            d: 24 * 60 * 60 * 1000
        };

        return value * multipliers[unit];
    },

    saveGiveaway(giveaway) {
        const filePath = path.join(__dirname, '../../data/giveaways.json');
        let giveaways = [];
        try {
            giveaways = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        } catch (error) {
            giveaways = [];
        }
        giveaways.push(giveaway);
        fs.writeFileSync(filePath, JSON.stringify(giveaways, null, 2));
    },

    async endGiveaway(client, giveaway) {
        try {
            const channel = await client.channels.fetch(giveaway.channelId);
            const message = await channel.messages.fetch(giveaway.id);
            
            const reaction = message.reactions.cache.get('🎉');
            if (!reaction) {
                return { success: false, error: 'Aucune réaction trouvée' };
            }
            
            const users = await reaction.users.fetch();
            const participants = users.filter(user => !user.bot);
            
            if (participants.size === 0) {
                const embed = new EmbedBuilder()
                    .setTitle('🎉 GIVEAWAY TERMINÉ 🎉')
                    .setDescription(`**Prix :** ${giveaway.prize}\n\n❌ Aucun participant !`)
                    .setColor(0xFF4444)
                    .setTimestamp();
                
                await message.edit({ embeds: [embed] });
                return { success: true, winners: [] };
            }
            
            const participantArray = Array.from(participants.values());
            const winnersCount = Math.min(giveaway.winners, participantArray.length);
            const selectedWinners = [];
            
            for (let i = 0; i < winnersCount; i++) {
                const randomIndex = Math.floor(Math.random() * participantArray.length);
                selectedWinners.push(participantArray.splice(randomIndex, 1)[0]);
            }
            
            const winnerMentions = selectedWinners.map(winner => `<@${winner.id}>`).join(', ');
            
            const embed = new EmbedBuilder()
                .setTitle('🎉 GIVEAWAY TERMINÉ 🎉')
                .setDescription(`**Prix :** ${giveaway.prize}`)
                .addFields(
                    { name: '🏆 Gagnant(s)', value: winnerMentions, inline: false },
                    { name: '👥 Participants', value: `${participants.size} personne(s)`, inline: true }
                )
                .setColor(0x00FF00)
                .setTimestamp();
            
            await message.edit({ embeds: [embed] });
            
            await channel.send({
                content: `🎉 Félicitations ${winnerMentions} ! Vous avez gagné **${giveaway.prize}** !`,
                allowedMentions: { users: selectedWinners.map(w => w.id) }
            });
            
            return { success: true, winners: selectedWinners.map(w => w.id) };
            
        } catch (error) {
            console.error('Erreur fin giveaway:', error);
            return { success: false, error: error.message };
        }
    },

    async autoEndGiveaway(client, giveawayId) {
        const filePath = path.join(__dirname, '../../data/giveaways.json');
        const giveaways = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        const giveaway = giveaways.find(g => g.id === giveawayId);
        
        if (giveaway && !giveaway.ended) {
            const result = await this.endGiveaway(client, giveaway);
            if (result.success) {
                giveaway.ended = true;
                giveaway.endedAt = Date.now();
                giveaway.winners = result.winners;
                fs.writeFileSync(filePath, JSON.stringify(giveaways, null, 2));
            }
        }
    }
};