const Discord = require('discord.js');
const Promise = require('bluebird');
const _ = require('lodash');

const helpers = {};

helpers.forArgTypes = [`user`, `role`, `permission`];

helpers.colors = {
    success: [67, 181, 129],
    error: [240, 71, 71],
    info: [114, 137, 218],
    warning: [250, 166, 26],
};

helpers.permissionsToHumanReadable = {
    ADMINISTRATOR: 'Administrator',
    CREATE_INSTANT_INVITE: 'Create Instant Invite',
    KICK_MEMBERS: 'Kick Members',
    BAN_MEMBERS: 'Ban Members',
    MANAGE_CHANNELS: 'Manage Channels',
    MANAGE_GUILD: 'Manage Guild',
    ADD_REACTIONS: 'Add Reactions',
    VIEW_AUDIT_LOG: 'View Audit Log',
    PRIORITY_SPEAKER: 'Priority Speaker',
    VIEW_CHANNEL: 'View Channel',
    SEND_MESSAGES: 'Send Messages',
    SEND_TTS_MESSAGES: 'Send TTS Messages',
    MANAGE_MESSAGES: 'Manage Messages',
    EMBED_LINKS: 'Embed Links',
    ATTACH_FILES: 'Attach Files',
    READ_MESSAGE_HISTORY: 'Read Message History',
    MENTION_EVERYONE: 'Mention @everyone',
    USE_EXTERNAL_EMOJIS: 'Use External Emojis',
    CONNECT: 'Connect',
    SPEAK: 'Speak',
    MUTE_MEMBERS: 'Mute Members',
    DEAFEN_MEMBERS: 'Deafen Members',
    MOVE_MEMBERS: 'Move Members',
    USE_VAD: 'Use Voice Activity',
    CHANGE_NICKNAME: 'Change Nickname',
    MANAGE_NICKNAMES: 'Manage Nicknames',
    MANAGE_ROLES: 'Manage Roles',
    MANAGE_WEBHOOKS: 'Manage Webhooks',
    MANAGE_EMOJIS: 'Manage Emojis',
};

helpers.log = function (...args) {
    return console.log(args.join(` → `));
};

helpers.startsWith = function (str1, str2) {
    return str1.substr(0, str2.length).toLowerCase() === str2.toLowerCase();
};

helpers.joinCode = function (arr, delimiter) {
    return arr.map(x => `\`` + x + `\``).join(delimiter);
};

helpers.mumberToOrdinal = function (n) {
    return ["st","nd","rd"][(((n < 0 ? -n : n) + 90 ) % 100 - 10) % 10 - 1] || "th";
}

helpers.addSenderToFooter = function (embed, message, filler) {
    return embed.setFooter(`${message.author.username}#${message.author.discriminator} ${filler} in #${message.channel.name}`, message.author.displayAvatarURL());
}

helpers.addReactions = async function (message, index, descriptions) {
    await message.reactions.removeAll();
    if (index > 0) {
        await message.react('⬅');
        await Promise.delay(450);
    }

    if ((index + 1) < descriptions.length) {
        await message.react('➡');
        await Promise.delay(450);
    }

    await message.react('❌');
};

helpers.page = async function (bot, message, exports, title, descriptions, footer) {
    let index = 0;
    return helpers.createOrUpdateEmbed(message.channel, title, descriptions[index], footer).then(async sentMessage => {
        await bot.addDeleteWatchForMessage(exports.meta.name, message, sentMessage);
        const filter = (reaction, user) => {
            if (user.id !== message.author.id) {
                return false;
            }

            return '⬅➡❌'.includes(reaction.emoji.name);
        };

        let collector = sentMessage.createReactionCollector(filter);
        let stop = async () => {
            collector.stop();
            await sentMessage.reactions.removeAll();
        };
        let timer = setTimeout(stop, 120 * 1000);
        collector.on('collect', async r => {
            if (r.emoji.name == '❌') {
                return await stop();
            }

            if (r.emoji.name == '➡') {
                index += 1;
            } else if (r.emoji.name == '⬅') {
                index -= 1;
            }
            sentMessage = await helpers.createOrUpdateEmbed(message.channel, title, descriptions[index], footer, sentMessage);
            await helpers.addReactions(sentMessage, index, descriptions);

            clearTimeout(timer);
            timer = setTimeout(stop, 120 * 1000);
        });

        await helpers.addReactions(sentMessage, index, descriptions);
    });
}

