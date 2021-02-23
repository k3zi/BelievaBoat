const Discord = require('discord.js');
const Promise = require('bluebird');
const moment = require('moment');
const _ = require('lodash');
const fs = Promise.promisifyAll(require('fs'));

module.exports = (async function(client, helpers) {
    const exports = {};

    exports.meta = {};
    exports.meta.name = `prefix`;
    exports.meta.aliases = [`set-prefix`, `set-unbpro-prefix`];
    exports.meta.description = `Change the bot prefix for this guild.\n`
    + '```prefix <new-prefix>```';
    exports.meta.module = 'setup';
    exports.meta.examples = ['prefix !', 'prefix -'];

    exports.run = async (client, message, arg) => {
        let { dbGuild, guild } = message;
        let args = arg.trim().split(/[\s\n]+/gi);
        if (arg.length == 0 || args.length == 0) {
            throw new Error(`No arguments were provided.`);
        }

        if (args.length > 1) {
            throw new Error(`The bot prefix must not contain a space.`);
        }

        let newPrefix = args[0];
        dbGuild.settings.prefix = newPrefix;
        dbGuild.markModified(`settings`);
        await dbGuild.save();

        let embed = client.helpers.generateSuccessEmbed(client, message.member.user, `The bot prefix has been changed to \`${newPrefix}\`.`);
        return message.channel.send({ embed });
    };

    return exports;
});
