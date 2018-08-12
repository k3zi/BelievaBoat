const Discord = require('discord.js');
const Promise = require('bluebird');

const helpers = {};

helpers.log = function (...args) {
    return console.log(args.join(` → `));
};

helpers.generateErrorEmbed = function (client, user, error) {
    var embed = new Discord.RichEmbed();
    embed = embed.setAuthor(`${user.username}#${user.discriminator}`, user.displayAvatarURL);
    embed = embed.setDescription(`${client.customEmojis.xmark} ${error}`);
    embed = embed.setColor([240, 71, 71]);
    return embed;
};

helpers.generateSuccessEmbed = function (client, user, message) {
    var embed = new Discord.RichEmbed();
    embed = embed.setAuthor(`${user.username}#${user.discriminator}`, user.displayAvatarURL);
    embed = embed.setDescription(`${client.customEmojis.check} ${message}`);
    embed = embed.setColor([67, 181, 129]);
    return embed;
};

helpers.startsWith = function (str1, str2) {
    return str1.substr(0, str2.length).toLowerCase() === str2.toLowerCase();
};

helpers.joinCode = function (arr, delimiter) {
    return arr.map(x => `\`` + x + `\``).join(delimiter);
};

helpers.findUser = async function (guild, value) {
    value = value + '';
    if (guild.members.has(value)) {
        return guild.members.get(value).user;
    }

    var match;
    if (match = value.match(/<@[!]?([0-9]+)>/)) {
        let userID = match[1];
        if (guild.members.has(userID)) {
            return guild.members.get(userID).user;
        }

        let user = await guild.client.fetch(userID);
        if (user) {
            return user;
        }
    }

    if (value.includes('#')) {
        let [username, discriminator] = value.split(`#`);
        let user = guild.members.find(m => m.user.username == username && m.user.discriminator == discriminator);
        if (user) {
            return user.user;
        }
    }

    value = value.toLowerCase();
    let searchUsers = guild.members.filter(m => helpers.startsWith(m.displayName, value) || helpers.startsWith(m.user.username, value));
    if (searchUsers.size === 1) {
        return searchUsers.first();
    }

    return undefined;
};

helpers.findChannelCategory = async function (guild, value) {
    value = value + '';
    let guildCategoryChannels = guild.channels.filter(x => x.type === `category`);
    if (guildCategoryChannels.has(value)) {
        return guildCategoryChannels.get(value);
    }

    var match;
    if (match = value.match(/<#([0-9]+)>/)) {
        let channelID = match[1];
        if (guildCategoryChannels.has(channelID)) {
            return guildCategoryChannels.get(channelID);
        }
    }

    value = value.toLowerCase();
    let searchChannels = guildCategoryChannels.filter(c => helpers.startsWith(c.name, value));
    if (searchChannels.size === 1) {
        return searchChannels.first();
    }

    return undefined;
};

helpers.findChannel = async function (guild, value) {
    value = value + '';
    let guildChannels = guild.channels.filter(x => x.type === `text`);
    if (guildChannels.has(value)) {
        return guildChannels.get(value);
    }

    var match;
    if (match = value.match(/<#([0-9]+)>/)) {
        let channelID = match[1];
        if (guildChannels.has(channelID)) {
            return guildChannels.get(channelID);
        }
    }

    value = value.toLowerCase();
    let searchChannels = guildChannels.filter(c => helpers.startsWith(c.name, value));
    if (searchChannels.size === 1) {
        return searchChannels.first();
    }

    return undefined;
};

helpers.findRole = async function (guild, value) {
    value = value + '';
    if (guild.roles.has(value)) {
        return guild.roles.get(value);
    }

    var match;
    if (match = value.match(/<@&([0-9]+)>/)) {
        let roleID = match[1];
        if (guild.roles.has(roleID)) {
            return guild.roles.get(roleID);
        }
    }

    value = value.toLowerCase();
    let searchRoles = guild.roles.filter(r => helpers.startsWith(r.name, value));
    if (searchRoles.size === 1) {
        return searchRoles.first();
    }

    return undefined;
};

const possibleFlags = Object.keys(Discord.Permissions.FLAGS);
const possibleFlagsLowercase = possibleFlags.map(x => x.toLowerCase());
helpers.findPermission = async function (value) {
    value = value + '';
    if (possibleFlags.includes(value)) {
        return Discord.Permissions.FLAGS[value];
    }

    value = value.toLowerCase();
    var lowercaseIndex = possibleFlagsLowercase.indexOf(value);
    if (lowercaseIndex >= 0) {
        return Discord.Permissions.FLAGS[possibleFlags[lowercaseIndex]];
    }

    return undefined;
};

module.exports = helpers;
