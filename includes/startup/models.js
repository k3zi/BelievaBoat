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
                    // user (location) -> action (location) -> location
                    everywhere: true
                },
                modules: {
                    // module -> user (location) -> action (location) -> location
                    moderation: {
                        everywhere: false,
                        permissions: {
                            'ADMINISTRATOR': {
                                // action (location) -> location
                                everywhere: true,
                                /*execute: {
                                    everywhere: true
                                }*/
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

    let checkUser = function (result, item, member, action, channel) {
        // item == user level
        result = checkLocation(result, item, channel);
        
        if (_.isObject(item.permissions)) {
            For (let [key, value] of Object.entries(item.permissions)) {
                if (member.hasPermission(key)) {
                    if (_.isBoolean(value)) {
                        result = value;
                    } else if (_.isObject(valuie)) {
                        result = checkAction(result, value, action, channel);
                    }
                }
            }
        }

        if (_.isObject(item.roles)) {
            For (let [key, value] of Object.entries(item.roles)) {
                if (member.hasRole(key)) {
                    if (_.isBoolean(value)) {
                        result = value;
                    } else if (_.isObject(valuie)) {
                        result = checkAction(result, value, action, channel);
                    }
                }
            }
        }

        if (_.isObject(item.users)) {
            For (let [key, value] of Object.entries(item.users)) {
                if (member.id === key) {
                    if (_.isBoolean(value)) {
                        result = value;
                    } else if (_.isObject(valuie)) {
                        result = checkAction(result, value, action, channel);
                    }
                }
            }
        }

        return result;
    };

    let checkAction = function (result, item, action, channel) {
        result = checkLocation(result, item, channel);

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

        return result;
    };

    let onFunction = function (guild, member, action, channel) {
        var result = false;
        let perms = guild.perms;
        let checkOrder = [`everything`, `modules`, `commands`];
        let type = action.type;
        let command = action.value;

        for (let check of checkOrder) {
            let item = perms[check];
            if (_.isBoolean(item)) {
                result = item;
            } else if (_.isObject(item)) {
                if (check === `everything`) {
                    result = checkLocation(result, item, )
                }
            }
        }
    };

    let innerCanFunction = function (target) {
        console.log(target);
        return onFunction(target.guild, target.member, target[`#doWhat#`], target.in);
    };

    guildSchema.methods.can = function (member) {
        // .can.execute.command('').in()
        var arr = [`#doWhat#`, `$aWhat$`, `in`];

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
                     if (match === thing || match.startsWith(`$`)) {
                         return (response) => {
                            target[match] = match.startsWith(`$`) ? {
                                type: thing,
                                value: response
                            } : response;

                            if (!arr.length) {
                                return innerCanFunction(target);
                            }

                            return proxy;
                        };
                    }

                    target[match] = thing;

                    if (!arr.length) {
                        return innerCanFunction(target);
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
        onRestart: { type: Boolean, default: false }
    }));

    db.model(`VoiceChannelSpeakActivity`, new Schema({
        userID: { type: String, required: true },
        channelID: { type: String, required: true },
        start: { type: Date, default: Date.now },
        duration: { type: Number, default: 0 }
    }));

    db.model(`MessageDeleteWatch`, new Schema({
        command: { type: String, required: true },
        message: { type: Schema.Types.Mixed, required: true },
        sentMessage: { type: Schema.Types.Mixed, required: true }
    }));

    db.model(`QueuedTrack`, new Schema({
        channel: { type: Schema.Types.Mixed, required: true },
        client: { type: Schema.Types.Mixed, required: true },
        member: { type: Schema.Types.Mixed, required: true },
        track: { type: Schema.Types.Mixed, required: true }
    }));

    db.model(`MemberAction`, new Schema({
        type: { type: String, required: true },
        member: { type: Schema.Types.Mixed, required: true },
        points: { type: Number, required: true },
        date: { type: Date, default: Date.now }
    }));

    db.model(`MemberMessageEmoji`, new Schema({
        value: { type: String, required: true },
        member: { type: Schema.Types.Mixed, required: true },
        date: { type: Date, default: Date.now }
    }));

    return exports;
});
