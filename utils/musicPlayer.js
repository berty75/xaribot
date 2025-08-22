const { createAudioPlayer, createAudioResource, joinVoiceChannel, AudioPlayerStatus } = require('@discordjs/voice');
const { google } = require('googleapis');

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
                volume: 50,
                playing: false
            });
        }
        return this.queues.get(guildId);
    }

    async play(interaction, query) {
        const queue = this.getQueue(interaction.guild.id);
        const voiceChannel = interaction.member.voice.channel;

        if (!voiceChannel) {
            return interaction.reply('Vous devez être dans un canal vocal !');
        }

        try {
            await interaction.deferReply();
            
            let videoUrl;
            let videoTitle;
            
            if (query.includes('youtube.com') || query.includes('youtu.be')) {
                videoUrl = query;
                videoTitle = 'Vidéo YouTube';
            } else {
                try {
                    const youtube = google.youtube({
                        version: 'v3',
                        auth: process.env.YOUTUBE_API_KEY
                    });
                    
                    const response = await youtube.search.list({
                        part: 'snippet',
                        q: query,
                        type: 'video',
                        maxResults: 1
                    });
                    
                    if (!response.data.items || response.data.items.length === 0) {
                        return interaction.editReply('Aucune vidéo trouvée !');
                    }
                    
                    const video = response.data.items[0];
                    videoUrl = `https://www.youtube.com/watch?v=${video.id.videoId}`;
                    videoTitle = video.snippet.title;
                    
                    console.log('API YouTube - Vidéo trouvée:', videoTitle);
                } catch (apiError) {
                    console.error('Erreur API YouTube:', apiError.message);
                    return interaction.editReply('Erreur lors de la recherche.');
                }
            }

            const song = {
                title: videoTitle,
                url: videoUrl,
                duration: 'Durée inconnue',
                thumbnail: null,
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

                queue.player.on(AudioPlayerStatus.Playing, () => {
                    console.log('Lecture en cours');
                    queue.playing = true;
                });

                queue.player.on(AudioPlayerStatus.Idle, () => {
                    console.log('Musique terminée');
                    queue.playing = false;
                    queue.songs.shift();
                    this.playNextSong(interaction.guild.id);
                });

                this.playNextSong(interaction.guild.id);
            }

            await interaction.editReply(`${song.title} ajoutée à la file !`);

        } catch (error) {
            console.error('Erreur:', error);
            await interaction.editReply('Erreur lors de la recherche.');
        }
    }

    async playNextSong(guildId) {
        const queue = this.getQueue(guildId);
        
        if (queue.songs.length === 0) {
            return;
        }

        const song = queue.songs[0];
        
        try {
            const ytdl = require('ytdl-core');
            const stream = ytdl(song.url, { filter: 'audioonly', quality: 'lowestaudio' });
            const resource = createAudioResource(stream);
            queue.player.play(resource);
            console.log('Lecture:', song.title);
        } catch (error) {
            console.error('Erreur lecture:', error.message);
            queue.songs.shift();
            if (queue.songs.length > 0) {
                setTimeout(() => this.playNextSong(guildId), 1000);
            }
        }
    }

    skip(guildId) {
        const queue = this.getQueue(guildId);
        if (queue.player && queue.songs.length > 0) {
            queue.player.stop();
            return true;
        }
        return false;
    }

    stop(guildId) {
        const queue = this.getQueue(guildId);
        queue.songs = [];
        if (queue.player) queue.player.stop();
        if (queue.connection) queue.connection.destroy();
        this.queues.delete(guildId);
    }

    getCurrentSong(guildId) {
        const queue = this.getQueue(guildId);
        return queue.songs[0] || null;
    }
}

module.exports = new MusicPlayer();