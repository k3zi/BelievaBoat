const Discord = require('discord.js');
const Promise = require('bluebird');
const _ = require('lodash');

module.exports = (async function(client, helpers) {
    let exports = {};

    const db = client.db;

    exports.meta = {};
    exports.meta.name = 'shuffle';
    exports.meta.description = 'Shuffles the upcoming tracks.';
    exports.meta.module = 'music';
    exports.meta.examples = ['shuffle'];
    exports.meta.aliases = [];

    exports.run = async (client, message, arg) => {
        const channel = message.member.voice.channel;
        if (!channel) {
            throw new Error('Please join a voice channel first.');
        }

        let manager = client.musicManagers.get(message.guild.id);
        if (!manager) {
            throw new Error('Not currently playing.');
        }

        await manager.shuffle();
        return message.channel.send(helpers.generateEmbed(client, message.author, `Shuffled.`,  true));
    };

    return exports;
});
