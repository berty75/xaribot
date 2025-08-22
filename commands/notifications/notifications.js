const { SlashCommandBuilder, EmbedBuilder, ChannelType } = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('notify')
        .setDescription('Gérer les notifications automatiques')
        .addSubcommand(subcommand =>
            subcommand
                .setName('welcome')
                .setDescription('Configurer les messages de bienvenue')
                .addChannelOption(option =>
                    option.setName('channel')
                        .setDescription('Canal pour les messages de bienvenue')
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('message')
                        .setDescription('Message de bienvenue (utilisez {user} pour mentionner)')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('reminder')
                .setDescription('Créer un rappel automatique')
                .addStringOption(option =>
                    option.setName('message')
                        .setDescription('Message du rappel')
                        .setRequired(true))
                .addIntegerOption(option =>
                    option.setName('minutes')
                        .setDescription('Dans combien de minutes')
                        .setRequired(true)
                        .setMinValue(1)
                        .setMaxValue(1440)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('schedule')
                .setDescription('Programmer un message')
                .addChannelOption(option =>
                    option.setName('channel')
                        .setDescription('Canal de destination')
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('message')
                        .setDescription('Message à envoyer')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('time')
                        .setDescription('Heure (format: HH:MM)')
                        .setRequired(true)))
        .setDefaultMemberPermissions('0x20'), // MANAGE_MESSAGES

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        
        switch (subcommand) {
            case 'welcome':
                return this.handleWelcome(interaction);
            case 'reminder':
                return this.handleReminder(interaction);
            case 'schedule':
                return this.handleSchedule(interaction);
        }
    },

    async handleWelcome(interaction) {
        const channel = interaction.options.getChannel('channel');
        const message = interaction.options.getString('message');

        const config = {
            guildId: interaction.guild.id,
            welcomeChannel: channel.id,
            welcomeMessage: message,
            enabled: true
        };

        this.saveWelcomeConfig(config);

        const embed = new EmbedBuilder()
            .setTitle('✅ Configuration sauvegardée')
            .setDescription(`Messages de bienvenue configurés dans ${channel}`)
            .addFields(
                { name: 'Message', value: message.replace('{user}', interaction.user.toString()), inline: false }
            )
            .setColor(0x00FF00);

        await interaction.reply({ embeds: [embed] });
    },

    async handleReminder(interaction) {
        const message = interaction.options.getString('message');
        const minutes = interaction.options.getInteger('minutes');

        const reminder = {
            userId: interaction.user.id,
            channelId: interaction.channel.id,
            message,
            triggerTime: Date.now() + (minutes * 60 * 1000),
            createdAt: Date.now()
        };

        this.saveReminder(reminder);

        setTimeout(() => {
            this.triggerReminder(interaction.client, reminder);
        }, minutes * 60 * 1000);

        const embed = new EmbedBuilder()
            .setTitle('⏰ Rappel programmé')
            .setDescription(`Je vous rappellerai dans ${minutes} minute(s)`)
            .addFields(
                { name: 'Message', value: message, inline: false }
            )
            .setColor(0xFFAA00);

        await interaction.reply({ embeds: [embed] });
    },

    async handleSchedule(interaction) {
        const channel = interaction.options.getChannel('channel');
        const message = interaction.options.getString('message');
        const timeString = interaction.options.getString('time');

        // Valider le format de l'heure
        const timeRegex = /^([01]?[0-9]|2[0-3]):([0-5][0-9])$/;
        if (!timeRegex.test(timeString)) {
            return interaction.reply({
                content: 'Format d\'heure invalide ! Utilisez HH:MM (ex: 14:30)',
                ephemeral: true
            });
        }

        const [hours, minutes] = timeString.split(':').map(Number);
        const now = new Date();
        const scheduledTime = new Date();
        scheduledTime.setHours(hours, minutes, 0, 0);

        // Si l'heure est déjà passée aujourd'hui, programmer pour demain
        if (scheduledTime <= now) {
            scheduledTime.setDate(scheduledTime.getDate() + 1);
        }

        const scheduledMessage = {
            guildId: interaction.guild.id,
            channelId: channel.id,
            message,
            scheduledTime: scheduledTime.getTime(),
            createdBy: interaction.user.id,
            createdAt: Date.now()
        };

        this.saveScheduledMessage(scheduledMessage);

        const delay = scheduledTime.getTime() - Date.now();
        setTimeout(() => {
            this.sendScheduledMessage(interaction.client, scheduledMessage);
        }, delay);

        const embed = new EmbedBuilder()
            .setTitle('📅 Message programmé')
            .setDescription(`Message programmé pour ${timeString}`)
            .addFields(
                { name: 'Canal', value: channel.toString(), inline: true },
                { name: 'Heure', value: `<t:${Math.floor(scheduledTime.getTime() / 1000)}:F>`, inline: true },
                { name: 'Message', value: message, inline: false }
            )
            .setColor(0x0099FF);

        await interaction.reply({ embeds: [embed] });
    },

    saveWelcomeConfig(config) {
        const filePath = path.join(__dirname, '../../data/welcome.json');
        let configs = [];
        try {
            configs = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        } catch (error) {
            configs = [];
        }
        
        const existingIndex = configs.findIndex(c => c.guildId === config.guildId);
        if (existingIndex !== -1) {
            configs[existingIndex] = config;
        } else {
            configs.push(config);
        }
        
        fs.writeFileSync(filePath, JSON.stringify(configs, null, 2));
    },

    saveReminder(reminder) {
        const filePath = path.join(__dirname, '../../data/reminders.json');
        let reminders = [];
        try {
            reminders = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        } catch (error) {
            reminders = [];
        }
        reminders.push(reminder);
        fs.writeFileSync(filePath, JSON.stringify(reminders, null, 2));
    },

    saveScheduledMessage(scheduledMessage) {
        const filePath = path.join(__dirname, '../../data/scheduled.json');
        let messages = [];
        try {
            messages = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        } catch (error) {
            messages = [];
        }
        messages.push(scheduledMessage);
        fs.writeFileSync(filePath, JSON.stringify(messages, null, 2));
    },

    async triggerReminder(client, reminder) {
        try {
            const channel = await client.channels.fetch(reminder.channelId);
            const user = await client.users.fetch(reminder.userId);
            
            const embed = new EmbedBuilder()
                .setTitle('⏰ Rappel')
                .setDescription(reminder.message)
                .setColor(0xFFAA00)
                .setTimestamp();
                
            await channel.send({ content: user.toString(), embeds: [embed] });
        } catch (error) {
            console.error('Erreur lors du rappel:', error);
        }
    },

    async sendScheduledMessage(client, scheduledMessage) {
        try {
            const channel = await client.channels.fetch(scheduledMessage.channelId);
            await channel.send(scheduledMessage.message);
        } catch (error) {
            console.error('Erreur lors de l\'envoi du message programmé:', error);
        }
    }
};