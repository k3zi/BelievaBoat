const Discord = require('discord.js');
const _ = require('lodash');

const ReminderType = Object.freeze({
    once: 1,
    recurring: 2
});

const WhenType = Object.freeze({
    online: 1,
    offline: 2,
    dnd: 3,
    idle: 4,
    busy: 3,
    isValid: (x) => [1, 2, 3, 4].includes(x),
    toStatus: (x) => ['invalid', 'online', 'offline', 'dnd', 'idle', 'busy'][x]
});

function parseTime(s) {
    const unitMapping = {
        'd': 60 * 60 * 24,
        'h': 60 * 60,
        'm': 60,
        's': 1
    };

    const matches = s.match(/\d*\.?\d+[dhms]/g);
    if (!matches) {
        return undefined;
    }

    let result = 0;
    for (let match of matches) {
        const unit = unitMapping[match.slice(-1)];
        const number = parseFloat(match.slice(0, -1));
        result += unit * number;
    }

    return result;
}

// remind [(me) / @user] [(in) | every] [time] [when [online | offline | dnd | idle]] [message] 
async function parseArgs(message, arg) {
    const result = {
        type: ReminderType.once,
        user: message.author,
        when: null,
        message: null,
        seconds: 0
    };
    const args = arg.split(' ');
    let token = args.shift();

    if (token === 'me') {
        result.user = message.author;
        token = args.shift();
    } else {
        let match;
        if (match = token.match(/<@[!]?([0-9]+)>/)) {
            let userID = match[1];
            if (message.guild.members.cache.has(userID)) {
                return message.guild.members.cache.get(userID).user;
            }

            result.user = await message.guild.client.fetch(userID);
        }
    }

    if (token === 'in') {
        result.type = ReminderType.once;
        token = args.shift();
    } else if (token === 'every') {
        result.type = ReminderType.recurring;
        token = args.shift();
    }

    let seconds = parseTime(token);
    if (seconds < 10) {
        throw new Error('The specified time was too short.');
    }
    result.seconds = seconds;
    token = args.shift();

    if (token === 'when' && ['online', 'offline', 'dnd', 'idle'].includes(args[0])) {
        if (result.type !== ReminderType.recurring) {
            throw new Error('`when` may only be used for recurring events.')
        }
        result.when = WhenType[args.shift()];
    } else {
        args.unshift(token);
    }

    result.message = args.join(' ');
    return result;
}

module.exports = async (client) => {
    let exports = {};

    exports.meta = {};
    exports.meta.name = 'remind';
    exports.meta.description = 'Displays the list of songs in the queue.';
    exports.meta.module = 'study';
    exports.meta.examples = ['remind @user in 2h go walk the dog'];
    exports.meta.aliases = [];

    const Reminder = client.db.model('Reminder');
    client.intervalReminderMapping = {};
    client.timeoutReminderMapping = {};

    async function fireReminder(client, reminder) {
        const channel = client.channels.cache.get(reminder.channelID);
        const user = await client.users.fetch(reminder.userID);
        const embed = new Discord.MessageEmbed()
            .setDescription(`${client.customEmojis.check} Reminder: ${reminder.message}`)
       　   .setColor(client.helpers.colors.info);
        await channel.send(user, embed);
    }

    async function removeReminder(client, reminder) {
        const id = reminder.id;
        const interval = client.intervalReminderMapping[id];
        if (interval) {
            clearInterval(interval);
            delete client.intervalReminderMapping[id];
        }

        const timeout = client.timeoutReminderMapping[id];
        if (timeout) {
            clearTimeout(timeout);
            delete client.timeoutReminderMapping[id];
        }
    }

    async function addReminder(client, reminder) {
        const user = await client.users.fetch(reminder.userID);
        if (WhenType.isValid(reminder.when) && user.presence.status !== WhenType.toStatus(reminder.when)) {
            return;
        }

        const now = new Date();
        if (reminder.type === ReminderType.once) {
            const fireDate = new Date(reminder.createdAt.getTime() + reminder.seconds * 1000);
            let timeot = fireDate - now;
            if (timeot <= 0) {
                await fireReminder(client, reminder);
                return await reminder.remove();
            }
            const timeout = setTimeout(async () => {
                await fireReminder(client, reminder);
                await reminder.remove();
            }, timeot);
            client.timeoutReminderMapping[reminder.id] = timeout;
        } else if (reminder.type === ReminderType.recurring) {
            let fireDate = reminder.createdAt;
            if (WhenType.isValid(reminder.when)) {
                fireDate = new Date();
            } else {
                let nextFireDate = fireDate;
                while (nextFireDate < now) {
                    fireDate = nextFireDate;
                    nextFireDate = new Date(nextFireDate.getTime() + reminder.seconds * 1000);
                }
            }

            const delayToFireDate = Math.min(0, Math.max(0, now - fireDate));
            const timeout = setTimeout(() => {
                const interval = setInterval(async () => {
                    await fireReminder(client, reminder);
                }, reminder.seconds * 1000);
                client.intervalReminderMapping[reminder.id] = interval;
            }, delayToFireDate);
            client.timeoutReminderMapping[reminder.id] = timeout;
        }
    }

    client.addReminder = addReminder;
    client.removeReminder = removeReminder;

    exports.run = async (client, message, arg) => {
        const reminderInfo = await parseArgs(message, arg);
        console.log(reminderInfo);
        let remminder = new Reminder({
            channelID: message.channel.id,
            guildID: message.guild.id,
            message: reminderInfo.message,
            userID: message.author.id,
            type: reminderInfo.type,
            when: reminderInfo.when,
            seconds: reminderInfo.seconds
        });

        await remminder.save();
        await addReminder(client, remminder);

        let embed = client.helpers.generateSuccessEmbed(client, message.author, 'Successfully created reminder.');
        return message.channel.send(embed);
    };

    client.on(`ready`, async () => {
        const reminders = await Reminder.find().exec();
        client.helpers.log('reminder', `scheduling ${reminders.length} reminders`);
        await Promise.all(reminders.map((r) => addReminder(client, r)));
    });

    client.on('presenceUpdate', async (oldPresence, newPresence) => {
        if (!oldPresence) {
            return;
        }

        if (newPresence.status === oldPresence.status) {
            return;
        }

        const user = newPresence.user;
        const reminders = await Reminder.find()
            .where('userID').equals(user.id)
            .exec();
        if (reminders.length === 0) {
            return;
        }

        client.helpers.log('reminders', `${user.username} status changed from: ${oldPresence.status} to ${newPresence.status}; adjusting ${reminders.length} reminders`);
        
        const validReminders = reminders.filter(r => WhenType.isValid(r.when));
        const inActiveReminders = validReminders.filter(r => WhenType.toStatus(r.when) !== newPresence.status && client.intervalReminderMapping[r.id]);
        const activeReminders = validReminders.filter(r => WhenType.toStatus(r.when) === newPresence.status && !client.intervalReminderMapping[r.id]);
        await Promise.all(inActiveReminders.map((r) => removeReminder(client, r)));
        await Promise.all(activeReminders.map((r) => addReminder(client, r)));
    });

    return exports;
};
