const Discord = require('discord.js');
const Promise = require('bluebird');
const moment = require('moment');

const fs = Promise.promisifyAll(require('fs'));

module.exports = (async function(client, helpers) {
    const exports = {};
    const db = client.db;

    exports.meta = {};
    exports.meta.name = `greet`;
    exports.meta.aliases = ['welcome'];
    exports.meta.description = `Greets the passed in user.`;
    exports.meta.module = 'server';
    exports.meta.examples = ['greet @User'];

    exports.run = async (client, message, arg) => {
        const { dbGuild } = message;
        let member;
        if (arg.length != 0) {
            member = message.guild.members.cache.get(arg) || (message.mentions.members || (new Discord.Collection())).first();
        }

        if (!member) {
            throw new Error('Could not find the specified member.');
        }

        const { greeting } = dbGuild.settings;

        if (greeting.length === 0) {
            throw new Error('This server has not specified a greeting.');
        }

        const greetingModified = greeting.replace(/\{name\}/g, member.nickname || member.user.username);
        return await message.channel.send(greetingModified);
    };

    return exports;
});
