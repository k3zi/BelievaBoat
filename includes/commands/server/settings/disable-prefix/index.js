const Discord = require('discord.js');
const Promise = require('bluebird');
const moment = require('moment');
const _ = require('lodash');
const fs = Promise.promisifyAll(require('fs'));

module.exports = (async function(client, helpers) {
    const exports = {};

    exports.meta = {};
    exports.meta.name = `disable-prefix`;
    exports.meta.aliases = [];
    exports.meta.description = `Use commands without prepdending a prefix.`;
    exports.meta.module = 'setup';
    exports.meta.examples = ['disable-prefix'];

    exports.run = async (client, message, arg) => {
        let { dbGuild, guild } = message;

        dbGuild.settings.disablePrefix = true;
        dbGuild.markModified(`settings`);
        await dbGuild.save();

        let embed = client.helpers.generateSuccessEmbed(client, message.member.user, `The bot prefix has been disabled.`);
        return message.channel.send({ embed });
    };

    return exports;
});
