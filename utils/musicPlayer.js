const { createAudioPlayer, createAudioResource, joinVoiceChannel, AudioPlayerStatus, VoiceConnectionStatus } = require('@discordjs/voice');
const ytdl = require('@distube/ytdl-core');

class MusicPlayer {
    constructor() {
        this.queues = new Map();
    }

    getQueue(guildId) {
        if (!this.queues.has(guildId)) {
            this.queues.set(guildId, {
                songs: [],
                connection: null,
                player: null,
                isPlaying: false,
                volume: 50
            });
        }
        return this.queues.get(guildId);
    }

    async play(interaction, query) {
        const queue = this.getQueue(interaction.guild.id);
        const voiceChannel = interaction.member.voice.channel;

        if (!voiceChannel) {
            return interaction.reply('❌ Vous devez être dans un canal vocal !');
        }

        try {
            await interaction.deferReply();
            
            // Rechercher la vidéo
            const videoInfo = await ytdl.getInfo(query);
            const song = {
                title: videoInfo.videoDetails.title,
                url: videoInfo.videoDetails.video_url,
                duration: this.formatDuration(parseInt(videoInfo.videoDetails.lengthSeconds)),
                thumbnail: videoInfo.videoDetails.thumbnails[0]?.url,
                requestedBy: interaction.user
            };

            queue.songs.push(song);

            if (!queue.connection) {
                queue.connection = joinVoiceChannel({
                    channelId: voiceChannel.id,
                    guildId: interaction.guild.id,
                    adapterCreator: interaction.guild.voiceAdapterCreator,
                });

                queue.player = createAudioPlayer();
                queue.connection.subscribe(queue.player);

                queue.connection.on(VoiceConnectionStatus.Ready, () => {
                    console.log('Connexion vocale prête');
                });

                queue.connection.on(VoiceConnectionStatus.Disconnected, () => {
                    console.log('Connexion vocale fermée');
                });

                this.playNextSong(interaction.guild.id);
            }

            await interaction.editReply(`🎵 **${song.title}** ajouté à la file d'attente !`);

        } catch (error) {
            console.error('Erreur lors de la lecture:', error);
            await interaction.editReply('❌ Erreur lors de la lecture de la musique.');
        }
    }

    async playNextSong(guildId) {
        const queue = this.getQueue(guildId);
        
        if (queue.songs.length === 0) {
            queue.isPlaying = false;
            console.log('File d\'attente vide');
            return;
        }

        const song = queue.songs[0];
        queue.isPlaying = true;

        try {
            console.log(`Tentative lecture: ${song.title}`);
            
            const stream = ytdl(song.url, {
                filter: 'audioonly',
                quality: 'highestaudio',
                highWaterMark: 1 << 25
            });

            const resource = createAudioResource(stream, {
                inputType: 'arbitrary',
            });

            queue.player.play(resource);
            console.log(`Lecture démarrée: ${song.title}`);

            queue.player.once(AudioPlayerStatus.Idle, () => {
                console.log(`Chanson terminée: ${song.title}`);
                queue.songs.shift();
                this.playNextSong(guildId);
            });

            queue.player.once(AudioPlayerStatus.Playing, () => {
                console.log(`Statut: En cours de lecture`);
            });

            queue.player.on('error', error => {
                console.error('Erreur player:', error);
                queue.songs.shift();
                this.playNextSong(guildId);
            });

        } catch (error) {
            console.error('Erreur lecture audio:', error);
            queue.songs.shift();
            setTimeout(() => this.playNextSong(guildId), 1000);
        }
    }

    skip(interaction) {
        const queue = this.getQueue(interaction.guild.id);
        
        if (!queue.player || queue.songs.length === 0) {
            return interaction.reply('❌ Aucune musique en cours !');
        }

        queue.player.stop();
        interaction.reply('⏭️ Musique passée !');
    }

    stop(interaction) {
        const queue = this.getQueue(interaction.guild.id);
        
        if (!queue.player) {
            return interaction.reply('❌ Aucune musique en cours !');
        }

        queue.songs = [];
        queue.player.stop();
        queue.connection?.destroy();
        this.queues.delete(interaction.guild.id);
        
        interaction.reply('⏹️ Musique arrêtée !');
    }

    getQueue(interaction) {
        const queue = this.getQueue(interaction.guild.id);
        
        if (queue.songs.length === 0) {
            return interaction.reply('❌ File d\'attente vide !');
        }

        const current = queue.songs[0];
        const upcoming = queue.songs.slice(1, 11);
        
        let queueString = `**🎵 En cours de lecture :**\n${current.title}\n\n`;
        
        if (upcoming.length > 0) {
            queueString += `**📋 À venir :**\n`;
            upcoming.forEach((song, index) => {
                queueString += `${index + 1}. ${song.title}\n`;
            });
        }

        interaction.reply(queueString);
    }

    nowPlaying(interaction) {
        const queue = this.getQueue(interaction.guild.id);
        
        if (!queue.player || queue.songs.length === 0) {
            return interaction.reply('❌ Aucune musique en cours !');
        }

        const current = queue.songs[0];
        interaction.reply(`🎵 **En cours :** ${current.title}`);
    }

    setVolume(interaction, volume) {
        const queue = this.getQueue(interaction.guild.id);
        
        if (!queue.player) {
            return interaction.reply('❌ Aucune musique en cours !');
        }

        if (volume < 0 || volume > 100) {
            return interaction.reply('❌ Volume doit être entre 0 et 100 !');
        }

        queue.volume = volume;
        interaction.reply(`🔊 Volume réglé à ${volume}% !`);
    }

    formatDuration(seconds) {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
}

module.exports = new MusicPlayer();