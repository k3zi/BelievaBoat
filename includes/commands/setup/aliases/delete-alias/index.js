const Discord = require('discord.js');
const Promise = require('bluebird');
const _ = require('lodash');

module.exports = (async function(client, helpers) {
    const exports = {};

    exports.meta = {};
    exports.meta.name = `delete-alias`;
    exports.meta.aliases = ['remove-alias', 'deletealias', 'removealias', 'rm-alias', 'del-alias'];
    exports.meta.description = `Creates an alias for a command. The alias can bot contain spaces.`;
    exports.meta.module = 'setup';
    exports.meta.examples = ['delete-alias code', 'remove-alias byebye'];

    exports.run = async (client, message, arg) => {
        let { dbGuild, guild } = message;

        let args = arg.trim().split(/[\s]+/gi);
        if (arg.length == 0 || args.length == 0) {
            throw new Error(`No arguments were provided.`);
        }

        if (args.length !== 1) {
            throw new Error(`Only one argument is allowed.`);
        }

        if (client.helpers.aliasWorks(client, dbGuild, args[0])) {
            throw new Error(`The specified alias could not be found.`);
        }

        let from = args[0].toLowerCase();

        let prevAliases = dbGuild.settings.aliases;
        dbGuild.settings.aliases = dbGuild.settings.aliases.filter(a => a.from !== from);

        if (prevAliases.length === dbGuild.settings.aliases.length) {
            dbGuild.settings.removedAliases.push({
                from: from,
                executor: _.pick(message.author, ['id', 'username', 'discriminator']),
            });
        }

        dbGuild.markModified(`settings`);
        await dbGuild.save();

        let embed = client.helpers.generateSuccessEmbed(client, undefined, `The alias: \`${from}\` has been removed.`);
        embed = client.helpers.addSenderToFooter(embed, message, 'executed this request');
        return message.channel.send({ embed });
    };

    return exports;
});
