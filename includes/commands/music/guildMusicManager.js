const ytdl = require("discord-ytdl-core");
const _ = require('lodash');

class GuildMusicManager {

    constructor(client, guild, channel, connection) {
        this.client = client;
        this.guild = guild;
        this.channel = channel;
        this.connection = connection;
        this.monitorInactivity = null;
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
        const self = this;

        // Stop playing if there are no more songs left.
        if (this.queue.length === 0) {
            this.isPlaying = false;
            this.monitorInactivity = setTimeout(() => {
                this.connection.disconnect();
            }, 60 * 1000);
            return;
        }

        // Remove the timer for inactivity since we are still playing.
        if (this.monitorInactivity) {
            clearTimeout(this.monitorInactivity);
        }
        this.isPlaying = true;

        const nextSong = this.queue.shift();
        const url = `https://www.youtube.com/watch?v=${nextSong.videoID}`;
        const output = ytdl(url, {
            filter: "audioonly",
            opusEncoded: true,
            encoderArgs: ['-af', 'bass=g=-1'],
            highWaterMark: 1 << 25
        });

        this.channel.send(this.client.helpers.generateEmbed(this.client, nextSong.user, `Now Playing: ${nextSong.title}`,  true));
        this.connection.play(output, { 
            volume: this.volume,
            type: "opus",
            highWaterMark: 1
        })
            .on('error', (e) => {
                console.log(e);
                self.playNext();
            })
            .on('finish', () => {
                console.log('finished playing song');
                self.playNext();
            });
    }

    async pause() {
        const dispatcher = this.connection.dispatcher;
        if (dispatcher) {
            dispatcher.pause();
        }
    }

    async resume() {
        const dispatcher = this.connection.dispatcher;
        if (dispatcher) {
            dispatcher.resume();
        }
    }

    async shuffle() {
        this.queue = _.shuffle(this.queue);
    }

    async disconnect() {
        this.isPlaying = false;
        this.connection.disconnect();
    }

    async clearQueue() {
        this.queue = [];
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

module.exports = GuildMusicManager;