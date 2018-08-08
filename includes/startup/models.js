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
    }, { _id: false });

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
                    // user (location) -> location
                    everywhere: true
                },
                modules: {
                    // module -> user (location) -> location
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

            await guild.save();
        }

        return guild;
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

    db.model(`Guild`, guildSchema);

    ////////////////////////////////////////////////////////////////////////////

    db.model(`PrivateVoiceChannel`, new Schema({
        channelID: String
    }));

    db.model(`VoiceChannelJoinActivity`, new Schema({
        userID: { type: String, required: true },
        channelID: { type: String, required: true },
        start: { type: Date, default: Date.now },
        duration: { type: Number, default: 0 },
        onRestart: { type: Boolean, default: false },
    }));

    db.model(`VoiceChannelSpeakActivity`, new Schema({
        userID: { type: String, required: true },
        channelID: { type: String, required: true },
        start: { type: Date, default: Date.now },
        duration: { type: Number, default: 0 },
    }));

    db.model(`MessageDeleteWatch`, new Schema({
        command: { type: String, required: true },
        message: { type: Schema.Types.Mixed, required: true },
        sentMessage: { type: Schema.Types.Mixed, required: true },
        shard: Number,
    }));

    db.model(`QueuedTrack`, new Schema({
        channel: { type: Schema.Types.Mixed, required: true },
        client: { type: Schema.Types.Mixed, required: true },
        member: { type: Schema.Types.Mixed, required: true },
        track: { type: Schema.Types.Mixed, required: true },
    }));

    db.model(`MemberAction`, new Schema({
        type: { type: String, required: true },
        member: { type: Schema.Types.Mixed, required: true },
        points: { type: Number, required: true },
        date: { type: Date, default: Date.now },
    }));

    db.model(`MemberMessageEmoji`, new Schema({
        value: { type: String, required: true },
        member: { type: Schema.Types.Mixed, required: true },
        date: { type: Date, default: Date.now },
    }));

    return exports;
});
