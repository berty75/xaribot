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
            await interaction.followUp({ content: 'Une erreur est survenue lors de l\'exécution de cette commande!', ephemeral: true });
        } else {
            await interaction.reply({ content: 'Une erreur est survenue lors de l\'exécution de cette commande!', ephemeral: true });
        }
    }
});

// Système de niveaux automatique
client.on('messageCreate', message => {
    if (message.author.bot) return;
    if (!message.guild) return;
    
    // Éviter le spam - cooldown par utilisateur
    if (!client.xpCooldowns) client.xpCooldowns = new Map();
    const cooldownKey = `${message.guild.id}-${message.author.id}`;
    const now = Date.now();
    
    if (client.xpCooldowns.has(cooldownKey)) {
        const expirationTime = client.xpCooldowns.get(cooldownKey) + 60000; // 1 minute
        if (now < expirationTime) return;
    }
    
    client.xpCooldowns.set(cooldownKey, now);
    
    const result = levelSystem.addXP(message.guild.id, message.author.id);
    
    if (result.levelUp) {
        message.channel.send(`Félicitations ${message.author} ! Tu es maintenant niveau ${result.level} !`);
    }
});

// Ancien système de commandes (optionnel, pour compatibilité)
client.on('messageCreate', message => {
    if (message.author.bot) return;
    
    if (message.content === '!ping') {
        message.reply('Pong ! Utilisez `/ping` pour la nouvelle commande slash!');
    }
});

client.on('messageCreate', async message => {
    if (message.author.bot || !message.guild) return;

    const result = levelSystem.addXP(message.author.id, message.guild.id);
    
    if (result && result.levelUp) {
        const member = message.guild.members.cache.get(message.author.id);
        const rolesAdded = await levelSystem.checkRoleRewards(member, result.newLevel);
        
        let congratsMessage = `Félicitations ${message.author}! Vous avez atteint le niveau ${result.newLevel}!`;
        
        if (rolesAdded.length > 0) {
            congratsMessage += `\nNouveaux rôles obtenus : ${rolesAdded.join(', ')}`;
        }
        
        message.channel.send(congratsMessage);
    }
});

client.login(process.env.BOT_TOKEN);