const Discord = require('discord.js');
const Promise = require('bluebird');
const _ = require(`lodash`);

module.exports = (async function(client, helpers) {
    const exports = {};

    const db = client.db;
    const Schema = db.Schema;
    
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

    db.model(`MessageDeleteWatch`, new Schema({
        command: { type: Number, required: true },
        message: { type: Schema.Types.Mixed, required: true },
        sentMessage: { type: Schema.Types.Mixed, required: true },
        shard: Number,
    }));
    
    db.model(`PrivateVoiceChannel`, new Schema({
        channelID: String
    }));

    db.model(`QueuedTrack`, new Schema({
        channel: { type: Schema.Types.Mixed, required: true },
        client: { type: Schema.Types.Mixed, required: true },
        member: { type: Schema.Types.Mixed, required: true },
        track: { type: Schema.Types.Mixed, required: true },
    }));

    db.model(`Reminder`, new Schema({
        channelID: { type: String, required: true },
        guildID: { type: String, required: true },
        message: { type: String, required: true },
        userID: { type: String, required: true },
        type: { type: Number, required: true },
        when: { type: Number, required: true },
    }, {
        timestamps: true
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

    return exports;
});
