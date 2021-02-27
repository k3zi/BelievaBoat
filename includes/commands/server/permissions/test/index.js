const Discord = require('discord.js');
const Promise = require('bluebird');
const moment = require('moment');
const _ = require('lodash');
const fs = Promise.promisifyAll(require('fs'));

module.exports = (async function(client, helpers) {
    const exports = {};

    const db = client.db;
    const emojis = client.customEmojis;
    const VoiceChannelJoinActivity = db.model('VoiceChannelJoinActivity');
    // const logTypes = [`delete`, `edit`, `reaction`, `media`, `link`];

    exports.meta = {};
    exports.meta.name = `test`;
    exports.meta.aliases = [];
    exports.meta.description = `Test whether a command or module will work with the current or given user in the current channe or given channel.\n`
    + '```test <everything | module-name | command-name> (for <user>) (in <category / channel> [name | id])```';
    exports.meta.module = 'setup';
    exports.meta.examples = ['test everything for @User', 'test profile for @User'];

    exports.run = async (client, message, arg) => {
        let { dbGuild, guild } = message;

        let args = arg.trim().split(/[\s]+/gi);
        if (arg.length == 0 || args.length == 0) {
            throw new Error(`No arguments were provided.`);
        }

        let { action, value } = helpers.findAction(client, args.shift());

        let member = message.mentions.members.first() || message.member;
        let channel = message.mentions.channels.first() || message.channel;

        var embed;
        if (action === `command`) {
            let commandFile = client.commands.find(c => c.meta.name === value);
            let canRun = dbGuild.can(member).run(commandFile).in(channel);
            embed = client.helpers.generateEmbed(client, message.member.user, '', canRun);

            var description = embed.description;
            description += `\`${action}\` → \`${value || `n/a`}\``;
            description += `\n**For**: \`user\` → ${member}`;
            description += `\n**In**: \`channel\` → ${channel}`;
            embed = embed.setDescription(description);
        } else {
            var availableCommands, unavailableCommands;
            if (action === `everything`) {
                availableCommands = client.commands.filter(c => dbGuild.can(member).run(c).in(channel));
                unavailableCommands = client.commands.filter(c => !availableCommands.some(d => d.meta.name === c.meta.name));
            } else if (action === `module`) {
                availableCommands = client.commands.filter(c => c.meta.module === value && dbGuild.can(member).run(c).in(channel));
                unavailableCommands = client.commands.filter(c => c.meta.module === value && !availableCommands.some(d => d.meta.name === c.meta.name));
            }

            embed = client.helpers.generatePlainEmbed(client, message.member.user, `Calculated available commands:\n`);
            var description = embed.description;
            description += `**\`${action}\`** → \`${value || `n/a`}\``;
            description += `\n**For**: \`user\` → ${member}`;
            description += `\n**In**: \`channel\` → ${channel}`;
            description += `\n\n`;
            description += `${client.customEmojis.check} Available: ${availableCommands.map(c => `\`${c.meta.name}\``).join(`, `)}`;
            description += `\n${client.customEmojis.xmark} Unavailable: ${unavailableCommands.map(c => `\`${c.meta.name}\``).join(`, `)}`;
            embed = embed.setDescription(description);
        }


        return message.channel.send({ embed });
    };

    return exports;
});
