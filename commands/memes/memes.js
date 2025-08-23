const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const https = require('https');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('memes')
        .setDescription('Memes depuis Reddit')
        .addStringOption(option =>
            option.setName('category')
                .setDescription('Catégorie de memes')
                .setRequired(false)
                .addChoices(
                    { name: 'Memes généraux', value: 'memes' },
                    { name: 'Memes français', value: 'rance' },
                    { name: 'Programming', value: 'ProgrammerHumor' },
                    { name: 'Gaming', value: 'gaming' },
                    { name: 'Animaux', value: 'animalsbeingderps' },
                    { name: 'Dank memes', value: 'dankmemes' }
                )),

    async execute(interaction) {
        await interaction.deferReply();

        const category = interaction.options.getString('category') || 'memes';

        try {
            const memeData = await this.getRedditMeme(category);
            
            if (!memeData) {
                return interaction.editReply('Aucun meme trouvé dans cette catégorie!');
            }

            const embed = new EmbedBuilder()
                .setTitle(memeData.title.length > 256 ? memeData.title.substring(0, 253) + '...' : memeData.title)
                .setImage(memeData.url)
                .setColor(0xFF6B35)
                .addFields(
                    { name: 'Upvotes', value: memeData.ups.toString(), inline: true },
                    { name: 'Subreddit', value: `r/${memeData.subreddit}`, inline: true },
                    { name: 'Auteur', value: `u/${memeData.author}`, inline: true }
                )
                .setFooter({ text: 'Source: Reddit' })
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error('Erreur memes:', error);
            await interaction.editReply('Impossible de récupérer des memes pour le moment.');
        }
    },

    async getRedditMeme(subreddit) {
        return new Promise((resolve, reject) => {
            const options = {
                hostname: 'www.reddit.com',
                path: `/r/${subreddit}/hot.json?limit=100`,
                headers: {
                    'User-Agent': 'XariBot/1.0 (Discord Bot)'
                }
            };

            https.get(options, (res) => {
                let data = '';

                res.on('data', chunk => {
                    data += chunk;
                });

                res.on('end', () => {
                    try {
                        const redditData = JSON.parse(data);
                        const posts = redditData.data.children;
                        
                        // Filtrer les posts avec des images
                        const imagePosts = posts.filter(post => {
                            const url = post.data.url;
                            return url && (
                                url.includes('.jpg') || 
                                url.includes('.jpeg') || 
                                url.includes('.png') || 
                                url.includes('.gif') ||
                                url.includes('i.redd.it') ||
                                url.includes('imgur.com')
                            ) && !post.data.over_18; // Pas de contenu NSFW
                        });

                        if (imagePosts.length > 0) {
                            const randomPost = imagePosts[Math.floor(Math.random() * imagePosts.length)];
                            const postData = randomPost.data;
                            
                            resolve({
                                title: postData.title,
                                url: postData.url,
                                ups: postData.ups,
                                subreddit: postData.subreddit,
                                author: postData.author,
                                permalink: `https://reddit.com${postData.permalink}`
                            });
                        } else {
                            resolve(null);
                        }
                    } catch (error) {
                        reject(error);
                    }
                });
            }).on('error', reject);
        });
    }
};