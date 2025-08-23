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
                .setDescription('Questions de culture générale'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('daily')
                .setDescription('Récompense quotidienne'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('collect')
                .setDescription('Collecter des objets rares (toutes les 4h)'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('battle')
                .setDescription('Défi un autre joueur')
                .addUserOption(option =>
                    option.setName('opponent')
                        .setDescription('Joueur à défier')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('inventory')
                .setDescription('Voir votre inventaire'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('leaderboard')
                .setDescription('Classement des collectionneurs')),

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
            case 'daily':
                return this.handleDaily(interaction);
            case 'collect':
                return this.handleCollect(interaction);
            case 'battle':
                return this.handleBattle(interaction);
            case 'inventory':
                return this.handleInventory(interaction);
            case 'leaderboard':
                return this.handleLeaderboard(interaction);
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
        const collector = interaction.channel.createMessageComponentCollector({ filter, time: 60000 }); // 1 minute au lieu de 30 secondes

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
                const userData = this.getUserData(i.user.id, i.guild.id);
                userData.coins = (userData.coins || 0) + 25;
                userData.xp = (userData.xp || 0) + 10;
                this.saveUserData(i.user.id, i.guild.id, userData);
            } else {
                result = 'Vous perdez !';
                const userData = this.getUserData(i.user.id, i.guild.id);
                userData.xp = (userData.xp || 0) + 5;
                this.saveUserData(i.user.id, i.guild.id, userData);
            }

            const resultEmbed = new EmbedBuilder()
                .setTitle('Résultat')
                .addFields(
                    { name: 'Votre choix', value: `${choices[userChoice].emoji} ${choices[userChoice].name}`, inline: true },
                    { name: 'Mon choix', value: `${choices[botChoice].emoji} ${choices[botChoice].name}`, inline: true },
                    { name: 'Résultat', value: result, inline: false }
                )
                .setColor(result === 'Vous gagnez !' ? 0x00FF00 : result === 'Vous perdez !' ? 0xFF0000 : 0xFFFF00);

            if (result === 'Vous gagnez !') {
                resultEmbed.addFields({ name: 'Récompense', value: '+25 pièces, +10 XP', inline: false });
            }

            await i.update({ embeds: [resultEmbed], components: [] });
            collector.stop();
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
            },
            {
                question: "Quelle est la planète la plus proche du soleil ?",
                options: ["Vénus", "Mercure", "Mars", "Terre"],
                correct: 1
            },
            {
                question: "En quelle année l'homme a-t-il marché sur la lune ?",
                options: ["1967", "1969", "1971", "1973"],
                correct: 1
            },
            {
                question: "Quel est le plus grand océan du monde ?",
                options: ["Atlantique", "Indien", "Arctique", "Pacifique"],
                correct: 3
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

            const userData = this.getUserData(i.user.id, i.guild.id);
            if (isCorrect) {
                userData.coins = (userData.coins || 0) + 50;
                userData.xp = (userData.xp || 0) + 20;
            } else {
                userData.xp = (userData.xp || 0) + 5;
            }
            this.saveUserData(i.user.id, i.guild.id, userData);

            const resultEmbed = new EmbedBuilder()
                .setTitle(isCorrect ? 'Correct !' : 'Incorrect !')
                .setDescription(`La bonne réponse était : **${randomQuestion.options[randomQuestion.correct]}**`)
                .setColor(isCorrect ? 0x00FF00 : 0xFF0000);

            if (isCorrect) {
                resultEmbed.addFields({ name: 'Récompense', value: '+50 pièces, +20 XP', inline: false });
            }

            await i.update({ embeds: [resultEmbed], components: [] });
            collector.stop();
        });
    },

    async handleMemory(interaction) {
        const sequence = [];
        const emojis = ['🔴', '🟡', '🟢', '🔵'];
        
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
                    
                    const userData = this.getUserData(i.user.id, i.guild.id);
                    if (isCorrect) {
                        userData.coins = (userData.coins || 0) + 100;
                        userData.xp = (userData.xp || 0) + 30;
                    } else {
                        userData.xp = (userData.xp || 0) + 10;
                    }
                    this.saveUserData(i.user.id, i.guild.id, userData);
                    
                    const resultEmbed = new EmbedBuilder()
                        .setTitle(isCorrect ? 'Bravo !' : 'Perdu !')
                        .setDescription(`Séquence originale : ${sequence.join(' ')}\nVotre séquence : ${userSequence.join(' ')}`)
                        .setColor(isCorrect ? 0x00FF00 : 0xFF0000);

                    if (isCorrect) {
                        resultEmbed.addFields({ name: 'Récompense', value: '+100 pièces, +30 XP', inline: false });
                    }

                    await i.update({ embeds: [resultEmbed], components: [] });
                    collector.stop();
                } else {
                    await i.deferUpdate();
                }
            });
        }, 5000);
    },

    async handleDaily(interaction) {
        const userData = this.getUserData(interaction.user.id, interaction.guild.id);
        const now = Date.now();
        const oneDay = 24 * 60 * 60 * 1000;
        
        if (now - (userData.lastDaily || 0) < oneDay) {
            const timeLeft = oneDay - (now - (userData.lastDaily || 0));
            const hours = Math.floor(timeLeft / (60 * 60 * 1000));
            const minutes = Math.floor((timeLeft % (60 * 60 * 1000)) / (60 * 1000));
            
            return interaction.reply({
                content: `Revenez dans ${hours}h ${minutes}m pour votre récompense quotidienne!`,
                ephemeral: true
            });
        }
        
        userData.lastDaily = now;
        userData.streak = userData.streak || 0;
        
        if (now - (userData.lastDaily || 0) < 48 * 60 * 60 * 1000) {
            userData.streak++;
        } else {
            userData.streak = 1;
        }
        
        const baseReward = 100;
        const coinsEarned = baseReward * Math.min(userData.streak, 7);
        const xpEarned = 50 * userData.streak;
        
        userData.coins = (userData.coins || 0) + coinsEarned;
        userData.xp = (userData.xp || 0) + xpEarned;
        
        this.saveUserData(interaction.user.id, interaction.guild.id, userData);
        
        const embed = new EmbedBuilder()
            .setTitle('Récompense Quotidienne!')
            .setDescription(`Série: ${userData.streak} jour(s) consécutif(s)`)
            .addFields(
                { name: 'Pièces gagnées', value: `${coinsEarned}`, inline: true },
                { name: 'XP gagné', value: `${xpEarned}`, inline: true },
                { name: 'Total pièces', value: `${userData.coins}`, inline: true }
            )
            .setColor(0xFFD700)
            .setFooter({ text: `Série maximale: x7 | Prochaine récompense dans 24h` });
            
        await interaction.reply({ embeds: [embed] });
    },

    async handleCollect(interaction) {
        const userData = this.getUserData(interaction.user.id, interaction.guild.id);
        const now = Date.now();
        const fourHours = 4 * 60 * 60 * 1000;
        
        if (now - (userData.lastCollect || 0) < fourHours) {
            const timeLeft = fourHours - (now - (userData.lastCollect || 0));
            const hours = Math.floor(timeLeft / (60 * 60 * 1000));
            const minutes = Math.floor((timeLeft % (60 * 60 * 1000)) / (60 * 1000));
            
            return interaction.reply({
                content: `Collection disponible dans ${hours}h ${minutes}m!`,
                ephemeral: true
            });
        }
        
        const rarities = [
            { name: 'Commun', emoji: '⚪', chance: 50, value: 25 },
            { name: 'Rare', emoji: '🟢', chance: 30, value: 75 },
            { name: 'Épique', emoji: '🟣', chance: 15, value: 200 },
            { name: 'Légendaire', emoji: '🟠', chance: 4, value: 750 },
            { name: 'Mythique', emoji: '🔴', chance: 1, value: 2500 }
        ];
        
        const items = [
            'Cristal', 'Gemme', 'Relique', 'Artefact', 'Talisman', 
            'Amulette', 'Orbe', 'Sceptre', 'Couronne', 'Épée'
        ];
        
        const random = Math.random() * 100;
        let cumulativeChance = 0;
        let foundItem = null;
        
        for (const rarity of rarities) {
            cumulativeChance += rarity.chance;
            if (random <= cumulativeChance) {
                foundItem = rarity;
                break;
            }
        }
        
        const itemName = items[Math.floor(Math.random() * items.length)];
        const fullItemName = `${foundItem.name} ${itemName}`;
        
        userData.lastCollect = now;
        userData.inventory = userData.inventory || {};
        userData.inventory[fullItemName] = (userData.inventory[fullItemName] || 0) + 1;
        userData.coins = (userData.coins || 0) + foundItem.value;
        
        this.saveUserData(interaction.user.id, interaction.guild.id, userData);
        
        const embed = new EmbedBuilder()
            .setTitle('Objet Collecté!')
            .setDescription(`${foundItem.emoji} **${fullItemName}** ${foundItem.emoji}`)
            .addFields(
                { name: 'Rareté', value: foundItem.name, inline: true },
                { name: 'Valeur', value: `${foundItem.value} pièces`, inline: true },
                { name: 'Quantité totale', value: `${userData.inventory[fullItemName]}`, inline: true }
            )
            .setColor(foundItem.name === 'Mythique' ? 0xFF0000 : 
                     foundItem.name === 'Légendaire' ? 0xFF8C00 :
                     foundItem.name === 'Épique' ? 0x800080 :
                     foundItem.name === 'Rare' ? 0x00FF00 : 0x808080)
            .setFooter({ text: 'Prochaine collection dans 4h' });
            
        await interaction.reply({ embeds: [embed] });
        
        if (foundItem.name === 'Mythique' || foundItem.name === 'Légendaire') {
            setTimeout(() => {
                interaction.followUp({
                    content: `🎉 ${interaction.user} vient de trouver un objet ${foundItem.name}! Incroyable chance!`
                });
            }, 1000);
        }
    },

    async handleBattle(interaction) {
        const opponent = interaction.options.getUser('opponent');
        
        if (opponent.bot || opponent.id === interaction.user.id) {
            return interaction.reply({
                content: 'Vous ne pouvez pas défier des bots ou vous-même!',
                ephemeral: true
            });
        }
        
        const challengeEmbed = new EmbedBuilder()
            .setTitle('Défi de Combat!')
            .setDescription(`${interaction.user} défie ${opponent} en duel!`)
            .setColor(0xFF6B35);
            
        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('accept_battle')
                    .setLabel('Accepter')
                    .setEmoji('⚔️')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId('decline_battle')
                    .setLabel('Refuser')
                    .setEmoji('❌')
                    .setStyle(ButtonStyle.Danger)
            );
        
        await interaction.reply({
            content: `${opponent}`,
            embeds: [challengeEmbed],
            components: [row]
        });
        
        const filter = i => i.user.id === opponent.id && (i.customId === 'accept_battle' || i.customId === 'decline_battle');
        const collector = interaction.channel.createMessageComponentCollector({ filter, time: 60000 });
        
        collector.on('collect', async i => {
            if (i.customId === 'accept_battle') {
                await this.startBattle(i, interaction.user, opponent);
            } else {
                await i.update({
                    content: `${opponent} a refusé le défi.`,
                    embeds: [],
                    components: []
                });
            }
            collector.stop();
        });
        
        collector.on('end', collected => {
            if (collected.size === 0) {
                interaction.editReply({
                    content: 'Défi expiré - pas de réponse.',
                    embeds: [],
                    components: []
                });
            }
        });
    },

    async startBattle(interaction, challenger, opponent) {
        const challengerData = this.getUserData(challenger.id, interaction.guild.id);
        const opponentData = this.getUserData(opponent.id, interaction.guild.id);
        
        const challengerPower = (challengerData.xp || 100) + (Object.keys(challengerData.inventory || {}).length * 50);
        const opponentPower = (opponentData.xp || 100) + (Object.keys(opponentData.inventory || {}).length * 50);
        
        // Stocker l'état du combat
        this.battleState = {
            challenger,
            opponent,
            challengerPower,
            opponentPower,
            challengerScore: 0,
            opponentScore: 0,
            round: 1
        };
        
        await this.playRound(interaction);
    },

    async playRound(interaction) {
        const state = this.battleState;
        
        if (state.round > 3 || state.challengerScore === 2 || state.opponentScore === 2) {
            return this.finishBattle(interaction);
        }
        
        const battleEmbed = new EmbedBuilder()
            .setTitle(`Combat - Manche ${state.round}/3`)
            .setDescription(`${state.challenger.username} vs ${state.opponent.username}\n\nScore: ${state.challengerScore} - ${state.opponentScore}`)
            .addFields(
                { name: 'Puissance', value: `${state.challenger.username}: ${state.challengerPower}\n${state.opponent.username}: ${state.opponentPower}`, inline: true }
            )
            .setColor(0xFF6B35);
            
        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`round_rock_${state.round}`)
                    .setLabel('Pierre')
                    .setEmoji('🗿')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId(`round_paper_${state.round}`)
                    .setLabel('Papier')
                    .setEmoji('📄')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId(`round_scissors_${state.round}`)
                    .setLabel('Ciseaux')
                    .setEmoji('✂️')
                    .setStyle(ButtonStyle.Primary)
            );
            
        // Pour la première manche, utiliser update, sinon utiliser followUp
        if (state.round === 1) {
            await interaction.update({
                content: `Manche ${state.round} - Faites vos choix!`,
                embeds: [battleEmbed],
                components: [row]
            });
        } else {
            await interaction.followUp({
                content: `Manche ${state.round} - Faites vos choix!`,
                embeds: [battleEmbed],
                components: [row]
            });
        }
        
        const choices = {};
        const filter = i => (i.user.id === state.challenger.id || i.user.id === state.opponent.id) && i.customId.startsWith(`round_`);
        const collector = interaction.channel.createMessageComponentCollector({ filter, time: 60000 }); // 1 minute
        
        collector.on('collect', async i => {
            const choice = i.customId.split('_')[1];
            choices[i.user.id] = choice;
            
            if (Object.keys(choices).length === 2) {
                collector.stop();
                
                const challengerChoice = choices[state.challenger.id];
                const opponentChoice = choices[state.opponent.id];
                
                const choiceEmojis = {
                    rock: '🗿',
                    paper: '📄',
                    scissors: '✂️'
                };
                
                let roundWinner = null;
                if (challengerChoice === opponentChoice) {
                    roundWinner = 'tie';
                } else if (
                    (challengerChoice === 'rock' && opponentChoice === 'scissors') ||
                    (challengerChoice === 'paper' && opponentChoice === 'rock') ||
                    (challengerChoice === 'scissors' && opponentChoice === 'paper')
                ) {
                    roundWinner = state.challenger;
                    state.challengerScore++;
                } else {
                    roundWinner = state.opponent;
                    state.opponentScore++;
                }
                
                const resultEmbed = new EmbedBuilder()
                    .setTitle(`Résultat Manche ${state.round}`)
                    .addFields(
                        { name: state.challenger.username, value: `${choiceEmojis[challengerChoice]}`, inline: true },
                        { name: 'VS', value: '⚔️', inline: true },
                        { name: state.opponent.username, value: `${choiceEmojis[opponentChoice]}`, inline: true },
                        { name: 'Vainqueur', value: roundWinner === 'tie' ? 'Égalité!' : `${roundWinner.username}`, inline: false },
                        { name: 'Score', value: `${state.challengerScore} - ${state.opponentScore}`, inline: false }
                    )
                    .setColor(roundWinner === 'tie' ? 0xFFFF00 : 0x00FF00);
                    
                await i.update({
                    content: '',
                    embeds: [resultEmbed],
                    components: []
                });
                
                state.round++;
                
                setTimeout(() => {
                    if (state.round > 3 || state.challengerScore === 2 || state.opponentScore === 2) {
                        this.finishBattle(interaction);
                    } else {
                        this.playRound(interaction);
                    }
                }, 2000);
            } else {
                await i.deferUpdate();
            }
        });
        
        collector.on('end', collected => {
            if (collected.size < 2) {
                interaction.followUp({
                    content: 'Combat annulé - temps écoulé'
                });
                delete this.battleState;
            }
        });
    },
    
    async finishBattle(interaction) {
        const state = this.battleState;
        const winner = state.challengerScore > state.opponentScore ? state.challenger : state.opponent;
        const loser = winner === state.challenger ? state.opponent : state.challenger;
        
        const winnerData = this.getUserData(winner.id, interaction.guild.id);
        const loserData = this.getUserData(loser.id, interaction.guild.id);
        
        const reward = Math.floor(Math.random() * 300) + 200;
        winnerData.coins = (winnerData.coins || 0) + reward;
        winnerData.xp = (winnerData.xp || 0) + 50;
        winnerData.wins = (winnerData.wins || 0) + 1;
        
        loserData.xp = (loserData.xp || 0) + 15;
        loserData.losses = (loserData.losses || 0) + 1;
        
        this.saveUserData(winner.id, interaction.guild.id, winnerData);
        this.saveUserData(loser.id, interaction.guild.id, loserData);
        
        const finalEmbed = new EmbedBuilder()
            .setTitle('Combat Terminé!')
            .setDescription(`${winner.username} remporte le combat ${state.challengerScore}-${state.opponentScore}!`)
            .addFields(
                { name: 'Vainqueur', value: `${winner}\n+${reward} pièces\n+50 XP\n+1 Victoire`, inline: true },
                { name: 'Adversaire', value: `${loser}\n+15 XP\n+1 Défaite`, inline: true }
            )
            .setColor(0x00FF00);
            
        await interaction.followUp({
            embeds: [finalEmbed]
        });
        
        delete this.battleState;
    },

    async handleInventory(interaction) {
        const userData = this.getUserData(interaction.user.id, interaction.guild.id);
        
        if (!userData.inventory || Object.keys(userData.inventory).length === 0) {
            return interaction.reply({
                content: 'Votre inventaire est vide! Utilisez `/games collect` pour commencer à collecter.',
                ephemeral: true
            });
        }
        
        const items = Object.entries(userData.inventory).sort((a, b) => b[1] - a[1]);
        const itemList = items.map(([item, count]) => `${item} x${count}`).join('\n');
        
        const embed = new EmbedBuilder()
            .setTitle(`Inventaire de ${interaction.user.username}`)
            .setDescription(itemList)
            .addFields(
                { name: 'Total pièces', value: `${userData.coins || 0}`, inline: true },
                { name: 'XP total', value: `${userData.xp || 0}`, inline: true },
                { name: 'Objets uniques', value: `${Object.keys(userData.inventory).length}`, inline: true }
            )
            .setColor(0x9966CC)
            .setTimestamp();
            
        if (userData.wins || userData.losses) {
            embed.addFields({
                name: 'Combat',
                value: `Victoires: ${userData.wins || 0} | Défaites: ${userData.losses || 0}`,
                inline: false
            });
        }
            
        await interaction.reply({ embeds: [embed] });
    },

    async handleLeaderboard(interaction) {
        const filePath = path.join(__dirname, '../../data/gaming.json');
        let allData = {};
        
        try {
            allData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        } catch (error) {
            return interaction.reply('Aucune donnée de classement disponible.');
        }
        
        const guildData = Object.entries(allData)
            .filter(([key]) => key.startsWith(`${interaction.guild.id}-`))
            .map(([key, data]) => ({
                userId: key.split('-')[1],
                ...data,
                totalValue: (data.coins || 0) + (data.xp || 0) + (Object.keys(data.inventory || {}).length * 100)
            }))
            .sort((a, b) => b.totalValue - a.totalValue)
            .slice(0, 10);
            
        if (guildData.length === 0) {
            return interaction.reply('Aucun joueur dans le classement.');
        }
        
        let leaderboard = '';
        for (let i = 0; i < guildData.length; i++) {
            const player = guildData[i];
            const user = await interaction.client.users.fetch(player.userId).catch(() => null);
            const username = user ? user.username : 'Utilisateur inconnu';
            
            const medals = ['🥇', '🥈', '🥉'];
            const medal = medals[i] || `${i + 1}.`;
            
            leaderboard += `${medal} **${username}**\n`;
            leaderboard += `   💰 ${player.coins || 0} pièces | ✨ ${player.xp || 0} XP\n`;
            leaderboard += `   🎒 ${Object.keys(player.inventory || {}).length} objets uniques\n\n`;
        }
        
        const embed = new EmbedBuilder()
            .setTitle('🏆 Classement des Collectionneurs')
            .setDescription(leaderboard)
            .setColor(0xFFD700)
            .setTimestamp();
            
        await interaction.reply({ embeds: [embed] });
    },

    async handleRiddle(interaction) {
        const riddles = [
            {
                question: "Je suis plus lourd que l'air mais je vole. Qui suis-je ?",
                answer: "avion",
                hint: "Transport aérien"
            },
            {
                question: "Plus je sèche, plus je mouille. Qui suis-je ?",
                answer: "serviette",
                hint: "Objet de salle de bain"
            },
            {
                question: "J'ai des dents mais je ne mords pas. Qui suis-je ?",
                answer: "peigne",
                hint: "Accessoire de coiffure"
            }
        ];
        
        const riddle = riddles[Math.floor(Math.random() * riddles.length)];
        
        const embed = new EmbedBuilder()
            .setTitle('Énigme')
            .setDescription(riddle.question)
            .setFooter({ text: 'Répondez dans le chat !' })
            .setColor(0x9966CC);
            
        await interaction.reply({ embeds: [embed] });
        
        const filter = m => m.author.id === interaction.user.id;
        const collector = interaction.channel.createMessageComponentCollector({ filter, time: 120000 }); // 2 minutes au lieu de 60 secondes
        
        collector.on('collect', m => {
            if (m.content.toLowerCase().includes(riddle.answer.toLowerCase())) {
                const userData = this.getUserData(m.author.id, interaction.guild.id);
                userData.coins = (userData.coins || 0) + 150;
                userData.xp = (userData.xp || 0) + 40;
                this.saveUserData(m.author.id, interaction.guild.id, userData);
                
                m.reply(`Bravo ! La réponse était bien "${riddle.answer}". +150 pièces, +40 XP`);
            } else {
                m.reply(`Mauvaise réponse ! La réponse était "${riddle.answer}". Indice: ${riddle.hint}`);
            }
        });
        
        collector.on('end', collected => {
            if (collected.size === 0) {
                interaction.followUp(`Temps écoulé ! La réponse était "${riddle.answer}".`);
            }
        });
    },

    async handleTrivia(interaction) {
        return this.handleQuiz(interaction);
    },

    getUserData(userId, guildId) {
        const filePath = path.join(__dirname, '../../data/gaming.json');
        let data = {};
        
        try {
            data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        } catch (error) {
            data = {};
        }
        
        const key = `${guildId}-${userId}`;
        return data[key] || {};
    },

    saveUserData(userId, guildId, userData) {
        const filePath = path.join(__dirname, '../../data/gaming.json');
        let data = {};
        
        try {
            data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        } catch (error) {
            data = {};
        }
        
        const key = `${guildId}-${userId}`;
        data[key] = userData;
        
        const dir = path.dirname(filePath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    }
};