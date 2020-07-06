const _ = require('lodash');
const shortid = require('shortid');

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
        command: { type: String, required: true },
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

    db.model(`Alert`, new Schema({
        _id: {
            type: String,
            default: shortid.generate
        },
        authorID: { type: String, required: true },
        channelID: { type: String, required: true },
        guildID: { type: String, required: true },
        message: { type: String, required: true },
        userID: { type: String, required: true },
        referenceUserID: { type: String, required: true },
        when: { type: Number, required: true },
        viaDM: { type: Boolean, required: true, default: () => false }
    }, {
        timestamps: true
     }));

    db.model(`Reminder`, new Schema({
        _id: {
            type: String,
            default: shortid.generate
        },
        authorID: { type: String, required: true },
        channelID: { type: String, required: true },
        guildID: { type: String, required: true },
        message: { type: String, required: true },
        userID: { type: String, required: true },
        seconds: { type: Number, required: false },
        type: { type: Number, required: true },
        when: { type: Number, required: false },
        viaDM: { type: Boolean, required: true, default: () => false }
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
