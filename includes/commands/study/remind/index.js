const _ = require('lodash');

const ReminderType = Object.freeze({
    once: 1,
    recurring: 2
});

const WhenType = Object.freeze({
    online: 1,
    offline: 2,
    dnd: 3,
    idle: 4
});

function parseTime(s) {
    const unitMapping = {
        'd': 60 * 60 * 60 * 24,
        'h': 60 * 60 * 60,
        'm': 60 * 60,
        's': 60
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
            if (guild.members.has(userID)) {
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

    if (token === 'when' && ['online', 'offline', 'dnd', 'idle'].includes(args.peek())) {
        if (result.type !== ReminderType.recurring) {
            throw new Error('`when` may only be used for recurring events.')
        }
        result.when = WhenType[args.shift()];
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

    async function fireReminder(client, reminder) {
        const channel = client.channels.cache.get(reminder.channelID);
        const user = await client.users.fetch(reminder.userID);
        const embed = client.helpers.generateSuccessEmbed(client, user, `Reminder: ${reminder.message}`);
        await channel.send(embed);
    }

    async function addReminder(client, reminder) {
        const now = new Date();
        if (reminder.type === ReminderType.once) {
            const fireDate = new Date(reminder.createdAt.getTime() + reminder.seconds);
            let timeot = fireDate - now;
            if (timeot <= 0) {
                await reminder.remove();
            }
            setTimeout(async () => {
                await fireReminder(client, reminder);
            }, timeot);
        } else if (reminder.type === ReminderType.recurring) {
            let fireDate = reminder.createdAt;
            let nextFireDate = fireDate;
            while (nextFireDate < now) {
                fireDate = nextFireDate;
                nextFireDate = new Date(nextFireDate.getTime() + reminder.seconds);
            }
            const delayToFireDate = Math.min(0, Math.max(0, now - fireDate));
            setTimeout(() => {
                setInterval(async () => {
                    await fireReminder(client, reminder);
                }, reminder.seconds);
            }, delayToFireDate);
        }
    }

    exports.run = async (client, message, arg) => {
        const reminderInfo = parseArgs(message, arg);
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
        await addReminder(remminder);

        let embed = client.helpers.generateSuccessEmbed(client, message.author, 'Successfully created reminder.');
        return message.channel.send(embed);
    };

    client.on(`ready`, async () => {
        const reminders = await Reminder.find().exec();
        client.helpers.log('reminder', `scheduling ${reminders.length} reminders`);
        await Promise.all(reminders.map(addReminder));
    });

    return exports;
};
