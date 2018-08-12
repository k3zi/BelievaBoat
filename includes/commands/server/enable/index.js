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

    const enableItems = [`everything`, `module`, `command`];
    const enableParameterItems = [`module`, `command`];
    const forArgTypes = [`user`, `role`, `permission`];
    // const logTypes = [`delete`, `edit`, `reaction`, `media`, `link`];

    exports.meta = {};
    exports.meta.name = 'enable';
    exports.meta.aliases = [];
    exports.meta.description = `Enable something.\n`
    + '```enable <everything | module [name] | channel [name] | log [name]> (for <user / role / permission> [name | id]) (in <category / channel> [name | id])```';
    exports.meta.module = 'setup';
    exports.meta.examples = ['enable everything for role @Admin', 'enable profile for @Member'];

    exports.run = async (client, message, arg) => {
        let member = message.member;
        let dbGuild = message.dbGuild;

        const modules = _.uniq(client.commands.array().map(c => c.meta.module));

        let forArg = {

        };

        let inArg = {

        };

        async function parseArgs(args) {
            var forIndex;
            if (!forArg.type && (forIndex = args.indexOf(`for`)) >= 0) {
                if (args.length <= (forIndex + 2)) {
                    throw new Error(`Arguments are missing for the  \`for\` input.`);
                }

                forArg.type = args[forIndex + 1];
                forArg.value = args[forIndex + 2];

                if (!forArgTypes.includes(forArg.type)) {
                    throw new Error(`No valid \`for\` type: [${helpers.joinCode(forArgTypes, ` | `)}] was provided.`);
                }

                if (forArg.type === `user`) {
                    let user = await client.helpers.findUser(message.guild, forArg.value);
                    if (!user) {
                        throw new Error(`Unable to locate the specified \`user\`. Please use a more exact value such as the user's ID.`);
                    }

                    forArg.value = user;
                }

                if (forArg.type === `role`) {
                    let role = await client.helpers.findRole(message.guild, forArg.value);
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
            if (!inArg.type && (inIndex = args.indexOf(`in`)) >= 0) {
                if (args.length <= (inIndex + 2)) {
                    throw new Error(`Arguments are missing for the  \`in\` input.`);
                }

                inArg.type = args[inIndex + 1];
                inArg.value = args[inIndex + 2];

                if (![`category`, `channel`].includes(inArg.type)) {
                    throw new Error(`No valid \`in\` type (\`category\` | \`channel\`) was provided.`);
                }

                if (inArg.type === `category`) {
                    let category = await client.helpers.findChannelCategory(message.guild, inArg.value);
                    if (!category) {
                        throw new Error(`Unable to locate the specified \`category\`. Please use a more exact value such as the user's ID.`);
                    }

                    inArg.value = category;
                }

                if (inArg.type === `channel`) {
                    let channel = await client.helpers.findChannel(message.guild, inArg.value);
                    if (!channel) {
                        throw new Error(`Unable to locate the specified \`channel\`. Please use a more exact value such as the role's ID.`);
                    }

                    inArg.value = channel;
                }
            }
        }

        async function applyLocation(item, enable) {
            var residingValue;

            if (inArg.type === `category`) {
                residingValue = item.categories || {};
                item.categories = residingValue;
            } else if (inArg.type === `channel`) {
                residingValue = item.channels || {};
                item.channels = residingValue;
            } else if (_.isBoolean(enable)) {
                item.everywhere = enable;
                return;
            } else {
                delete item.everywhere;
                return;
            }

            if (_.isBoolean(enable)) {
                residingValue[inArg.value.id] = enable;
            } else {
                delete residingValue[inArg.value.id];
            }
        }

        async function applyUser(item, enable) {
            var residingValue;
            var forValueID;

            if (forArg.type === `user`) {
                let users = item.users || {};
                item.users = users;
                residingValue = item.users;
                forValueID = forArg.value.id;
            } else if (forArg.type === `role`) {
                let roles = item.roles || {};
                item.roles = roles;
                residingValue = item.roles;
                forValueID = forArg.value.id;
            } else if (forArg.type === `permission`) {
                let permissions = item.permissions || {};
                item.permissions = permissions;
                residingValue = item.permissions;
                forValueID = forArg.value;
            }

            let location = residingValue[forValueID] || {};
            residingValue[forValueID] = location;
            return applyLocation(location, enable);
        }

        async function applyItem(action, value, enable) {
            // action = everything, module, command
            if (action === `module`) {
                action = `modules`;
            } else if (action === `command`) {
                action = `commands`;
            }

            let item = dbGuild.permissions[action];
            if (action !== `everything`) {
                let subItem = item[value] || {};
                item[value] = subItem;
                item = subItem;
            }

            if (forArg.type) {
                await applyUser(item, enable);
            } else {
                await applyLocation(item, enable);
            }

            dbGuild.markModified(`permissions`);
        }

        var args = arg.trim().split(/[\s]+/gi);
        if (arg.length == 0 || args.length == 0) {
            throw new Error(`No arguments were provided.`);
        }

        let action = args.shift();
        if (!enableItems.includes(action)) {
            throw new Error(`No valid \`action\` type: [${helpers.joinCode(enableItems, ` | `)}] was provided.`);
        }

        let value = args.shift();
        if (action === `everything`) {
            args.unshift(value);
        } else if (!value || !value.length) {
            throw new Error(`No valid value was provided for the action type: \`${action}\`.`);
        } else if (action === `module` && !modules.includes(value)) {
            throw new Error(`No valid value was provided for the action type: \`${action}\`.  Please use one of the following: ${modules.map(x => `\`${x}\``).join(`, `)}`);
        } else if (action === `command` && !client.commands.some(c => c.meta.name === value || c.meta.aliases.includes(value))) {
            throw new Error(`No valid value was provided for the action type: \`${action}\`.  Please use one of the following: ${client.commands.map(c => `\`${c.meta.name}\``).join(`, `)}`);
        }

        args = args.join(` `).split(`\n`);
        await parseArgs(args);
        args = args.join(`\n`).split(`,`);
        await parseArgs(args);
        args = args.join(`,`).split(` `);
        await parseArgs(args);

        client.helpers.log(`command`, `enable`, `${value} (${action})`, `for: ${forArg.value ? (forArg.value.id ? forArg.value.id : forArg.value) : forArg.value} (${forArg.type})`, `in: ${inArg.value ? inArg.value.id : inArg.value} (${inArg.type})`);

        console.log('before: ', JSON.stringify(dbGuild.permissions, null, 4));
        await applyItem(action, value, true);
        console.log('after: ', JSON.stringify(dbGuild.permissions, null, 4));
        console.log(JSON.stringify(await dbGuild.save()));

        var embed = client.helpers.generateSuccessEmbed(client, member.user, `**Enabled**: `);
        var description = embed.description;
        description += `\`${action}\` → \`${value || `n/a`}\``;
        if (forArg.type) {
            description += `\n**For**: \`${forArg.type}\` → ${forArg.value || `\`n/a\``}`;
        }
        if (inArg.type) {
            description += `\n**In**: \`${inArg.type}\` → ${inArg.value || `\`n/a\``}`;
        }
        embed = embed.setDescription(description);
        return message.channel.send({ embed });
    };

    return exports;
});
