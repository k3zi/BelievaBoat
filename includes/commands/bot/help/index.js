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
        let { dbGuild } = message;

        let descriptions = [];
        let description = '';
        let commandGroups = _.groupBy(bot.commands.array().map(c => c.meta), 'module');
        for (const key of Object.keys(commandGroups).filter(k => k && (typeof k !== 'undefined') && k != 'undefined' && k.length).sort((a, b) => a.localeCompare(b))) {
            let commandText = '';
            commandText += `\n**${key}**`;
            const commands = commandGroups[key];
            for (const command of commands.filter(c => c.examples)) {
                commandText += "\n"
                    + command.examples.map(e => "`" + helpers.prefix(dbGuild, client) + e + "`").join(' | ') + "\n";
                    commandText += command.description + "\n";

                if ((description + commandText).length > 2048) {
                    descriptions.push(description);
                    description = '';

                    description += commandText;
                    commandText = `\n**${key}**`;
                } else {
                    description += commandText;
                    commandText = '';
                }
            }
        }

        if (description.length > 0) {
            descriptions.push(description);
        }

        const title = 'Help | Available Commands:';
        const footer = 'You can delete this by deleting the posted `.help` command.';
        helpers.page(bot, message, exports, title, descriptions, footer);
    };

    return exports;
});
