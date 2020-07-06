const Discord = require('discord.js');
const _ = require('lodash');

module.exports = async (client) => {
    let exports = {};

    exports.meta = {};
    exports.meta.name = 'clear-alert';
    exports.meta.description = 'Removes the alert with the specified ID.';
    exports.meta.module = 'study';
    exports.meta.examples = ['clear-alert f5f4f4'];
    exports.meta.aliases = ['remove-alert', 'delete-alert'];

    const Alert = client.db.model('Alert');

    exports.run = async (client, message, arg) => {
        const alerts = await Alert.find()
            .where('authorID').equals(message.author.id)
            .where('_id').equals(arg)
            .exec();

        if (alerts.length !== 1) {
            throw new Error('Unable to find an alert with that ID.');
        }

        const alert = alerts[0];
        const id = alert.id;

        await alert.remove();

        let embed = client.helpers.generateSuccessEmbed(client, message.author, `Removed alert: ${id}.`);
        return message.channel.send(embed);
    };

    return exports;
};
