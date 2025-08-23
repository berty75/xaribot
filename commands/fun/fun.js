const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const https = require('https');
const QRCode = require('qrcode');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('fun')
        .setDescription('Commandes amusantes')
        .addSubcommand(subcommand =>
            subcommand
                .setName('meme')
                .setDescription('Afficher un meme aléatoire'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('joke')
                .setDescription('Raconter une blague'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('roast')
                .setDescription('Roaster quelqu\'un gentiment')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('Utilisateur à roaster')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('compliment')
                .setDescription('Faire un compliment à quelqu\'un')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('Utilisateur à complimenter')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('hug')
                .setDescription('Faire un câlin virtuel')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('Utilisateur à câliner')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('8ball')
                .setDescription('Poser une question à la boule magique')
                .addStringOption(option =>
                    option.setName('question')
                        .setDescription('Votre question')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('coinflip')
                .setDescription('Pile ou face'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('dice')
                .setDescription('Lancer un dé')
                .addIntegerOption(option =>
                    option.setName('sides')
                        .setDescription('Nombre de faces du dé')
                        .setRequired(false)
                        .setMinValue(2)
                        .setMaxValue(100)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('avatar')
                .setDescription('Afficher l\'avatar d\'un utilisateur')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('Utilisateur (vous par défaut)')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('reverse')
                .setDescription('Inverser du texte')
                .addStringOption(option =>
                    option.setName('text')
                        .setDescription('Texte à inverser')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('qrcode')
                .setDescription('Générer un QR code')
                .addStringOption(option =>
                    option.setName('text')
                        .setDescription('Texte à encoder')
                        .setRequired(true))),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        
        switch (subcommand) {
            case 'meme':
                return this.handleMeme(interaction);
            case 'joke':
                return this.handleJoke(interaction);
            case 'roast':
                return this.handleRoast(interaction);
            case 'compliment':
                return this.handleCompliment(interaction);
            case 'hug':
                return this.handleHug(interaction);
            case '8ball':
                return this.handle8Ball(interaction);
            case 'coinflip':
                return this.handleCoinflip(interaction);
            case 'dice':
                return this.handleDice(interaction);
            case 'avatar':
                return this.handleAvatar(interaction);
            case 'reverse':
                return this.handleReverse(interaction);
            case 'qrcode':
                return this.handleQRCode(interaction);
        }
    },

    // === MEME ===
    async handleMeme(interaction) {
        try {
            const memes = await this.fetchRedditMemes();
            if (memes.length === 0) {
                return interaction.reply('❌ Impossible de récupérer des memes pour le moment !');
            }
            
            const randomMeme = memes[Math.floor(Math.random() * memes.length)];
            
            const embed = new EmbedBuilder()
                .setTitle('😂 Meme du jour')
                .setDescription(randomMeme.title)
                .setImage(randomMeme.url)
                .setFooter({ text: `👍 ${randomMeme.ups} upvotes • r/${randomMeme.subreddit}` })
                .setColor(0xFF6B35);
                
            return interaction.reply({ embeds: [embed] });
        } catch (error) {
            return interaction.reply('❌ Erreur lors de la récupération du meme !');
        }
    },

    // === JOKE ===
    async handleJoke(interaction) {
        const jokes = [
            "Pourquoi les plongeurs plongent-ils toujours en arrière et jamais en avant ? Parce que sinon, ils tombent dans le bateau ! 😄",
            "Qu'est-ce qui est jaune et qui attend ? Jonathan ! 🍌",
            "Pourquoi les poissons n'aiment pas jouer au tennis ? Parce qu'ils ont peur du filet ! 🎾",
            "Comment appelle-t-on un chat tombé dans un pot de peinture le jour de Noël ? Un chat-mallow ! 🎨",
            "Que dit un escargot quand il croise une limace ? 'Regardez-moi ce punk !' 🐌",
            "Pourquoi les pompiers ont-ils des bretelles rouges ? Pour tenir leur pantalon ! 🚒",
            "Comment appelle-t-on un boomerang qui ne revient pas ? Un bâton ! 🪃",
            "Qu'est-ce qui est transparent et qui sent la carotte ? Un pet de lapin ! 🥕"
        ];
        
        const randomJoke = jokes[Math.floor(Math.random() * jokes.length)];
        
        const embed = new EmbedBuilder()
            .setTitle('😄 Blague du jour')
            .setDescription(randomJoke)
            .setColor(0xFFD700);
            
        return interaction.reply({ embeds: [embed] });
    },

    // === ROAST ===
    async handleRoast(interaction) {
        const user = interaction.options.getUser('user');
        const roasts = [
            `${user.username}, tu es tellement unique que même Google ne te trouve pas ! 🔍`,
            `${user.username}, tu apportes tellement de joie... quand tu quittes la pièce ! 😏`,
            `${user.username}, tu es comme une fonction JavaScript... personne ne comprend vraiment ce que tu fais ! 💻`,
            `${user.username}, tu as un visage pour la radio ! 📻`,
            `${user.username}, tu es la preuve vivante que même l'évolution peut faire marche arrière ! 🐵`,
            `${user.username}, tu es tellement lent que même Internet Explorer se moque de toi ! 🐌`
        ];
        
        const randomRoast = roasts[Math.floor(Math.random() * roasts.length)];
        
        return interaction.reply({
            content: `🔥 **ROAST** 🔥\n${randomRoast}`,
            allowedMentions: { users: [user.id] }
        });
    },

    // === COMPLIMENT ===
    async handleCompliment(interaction) {
        const user = interaction.options.getUser('user');
        const compliments = [
            `${user.username}, tu illumines cette journée comme un soleil ! ☀️`,
            `${user.username}, tu es plus cool qu'un pingouin en smoking ! 🐧`,
            `${user.username}, ta présence rend ce serveur 1000x plus sympa ! ✨`,
            `${user.username}, tu es comme un bon code : élégant et fonctionnel ! 💻`,
            `${user.username}, ton sourire peut alimenter une ville entière ! 😊`,
            `${user.username}, tu es la cerise sur le gâteau de ce serveur ! 🍒`
        ];
        
        const randomCompliment = compliments[Math.floor(Math.random() * compliments.length)];
        
        return interaction.reply({
            content: `💖 **COMPLIMENT** 💖\n${randomCompliment}`,
            allowedMentions: { users: [user.id] }
        });
    },

    // === HUG ===
    async handleHug(interaction) {
        const user = interaction.options.getUser('user');
        const hugGifs = [
            'https://media1.tenor.com/images/7ed8eba30d14bd58e1d6c7e09d95c4bf/tenor.gif',
            'https://media1.tenor.com/images/326c5286c88b70360e3b3e7e6a7d9db4/tenor.gif',
            'https://media1.tenor.com/images/c0e2e0a8d91664e8e0e5b7b5b9f0c8b8/tenor.gif'
        ];
        
        const randomGif = hugGifs[Math.floor(Math.random() * hugGifs.length)];
        
        const embed = new EmbedBuilder()
            .setTitle('🤗 Câlin virtuel !')
            .setDescription(`${interaction.user.username} fait un gros câlin à ${user.username} ! 💕`)
            .setImage(randomGif)
            .setColor(0xFF69B4);
            
        return interaction.reply({ 
            embeds: [embed],
            allowedMentions: { users: [user.id] }
        });
    },

    // === 8BALL ===
    async handle8Ball(interaction) {
        const question = interaction.options.getString('question');
        const responses = [
            '🎱 C\'est certain !',
            '🎱 Sans aucun doute !',
            '🎱 Oui, absolument !',
            '🎱 Tu peux compter dessus !',
            '🎱 Comme je le vois, oui !',
            '🎱 Probablement !',
            '🎱 Les perspectives sont bonnes !',
            '🎱 Oui !',
            '🎱 Les signes pointent vers oui !',
            '🎱 Ma réponse est non !',
            '🎱 Ne compte pas dessus !',
            '🎱 Ma réponse est non !',
            '🎱 Mes sources disent non !',
            '🎱 Les perspectives ne sont pas si bonnes !',
            '🎱 Très douteux !',
            '🎱 Concentre-toi et demande encore !',
            '🎱 Demande plus tard !',
            '🎱 Je ne peux pas prédire maintenant !',
            '🎱 Impossible à dire maintenant !'
        ];
        
        const response = responses[Math.floor(Math.random() * responses.length)];
        
        const embed = new EmbedBuilder()
            .setTitle('🎱 Boule Magique')
            .addFields(
                { name: '❓ Question', value: question, inline: false },
                { name: '🔮 Réponse', value: response, inline: false }
            )
            .setColor(0x000000);
            
        return interaction.reply({ embeds: [embed] });
    },

    // === COINFLIP ===
    async handleCoinflip(interaction) {
        const result = Math.random() < 0.5 ? 'Pile' : 'Face';
        const emoji = result === 'Pile' ? '🪙' : '🎭';
        
        const embed = new EmbedBuilder()
            .setTitle('🪙 Pile ou Face')
            .setDescription(`${emoji} **${result}** !`)
            .setColor(result === 'Pile' ? 0xFFD700 : 0xC0C0C0);
            
        return interaction.reply({ embeds: [embed] });
    },

    // === DICE ===
    async handleDice(interaction) {
        const sides = interaction.options.getInteger('sides') || 6;
        const result = Math.floor(Math.random() * sides) + 1;
        
        const embed = new EmbedBuilder()
            .setTitle('🎲 Lancer de dé')
            .setDescription(`Dé à **${sides} faces**\n\n🎯 **Résultat : ${result}**`)
            .setColor(0x00FF00);
            
        return interaction.reply({ embeds: [embed] });
    },

    // === AVATAR ===
    async handleAvatar(interaction) {
        const user = interaction.options.getUser('user') || interaction.user;
        
        const embed = new EmbedBuilder()
            .setTitle(`🖼️ Avatar de ${user.username}`)
            .setImage(user.displayAvatarURL({ dynamic: true, size: 512 }))
            .setFooter({ text: `ID: ${user.id}` })
            .setColor(0x5865F2);
            
        return interaction.reply({ embeds: [embed] });
    },

    // === REVERSE ===
    async handleReverse(interaction) {
        const text = interaction.options.getString('text');
        const reversed = text.split('').reverse().join('');
        
        const embed = new EmbedBuilder()
            .setTitle('🔄 Texte inversé')
            .addFields(
                { name: '📝 Original', value: text, inline: false },
                { name: '🔀 Inversé', value: reversed, inline: false }
            )
            .setColor(0x9966CC);
            
        return interaction.reply({ embeds: [embed] });
    },

    // === QR CODE ===
    async handleQRCode(interaction) {
        const text = interaction.options.getString('text');
        
        try {
            const qrCodeDataURL = await QRCode.toDataURL(text);
            
            const embed = new EmbedBuilder()
                .setTitle('📱 QR Code généré')
                .setDescription(`Contenu : \`${text}\``)
                .setImage(qrCodeDataURL)
                .setColor(0x000000);
                
            return interaction.reply({ embeds: [embed] });
        } catch (error) {
            return interaction.reply('❌ Erreur lors de la génération du QR code !');
        }
    },

    // === UTILS ===
    async fetchRedditMemes() {
        return new Promise((resolve) => {
            // Simuler des memes (remplacez par une vraie API Reddit)
            const fakeMemes = [
                {
                    title: "Quand tu vois ton code fonctionner du premier coup",
                    url: "https://i.imgflip.com/1g8my4.jpg",
                    ups: 1337,
                    subreddit: "ProgrammerHumor"
                },
                {
                    title: "Moi essayant de comprendre Discord.js",
                    url: "https://i.imgflip.com/2/30b1gx.jpg", 
                    ups: 2021,
                    subreddit: "memes"
                }
            ];
            resolve(fakeMemes);
        });
    }
};
