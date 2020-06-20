const Discord = require('discord.js');
const Promise = require('bluebird');
const _ = require('lodash');
const YouTube = require('youtube-node');
const ytdl = require('ytdl-core');

module.exports = (async function(client, helpers) {
    let exports = {};

    const db = client.db;
    const MessageDeleteWatch = db.model('MessageDeleteWatch');
    const QueuedTrack = db.model('QueuedTrack');

    exports.meta = {};
    exports.meta.name = 'skip';
    exports.meta.description = 'Skips the currently playing song.';
    exports.meta.module = 'music';
    exports.meta.examples = ['skip'];
    exports.meta.aliases = [''];

    exports.run = async (client, message, arg) => {
        const channel = message.member.voice.channel;
        if (!channel) {
            throw new Error('Please join a voice channel first.');
        }

        let manager = client.musicManagers.get(message.guild.id);
        if (!manager) {
            throw new Error('Not currently playing.');
        }

        manager.playNext();
        message.channel.send(helpers.generateEmbed(client, message.author, `Skipped.`,  true));
    };

    return exports;
});
