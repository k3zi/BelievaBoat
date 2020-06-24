const Promise = require('bluebird');
const _ = require('lodash');
const YouTube = require('youtube-node');
const GuildMusicManager = require('./../guildMusicManager');
const he = require('he');

module.exports = async (client, helpers) => {
    let exports = {};

    exports.meta = {};
    exports.meta.name = 'play';
    exports.meta.description = 'Queues the first matched song for the search term given.';
    exports.meta.module = 'music';
    exports.meta.examples = ['play Justin Bieber Baby'];
    exports.meta.aliases = [];

    async function search(term) {
        const youTube = new YouTube();
        youTube.setKey(client.config.youTubeDataAPIKey);
        console.log(`play -> searching for: ${term}`);
        return new Promise((resolve, reject) => {
            youTube.search(term, 1, (error, result) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(result);
                }
            });
        }).then(r => r.items[0]);
    }

    exports.run = async (client, message, arg) => {
        if (arg.length === 0) {
            throw new Error('No arguments provided.');
        }

        const channel = message.member.voice.channel;
        if (!channel) {
            throw new Error('Please join a voice channel first.');
        }

        const searchTerm = arg;

        const videoObject = await search(searchTerm);
        if (!videoObject) {
            throw new Error('No results found.');
        }
        const videoId = videoObject.id.videoId;
        const videoTitle = he.decode(videoObject.snippet.title);
        const guild = message.guild;
        
        let voiceBot;
        let connection;

        let voiceBotMember = channel.members.find(m => client.potentialBots.some(b => b.user && b.user.id == m.user.id && b.voice.connections.find(c => c.channel.id === channel.id)));
        if (voiceBotMember) {
            voiceBot = client.potentialBots.find(b => b.user.id === voiceBotMember.user.id);
        }
        
        if (!voiceBot) {
            let availableBots = await client.loopUntilBotAvailable(guild);
            voiceBot = availableBots[0];
            let voiceBotChannel = voiceBot.channels.cache.get(message.member.voice.channelID);
            connection = await voiceBotChannel.join();
        }

        let voiceBotChannel = voiceBot.channels.cache.get(message.member.voice.channelID);
        connection = voiceBotChannel.connection || (await voiceBotChannel.join());

        let manager = client.musicManagers.get(guild.id);
        if (!manager) {
            manager = new GuildMusicManager(client, guild, message.channel, connection);
            client.musicManagers.set(guild.id, manager);
            connection.on('disconnect', () => {
                client.musicManagers.delete(guild.id);
            });
        }

        message.channel.send(helpers.generateEmbed(client, message.author, `Queued: ${videoTitle}`,  true));
        await manager.queueSong(videoId, videoTitle, message.author);
    };

    return exports;
};
