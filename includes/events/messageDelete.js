const Discord = require('discord.js');
const Promise = require('bluebird');
const _ = require(`lodash`);

module.exports = (async function(client, helpers) {
    const exports = {};

    const db = client.db;
    let MessageDeleteWatch = db.model('MessageDeleteWatch');

    client.addDeleteWatchForMessage = async function(command, message, sentMessage) {
        let watch = new MessageDeleteWatch({
            command: command,
            message: _.pick(message, [`id`, `channel.id`, `channel.name`]),
            sentMessage: _.pick(sentMessage, [`id`, `channel.id`, `channel.name`]),
            shard: client.shard ? client.shard.id : undefined
        });

        return watch.save();
    };

    client.on(`messageDeleteRaw`, async message => {
        let watchInfos = await MessageDeleteWatch.find({
            'message.id': message.id,
            'message.channel.id': message.channel.id,
            shard: client.shard ? client.shard.id : undefined
        });

        if (!watchInfos || !watchInfos.length) {
            client.helpers.log(`event`, `messageDelete`, message.id, `no watch was found`);
            return;
        }

        client.helpers.log(`event`, `messageDelete`, message.id, `watch was found`);

        await Promise.map(watchInfos, async watchInfo => {
            await watchInfo.remove();
            let commandfile = client.commands.get(watchInfo.command);
            if (!commandfile) {
                return;
            }

            let channel = await client.channels.get(watchInfo.sentMessage.channel.id);
            let sentMessage = await channel.fetchMessage(watchInfo.sentMessage.id);
            return sentMessage.delete();
        });
    });

    return exports;
});
