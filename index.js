require('dotenv').config();
const { Client, GatewayIntentBits, Events } = require('discord.js');
const { loadCommands } = require('./handlers/commandHandler');
const levelSystem = require('./utils/levelSystem');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMembers
    ]
});

// Charger les commandes
loadCommands(client);

client.once(Events.ClientReady, () => {
    console.log(`Bot connecté en tant que ${client.user.tag}!`);
    console.log(`Présent sur ${client.guilds.cache.size} serveur(s)`);
});

// Gestionnaire d'interactions (commandes slash)
client.on(Events.InteractionCreate, async interaction => {
    if (!interaction.isChatInputCommand()) return;

    const command = client.commands.get(interaction.commandName);
    if (!command) {
        console.error(`Commande ${interaction.commandName} non trouvée.`);
        return;
    }

    try {
        await command.execute(interaction);
    } catch (error) {
        console.error('Erreur lors de l\'exécution de la commande:', error);
        if (interaction.replied || interaction.deferred) {
            await interaction.followUp({ content: 'Une erreur est survenue!', flags: 64 });
        } else {
            await interaction.reply({ content: 'Une erreur est survenue!', flags: 64 });
        }
    }
});

// Système de niveaux
client.on('messageCreate', message => {
    if (message.author.bot || !message.guild) return;

    if (!client.xpCooldowns) client.xpCooldowns = new Map();
    const cooldownKey = `${message.guild.id}-${message.author.id}`;
    const now = Date.now();
    
    if (client.xpCooldowns.has(cooldownKey)) {
        const expirationTime = client.xpCooldowns.get(cooldownKey) + 60000;
        if (now < expirationTime) return;
    }

    client.xpCooldowns.set(cooldownKey, now);
    const result = levelSystem.addXP(message.guild.id, message.author.id);
    
    if (result.levelUp) {
        message.channel.send(`Félicitations ${message.author} ! Tu es maintenant niveau ${result.level} !`);
    }
});

client.login(process.env.BOT_TOKEN);