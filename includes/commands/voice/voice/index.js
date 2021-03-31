const Discord = require('discord.js');
const Promise = require('bluebird');
const _ = require('lodash');

module.exports = (async function(bot, helpers) {
    let exports = {};

    const db = bot.db;
    const VoiceChannelJoinActivity = db.model('VoiceChannelJoinActivity');
    const VoiceChannelSpeakActivity = db.model('VoiceChannelSpeakActivity');

    exports.meta = {};
    exports.meta.name = 'voice';
    exports.meta.description = 'Shows statistics about voice participants';
    exports.meta.module = 'voice';
    exports.meta.examples = ['voice'];
    exports.meta.aliases = ['vc'];

    async function logUserEnteredVoice(user, channel, onRestart) {    
        let voiceChannelActivity = new VoiceChannelJoinActivity({
            userID: user.id,
            channelID: channel.id,
            onRestart: onRestart || false
        });
        await voiceChannelActivity.save();
    }

    async function logUserExitedVoice(user, channel) {
        let voiceChannelActivity = await VoiceChannelJoinActivity.where({
            userID: user.id,
            channelID: channel.id,
            duration: 0
        }).sort({
            start: -1
        }).findOne();

        if (!voiceChannelActivity) {
            return;
        }

        voiceChannelActivity.duration = (new Date()) - voiceChannelActivity.start;
        await voiceChannelActivity.save();
    }

    async function logUserStartedSpeaking(user, channel) {
        let voiceChannelActivity = new VoiceChannelSpeakActivity({
            userID: user.id,
            channelID: channel.id
        });
        await voiceChannelActivity.save();
    }

    async function logUserStoppedSpeaking(user, channel) {
        let voiceChannelActivity = await VoiceChannelSpeakActivity.where({
            userID: user.id,
            channelID: channel.id,
            start: { $gte: bot.startTime },
            duration: 0,
        }).sort({
            start: -1
        }).findOne();

        if (!voiceChannelActivity) {
            return;
        }

        voiceChannelActivity.duration = (new Date()) - voiceChannelActivity.start;
        await voiceChannelActivity.save();
    }

    bot.on('ready', async () => {
        let voiceChannels = bot.channels.cache.array().filter(c => c.type === 'voice');
        let guilds = _.uniqBy(voiceChannels.map(vc => vc.guild), 'id');

        let voiceChannelActivities = await VoiceChannelJoinActivity.find().where('duration').equals(0).exec();

        console.log(`voice -> setting the duration of ${voiceChannelActivities.length} join activities`);

        let zeroDurationUsers = [];
        await Promise.mapSeries(voiceChannelActivities.sort((a, b) => b.startTime - a.startTime), async voiceChannelActivity => {
            if (zeroDurationUsers.includes(voiceChannelActivity.userID)) {
                await voiceChannelActivity.remove();
                return;
            }
            zeroDurationUsers.push(voiceChannelActivity.userID);
            voiceChannelActivity.duration = (new Date()) - voiceChannelActivity.start;
            await voiceChannelActivity.save();
        });

        await Promise.map(guilds, guild => {
            if (!guild.available || !guild.me || !guild.me.hasPermission("MANAGE_ROLES")) {
                return;
            }

            let vcRole = guild.roles.cache.filter(r => r.name.includes('In Voice')).first();
            if (!vcRole) {
                return;
            }

            return Promise.map(vcRole.members.array(), async member => {
                if (!member.voice.channel) {
                    return member.roles.remove(vcRole);
                }
            });
        });

        await Promise.map(voiceChannels, async vc => {
            if (!vc.guild || !vc.guild.available || !vc.guild.me || !vc.guild.me.hasPermission("MANAGE_ROLES")) {
                return;
            }

            let vcRole = vc.guild.roles.cache.filter(r => r.name.includes('In Voice')).first();

            if (!vcRole) {
                return;
            }

            await Promise.map(vc.members.array(), async member => {
                if (!member.roles.cache.get(vcRole.id)) {
                    await member.roles.add(vcRole);
                }

                await logUserEnteredVoice(member.user, member.voice.channel, true);
            });
        });
    });

    bot.on('voiceStateUpdate', async (oldState, newState) => {
        const vcRole = (oldState.guild || newState.guild).roles.cache.filter(r => r.name.includes('In Voice')).first();
        if (!vcRole) {
            return;
        }

        let newVoiceChannel = newState.channel;
        let oldVoiceChannel = oldState.channel;
        const member = newState.member;
        const user = member.user;

        let didLog = false;

        if (!member.roles.cache.get(vcRole.id) && newVoiceChannel) {
            await member.roles.add(vcRole);
            await logUserEnteredVoice(user, newVoiceChannel);
            didLog = true;
        } else if (member.roles.cache.get(vcRole.id) && !newVoiceChannel) {
            await member.roles.remove(vcRole);

            if (oldVoiceChannel) {
                await logUserExitedVoice(user, oldVoiceChannel);
            }
        }

        if (oldVoiceChannel && newVoiceChannel && oldVoiceChannel.id != newVoiceChannel.id) {
            await logUserExitedVoice(user, oldVoiceChannel);

            if (!didLog) {
                await logUserEnteredVoice(user, newVoiceChannel);
                didLog = true;
            }
        }
    });

    bot.on('guildMemberSpeaking', async (member, speaking) => {
        if (speaking) {
            await logUserStartedSpeaking(member.user, member.voice.channel);
        } else {
            await logUserStoppedSpeaking(member.user, member.voice.channel);
        }
    });

    exports.run = async (bot, message, arg) => {
        const member = message.member;
        if (arg.length != 0) {
            member = message.guild.members.cache.get(arg) || (message.mentions.members || (new Discord.Collection())).first();
        }

        if (!member) {
            return;
        }

        const aggrSet = await VoiceChannelJoinActivity.aggregate([
            {
                $project: {
                    _id: 1,
                    userID: 1,
                    channelID: 1,
                    duration: {
                        $cond: {
                            if: {
                                $eq: ['$duration', 0]
                            },
                            then: {
                                $subtract: [new Date(), "$start"]
                            },
                            else: '$duration'
                        }
                    }
                }
            },
            {
                $group: {
                    _id: '$userID',
                    totalDuration: {
                        $sum: "$duration"
                    }
                }
            }
        ]);

        const sortedAggrSet = aggrSet.sort((a, b) => {
            return b.totalDuration - a.totalDuration;
        });

        let embed = new Discord.MessageEmbed();
        embed = embed.setTitle("Voice Statistics:");
        embed = embed.setColor(helpers.colors.info);
        embed = embed.setTimestamp();

        let i = 0;
        let j = 0;
        while (i < sortedAggrSet.length && j < 18) {
            let ele = sortedAggrSet[i];
            let eleUser = message.guild.members.cache.get(ele._id);
            if (eleUser) {
                let hours = Math.round((ele.totalDuration / 1000 / 60 / 60) * 1000) / 1000;
                embed = embed.addField(`${i + 1}) ${eleUser.displayName}`, `${hours} hours`, true);
                j++;
            }
            i++;
        };

        return message.channel.send({embed});
    };

    return exports;
});
