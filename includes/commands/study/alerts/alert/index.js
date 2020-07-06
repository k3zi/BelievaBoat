const Discord = require('discord.js');
const _ = require('lodash');

const WhenType = require('./../whenType');

// alert [(me) / @user] [via dm] [when [@user] [online | offline | dnd | idle | vc]] [message] 
async function parseArgs(message, arg) {
    const result = {
        user: message.author,
        referenceUser: message.author,
        when: null,
        message: null,
        viaDM: false
    };
    const args = arg.split(' ').filter(s => s.trim() != '');
    let token = args.shift();

    if (token === 'me') {
        result.user = message.author;
        token = args.shift();
    } else {
        let match;
        if (match = token.match(/<?@?[!]?([0-9]+)>?/)) {
            let userID = match[1];
            result.user = (await message.guild.members.fetch(userID)) || message.author;
            token = args.shift();
        }
    }

    if (token === 'when') {
        token = args.shift();
        let match;
        if (match = token.match(/<?@?[!]?([0-9]+)>?/)) {
            let userID = match[1];
            result.referenceUser = (await message.guild.members.fetch(userID)) || message.author;
            token = args.shift();
        }

        if (['online', 'offline', 'dnd', 'idle', 'busy', 'vc'].includes(token)) {
            result.when = WhenType[token];
            token = args.shift();
        } else {
            throw new Error('Invalid `when` type provided.');
        }
    } else {
        throw new Error('`when` type not provided.');
    }

    if (token === 'via' && args[0] === 'dm') {
        result.viaDM = true;
        args.shift();
    } else {
        args.unshift(token);
    }

    result.message = args.join(' ');
    return result;
}

module.exports = async (client) => {
    let exports = {};

    exports.meta = {};
    exports.meta.name = 'alert';
    exports.meta.description = 'Dispatches an alert whenever the specified confition is satisified.';
    exports.meta.module = 'study';
    exports.meta.examples = ['alert me when @user online why are you up at 5am...', 'alert me when @user vc via dm time to party ٩( ᐛ )و'];
    exports.meta.aliases = [];

    const Alert = client.db.model('Alert');

    async function fireAlert(client, alert) {
        const user = await client.users.fetch(alert.userID);

        let channel;
        if (alert.viaDM) {
            channel = await user.createDM();
        } else {
            channel = client.channels.cache.get(alert.channelID);
        }
        
        const embed = new Discord.MessageEmbed()
            .setDescription(`${client.customEmojis.check} Alert: ${alert.message}`)
       　   .setColor(client.helpers.colors.info);
        await channel.send(user, embed);
    }

    exports.run = async (client, message, arg) => {
        const alertInfo = await parseArgs(message, arg);
        client.helpers.log('alert', 'creating', alertInfo);
        const alert = new Alert({
            channelID: message.channel.id,
            guildID: message.guild.id,
            message: alertInfo.message,
            authorID: message.author.id,
            userID: alertInfo.user.id,
            referenceUserID: alertInfo.referenceUser.id,
            when: alertInfo.when,
            viaDM: alertInfo.viaDM
        });

        await alert.save();

        let embed = client.helpers.generateSuccessEmbed(client, message.author, 'Successfully created alert.');
        return message.channel.send(embed);
    };

    client.on('presenceUpdate', async (oldPresence, newPresence) => {
        if (oldPresence && newPresence.status === oldPresence.status) {
            return;
        }

        const { guild, user } = newPresence;
        const alerts = await Alert.find()
            .where('referenceUserID').equals(user.id)
            .where('guildID').equals(guild.id)
            .exec();
        if (alerts.length === 0) {
            return;
        }

        client.helpers.log('alerts', `${user.username} status changed from: ${oldPresence ? oldPresence.status : 'unknown'} to ${newPresence.status}; checking ${alerts.length} alerts`);
        
        const validAlerts = alerts.filter(a => WhenType.toStatus(a.when) === newPresence.status);
        await Promise.all(validAlerts.map((a) => fireAlert(client, a)));
    });

    client.on('voiceStateUpdate', async (oldState, newState) => {
        let newVoiceChannel = newState.channel;
        let oldVoiceChannel = oldState.channel;
        const member = newState.member;
        const user = member.user;

        if (oldVoiceChannel || !newVoiceChannel) {
            return;
        }

        const alerts = await Alert.find()
            .where('referenceUserID').equals(user.id)
            .where('guildID').equals(member.guild.id)
            .exec();
        if (alerts.length === 0) {
            return;
        }

        client.helpers.log('alerts', `${user.username} entered a vc; checking ${alerts.length} alerts`);
        
        const validAlerts = alerts.filter(a => WhenType.toStatus(a.when) === 'vc');
        await Promise.all(validAlerts.map((a) => fireAlert(client, a)));
    });

    return exports;
};
