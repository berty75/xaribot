require('dotenv').config();
const { Client, GatewayIntentBits, Events } = require('discord.js');
const { loadCommands } = require('./handlers/commandHandler');

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
    console.log(`✅ Bot connecté en tant que ${client.user.tag}!`);
    console.log(`🌐 Présent sur ${client.guilds.cache.size} serveur(s)`);
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
            await interaction.followUp({ content: 'Une erreur est survenue lors de l\'exécution de cette commande!', ephemeral: true });
        } else {
            await interaction.reply({ content: 'Une erreur est survenue lors de l\'exécution de cette commande!', ephemeral: true });
        }
    }
});

// Ancien système de commandes (optionnel, pour compatibilité)
client.on('messageCreate', message => {
    if (message.author.bot) return;
    
    if (message.content === '!ping') {
        message.reply('🏓 Pong ! Utilisez `/ping` pour la nouvelle commande slash!');
    }
});

client.login(process.env.BOT_TOKEN);