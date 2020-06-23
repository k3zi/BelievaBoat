const Discord = require('discord.js');
const _ = require('lodash');

module.exports = async (client) => {
    let exports = {};

    exports.meta = {};
    exports.meta.name = 'clear-reminder';
    exports.meta.description = 'Clears all reminders';
    exports.meta.module = 'study';
    exports.meta.examples = ['clear-reminder'];
    exports.meta.aliases = ['remove-reminder', 'delete-reminder'];

    const Reminder = client.db.model('Reminder');

    exports.run = async (client, message, arg) => {
        const reminders = await Reminder.find()
            .where('authorID').equals(message.author.id)
            .where('_id').equals(arg)
            .exec();

        if (reminders.length !== 1) {
            throw new Error('Unable to find a reminder with that ID.');
        }

        const reminder = reminders[0];
        const id = reminder.id;

        await client.removeReminder(client, reminder);
        await reminder.remove();

        let embed = client.helpers.generateSuccessEmbed(client, message.author, `Removed reminder: ${id}.`);
        return message.channel.send(embed);
    };

    return exports;
};
