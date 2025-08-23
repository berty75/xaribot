const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const https = require('https');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('weather')
        .setDescription('Météo gratuite en temps réel')
        .addStringOption(option =>
            option.setName('city')
                .setDescription('Nom de la ville')
                .setRequired(true)),

    async execute(interaction) {
        await interaction.deferReply();

        const city = interaction.options.getString('city');

        try {
            // Étape 1: Géocoding pour obtenir lat/lon
            const coords = await this.getCoordinates(city);
            
            // Étape 2: Obtenir météo avec les coordonnées
            const weatherData = await this.getWeatherData(coords.latitude, coords.longitude);
            
            const weatherCode = weatherData.current.weather_code;
            const temp = weatherData.current.temperature_2m;
            const humidity = weatherData.current.relative_humidity_2m;
            const windSpeed = weatherData.current.wind_speed_10m;
            
            const embed = new EmbedBuilder()
                .setTitle(`🌍 Météo à ${coords.name}, ${coords.country}`)
                .setDescription(`${this.getWeatherEmoji(weatherCode)} **${temp}°C**`)
                .addFields(
                    { name: '🌡️ Température', value: `${temp}°C`, inline: true },
                    { name: '💧 Humidité', value: `${humidity}%`, inline: true },
                    { name: '💨 Vent', value: `${windSpeed} km/h`, inline: true },
                    { name: 'Code météo', value: this.getWeatherDescription(weatherCode), inline: false }
                )
                .setColor(this.getWeatherColor(temp))
                .setTimestamp()
                .setFooter({ text: 'Données fournies par Open-Meteo (gratuit) • Aujourd\'hui à ' + new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) });

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error('Erreur météo:', error);
            await interaction.editReply({
                content: 'Impossible de récupérer les données météo pour cette ville. Vérifiez l\'orthographe.'
            });
        }
    },

    getCoordinates(city) {
        return new Promise((resolve, reject) => {
            const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=fr&format=json`;

            https.get(url, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    try {
                        const geoData = JSON.parse(data);
                        if (geoData.results && geoData.results.length > 0) {
                            const result = geoData.results[0];
                            resolve({
                                latitude: result.latitude,
                                longitude: result.longitude,
                                name: result.name,
                                country: result.country
                            });
                        } else {
                            reject(new Error('Ville introuvable'));
                        }
                    } catch (error) {
                        reject(error);
                    }
                });
            }).on('error', reject);
        });
    },

    getWeatherData(lat, lon) {
        return new Promise((resolve, reject) => {
            const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&timezone=auto`;

            https.get(url, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    try {
                        resolve(JSON.parse(data));
                    } catch (error) {
                        reject(error);
                    }
                });
            }).on('error', reject);
        });
    },

    getWeatherDescription(code) {
        const descriptions = {
            0: 'Ciel dégagé',
            1: 'Principalement dégagé',
            2: 'Partiellement nuageux',
            3: 'Couvert',
            45: 'Brouillard',
            48: 'Brouillard givrant',
            51: 'Bruine légère',
            53: 'Bruine modérée',
            55: 'Bruine dense',
            61: 'Pluie légère',
            63: 'Pluie modérée',
            65: 'Pluie forte',
            71: 'Neige légère',
            73: 'Neige modérée',
            75: 'Neige forte',
            95: 'Orage',
            96: 'Orage avec grêle',
            99: 'Orage violent'
        };
        return descriptions[code] || 'Conditions inconnues';
    },

    getWeatherColor(temp) {
        if (temp <= 0) return 0x87CEEB;      // Bleu ciel (froid)
        if (temp <= 10) return 0x4682B4;     // Bleu acier (frais)
        if (temp <= 25) return 0xFFD700;     // Doré (agréable)
        return 0xFF4500;                     // Rouge-orange (chaud)
    }, 

    getWeatherEmoji(weatherCode) {
        const weatherEmojis = {
            0: '☀️',    // Ciel dégagé
            1: '🌤️',    // Principalement dégagé
            2: '⛅',    // Partiellement nuageux
            3: '☁️',    // Couvert
            45: '🌫️',   // Brouillard
            48: '🌫️',   // Brouillard givrant
            51: '🌦️',   // Bruine légère
            53: '🌦️',   // Bruine modérée
            55: '🌧️',   // Bruine dense
            61: '🌧️',   // Pluie légère
            63: '🌧️',   // Pluie modérée
            65: '🌧️',   // Pluie forte
            71: '🌨️',   // Neige légère
            73: '❄️',   // Neige modérée
            75: '❄️',   // Neige forte
            95: '⛈️',   // Orages
            96: '⛈️',   // Orages avec grêle
            99: '⛈️'    // Orages violents
        };
        return weatherEmojis[weatherCode] || '🌤️';
    }
};