const Discord = require('discord.js');
const Promise = require('bluebird');
const _ = require('lodash');
const YouTube = require('youtube-node');
const ytdl = require('ytdl-core-discord');

module.exports = (async function(client, helpers) {
    let exports = {};

    const db = client.db;
    const MessageDeleteWatch = db.model('MessageDeleteWatch');
    const QueuedTrack = db.model('QueuedTrack');

    exports.meta = {};
    exports.meta.name = 'play';
    exports.meta.description = 'Shows statistics about voice participants';
    exports.meta.module = 'music';
    exports.meta.examples = ['play Justin Bieber Baby'];
    exports.meta.aliases = [''];

    async function search(term) {
        const youTube = new YouTube();
        youTube.setKey(client.config.youTubeDataAPIKey);
        console.log(`play -> searching for: ${term}`);
        return new Promise(function(resolve, reject) {
            youTube.search(term, 1, function(error, result) {
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
            return;
        }

        const channel = message.voice.channel;
        if (!channel) {
            return;
        }

        const searchTerm = arg;

        const videoObject = await search(searchTerm);
        if (videoObject) {
            const videoId = videoObject.id.videoId;
            let connection = await channel.join();
            const url = `https://www.youtube.com/watch?v=${videoId}`;
            
            console.log(`play -> playing: (${videoId})`);
            let voiceBot, connection;
            voiceBot = channel.members.first(m => client.potentialBots.some(b => b.user && b.user.id == m.user.id && b.channels.get(message.member.voice.channelID).connection));
            if (!voiceBot) {
                let availableBots = await client.loopUntilBotAvailable(message.guild);
                voiceBot = availableBots[0];
                let voiceBotChannel = voiceBot.channels.get(message.member.voice.channelID);
                connection = await voiceBotChannel.join();
            }

            let voiceBotChannel = voiceBot.channels.get(message.member.voice.channelID);
            connection = voiceBotChannel.connection || (await voiceBotChannel.join());
            connection.play(await ytdl(url), { type: 'opus', volume: 0.5 });
        }

        // let queuedTrack = new QueuedTrack({
        //     channel: {
        //         id: channel.id,
        //         name: channel.name
        //     },
        //     bot: {
        //         user: {
        //             id: voiceBot.user.id,
        //             username: voiceBot.user.username
        //         }
        //     },
        //     member: {
        //         id: member.id,
        //         displayName: member.displayName
        //     }
        // });
    };

    return exports;
});
