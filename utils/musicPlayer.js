const { createAudioPlayer, createAudioResource, joinVoiceChannel, AudioPlayerStatus } = require('@discordjs/voice');
const play = require('play-dl');

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
            return interaction.reply('❌ Vous devez être dans un canal vocal !');
        }

        try {
            await interaction.deferReply();
            
            let videoInfo;
            
            // Vérifier si c'est une URL YouTube directe
            if (query.includes('youtube.com') || query.includes('youtu.be')) {
                try {
                    videoInfo = await play.video_info(query);
                } catch (error) {
                    console.log('Erreur URL directe, recherche normale...');
                    const searched = await play.search(query, { limit: 1, source: { youtube: "video" } });
                    videoInfo = searched[0] ? await play.video_info(searched[0].url) : null;
                }
            } else {
                // Recherche normale
                const searched = await play.search(query, { limit: 1, source: { youtube: "video" } });
                if (searched && searched.length > 0) {
                    videoInfo = await play.video_info(searched[0].url);
                }
            }
            
            if (!videoInfo || !videoInfo.video_details) {
                return interaction.editReply('❌ Aucune vidéo trouvée !');
            }

            const song = {
                title: videoInfo.video_details.title,
                url: videoInfo.video_details.url,
                duration: this.formatDuration(videoInfo.video_details.durationInSec),
                thumbnail: videoInfo.video_details.thumbnails?.[0]?.url,
                requestedBy: interaction.user,
                videoInfo: videoInfo
            };

            console.log('✅ Vidéo trouvée:', song.title);
            console.log('✅ URL:', song.url);

            queue.songs.push(song);

            if (!queue.connection) {
                try {
                    queue.connection = joinVoiceChannel({
                        channelId: voiceChannel.id,
                        guildId: interaction.guild.id,
                        adapterCreator: interaction.guild.voiceAdapterCreator,
                    });

                    queue.player = createAudioPlayer();
                    queue.connection.subscribe(queue.player);

                    // Gestion des événements du player
                    queue.player.on(AudioPlayerStatus.Playing, () => {
                        console.log('🎵 Lecture en cours');
                        queue.playing = true;
                    });

                    queue.player.on(AudioPlayerStatus.Idle, () => {
                        console.log('⏭️ Musique terminée, passage à la suivante');
                        queue.playing = false;
                        queue.songs.shift();
                        this.playNextSong(interaction.guild.id);
                    });

                    queue.player.on('error', (error) => {
                        console.error('❌ Erreur player:', error.message);
                        queue.songs.shift();
                        this.playNextSong(interaction.guild.id);
                    });

                    console.log('🔗 Connexion vocale établie');
                    this.playNextSong(interaction.guild.id);
                } catch (error) {
                    console.error('❌ Erreur connexion vocale:', error);
                    return interaction.editReply('❌ Impossible de rejoindre le canal vocal !');
                }
            }

            const position = queue.songs.length;
            if (position === 1) {
                await interaction.editReply(`🎵 **${song.title}** est maintenant en lecture !`);
            } else {
                await interaction.editReply(`🎵 **${song.title}** ajoutée à la file d'attente ! (Position: ${position})`);
            }

        } catch (error) {
            console.error('❌ Erreur lors de la recherche:', error);
            await interaction.editReply('❌ Erreur lors de la recherche de la musique.');
        }
    }

    async playNextSong(guildId) {
        const queue = this.getQueue(guildId);
        
        if (queue.songs.length === 0) {
            console.log('📭 File d\'attente vide');
            if (queue.connection) {
                setTimeout(() => {
                    if (queue.songs.length === 0) {
                        queue.connection.destroy();
                        this.queues.delete(guildId);
                        console.log('🔌 Déconnexion automatique');
                    }
                }, 30000);
            }
            return;
        }

        const song = queue.songs[0];
        
        if (!song.url) {
            console.error('❌ URL manquante pour:', song.title);
            queue.songs.shift();
            this.playNextSong(guildId);
            return;
        }
        
        try {
            console.log('🎵 Tentative de lecture de:', song.title);
            console.log('🔗 URL utilisée:', song.url);
            
            // MÉTHODE 1: play-dl avec qualité spécifiée
            const stream = await play.stream(song.url, { 
                quality: 2
            });
            
            if (!stream || !stream.stream) {
                throw new Error('Stream invalide');
            }

            console.log('📡 Stream créé, type:', stream.type);

            const resource = createAudioResource(stream.stream, {
                inputType: stream.type,
                inlineVolume: true
            });

            resource.volume?.setVolume(queue.volume / 100);
            
            queue.player.play(resource);
            console.log('✅ Lecture démarrée avec play-dl pour:', song.title);

        } catch (error) {
            console.error('❌ Méthode 1 échouée:', error.message);
            
            // MÉTHODE 2: play-dl sans options
            try {
                console.log('🔄 Tentative méthode 2: play-dl sans options...');
                const fallbackStream = await play.stream(song.url);
                
                if (!fallbackStream || !fallbackStream.stream) {
                    throw new Error('Fallback stream invalide');
                }
                
                console.log('📡 Fallback stream créé, type:', fallbackStream.type);
                
                const resource = createAudioResource(fallbackStream.stream, {
                    inputType: fallbackStream.type
                });
                
                queue.player.play(resource);
                console.log('✅ Méthode 2 réussie pour:', song.title);
                
            } catch (fallbackError) {
                console.error('❌ Méthode 2 échouée:', fallbackError.message);
                
                // MÉTHODE 3: ytdl-core optimisé
                try {
                    console.log('🔄 Tentative méthode 3: ytdl-core optimisé...');
                    
                    const ytdl = require('ytdl-core');
                    
                    const ytdlStream = ytdl(song.url, { 
                        filter: 'audioonly',
                        quality: 'lowestaudio',
                        highWaterMark: 1<<25,
                        requestOptions: {
                            headers: {
                                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                            }
                        }
                    });
                    
                    ytdlStream.on('error', (streamError) => {
                        console.error('❌ Erreur ytdl stream:', streamError.message);
                        queue.songs.shift();
                        setTimeout(() => this.playNextSong(guildId), 1000);
                    });
                    
                    const resource = createAudioResource(ytdlStream, {
                        inputType: 'arbitrary'
                    });
                    
                    queue.player.play(resource);
                    console.log('✅ Méthode 3 (ytdl-core) réussie pour:', song.title);
                    
                } catch (ytdlError) {
                    console.error('❌ Méthode 3 échouée:', ytdlError.message);
                    
                    // MÉTHODE 4: play-dl avec video_basic_info
                    try {
                        console.log('🔄 Tentative méthode 4: play-dl basic_info...');
                        
                        const basicInfo = await play.video_basic_info(song.url);
                        if (!basicInfo || !basicInfo.video_details) {
                            throw new Error('Informations vidéo non disponibles');
                        }
                        
                        const stream4 = await play.stream(basicInfo.video_details.url);
                        
                        if (!stream4 || !stream4.stream) {
                            throw new Error('Stream basic_info invalide');
                        }
                        
                        const resource = createAudioResource(stream4.stream, {
                            inputType: stream4.type
                        });
                        
                        queue.player.play(resource);
                        console.log('✅ Méthode 4 (basic_info) réussie pour:', song.title);
                        
                    } catch (basicInfoError) {
                        console.error('❌ Méthode 4 échouée:', basicInfoError.message);
                        
                        // MÉTHODE 5: Dernier recours - Skip
                        console.log('❌ Toutes les méthodes ont échoué pour:', song.title);
                        console.log('⏭️ Passage à la musique suivante...');
                        
                        queue.songs.shift();
                        
                        if (queue.songs.length > 0) {
                            setTimeout(() => this.playNextSong(guildId), 2000);
                        } else {
                            console.log('📭 Plus de musiques dans la file d\'attente');
                        }
                    }
                }
            }
        }
    }

    skip(guildId) {
        const queue = this.getQueue(guildId);
        if (queue.player && queue.songs.length > 0) {
            console.log('⏭️ Skip demandé');
            queue.player.stop();
            return true;
        }
        return false;
    }

    stop(guildId) {
        const queue = this.getQueue(guildId);
        console.log('⏹️ Arrêt demandé');
        queue.songs = [];
        if (queue.player) {
            queue.player.stop();
        }
        if (queue.connection) {
            queue.connection.destroy();
        }
        this.queues.delete(guildId);
    }

    formatDuration(seconds) {
        if (!seconds) return 'Durée inconnue';
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    getCurrentSong(guildId) {
        const queue = this.getQueue(guildId);
        return queue.songs[0] || null;
    }

    getQueueLength(guildId) {
        const queue = this.getQueue(guildId);
        return queue.songs.length;
    }

    isPlaying(guildId) {
        const queue = this.getQueue(guildId);
        return queue.playing && queue.songs.length > 0;
    }
}

module.exports = new MusicPlayer();