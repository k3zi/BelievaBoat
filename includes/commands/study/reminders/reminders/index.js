const ReminderType = require('./../reminderType');
const WhenType = require('./../whenType');
const moment = require('moment');
const remind = require('../remind');

module.exports = async (client) => {
    let exports = {};

    exports.meta = {};
    exports.meta.name = 'reminders';
    exports.meta.description = 'Display reminders.';
    exports.meta.module = 'study';
    exports.meta.examples = ['reminders'];
    exports.meta.aliases = [];

    const Reminder = client.db.model('Reminder');

    exports.run = async (client, message, arg) => {
        const reminders = await Reminder.find()
            .where('authorID').equals(message.author.id)
            .exec();

        let embed = client.helpers.generatePlainEmbed(client, client.user, '');
        embed = embed.setTitle(`Reminders:`);
        embed = embed.setFooter(`Replying to: ${message.id}`);
        embed = embed.setColor(client.helpers.colors.info);

        let descriptions = [];
        if (reminders.length === 0) {
            descriptions.push('No upcoming reminders.');
        } else {
            for (let reminder of reminders) {
                let info = '';
                if (reminder.type === ReminderType.once) {
                    const fireDate = moment(reminder.createdAt.getTime() + reminder.seconds * 1000);
                    info = `once ${fireDate.fromNow()}`;
                } else if (reminder.type === ReminderType.recurring) {
                    const duration = moment.duration(reminder.seconds).humanize();
                    info = `every ${duration}`;
                    
                    if (WhenType.isValid(remind.when)) {
                        info += ` when ${WhenType.toStatus(remind.when)}`;
                    }
                } else {
                    info = 'invalid';
                }
                descriptions.push(`\`${reminder.id}\` ${info}: ${reminder.message}`);
            }
        }
        embed = embed.setDescription(descriptions.join('\n'));
        return message.channel.send(embed);
    };

    return exports;
};
