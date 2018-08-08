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

    exports.meta = {};
    exports.meta.name = 'enable';
    exports.meta.aliases = [];
    exports.meta.description = `Enable a command or module.\n`
    + '```enable <everything / module / channel> (for <user / role / permission> <value of previous>) (in <category / channel> <value of previous>)```';
    exports.meta.module = 'setup';
    exports.meta.examples = ['enable everything for role @Admin', 'enable profile for @Member'];

    exports.run = async (client, message, arg) => {
        let member = message.member;
        const modules = _.uniq(client.commands.array().map(c => c.meta.module));

        let forArg = {

        };

        let inArg = {

        };

        async function parseArgs(args) {
            var forIndex;
            console.log(args);
            console.log(args.length);
            if (!forArg.type && (forIndex = args.indexOf(`for`)) >= 0) {
                if (args.length <= (forIndex + 2)) {
                    throw new Error(`Arguments are missing for the  \`for\` input.`);
                }

                forArg.type = args[forIndex + 1];
                forArg.value = args[forIndex + 2];

                if (![`user`, `role`, `permission`].includes(forArg.type)) {
                    throw new Error(`No valid \`for\` type (\`user\` | \`role\` | \`permission\`) was provided.`);
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
                    let user = await client.helpers.findChannelCategory(message.guild, inArg.value);
                    if (!user) {
                        throw new Error(`Unable to locate the specified \`category\`. Please use a more exact value such as the user's ID.`);
                    }

                    inArg.value = user;
                }

                if (inArg.type === `channel`) {
                    let role = await client.helpers.findChannel(message.guild, inArg.value);
                    if (!role) {
                        throw new Error(`Unable to locate the specified \`channel\`. Please use a more exact value such as the role's ID.`);
                    }

                    inArg.value = role;
                }
            }
        }

        var args = arg.trim().split(/[\s]+/gi);
        if (arg.length == 0 || args.length == 0) {
            throw new Error(`No arguments were provided.`);
        }

        let action = args.shift();
        if (![`everything`, `module`, `command`].includes(action)) {
            throw new Error(`No valid \`action\` type (\`everything\` | \`module\` | \`command\`) was provided.`);
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
        // await client.addDeleteWatchForMessage(exports.meta.name, message, sentMessage);
    };

    return exports;
});
