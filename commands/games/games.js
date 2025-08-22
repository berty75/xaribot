const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('games')
        .setDescription('Mini-jeux interactifs')
        .addSubcommand(subcommand =>
            subcommand
                .setName('rps')
                .setDescription('Pierre-papier-ciseaux contre le bot'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('quiz')
                .setDescription('Quiz de culture générale'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('memory')
                .setDescription('Jeu de mémoire avec séquences'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('riddle')
                .setDescription('Résoudre une énigme'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('trivia')
                .setDescription('Questions de culture générale')),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        
        switch (subcommand) {
            case 'rps':
                return this.handleRPS(interaction);
            case 'quiz':
                return this.handleQuiz(interaction);
            case 'memory':
                return this.handleMemory(interaction);
            case 'riddle':
                return this.handleRiddle(interaction);
            case 'trivia':
                return this.handleTrivia(interaction);
        }
    },

    async handleRPS(interaction) {
        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('rps_rock')
                    .setLabel('Pierre')
                    .setEmoji('🗿')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('rps_paper')
                    .setLabel('Papier')
                    .setEmoji('📄')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('rps_scissors')
                    .setLabel('Ciseaux')
                    .setEmoji('✂️')
                    .setStyle(ButtonStyle.Primary)
            );

        const embed = new EmbedBuilder()
            .setTitle('Pierre-Papier-Ciseaux')
            .setDescription('Choisissez votre coup !')
            .setColor(0x00FF00);

        await interaction.reply({ embeds: [embed], components: [row] });

        const filter = i => i.user.id === interaction.user.id && i.customId.startsWith('rps_');
        const collector = interaction.channel.createMessageComponentCollector({ filter, time: 30000 });

        collector.on('collect', async i => {
            const userChoice = i.customId.split('_')[1];
            const botChoices = ['rock', 'paper', 'scissors'];
            const botChoice = botChoices[Math.floor(Math.random() * 3)];

            const choices = {
                rock: { emoji: '🗿', name: 'Pierre' },
                paper: { emoji: '📄', name: 'Papier' },
                scissors: { emoji: '✂️', name: 'Ciseaux' }
            };

            let result;
            if (userChoice === botChoice) {
                result = 'Égalité !';
            } else if (
                (userChoice === 'rock' && botChoice === 'scissors') ||
                (userChoice === 'paper' && botChoice === 'rock') ||
                (userChoice === 'scissors' && botChoice === 'paper')
            ) {
                result = 'Vous gagnez !';
            } else {
                result = 'Vous perdez !';
            }

            const resultEmbed = new EmbedBuilder()
                .setTitle('Résultat')
                .addFields(
                    { name: 'Votre choix', value: `${choices[userChoice].emoji} ${choices[userChoice].name}`, inline: true },
                    { name: 'Mon choix', value: `${choices[botChoice].emoji} ${choices[botChoice].name}`, inline: true },
                    { name: 'Résultat', value: result, inline: false }
                )
                .setColor(result === 'Vous gagnez !' ? 0x00FF00 : result === 'Vous perdez !' ? 0xFF0000 : 0xFFFF00);

            await i.update({ embeds: [resultEmbed], components: [] });
        });

        collector.on('end', async collected => {
            if (collected.size === 0) {
                const timeoutEmbed = new EmbedBuilder()
                    .setTitle('Temps écoulé')
                    .setDescription('Vous n\'avez pas fait de choix à temps !')
                    .setColor(0xFF0000);
                await interaction.editReply({ embeds: [timeoutEmbed], components: [] });
            }
        });
    },

    async handleQuiz(interaction) {
        const questions = [
            {
                question: "Quelle est la capitale de la France ?",
                options: ["Paris", "Lyon", "Marseille", "Toulouse"],
                correct: 0
            },
            {
                question: "Combien y a-t-il de continents ?",
                options: ["5", "6", "7", "8"],
                correct: 2
            },
            {
                question: "Qui a peint la Joconde ?",
                options: ["Picasso", "Van Gogh", "Da Vinci", "Monet"],
                correct: 2
            }
        ];

        const randomQuestion = questions[Math.floor(Math.random() * questions.length)];

        const row = new ActionRowBuilder();
        for (let i = 0; i < randomQuestion.options.length; i++) {
            row.addComponents(
                new ButtonBuilder()
                    .setCustomId(`quiz_${i}`)
                    .setLabel(randomQuestion.options[i])
                    .setStyle(ButtonStyle.Secondary)
            );
        }

        const embed = new EmbedBuilder()
            .setTitle('Quiz')
            .setDescription(randomQuestion.question)
            .setColor(0x0099FF);

        await interaction.reply({ embeds: [embed], components: [row] });

        const filter = i => i.user.id === interaction.user.id && i.customId.startsWith('quiz_');
        const collector = interaction.channel.createMessageComponentCollector({ filter, time: 15000 });

        collector.on('collect', async i => {
            const choiceIndex = parseInt(i.customId.split('_')[1]);
            const isCorrect = choiceIndex === randomQuestion.correct;

            const resultEmbed = new EmbedBuilder()
                .setTitle(isCorrect ? 'Correct !' : 'Incorrect !')
                .setDescription(`La bonne réponse était : **${randomQuestion.options[randomQuestion.correct]}**`)
                .setColor(isCorrect ? 0x00FF00 : 0xFF0000);

            await i.update({ embeds: [resultEmbed], components: [] });
        });
    },

    async handleMemory(interaction) {
        const sequence = [];
        const emojis = ['🔴', '🟡', '🟢', '🔵'];
        
        // Générer une séquence de 4 éléments
        for (let i = 0; i < 4; i++) {
            sequence.push(emojis[Math.floor(Math.random() * emojis.length)]);
        }

        const embed = new EmbedBuilder()
            .setTitle('Jeu de Mémoire')
            .setDescription(`Mémorisez cette séquence :\n\n${sequence.join(' ')}\n\nElle va disparaître dans 5 secondes...`)
            .setColor(0xFF6B35);

        await interaction.reply({ embeds: [embed] });

        setTimeout(async () => {
            const row = new ActionRowBuilder();
            emojis.forEach((emoji, index) => {
                row.addComponents(
                    new ButtonBuilder()
                        .setCustomId(`memory_${index}`)
                        .setEmoji(emoji)
                        .setStyle(ButtonStyle.Secondary)
                );
            });

            const gameEmbed = new EmbedBuilder()
                .setTitle('Reproduisez la séquence')
                .setDescription('Cliquez sur les boutons dans le bon ordre !')
                .setColor(0xFF6B35);

            await interaction.editReply({ embeds: [gameEmbed], components: [row] });

            let userSequence = [];
            const filter = i => i.user.id === interaction.user.id && i.customId.startsWith('memory_');
            const collector = interaction.channel.createMessageComponentCollector({ filter, time: 30000 });

            collector.on('collect', async i => {
                const choiceIndex = parseInt(i.customId.split('_')[1]);
                userSequence.push(emojis[choiceIndex]);

                if (userSequence.length === sequence.length) {
                    const isCorrect = JSON.stringify(userSequence) === JSON.stringify(sequence);
                    
                    const resultEmbed = new EmbedBuilder()
                        .setTitle(isCorrect ? 'Bravo !' : 'Perdu !')
                        .setDescription(`Séquence originale : ${sequence.join(' ')}\nVotre séquence : ${userSequence.join(' ')}`)
                        .setColor(isCorrect ? 0x00FF00 : 0xFF0000);

                    await i.update({ embeds: [resultEmbed], components: [] });
                    collector.stop();
                } else {
                    await i.deferUpdate();
                }
            });
        }, 5000);
    }
};