const Discord = require('discord.js');
const Promise = require('bluebird');
const _ = require('lodash');

module.exports = (async function(client, helpers) {
    let exports = {};

    const db = client.db;

    exports.meta = {};
    exports.meta.name = 'volume';
    exports.meta.description = 'Adjusts the bots volume.';
    exports.meta.module = 'music';
    exports.meta.examples = ['volume 0.5'];
    exports.meta.aliases = [];

    exports.run = async (client, message, arg) => {
        if (arg.length === 0) {
            throw new Error('No argument provided.');
        }

        const volume = parseFloat(arg);
        if (isNaN(volume) || volume < 0 || volume > 1) {
            throw new Error('Invalid argument provided.');
        }
        
        const channel = message.member.voice.channel;
        if (!channel) {
            throw new Error('Please join a voice channel first.');
        }

        let manager = client.musicManagers.get(message.guild.id);
        if (!manager) {
            throw new Error('Not currently playing.');
        }

        manager.setVolume(volume);
        message.channel.send(helpers.generateEmbed(client, message.author, `Updated Volume.`,  true));
    };

    return exports;
});
