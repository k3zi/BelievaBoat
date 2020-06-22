module.exports = (async function(bot, helpers) {
    const exports = {};

    const db = bot.db;
    const PrivateVoiceChannel = db.model('PrivateVoiceChannel');

    exports.meta = {};
    exports.meta.order = 50;
    exports.meta.name = 'private';
    exports.meta.description = 'Allows the creation of private (invite only or limited capacity) voice channels.';
    exports.meta.module = 'voice';
    exports.meta.examples = ['private リーディングサークル', 'private 8 Poitical Debate'];
    exports.meta.aliases = [];

    bot.on('voiceStateUpdate', async(oldState, newState) => {
        let newUserChannel = newState.channel;
        let voiceChannel = oldState.channel;
        if (voiceChannel && bot.privateVoiceChannels.get(voiceChannel.id) && voiceChannel.members.size == 0) {
            await voiceChannel.delete();
        }
    });

    exports.run = async (bot, message, arg) => {
        if (arg.length == 0) {
            return;
        }

        const args = arg.split(' ');
        var count = args.shift();
        var name = args.join(' ');

        if (!message.member.voice.channel) {
            return message.reply('Please join a voice channel first.');
        }

        if (!count || isNaN(count))  {
            name = count;
            count = -1;
        }

        const user = message.guild.members.cache.find(m => m.id === message.author.id);
        const channel = await message.guild.createChannel((name && name.length) ? name : 'Private', 'voice', [{
            id: message.guild.id,
            deny: count === -1 ? ['CONNECT'] : [],
            allow: count === -1 ? ['SPEAK']  : ['SPEAK', 'CONNECT']
        }]);

        bot.privateVoiceChannels.set(channel.id, channel);
        const privateChannel = new PrivateVoiceChannel({
            channelId: channel.id
        });
        await privateChannel.save();
        await channel.setParent(message.guild.afkChannel.parent)
        await channel.setPosition(message.guild.afkChannel.position + 1);

        if (count >= 0) {
            await channel.setUserLimit(count);
        }

        await channel.overwritePermissions(user, {
            CONNECT: true
        });

        await user.setVoiceChannel(channel);
        await message.reply('A ' + (count === -1 ? 'private' : 'public') + ' voice channel has been created. Use `.invite @user1 @user2 @user3...` to invite users.');
        bot.emit('#privateVoiceChannelAdd', privateChannel);
    };

    return exports;
});
