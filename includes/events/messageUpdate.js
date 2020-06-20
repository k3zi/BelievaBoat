const Discord = require('discord.js');
const Promise = require('bluebird');
const _ = require(`lodash`);

module.exports = (async function(client, helpers) {
    const exports = {};

    const db = client.db;
    let Guild = db.model('Guild');

    client.on(`messageUpdate`, async (oldMessage, newMessage) => {
        let message = newMessage;
        if (!message.content || !message.content.length || message.author.bot || oldMessage.content === newMessage.content) {
            return;
        }

        let guild = message.guild;
        let dbGuild = await Guild.get(guild.id);
        let allWatches = dbGuild.findWatches(message.member, 'edit');
        let watches = _.uniqBy(allWatches, l => l.channel.id);

        if (watches.length > 0) {
            var embed = new Discord.MessageEmbed();
            embed.setColor(helpers.colors.error);
            embed.setAuthor(`${helpers.formatPlainUserString(message.author)} edited a message.`, message.author.displayAvatarURL(), message.url);
            embed.addField('User: ', helpers.formatUserMentionExtraString(message.author), true);
            embed.addField('Channel: ', message.channel, true);
            embed.addField('Old Content: ', oldMessage.content);
            embed.addField('New Content: ', newMessage.content);
            embed.setFooter(`# of Watches: ${allWatches.length} ・ Message ID: ${message.id}`);
            embed.setTimestamp(message.createdAt);

            await Promise.map(watches, l => {
                let channel = guild.channels.get(l.channel.id);
                if (!channel) {
                    dbGuild.settings.logs = dbGuild.settings.logs.filter(e => e.channel.id !== l.channel.id);
                    dbGuild.markModified('settings');
                    return dbGuild.save();
                }

                return channel.send({ embed }).catch(console.log);
            });
        }
    });

    return exports;
});
