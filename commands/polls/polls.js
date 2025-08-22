const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('poll')
        .setDescription('Créer des sondages interactifs')
        .addSubcommand(subcommand =>
            subcommand
                .setName('create')
                .setDescription('Créer un nouveau sondage')
                .addStringOption(option =>
                    option.setName('question')
                        .setDescription('Question du sondage')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('options')
                        .setDescription('Options séparées par des virgules (max 5)')
                        .setRequired(true))
                .addIntegerOption(option =>
                    option.setName('duration')
                        .setDescription('Durée en minutes (défaut: 60)')
                        .setMinValue(1)
                        .setMaxValue(1440)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('end')
                .setDescription('Terminer un sondage')
                .addStringOption(option =>
                    option.setName('message_id')
                        .setDescription('ID du message du sondage')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('results')
                .setDescription('Voir les résultats d\'un sondage')
                .addStringOption(option =>
                    option.setName('message_id')
                        .setDescription('ID du message du sondage')
                        .setRequired(true))),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        
        switch (subcommand) {
            case 'create':
                return this.handleCreate(interaction);
            case 'end':
                return this.handleEnd(interaction);
            case 'results':
                return this.handleResults(interaction);
        }
    },

    async handleCreate(interaction) {
        const question = interaction.options.getString('question');
        const optionsString = interaction.options.getString('options');
        const duration = interaction.options.getInteger('duration') || 60;

        const options = optionsString.split(',').map(opt => opt.trim()).filter(opt => opt.length > 0);

        if (options.length < 2 || options.length > 5) {
            return interaction.reply({
                content: 'Le sondage doit avoir entre 2 et 5 options !',
                ephemeral: true
            });
        }

        const emojis = ['🇦', '🇧', '🇨', '🇩', '🇪'];
        const row = new ActionRowBuilder();

        options.forEach((option, index) => {
            row.addComponents(
                new ButtonBuilder()
                    .setCustomId(`poll_${index}`)
                    .setLabel(`${option}`)
                    .setEmoji(emojis[index])
                    .setStyle(ButtonStyle.Primary)
            );
        });

        const endTime = Date.now() + (duration * 60 * 1000);
        const endTimestamp = Math.floor(endTime / 1000);

        const embed = new EmbedBuilder()
            .setTitle('📊 Sondage')
            .setDescription(`**${question}**\n\nCliquez sur les boutons pour voter !`)
            .addFields(
                { name: '⏱️ Se termine', value: `<t:${endTimestamp}:R>`, inline: true },
                { name: '👥 Votes', value: '0', inline: true }
            )
            .setColor(0x00AAFF)
            .setFooter({ text: `Créé par ${interaction.user.username}` })
            .setTimestamp();

        const message = await interaction.reply({
            embeds: [embed],
            components: [row],
            fetchReply: true
        });

        // Sauvegarder le sondage
        const poll = {
            id: message.id,
            channelId: interaction.channel.id,
            guildId: interaction.guild.id,
            creatorId: interaction.user.id,
            question,
            options,
            votes: new Array(options.length).fill(0),
            voters: [],
            endTime,
            active: true,
            createdAt: Date.now()
        };

        this.savePoll(poll);

        // Programmer la fin automatique
        setTimeout(() => {
            this.endPoll(interaction.client, poll.id);
        }, duration * 60 * 1000);
    },

    savePoll(poll) {
        const filePath = path.join(__dirname, '../../data/polls.json');
        let polls = [];
        try {
            polls = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        } catch (error) {
            polls = [];
        }
        polls.push(poll);
        fs.writeFileSync(filePath, JSON.stringify(polls, null, 2));
    },

    async endPoll(client, pollId) {
        const filePath = path.join(__dirname, '../../data/polls.json');
        const polls = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        const poll = polls.find(p => p.id === pollId);

        if (poll && poll.active) {
            poll.active = false;
            
            try {
                const channel = await client.channels.fetch(poll.channelId);
                const message = await channel.messages.fetch(poll.id);

                const totalVotes = poll.votes.reduce((sum, count) => sum + count, 0);
                
                let resultsText = '';
                poll.options.forEach((option, index) => {
                    const percentage = totalVotes > 0 ? ((poll.votes[index] / totalVotes) * 100).toFixed(1) : 0;
                    const barLength = Math.round((poll.votes[index] / Math.max(totalVotes, 1)) * 10);
                    const bar = '█'.repeat(barLength) + '░'.repeat(10 - barLength);
                    resultsText += `${['🇦', '🇧', '🇨', '🇩', '🇪'][index]} **${option}**\n${bar} ${poll.votes[index]} votes (${percentage}%)\n\n`;
                });

                const embed = new EmbedBuilder()
                    .setTitle('📊 Sondage terminé')
                    .setDescription(`**${poll.question}**\n\n${resultsText}`)
                    .addFields(
                        { name: '👥 Total des votes', value: totalVotes.toString(), inline: true }
                    )
                    .setColor(0x00FF00)
                    .setTimestamp();

                await message.edit({ embeds: [embed], components: [] });
            } catch (error) {
                console.error('Erreur lors de la fin du sondage:', error);
            }

            fs.writeFileSync(filePath, JSON.stringify(polls, null, 2));
        }
    }
};