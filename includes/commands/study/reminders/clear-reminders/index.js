const Discord = require('discord.js');
const _ = require('lodash');

module.exports = async (client) => {
    let exports = {};

    exports.meta = {};
    exports.meta.name = 'clear-reminders';
    exports.meta.description = 'Clears all reminders';
    exports.meta.module = 'study';
    exports.meta.examples = ['clear-reminders'];
    exports.meta.aliases = [];

    const Reminder = client.db.model('Reminder');

    exports.run = async (client, message, arg) => {
        const reminders = await Reminder.find()
            .where('authorID').equals(message.author.id)
            .exec();
        await Promise.all(reminders.map(async (r) => {
            await client.removeReminder(client, r);
            await r.remove();
        }));

        let embed = client.helpers.generateSuccessEmbed(client, message.author, 'Removed all reminders.');
        return message.channel.send(embed);
    };

    return exports;
};
