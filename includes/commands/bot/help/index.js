const Discord = require('discord.js');
const Promise = require('bluebird');
const moment = require('moment');
const _ = require('lodash');
const fs = Promise.promisifyAll(require('fs'));
const numeral = require('numeral');
const util = require('util');

module.exports = (async function(client, helpers) {
    const exports = {};

    exports.meta = {};
    exports.meta.name = `help`;
    exports.meta.aliases = ['commands'];
    exports.meta.description = `Shows a list of available commands.`;
    exports.meta.module = 'info';
    exports.meta.examples = ['help'];

    exports.run = async (bot, message, arg) => {
        var embed = new Discord.RichEmbed().setTitle("Help | Here is a list of available commands:").setTimestamp();
        embed.setColor([0, 0, 0]);
        var description = "";
        var commandGroups = _.groupBy(bot.commands.array().map(c => c.meta), 'module');
        for (const key of Object.keys(commandGroups).filter(k => k && (typeof k !== 'undefined') && k != 'undefined' && k.length).sort((a, b) => a.localeCompare(b))) {
            description += `\n**${key}**`;
            var commands = commandGroups[key];
            for (const command of commands.filter(c => c.examples)) {
                description += "\n"
                    + command.examples.map(e => "`" + bot.config.prefix + e + "`").join(' | ') + "\n";
                description += command.description + "\n";
            }
        }

        embed.setDescription(description);
        embed.setFooter('You can delete this by deleting the posted `.help` command.')
        message.channel.send({embed}).then(async sentMessage => {
            await bot.addDeleteWatchForMessage(exports.meta.name, message, sentMessage);
        });
    };

    return exports;
});
