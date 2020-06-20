const Discord = require('discord.js');
const Promise = require('bluebird');
const _ = require(`lodash`);

module.exports = (async function(client, helpers) {
    const exports = {};

    const db = client.db;
    let MessageDeleteWatch = db.model('MessageDeleteWatch');
    let Guild = db.model('Guild');

    client.addDeleteWatchForMessage = async function(command, message, sentMessage) {
        let watch = new MessageDeleteWatch({
            command: command,
            message: _.pick(message, [`id`, `channel.id`, `channel.name`]),
            sentMessage: _.pick(sentMessage, [`id`, `channel.id`, `channel.name`]),
            shard: client.shard ? client.shard.id : undefined
        });

        return watch.save();
    };

    client.on(`messageDelete`, async message => {
        if (!message.content || !message.content.length || message.author.bot) {
            return;
        }

        let guild = message.guild;
        let dbGuild = await Guild.get(guild.id);
        let allDeleteWatches = dbGuild.findWatches(message.member, 'delete');
        let deleteWatches = _.uniqBy(allDeleteWatches, l => l.channel.id);

        if (deleteWatches.length > 0) {
            var embed = new Discord.MessageEmbed();
            embed = embed.setColor(helpers.colors.error);
            embed = embed.setAuthor(`${helpers.formatPlainUserString(message.author)} deleted a message.`, message.author.displayAvatarURL(), message.url);
            embed = embed.addField('User: ', helpers.formatUserMentionExtraString(message.author), true);
            embed = embed.addField('Channel: ', message.channel, true);
            embed = embed.addField('Content: ', message.content);
            embed = embed.setFooter(`# of Watches: ${allDeleteWatches.length} ・ Message ID: ${message.id}`);
            embed = embed.setTimestamp(message.createdAt);

            await Promise.map(deleteWatches, l => {
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

    client.on(`messageDeleteRaw`, async message => {
        let watchInfos = await MessageDeleteWatch.find({
            'message.id': message.id,
            'message.channel.id': message.channel.id,
            shard: client.shard ? client.shard.id : undefined
        });

        if (!watchInfos || !watchInfos.length) {
            client.helpers.log(`event`, `messageDelete`, message.id, `no watch was found`);
            return;
        }

        client.helpers.log(`event`, `messageDelete`, message.id, `watch was found`);

        await Promise.map(watchInfos, async watchInfo => {
            await watchInfo.remove();
            const commandfile = client.commands.get(watchInfo.command);
            if (!commandfile) {
                return;
            }

            const channel = await client.channels.cache.get(watchInfo.sentMessage.channel.id);
            const sentMessage = await channel.messages.fetch(watchInfo.sentMessage.id);
            return sentMessage.delete();
        });
    });

    return exports;
});
