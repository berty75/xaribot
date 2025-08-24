const radioPlayer = require('../../utils/musicPlayer');

module.exports = {
    data: {
        name: 'radio',
        description: 'Contrôle de la radio',
        options: [
            {
                name: 'action',
                description: 'Action à effectuer',
                type: 3,
                required: true,
                choices: [
                    { name: 'Skyrock', value: 'skyrock' },
                    { name: 'Planète Rap', value: 'planeterap' },
                    { name: 'Liste des stations', value: 'list' },
                    { name: 'Station actuelle', value: 'nowplaying' },
                    { name: 'Arrêter', value: 'stop' }
                ]
            }
        ]
    },

    async execute(interaction) {
        const action = interaction.options.getString('action');

        switch (action) {
            case 'skyrock':
            case 'planeterap':
                return radioPlayer.play(interaction, action);
            case 'list':
                return radioPlayer.list(interaction);
            case 'nowplaying':
                return radioPlayer.nowPlaying(interaction);
            case 'stop':
                return radioPlayer.stop(interaction);
        }
    }
};
