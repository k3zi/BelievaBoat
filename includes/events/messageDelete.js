const Discord = require('discord.js');
const Promise = require('bluebird');

module.exports = (async function(client, helpers) {
    const exports = {};

    const db = client.db;
    let MessageDeleteWatch = db.model('MessageDeleteWatch');

    client.addDeleteWatchForMessage = async function(command, message, sentMessage) {
        let watch = new MessageDeleteWatch({
            command: command,
            message: {
                id: message.id,
                name: message.name
            },
            sentMessage: {
                id: sentMessage.id,
                channel: {
                    id: sentMessage.channel.id,
                    name: sentMessage.channel.name
                }
            }
        });

        return await watch.save();
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
            return await sentMessage.delete();
        });
    });

    return exports;
});
