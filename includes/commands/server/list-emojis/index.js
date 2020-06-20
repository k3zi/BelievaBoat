const Discord = require('discord.js');
const Promise = require('bluebird');
const moment = require('moment');
const _ = require('lodash');
const fs = Promise.promisifyAll(require('fs'));
const numeral = require('numeral');

module.exports = (async function(client, helpers) {
    const exports = {};

    exports.meta = {};
    exports.meta.name = `list-emojis`;
    exports.meta.aliases = [`emojis`];
    exports.meta.description = `Lists the added emojis in the guild.`;
    exports.meta.module = 'info';
    exports.meta.examples = ['list-emojis', 'emojis'];

    exports.run = async (client, message, arg) => {
        let { dbGuild, guild } = message;

        var embed = new Discord.MessageEmbed();
        embed = embed.setAuthor(`${guild.name} → All Emojis`, guild.iconURL);
        embed = embed.setColor(client.helpers.colors.info);
        embed = embed.addField('Non-Animated: ', `${guild.emojis.filter().array(e => !e.animated).join(``)}`);
        embed = embed.addField('Animated: ', `${guild.emojis.filter().array(e => e.animated).join(``)}`);
        return message.channel.send({ embed });
    };

    return exports;
});
