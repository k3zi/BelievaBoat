const Discord = require('discord.js');
const Promise = require('bluebird');
const _ = require('lodash');

module.exports = (async function(client, helpers) {
    let exports = {};

    const db = client.db;

    exports.meta = {};
    exports.meta.name = 'queue';
    exports.meta.description = 'Displays the list of songs in the queue.';
    exports.meta.module = 'music';
    exports.meta.examples = [];
    exports.meta.aliases = ['upcoming'];

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

        const manager = client.musicManagers.get(message.guild.id);
        if (!manager) {
            throw new Error('Not currently playing.');
        }

        const upcoming = manager.upcoming;
        let embed = client.helpers.generatePlainEmbed(client, client.user, '');
        embed = embed.setTitle(`Upcoming:`);
        embed = embed.setFooter(`Replying to: ${message.id}`);
        embed = embed.setColor(client.helpers.colors.info);

        const description = upcoming.map((s, i) => `${s+1}. [${s.videoID}] ${s.title} queued by ${s.user}`).join('\n');
        embed = embed.setDescription(description);
        return message.channel.send(embed);
    };

    return exports;
});
