const Discord = require('discord.js');
const Promise = require('bluebird');
const _ = require('lodash');
const YouTube = require('youtube-node');
const ytdl = require("discord-ytdl-core");

class GuildMusicManager {

    constructor(client, helpers, guild, channel, connection) {
        this.client = client;
        this.helpers = helpers;
        this.guild = guild;
        this.channel = channel;
        this.connection = connection;
        this.volume = 0.5;
        this.isPlaying = false;
        this.queue = [];
    }

    async queueSong(videoID, title, user) {
        this.queue.push({
            videoID,
            title,
            user
        });
        
        if (!this.isPlaying) {
            await this.playNext();
        }
    }

    async playNext() {
        if (this.queue.length === 0) {
            this.isPlaying = false;
            return;
        }
        this.isPlaying = true;

        const self = this;
        const nextSong = this.queue.shift();
        const url = `https://www.youtube.com/watch?v=${nextSong.videoID}`;
        const output = ytdl(url, {
            filter: "audioonly",
            opusEncoded: true,
            encoderArgs: ['-af', 'bass=g=-1']
        });

        this.channel.send(this.helpers.generateEmbed(this.client, nextSong.user, `Now Playing: ${nextSong.title}`,  true));
        this.connection.play(output, { 
            volume: this.volume,
            type: "opus",
            highWaterMark: 1 << 25
        })
            .on('error', (e) => {
                console.log(e);
                self.playNext();
            })
            .on('finish', () => {
                console.log('finished playing song');
                self.playNext();
            });
        this.setVolume(this.volume);
    }

    setVolume(newVolume) {
        this.volume = newVolume;
        const dispatcher = this.connection.dispatcher;
        if (dispatcher) {
            dispatcher.setVolumeLogarithmic(newVolume);
        }
    }

    get upcoming() {
        return this.queue.slice(0, 10);
    }

  }

module.exports = (async function(client, helpers) {
    let exports = {};

    const db = client.db;

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
        
        let voiceBot;
        let connection;

        let voiceBotMember = channel.members.find(m => client.potentialBots.some(b => b.user && b.user.id == m.user.id && b.voice.connections.find(c => c.channel.id === channel.id)));
        if (voiceBotMember) {
            voiceBot = client.potentialBots.find(b => b.user.id === voiceBotMember.user.id);
        }
        
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
            manager = new GuildMusicManager(client, helpers, message.guild, message.channel, connection);
            client.musicManagers.set(message.guild.id, manager);
        }

        message.channel.send(helpers.generateEmbed(client, message.author, `Queued: ${videoTitle}`,  true));
        await manager.queueSong(videoId, videoTitle, message.author);
    };

    return exports;
});
