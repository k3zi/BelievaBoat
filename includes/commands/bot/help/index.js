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
        async function createEmbed(message, description, sentMessage) {
            const embed = new Discord.MessageEmbed()
                .setTitle("Help | Available Commands:")
                .setTimestamp()
                .setColor([0, 0, 0])
                .setDescription(description)
                .setFooter('You can delete this by deleting the posted `.help` command.');

            if (sentMessage) {
                return sentMessage.edit({ embed });
            } else {
                return message.channel.send({ embed });
            }
        }

        async function addReactions(message, index, descriptions) {
            if (index > 0) {
                await message.react('⬅');
                await Promise.delay(450);
            }

            if (index < descriptions.length) {
                await message.react('➡');
                await Promise.delay(450);
            }

            await message.react('❌');
        }

        let descriptions = [];
        let description = '';
        let commandGroups = _.groupBy(bot.commands.array().map(c => c.meta), 'module');
        for (const key of Object.keys(commandGroups).filter(k => k && (typeof k !== 'undefined') && k != 'undefined' && k.length).sort((a, b) => a.localeCompare(b))) {
            let commandText = '';
            commandText += `\n**${key}**`;
            var commands = commandGroups[key];
            for (const command of commands.filter(c => c.examples)) {
                commandText += "\n"
                    + command.examples.map(e => "`" + bot.config.prefix + e + "`").join(' | ') + "\n";
                    commandText += command.description + "\n";
            }
            // TODO: Replace this magic number.
            if ((description + commandText).length > 2048) {
                descriptions.push(description);
                description = '';
            }

            description += commandText;
        }

        if (description.length > 0) {
            descriptions.push(description);
        }

        let index = 0;
        createEmbed(message. descriptions[index]).then(async sentMessage => {
            await bot.addDeleteWatchForMessage(exports.meta.name, message, sentMessage);
            const filter = (reaction, user) => {
                if (user.id !== message.author.id) {
                    return false;
                }
    
                return '⬅➡❌'.includes(reaction.emoji.name);
            };

            let collector = sentMessage.createReactionCollector(filter);
            let stop = async () => {
                collector.stop();
                await sentMessage.clearReactions();
            };
            let timer = setTimeout(stop, 15 * 1000);
            collector.on('collect', async r => {
                if (r.emoji.name == '❌') {
                    return await stop();
                }
    
                if (r.emoji.name == '➡') {
                    index += 1;
                } else if (r.emoji.name == '⬅') {
                    index -= 1;
                }
                sentMessage = await createEmbed(message. descriptions[index], sentMessage);
                await addReactions(sentMessage, index, descriptions);
    
                clearTimeout(timer);
                timer = setTimeout(stop, 15 * 1000);
            });

            await addReactions(sentMessage, index, descriptions);
        });
    };

    return exports;
});
