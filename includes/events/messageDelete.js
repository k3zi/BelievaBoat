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
            message: _.pick(message, [`id`, `name`]),
            sentMessage: _.pick(sentMessage, [`id`, `channel.id`, `channel.name`]),
        });

        return watch.save();
    };

    client.on(`messageDelete`, async message => {
        let watchInfos = await MessageDeleteWatch.find({
            'message.id': message.id
        });

        if (!watchInfos || !watchInfos.length) {
            return;
        }

        await Promise.map(watchInfos, async watchInfo => {
            await watchInfo.remove();
            let commandfile = client.commands.get(watchInfo.command);
            if (!commandfile) {
                return;
            }

            let channel = await client.channels.get(watchInfo.sentMessage.channel.id);
            let sentMessage = await channel.fetchMessage(watchInfo.sentMessage.id)
            return sentMessage.delete();
        });
    });

    return exports;
});
