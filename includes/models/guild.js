const Discord = require('discord.js');
const Promise = require('bluebird');
const _ = require(`lodash`);

module.exports = (async function(client, helpers) {
    const exports = {};

    const db = client.db;
    const Schema = db.Schema;

    let guildSchema = new Schema({
        _id: String,
        permissions: Schema.Types.Mixed,
        settings: {
            type: Schema.Types.Mixed,
        },
    }, { _id: false });

    const enableItems = [`everything`, `module`, `command`];
    const enableParameterItems = [`module`, `command`];

    guildSchema.statics.get = async function (id) {
        client.helpers.log(`db`, `getting guild`, id);

        let guild = await this.findByIdAndUpdate(id, { $setOnInsert: { _id: id }}, {
            upsert: true,
            new: true
        });

        if (!guild.permissions) {
            // permissionsAny:
            // permissionsAll:
            // roles:
            // users:

            guild.permissions = {
                everything: {
                    // user (location) -> location -> items
                    everywhere: true
                },
                modules: { // module -> user (location) -> location -> items
                    moderation: {
                        everywhere: false,
                        permissions: {
                            'ADMINISTRATOR': {
                                // location
                                everywhere: true,
                            }
                        }
                    },
                    setup: {
                        everywhere: false,
                        permissions: {
                            'ADMINISTRATOR': {
                                everywhere: true
                            }
                        }
                    }
                },
                commands: {

                }
            };
        }

        if (!guild.settings) {
            guild.settings = {
                aliases: [],
                removedAliases: [],
                prefix: client.config.defaultPrefix,
                disablePrefix: false,
                greeting: "",
                greetingChannelID: ""
            };
        }

        if (!guild.settings.aliases) {
            guild.settings.aliases = [];
        }

        if (!guild.settings.removedAliases) {
            guild.settings.removedAliases = [];
        }

        if (!guild.settings.logs) {
            guild.settings.logs = [];
        }

        if (!guild.settings.greeting) {
            guild.settings.greeting = "";
        }

        if (!guild.settings.greetingChannelID) {
            guild.settings.greetingChannelID = "";
        }

         return guild.save();
    };

    let checkWhat = function (result, item, member, type, command, channel) {
        let value = item[type === `modules` ? command.meta.module : command.meta.name];

        if (_.isBoolean(value)) {
            result = value;
        } else if (_.isObject(value)) {
            result = checkUser(result, value, member, channel);
        }

        return result;
    };

    let checkUser = function (result, item, member, channel) {
        // item == user level
        result = checkLocation(result, item, channel);

        if (_.isObject(item.permissions)) {
            for (let [key, value] of Object.entries(item.permissions)) {
                if (member.hasPermission(key)) {
                    if (_.isBoolean(value)) {
                        result = value;
                    } else if (_.isObject(value)) {
                        result = checkLocation(result, value, channel);
                    }
                }
            }
        }

        if (_.isObject(item.roles)) {
            for (let [key, value] of Object.entries(item.roles)) {
                if (member.hasRole(key)) {
                    if (_.isBoolean(value)) {
                        result = value;
                    } else if (_.isObject(value)) {
                        result = checkLocation(result, value, channel);
                    }
                }
            }
        }

        if (_.isObject(item.users)) {
            for (let [key, value] of Object.entries(item.users)) {
                if (member.id === key) {
                    if (_.isBoolean(value)) {
                        result = value;
                    } else if (_.isObject(value)) {
                        result = checkLocation(result, value, channel);
                    }
                }
            }
        }

        return result;
    };


    let checkLocation = function (result, item, channel) {
        if (_.isBoolean(item.everywhere)) {
            result = item.everywhere;
        }

        if (_.isObject(item.channels)) {
            if (_.isBoolean(item.channels[channel.id])) {
                result = item.channels[channel.id];
            }
        }

        if (channel.parentID && _.isObject(item.categories)) {
            if (_.isBoolean(item.categories[channel.id])) {
                result = item.categories[channel.parentID];
            }
        }

        return result;
    };

    let onFunction = function (guild, member, command, channel) {
        if (member.guild.ownerID === member.id) {
            return true;
        }

        var result = false;
        let perms = guild.permissions;
        let checkOrder = [`everything`, `modules`, `commands`];

        for (let type of checkOrder) {
            let item = perms[type];
            if (_.isBoolean(item)) {
                result = item;
            } else if (_.isObject(item)) {
                if (type === `everything`) {
                    result = checkUser(result, item, member, channel);
                } else {
                    result = checkWhat(result, item, member, type, command, channel);
                }
            }
        }

        return result;
    };

    let innerCanFunction = function (target) {
        return onFunction(target.guild, target.member, target.run, target.in);
    };

    guildSchema.methods.can = function (member) {
        // .can.execute.command('').in()
        var arr = [`run`, `in`];

        var proxy = new Proxy ({
             guild: this,
             member: member
         }, {
             get: (target, thing) => {
                 client.helpers.log(`proxy`, thing);
                 if (thing === 'inspect' || thing === 'constructor') {
                     return target[thing];
                 } else {
                     let match = arr.shift();
                     if (match === thing) {
                         return (response) => {
                            target[match] = response;

                            if (!arr.length) {
                                return innerCanFunction(target);
                            }

                            return proxy;
                        };
                    }

                    return proxy;
                }
             }
         });

         return proxy;
    };

    guildSchema.methods.updateSetting = async function (settingName, settingValue) {
        let settings = this.settings || {};
        settings[settingName] = settingValue;
        this.settings = settings;
        return this.markModified(`settings`);
    };

    guildSchema.methods.findWatches = function (member, type) {
        return this.settings.logs.filter(l => {
            if (l.type !== type) {
                return false;
            }

            if (l.for.type === 'everyone') {
                return true;
            } else if (l.for.type === 'user') {
                return l.for.value === member.user.id;
            } else if (l.for.type === 'role') {
                return member.hasRole(l.for.value);
            } else if (l.for.type === 'permission') {
                return member.hasPermission(l.for.value);
            }

            return false;
        });
    };

    guildSchema.methods.updatePermissions = async function (member, arg, enable, actionWord) {
        let guild = member.guild;
        let dbGuild = this;

        let { action, value, forArg, inArg } = await helpers.parseActionForIn(client, guild, arg);

        async function applyLocation(item, enable) {
            var residingValue;
            var actualType = inArg.type;

            if (inArg.type === `category`) {
                residingValue = item.categories || {};
                item.categories = residingValue;
                actualType = `categories`;
            } else if (inArg.type === `channel`) {
                residingValue = item.channels || {};
                item.channels = residingValue;
                actualType = `channels`;
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
                if (Object.keys(item[actualType]).length === 0) {
                    delete item[actualType];
                }
            }
        }

        async function applyUser(item, enable) {
            var residingValue;
            var forValueID;
            var actualType = forArg.type;

            if (forArg.type === `user`) {
                let users = item.users || {};
                item.users = users;
                residingValue = item.users;
                forValueID = forArg.value.id;
                actualType = `users`;
            } else if (forArg.type === `role`) {
                let roles = item.roles || {};
                item.roles = roles;
                residingValue = item.roles;
                forValueID = forArg.value.id;
                actualType = `roles`;
            } else if (forArg.type === `permission`) {
                let permissions = item.permissions || {};
                item.permissions = permissions;
                residingValue = item.permissions;
                forValueID = forArg.value;
                actualType = `permissions`;
            }

            let location = residingValue[forValueID] || {};
            residingValue[forValueID] = location;
            await applyLocation(location, enable);

            if (Object.keys(residingValue[forValueID]).length === 0) {
                delete residingValue[forValueID];
            }

            if (Object.keys(item[actualType]).length === 0) {
                delete item[actualType];
            }
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

            return dbGuild.markModified(`permissions`);
        }

        console.log('before: ', JSON.stringify(dbGuild.permissions, null, 4));
        console.log('action: ', action, 'value: ', value);
        await applyItem(action, value, enable);
        console.log('after: ', JSON.stringify(dbGuild.permissions, null, 4));
        await dbGuild.save();

        var embed = client.helpers.generateSuccessEmbed(client, member.user, `**${actionWord}**: `);
        var description = embed.description;
        description += `\`${action}\` → \`${value || `n/a`}\``;
        if (forArg.type) {
            description += `\n**For**: \`${forArg.type}\` → ${forArg.value || `\`n/a\``}`;
        }
        if (inArg.type) {
            description += `\n**In**: \`${inArg.type}\` → ${inArg.value || `\`n/a\``}`;
        }
        embed = embed.setDescription(description);
        return embed;
    };

    db.model(`Guild`, guildSchema);

    return exports;
});