helpers.createOrUpdateEmbed = function(channel, title, description, footer, sentMessage) {
    const embed = new Discord.MessageEmbed()
        .setTitle(title)
        .setTimestamp()
        .setColor(helpers.colors.info)
        .setDescription(description)
        .setFooter(footer);

    if (sentMessage) {
        return sentMessage.edit({ embed });
    } else {
        return channel.send({ embed });
    }
};

helpers.formatPlainUserString = function (user) {
    return `${user.username}#${user.discriminator}`;
}

helpers.formatUserMentionExtraString = function (user) {
    return `${user} \`[${helpers.formatPlainUserString(user)} | ${user.id}]\``;
}

helpers.generateErrorEmbed = function (client, user, error) {
    let embed = new Discord.MessageEmbed();
    if (user) {
        embed = embed.setAuthor(`${user.username}#${user.discriminator}`, user.displayAvatarURL());
    }
    if (error) {
        embed = embed.setDescription(`${client.customEmojis.xmark} ${error}`);
    }
    embed = embed.setColor(helpers.colors.error);
    return embed;
};

helpers.generateSuccessEmbed = function (client, user, message) {
    let embed = new Discord.MessageEmbed();
    if (user) {
        embed = embed.setAuthor(`${user.username}#${user.discriminator}`, user.displayAvatarURL());
    }
    embed = embed.setDescription(`${client.customEmojis.check} ${message}`);
    embed = embed.setColor(helpers.colors.success);
    return embed;
};

helpers.generatePlainEmbed = function (client, user, message) {
    let embed = new Discord.MessageEmbed();
    if (user) {
        embed = embed.setAuthor(`${user.username}#${user.discriminator}`, user.displayAvatarURL());
    }
    embed = embed.setDescription(message);
    embed = embed.setColor(helpers.colors.info);
    return embed;
};

helpers.generateEmbed = function (client, user, message, success) {
    if (success) {
        return helpers.generateSuccessEmbed(client, user, message);
    } else {
        return helpers.generateErrorEmbed(client, user, message);
    }
};

