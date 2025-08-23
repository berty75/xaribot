const { createAudioPlayer, createAudioResource, joinVoiceChannel, AudioPlayerStatus } = require('@discordjs/voice');

class RadioPlayer {
    constructor() {
        this.connections = new Map();
        this.stations = {
            skyrock: {
                name: 'Skyrock',
                url: 'http://icecast.skyrock.net/s/natio_mp3_128k',
                description: 'Première sur le rap - Planète Rap 20h-21h'
            },
            planeterap: {
                name: 'Planète Rap (Podcast)',
                url: 'https://skyrock.fm/emissions/planete-rap',
                description: 'Podcast de l\'émission rap de référence'
            }
        };
    }

    async play(interaction, stationName) {
        const voiceChannel = interaction.member.voice.channel;
        if (!voiceChannel) {
            return interaction.reply('Vous devez être dans un canal vocal !');
        }

        const station = this.stations[stationName.toLowerCase()];
        if (!station) {
            return interaction.reply('Station non trouvée. Utilisez `/radio list` pour voir les stations disponibles.');
        }

        try {
            await interaction.deferReply();

            const connection = joinVoiceChannel({
                channelId: voiceChannel.id,
                guildId: interaction.guild.id,
                adapterCreator: interaction.guild.voiceAdapterCreator,
            });

            const player = createAudioPlayer();
            const resource = createAudioResource(station.url);
            
            player.play(resource);
            connection.subscribe(player);

            this.connections.set(interaction.guild.id, {
                connection,
                player,
                station: station.name
            });

            await interaction.editReply(`Radio lancée : **${station.name}**\n${station.description}`);

        } catch (error) {
            console.error('Erreur radio:', error);
            await interaction.editReply('Erreur lors du lancement de la radio.');
        }
    }

    stop(interaction) {
        const guildConnection = this.connections.get(interaction.guild.id);
        if (!guildConnection) {
            return interaction.reply('Aucune radio en cours.');
        }

        guildConnection.player.stop();
        guildConnection.connection.destroy();
        this.connections.delete(interaction.guild.id);
        
        interaction.reply('Radio arrêtée.');
    }

    list(interaction) {
        const stationList = Object.entries(this.stations)
            .map(([key, station]) => `**${key}** - ${station.name}\n${station.description}`)
            .join('\n\n');

        interaction.reply(`Stations disponibles :\n\n${stationList}\n\nUtilisez \`/radio <nom>\` pour écouter.`);
    }

    nowPlaying(interaction) {
        const guildConnection = this.connections.get(interaction.guild.id);
        if (!guildConnection) {
            return interaction.reply('Aucune radio en cours.');
        }

        interaction.reply(`En cours : **${guildConnection.station}**`);
    }
}

module.exports = new RadioPlayer();