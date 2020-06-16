const Discord = require('discord.js');
const Promise = require('bluebird');
const _ = require('lodash');

module.exports = (async function(bot, helpers) {
    let exports = {};

    const db = bot.db;
    const VoiceChannelJoinActivity = db.model('VoiceChannelJoinActivity');
    const VoiceChannelSpeakActivity = db.model('VoiceChannelSpeakActivity');
    const MessageDeleteWatch = db.model('MessageDeleteWatch');

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
            userId: user.id,
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
        let voiceChannels = bot.channels.array().filter(c => c.type === 'voice');
        let guilds = _.uniqBy(voiceChannels.map(vc =>vc.guild), 'id');

        let voiceChannelActivities = await VoiceChannelJoinActivity.find().where('duration').equals(0).exec();

        console.log(`voice -> setting the duration of ${voiceChannelActivities.length} join activities`);

        let zeroDurationUsers = [];
        await Promise.mapSeries(voiceChannelActivities.sort((a, b) => b.startTime - a.startTime), async voiceChannelActivity => {
            if (zeroDurationUsers.includes(voiceChannelActivity.userID)) {
                return;
            }
            zeroDurationUsers.push(voiceChannelActivity.userID);
            voiceChannelActivity.duration = (new Date()) - voiceChannelActivity.start;
            await voiceChannelActivity.save();
        });

        await Promise.map(guilds, guild => {
            if (!guild.available) {
                return;
            }

            let vcRole = guild.roles.filter(r => r.name.includes('In Voice')).first();
            if (!vcRole) {
                return;
            }

            return Promise.map(vcRole.members.array(), async member => {
                if (!member.voiceChannel || member.voiceChannel.parent.name.toLowerCase().includes('staff')) {
                    return member.removeRole(vcRole);
                }
            });
        });

        await Promise.map(voiceChannels, async vc => {
            if (!vc.guild || !vc.guild.available) {
                return;
            }

            let vcRole = vc.guild.roles.filter(r => r.name.includes('In Voice')).first();

            if (!vcRole) {
                return;
            }

            await Promise.map(vc.members.array(), async member => {
                if (!member.roles.get(vcRole.id)) {
                    await member.roles.add(vcRole);
                }

                await logUserEnteredVoice(member.user, member.voiceChannel, true);
            });
        });
    });

    bot.on('voiceStateUpdate', async (oldMember, newMember) => {
        let vcRole = (oldMember.guild || newMember.guild).roles.filter(r => r.name.includes('In Voice')).first();
        if (!vcRole) {
            return;
        }

        let newVoiceChannel = newMember.voiceChannel;
        let oldVoiceChannel = oldMember.voiceChannel;

        var didLog = false;

        if (!newMember.roles.get(vcRole.id) && newVoiceChannel && !newVoiceChannel.parent.name.toLowerCase().includes('staff')) {
            await newMember.roles.add(vcRole);
            await logUserEnteredVoice(newMember.user, newVoiceChannel);
            didLog = true;
        } else if (newMember.roles.get(vcRole.id) && (!newVoiceChannel || newVoiceChannel.parent.name.toLowerCase().includes('staff'))) {
            await newMember.removeRole(vcRole);

            if (oldVoiceChannel && !oldVoiceChannel.parent.name.toLowerCase().includes('staff')) {
                await logUserExitedVoice(newMember.user, oldVoiceChannel);
            }
        }

        if (oldVoiceChannel && newVoiceChannel && oldVoiceChannel.id != newVoiceChannel.id) {
            if (!oldVoiceChannel.parent.name.toLowerCase().includes('staff')) {
                await logUserExitedVoice(newMember.user, oldVoiceChannel);
            }

            if (!didLog && !newVoiceChannel.parent.name.toLowerCase().includes('staff')) {
                await logUserEnteredVoice(newMember.user, newVoiceChannel);
                didLog = true;
            }
        }
    });

    bot.on('guildMemberSpeaking', async (member, speaking) => {
        if (member.voiceChannel.parent.name.toLowerCase().includes('staff')) {
            return;
        }

        console.log(`guildMemberSpeaking ⇒ ${member.user.username}: ${speaking ? 'yes' : 'no'}`);

        if (speaking) {
            await logUserStartedSpeaking(member.user, member.voiceChannel);
        } else {
            await logUserStoppedSpeaking(member.user, member.voiceChannel);
        }
    });

    exports.run = async (bot, message, arg) => {
        var member = message.member;
        if (arg.length != 0) {
            member = message.guild.members.get(arg) || (message.mentions.members || (new Discord.Collection())).first();
        }

        if (!member) {
            return;
        }

        const infoForDeletion = {
            command: exports.meta.name,
            channelID: message.channel.id
        };

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

        var embed = new Discord.MessageEmbed();
        embed = embed.setTitle("Voice Statistics:");
        embed = embed.setColor([0, 0, 0]);
        embed = embed.setTimestamp();

        var i = 0;
        var j = 0;
        while (i < sortedAggrSet.length && j < 18) {
            let ele = sortedAggrSet[i];
            let eleUser = message.guild.members.get(ele._id);
            if (eleUser) {
                let hours = Math.round((ele.totalDuration / 1000 / 60 / 60) * 1000) / 1000;
                embed = embed.addField(`${i + 1}) ${eleUser.displayName}`, `${hours} hours`, true);
                j++;
            }
            i++;
        };

        await message.channel.send({embed}).then(async sentMessage => {
            await bot.addDeleteWatchForMessage(exports.meta.name, message, sentMessage);
        });
    };

    return exports;
});
