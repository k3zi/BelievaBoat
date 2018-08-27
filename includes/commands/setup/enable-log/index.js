const Discord = require('discord.js');
const Promise = require('bluebird');
const _ = require('lodash');

module.exports = (async function(client, helpers) {
    const exports = {};

    exports.meta = {};
    exports.meta.name = `enable-log`;
    exports.meta.aliases = ['set-log', 'enablelog', 'add-log', 'addlog', 'log', 'watch'];
    exports.meta.description = `Creates an alias for a command. The alias can bot contain spaces.`;
    exports.meta.module = 'setup';
    exports.meta.examples = ['enable-log delete #msg-delete-log', 'log join #server-log'];

    exports.run = async (client, message, arg) => {
        let { dbGuild, guild } = message;

        let args = arg.trim().split(/[\s]+/gi);
        if (arg.length == 0 || args.length == 0) {
            throw new Error(`No arguments were provided.`);
        }

        if (args.length < 2) {
            throw new Error(`At least 2 arguments are required.`);
        }

        let choices = ['delete', 'edit', 'join', 'leave', 'image', 'nickname', 'swear'];
        let type = args[0].toLowerCase();
        if (!choices.includes(type)) {
            throw new Error(`Invalid log type provided. Possible types include: ${client.helpers.joinCode(choices, `・`)}`);
        }

        let channel = message.mentions.channels.first() || message.channel;

        let forArg = {
        };

        await client.helpers.parseArgs(client, guild, args, forArg);
        if (!forArg.type) {
            forArg.type = 'everyone';
            forArg.value = 'none';
        }

        let originalForValue = forArg.value;
        if (forArg.value.id) {
            forArg.value = forArg.value.id;
        }

        let logSetting = {
            id: `${channel.id}_${forArg.type}_${forArg.value}`,
            type: type,
            for: forArg,
            channel: _.pick(channel, ['id', 'name']),
            executor: _.pick(message.author, ['id', 'username', 'discriminator']),
        };

        console.log(dbGuild.settings.logs);

        if (dbGuild.settings.logs.find(l => l.id === logSetting.id)) {
            throw new Error(`A log already exists with these parameters.`);
        }

        dbGuild.settings.logs.push(logSetting);
        dbGuild.markModified(`settings`);
        await dbGuild.save();

        let embed = client.helpers.generateSuccessEmbed(client, undefined, `The \`${type}\` log has been added for ${originalForValue} \`(${forArg.type})\` and will emit in ${channel}.`);
        embed = client.helpers.addSenderToFooter(embed, message, 'executed this request');
        return message.channel.send({ embed });
    };

    return exports;
});
