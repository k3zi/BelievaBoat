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
    exports.meta.name = `clear`;
    exports.meta.aliases = [`unset`, `unfix`];
    exports.meta.description = `Clears a permission.\n`
    + '```clear <everything | module [name] | channel [name] | log [name]> (for <user / role / permission> [name | id]) (in <category / channel> [name | id])```';
    exports.meta.module = 'setup';
    exports.meta.examples = ['disable everything for role @Admin', 'disable profile for @Member'];

    exports.run = async (client, message, arg) => {
        let dbGuild = message.dbGuild;
        let embed = await dbGuild.updatePermissions(message.member, arg, undefined, `Cleared`);
        return message.channel.send({ embed });
    };

    return exports;
});
