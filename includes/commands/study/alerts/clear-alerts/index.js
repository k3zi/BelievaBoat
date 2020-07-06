const Discord = require('discord.js');
const _ = require('lodash');

module.exports = async (client) => {
    let exports = {};

    exports.meta = {};
    exports.meta.name = 'clear-alerts';
    exports.meta.description = 'Clears all alerts.';
    exports.meta.module = 'study';
    exports.meta.examples = ['clear-alerts'];
    exports.meta.aliases = [];

    const Alert = client.db.model('Alert');

    exports.run = async (client, message, arg) => {
        const alerts = await Alert.find()
            .where('authorID').equals(message.author.id)
            .exec();
        await Promise.all(alerts.map(async (r) => {
            await r.remove();
        }));

        let embed = client.helpers.generateSuccessEmbed(client, message.author, 'Removed all alerts.');
        return message.channel.send(embed);
    };

    return exports;
};
