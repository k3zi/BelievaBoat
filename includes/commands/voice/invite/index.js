const Discord = require('discord.js');
const Promise = require('bluebird');

const wait = (ms) => {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}

module.exports = (async function(bot, helpers) {
    const exports = {};

    exports.meta = {};
    exports.meta.order = 50;
    exports.meta.name = 'invite';
    exports.meta.description = 'Invite users to private voice channels. They must join voice first before accepting.';
    exports.meta.module = 'voice';
    exports.meta.examples = ['invite @user1 @user2 @user3...'];
    exports.meta.aliases = [];

    exports.run = async (bot, message, arg) => {
        if (arg.length == 0) {
            return;
        }

        const voiceChannel = message.member.voiceChannel;
        if (!voiceChannel) {
            return message.reply('Please join a voice channel first. まずボイスチャットに入ってください。');
        }

        var mentions = message.mentions.members;
        var channel = message.channel;
        await Promise.mapSeries(mentions.array(), member => {
            return channel.send(`${member}, You have been invited to: ` + message.member.voiceChannel.toString() +  '\nReply `accept` within 2 minutes to join.');
        });

        const filter = (m, u) => mentions.some(member => u.id == member.id) && m.content == 'accept';
        const collector = channel.createMessageCollector(filter, { time: 2 * 60 * 1000 });
        collector.on('collect', async m => {
            mentions = mentions.filter(member => {
                return member.id != m.author.id;
            });
            console.log(m.author.id + ' accepted the invite.');
            return m.author.setVoiceChannel(voiceChannel);
        });

        collector.on('end', async collected => {
            var vc = bot.privateVoiceChannels.get(voiceChannel.id);
            if (vc) {
                await Promise.mapSeries(mentions.array(), member => {
                    return message.channel.send(`${member}, Your invite to: ${message.member.voiceChannel} has expired.`);
                });
            }
        })
    };

    return exports;
});
