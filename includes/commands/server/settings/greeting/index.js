const Discord = require('discord.js');
const Promise = require('bluebird');
const moment = require('moment');
const _ = require('lodash');
const fs = Promise.promisifyAll(require('fs'));
const numeral = require('numeral');

module.exports = (async function(client, helpers) {
    const exports = {};

    exports.meta = {};
    exports.meta.name = `set-greeting`;
    exports.meta.aliases = [];
    exports.meta.description = `Sets a new greeting for new people who enter the server.`;
    exports.meta.module = 'setup';
    exports.meta.examples = ['set-greeting Hellllllllo this is yudai'];

    exports.run = async (client, message, arg) => {
        let { dbGuild, guild } = message;

        dbGuild.settings.greeting = arg;
        dbGuild.markModified(`settings`);
        await dbGuild.save();

        let embed = client.helpers.generateSuccessEmbed(client, message.member.user, `The bot greeting message has been changed to \`${arg}\`.`);
        return message.channel.send({ embed });
    };

    return exports;
});
