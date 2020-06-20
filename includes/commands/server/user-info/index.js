const Discord = require('discord.js');
const Promise = require('bluebird');
const moment = require('moment');

const fs = Promise.promisifyAll(require('fs'));

module.exports = (async function(client, helpers) {
    const exports = {};

    const db = client.db;
    const emojis = client.customEmojis;
    const VoiceChannelJoinActivity = db.model('VoiceChannelJoinActivity');

    exports.meta = {};
    exports.meta.name = 'user-info';
    exports.meta.aliases = ['profile', 'user'];
    exports.meta.description = 'Shows info related to the provided user or message author.';
    exports.meta.module = 'server';
    exports.meta.examples = ['profile', 'user-info @27'];

    exports.run = async (client, message, arg) => {
        var member = message.member;
        if (arg.length != 0) {
            member = message.guild.members.cache.get(arg) || (message.mentions.members || (new Discord.Collection())).first();
        }

        client.helpers.log(`command`, `displaying profile: ${member}`);

        if (!member) {
            return;
        }

        const aggrSet = await VoiceChannelJoinActivity.aggregate([
            {
                $match: {
                    userID: member.user.id,
                    guildID: member.guild.id
                }
            },
            {
                $group: {
                    _id: '$userID',
                    totalDuration: {
                        $sum: '$duration'
                    }
                }
            }
        ]);

        let embed = new Discord.MessageEmbed();
        embed = embed.setAuthor(`${member.user.username}#${member.user.discriminator}`, member.user.displayAvatarURL())
            .setDescription(`${emojis[member.user.presence.status]} ${member}`)
            .setColor(helpers.colors.info)
            .addField('User ID', member.user.id, false)
            .addField('Joined Discord', `${moment(member.user.createdAt).format('LLLL')} (${moment(member.user.createdAt).fromNow()})`, true)
            .addField('Joined Server', `${moment(member.joinedAt).format('LLLL')} (${moment(member.joinedAt).fromNow()})`, true)
            .addField('Highest Role', member.highestRole, false)
            .setThumbnail(member.user.displayAvatarURL());

        let sentMessage = await message.channel.send({
            embed
        });

        await client.addDeleteWatchForMessage(exports.meta.name, message, sentMessage);
    };

    return exports;
});
