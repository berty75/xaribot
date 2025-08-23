const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const https = require('https');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('quote')
        .setDescription('Citations inspirantes')
        .addStringOption(option =>
            option.setName('category')
                .setDescription('Catégorie de citation')
                .setRequired(false)
                .addChoices(
                    { name: 'Motivation', value: 'inspirational' },
                    { name: 'Sagesse', value: 'wisdom' },
                    { name: 'Amour', value: 'love' },
                    { name: 'Succès', value: 'success' },
                    { name: 'Vie', value: 'life' },
                    { name: 'Aléatoire', value: 'random' }
                )),

    async execute(interaction) {
        await interaction.deferReply();

        const category = interaction.options.getString('category') || 'random';

        try {
            const quote = await this.getQuote(category);
            
            const embed = new EmbedBuilder()
                .setTitle('Citation du jour')
                .setDescription(`*"${quote.text}"*`)
                .setColor(0x9B59B6)
                .setFooter({ text: quote.author ? `- ${quote.author}` : '- Auteur inconnu' })
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error('Erreur citations:', error);
            
            // Citations de fallback
            const fallbackQuotes = [
                { text: "Le succès, c'est d'aller d'échec en échec sans perdre son enthousiasme.", author: "Winston Churchill" },
                { text: "La seule façon d'échouer, c'est d'abandonner.", author: "Albert Einstein" },
                { text: "L'imagination est plus importante que la connaissance.", author: "Albert Einstein" }
            ];
            
            const randomQuote = fallbackQuotes[Math.floor(Math.random() * fallbackQuotes.length)];
            
            const embed = new EmbedBuilder()
                .setTitle('Citation du jour')
                .setDescription(`*"${randomQuote.text}"*`)
                .setColor(0x9B59B6)
                .setFooter({ text: `- ${randomQuote.author}` })
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });
        }
    },

    getQuote(category) {
        return new Promise((resolve, reject) => {
            const apiKey = process.env.QUOTABLE_API_KEY; // Optionnel pour certaines APIs
            let url;
            
            if (category === 'random') {
                url = 'https://api.quotable.io/random';
            } else {
                url = `https://api.quotable.io/random?tags=${category}`;
            }

            https.get(url, (res) => {
                let data = '';

                res.on('data', chunk => {
                    data += chunk;
                });

                res.on('end', () => {
                    try {
                        const quoteData = JSON.parse(data);
                        resolve({
                            text: quoteData.content,
                            author: quoteData.author
                        });
                    } catch (error) {
                        reject(error);
                    }
                });
            }).on('error', reject);
        });
    }
};