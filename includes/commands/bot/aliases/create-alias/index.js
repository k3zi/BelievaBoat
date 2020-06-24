const Discord = require('discord.js');
const Promise = require('bluebird');
const _ = require('lodash');

module.exports = (async function(client, helpers) {
    const exports = {};

    exports.meta = {};
    exports.meta.name = `create-alias`;
    exports.meta.aliases = ['add-alias', 'createalias', 'addalias'];
    exports.meta.description = `Creates an alias for a command. The alias can not contain spaces.`;
    exports.meta.module = 'setup';
    exports.meta.examples = ['create-alias work code', 'add-alias ban byebye'];

    exports.run = async (client, message, arg) => {
        let { dbGuild, guild } = message;

        let args = arg.trim().split(/[\s]+/gi);
        if (arg.length == 0 || args.length == 0) {
            throw new Error(`No arguments were provided.`);
        }

        if (args.length !== 2) {
            throw new Error(`Only two arguments are allowed.`);
        }

        let toCommand = client.helpers.findCommand(client, dbGuild, args[0]);
        if (!client.helpers.aliasWorks(client, dbGuild, args[1])) {
            throw new Error(`This alias is already in use by another command/module.`);
        }

        let to = toCommand.meta.name.toLowerCase();
        let from = args[1].toLowerCase();

        var removedAlias;
        if (toCommand.meta.aliases.includes(from)) {
            dbGuild.settings.removedAliases = dbGuild.settings.removedAliases.filter(a => a.from !== from);
        } else {
            dbGuild.settings.aliases.push({
                to: to,
                from: from,
                executor: _.pick(message.author, ['id', 'username', 'discriminator']),
            });
        }

        dbGuild.markModified(`settings`);
        await dbGuild.save();

        let embed = client.helpers.generateSuccessEmbed(client, undefined, `An alias has been made from: \`${from}\` to (the original command): \`${to}\`.`);
        embed = client.helpers.addSenderToFooter(embed, message, 'executed this request');
        return message.channel.send({ embed });
    };

    return exports;
});
