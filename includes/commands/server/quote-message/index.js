const Discord = require('discord.js');
const Promise = require('bluebird');
const moment = require('moment');
const _ = require('lodash');
const fs = Promise.promisifyAll(require('fs'));
const numeral = require('numeral');

module.exports = (async function(client, helpers) {
    const exports = {};

    exports.meta = {};
    exports.meta.name = `quote-message`;
    exports.meta.aliases = [`quote`, `quote-message`];
    exports.meta.description = `Lists the added emojis in the guild.`;
    exports.meta.module = 'info';
    exports.meta.examples = ['quote 478272572836462493 #general', 'quote #general 478272572836462493'];

    exports.run = async (client, message, arg) => {
        let { dbGuild, guild, author: sender } = message;

        let args = arg.trim().split(/[\s]+/gi);
        if (arg.length == 0 || args.length == 0) {
            throw new Error(`No arguments were provided.`);
        }

        let channel = message.mentions.channels.first() || message.channel;
        let retrievedMessage = await channel.messages.fetch(args[0]).catch(() => false);

        if (!retrievedMessage && args.length > 1) {
            retrievedMessage = await channel.messages.fetch(args[1]).catch(() => false);
        }

        if (!retrievedMessage) {
            throw new Error(`The specified message could not be found in ${channel}.`);
        }

        let author = retrievedMessage.author;
        let embed;
        let rawEmbed;
        if (rawEmbed = retrievedMessage.embeds.filter(e => e.type === `rich`)[0]) {
            let ommitedFields = _.pick(rawEmbed, [`description`, `hexColor`, `timestamp`, `title`, `url`]);
            rawEmbed = {
                ommitedFields,
                fields: rawEmbed.fields.map(f => _.pick(f, [`inline`, `name`, `value`])) 
            };
            console.log(rawEmbed);
            embed = new Discord.MessageEmbed(rawEmbed);
        } else {
            embed = client.helpers.generatePlainEmbed(client, message.author, retrievedMessage.content);
        }
        embed = embed.setAuthor(`${sender.username}#${sender.discriminator}`, sender.displayAvatarURL());
        embed = embed.setColor(helpers.colors.info);
        embed = embed.setFooter(`${author.username}#${author.discriminator} | ${guild.name} → #${channel.name}`, author.displayAvatarURL);
        embed = embed.setTimestamp(retrievedMessage.createdAt);
        return message.channel.send({ embed });
    };

    return exports;
});
