const { Manager } = require('erela.js');

class MusicPlayer {
    constructor(client) {
        this.client = client;
        this.manager = new Manager({
            nodes: [{
                host: 'lavalink.nextgencoders.xyz',
                port: 443,
                password: 'nextgencoderspvt',
                secure: true,
            }],
            send(id, payload) {
                const guild = client.guilds.cache.get(id);
                if (guild) guild.shard.send(payload);
            },
        });

        this.manager
            .on('nodeConnect', node => console.log(`Lavalink connecté: ${node.options.identifier}`))
            .on('nodeError', (node, error) => console.error(`Erreur Lavalink ${node.options.identifier}:`, error))
            .on('trackStart', (player, track) => {
                const channel = client.channels.cache.get(player.textChannel);
                channel.send(`Lecture: **${track.title}**`);
            })
            .on('queueEnd', player => {
                const channel = client.channels.cache.get(player.textChannel);
                channel.send('File d\'attente terminée');
                player.destroy();
            });
    }

    init() {
        this.manager.init(this.client.user.id);
    }

    async play(interaction, query) {
        const voiceChannel = interaction.member.voice.channel;
        if (!voiceChannel) {
            return interaction.reply('Vous devez être dans un canal vocal !');
        }

        await interaction.deferReply();

        try {
            const res = await this.manager.search(query, interaction.user);
            
            if (res.loadType === 'LOAD_FAILED') {
                return interaction.editReply('Erreur de chargement');
            }
            
            if (res.loadType === 'NO_MATCHES') {
                return interaction.editReply('Aucun résultat trouvé');
            }

            const player = this.manager.create({
                guild: interaction.guild.id,
                voiceChannel: voiceChannel.id,
                textChannel: interaction.channel.id,
            });

            if (player.state !== 'CONNECTED') player.connect();

            player.queue.add(res.tracks[0]);
            
            if (!player.playing && !player.paused && !player.queue.size) {
                player.play();
            }

            await interaction.editReply(`Ajouté: **${res.tracks[0].title}**`);

        } catch (error) {
            console.error('Erreur play:', error);
            await interaction.editReply('Erreur lors de la lecture');
        }
    }

    skip(interaction) {
        const player = this.manager.get(interaction.guild.id);
        if (!player) return interaction.reply('Aucune musique en cours');
        
        player.stop();
        interaction.reply('Musique passée');
    }

    stop(interaction) {
        const player = this.manager.get(interaction.guild.id);
        if (!player) return interaction.reply('Aucune musique en cours');
        
        player.destroy();
        interaction.reply('Musique arrêtée');
    }
}

module.exports = MusicPlayer;