helpers.findUser = async function (guild, value) {
    value = value + '';
    if (guild.members.has(value)) {
        return guild.members.cache.get(value).user;
    }

    var match;
    if (match = value.match(/<@[!]?([0-9]+)>/)) {
        let userID = match[1];
        if (guild.members.has(userID)) {
            return guild.members.cache.get(userID).user;
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
    let guildChannels = guild.channels.cache.filter(x => x.type === `text`);
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
    if (guild.roles.cache.has(value)) {
        return guild.roles.cache.get(value);
    }

    var match;
    if (match = value.match(/<@&([0-9]+)>/)) {
        let roleID = match[1];
        if (guild.roles.cache.has(roleID)) {
            return guild.roles.cache.get(roleID);
        }
    }

    value = value.toLowerCase();
    let searchRoles = guild.roles.cache.filter(r => helpers.startsWith(r.name, value));
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

var modules;
helpers.findAction = function (client, action) {
    if (!modules) {
        modules = _.uniq(client.commands.array().map(c => c.meta.module));
    }

    var value;
    if (modules.includes(action)) {
        value = action;
        action = `module`;
    } else if (value = client.commands.find(c => c.meta.name === action || c.meta.aliases.includes(action))) {
        value = value.meta.name;
        action = `command`;
    } else if (action !== `everything`) {
        throw new Error(`No valid module/command was provided. Please use one of the following:`
            + `\nModules → ${modules.map(c => `\`${c}\``).join(`, `)}`
            + `\nCommands → ${client.commands.map(c => `\`${c.meta.name}\``).join(`, `)}`);
    }

    return { action, value };
};

function innerSearchCommands (client, dbGuild, action) {
    action = action.toLowerCase();
    return client.commands.find(c =>
        c.meta.name === action
        || dbGuild.settings.aliases.some(a => a.from === action && a.to === c.meta.name)
        || (!dbGuild.settings.removedAliases.some(a => a.from === action) && c.meta.aliases.includes(action))
    );
}

helpers.innerSearchCommands = innerSearchCommands;

helpers.findCommand = function (client, dbGuild, action) {
    if (!modules) {
        modules = _.uniq(client.commands.array().map(c => c.meta.module));
    }

    var value;
    if (modules.includes(action)) {
        throw new Error(`A module name can no be used here. Please use one of the following commands:`
            + `\n${client.commands.map(c => `\`${c.meta.name}\``).join(`, `)}`);
    } else if (value = innerSearchCommands(client, dbGuild, action)) {
        return value;
    } else {
        throw new Error(`No valid command was provided. Please use one of the following:`
            + `\n${client.commands.map(c => `\`${c.meta.name}\``).join(`, `)}`);
    }
};

helpers.aliasWorks = function (client, dbGuild, action) {
    action = action.toLowerCase();
    if (!modules) {
        modules = _.uniq(client.commands.array().map(c => c.meta.module));
    }

    var value;
    if (modules.includes(action)) {
        return false;
    } else if (value = innerSearchCommands(client, dbGuild, action)) {
        return false;
    } else if (value === `everything`) {
        return false;
    } else if (Object.keys(dbGuild.settings.aliases).includes(action)) {
        return false;
    }

    return true;
};

helpers.parseArgs = async function (client, guild, args, forArg, inArg) {
    var forIndex;
    if (!forArg.type && (forIndex = args.indexOf(`for`)) >= 0) {
        if (args.length <= (forIndex + 2)) {
            throw new Error(`Arguments are missing for the  \`for\` input.`);
        }

        forArg.type = args[forIndex + 1];
        forArg.value = args[forIndex + 2];

        if (!helpers.forArgTypes.includes(forArg.type)) {
            throw new Error(`No valid \`for\` type: [${client.helpers.joinCode(helpers.forArgTypes, ` | `)}] was provided.`);
        }

        if (forArg.type === `user`) {
            let user = await client.helpers.findUser(guild, forArg.value);
            if (!user) {
                throw new Error(`Unable to locate the specified \`user\`. Please use a more exact value such as the user's ID.`);
            }

            forArg.value = user;
        }

        if (forArg.type === `role`) {
            let role = await client.helpers.findRole(guild, forArg.value);
            if (!role) {
                throw new Error(`Unable to locate the specified \`role\`. Please use a more exact value such as the role's ID.`);
            }

            forArg.value = role;
        }

        if (forArg.type === `permission`) {
            let permission = await client.helpers.findPermission(forArg.value);
            if (!permission) {
                throw new Error(`Unable to locate the specified \`permission\`. Please use one of the following: ${Object.keys(Discord.Permissions.FLAGS).map(x => `\`${x}\``).join(`, `)}`);
            }

            forArg.value = permission;
        }
    }

    var inIndex;
    if (inArg && !inArg.type && (inIndex = args.indexOf(`in`)) >= 0) {
        if (args.length <= (inIndex + 2)) {
            throw new Error(`Arguments are missing for the  \`in\` input.`);
        }

        inArg.type = args[inIndex + 1];
        inArg.value = args[inIndex + 2];

        if (![`category`, `channel`].includes(inArg.type)) {
            throw new Error(`No valid \`in\` type (\`category\` | \`channel\`) was provided.`);
        }

        if (inArg.type === `category`) {
            let category = await client.helpers.findChannelCategory(guild, inArg.value);
            if (!category) {
                throw new Error(`Unable to locate the specified \`category\`. Please use a more exact value such as the user's ID.`);
            }

            inArg.value = category;
        }

        if (inArg.type === `channel`) {
            let channel = await client.helpers.findChannel(guild, inArg.value);
            if (!channel) {
                throw new Error(`Unable to locate the specified \`channel\`. Please use a more exact value such as the role's ID.`);
            }

            inArg.value = channel;
        }
    }
};

helpers.parseActionForIn = async function (client, guild, arg) {
    let forArg = {

    };

    let inArg = {

    };

    var args = arg.trim().split(/[\s]+/gi);
    if (arg.length == 0 || args.length == 0) {
        throw new Error(`No arguments were provided.`);
    }

    let { action, value } = helpers.findAction(client, args.shift());

    args = args.join(` `).split(`\n`);
    await helpers.parseArgs(client, guild, args, forArg, inArg);
    args = args.join(`\n`).split(`,`);
    await helpers.parseArgs(client, guild, args, forArg, inArg);
    args = args.join(`,`).split(` `);
    await helpers.parseArgs(client, guild, args, forArg, inArg);

    return { action, value, forArg, inArg };
};

helpers.parseTime = function (s) {
    const unitMapping = {
        'd': 60 * 60 * 24,
        'h': 60 * 60,
        'm': 60,
        's': 1
    };

    const matches = s.match(/\d*\.?\d+[dhms]/g);
    if (!matches) {
        return undefined;
    }

    let result = 0;
    for (let match of matches) {
        const unit = unitMapping[match.slice(-1)];
        const number = parseFloat(match.slice(0, -1));
        result += unit * number;
    }

    return result;
};

helpers.prefix = function (dbGuild, client) {
    return (dbGuild.settings.prefix || ``).trim().length > 0 ? dbGuild.settings.prefix : client.config.defaultPrefix;
};

module.exports = helpers;
