const Discord = require('discord.js');
const Promise = require('bluebird');
const _ = require('lodash');
const YouTube = require('youtube-node');
const ytdl = require('ytdl-core-discord');

class GuildMusicManager {

    constructor(client, guild, channel, connection) {
        this.client = client;
        this.guild = guild;
        this.connection = connection;
        this.isPlaying = false;
        this.queue = [];
    }

    async queueSong(videoID, title, user) {
        this.queue.push({
            videoID,
            title,
            member
        });
        
        if (!this.isPlaying) {
            await this.playNext();
        }
    }

    async playNext() {
        if (this.queue.length === 0) {
            return;
        }
        
        const self = this;
        const nextSong = this.queue.shift();
        const url = `https://www.youtube.com/watch?v=${nextSong.videoID}`;
        const output = await ytdl(url);

        output.on('error', (e) => {
            console.log(e);
            self.playNext();
        });
        output.on('end', () => {
            console.log('finished song');
            self.playNext();
        });

        this.channel.send(helpers.generateEmbed(client, nextSong.user, `Now Playing: ${nextSong.title}`,  true));
        connection.play(output, { type: 'opus', volume: 0.5 });
    }

  }

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
        const videoTitle = videoObject.snippet.title;
        
        console.log(`play -> playing: (${videoId}) ${videoTitle}`);
        let voiceBot = channel.members.find(m => client.potentialBots.some(b => b.user && b.user.id == m.user.id && b.channels.cache.get(message.member.voice.channelID).connection));
        let connection;
        if (!voiceBot) {
            let availableBots = await client.loopUntilBotAvailable(message.guild);
            voiceBot = availableBots[0];
            let voiceBotChannel = voiceBot.channels.cache.get(message.member.voice.channelID);
            connection = await voiceBotChannel.join();
        }

        let voiceBotChannel = voiceBot.channels.cache.get(message.member.voice.channelID);
        connection = voiceBotChannel.connection || (await voiceBotChannel.join());

        let manager = client.musicManagers.get(message.guild.id);
        if (!manager) {
            manager = new GuildMusicManager(client, message.guild, message.channel, connection);
            client.musicManagers.set(message.guild.id, manager);
        }

        message.channel.send(helpers.generateEmbed(client, message.author, `Queued: ${videoTitle}`,  true));
        await manager.queueSong(videoId, videoTitle, message.author);

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
