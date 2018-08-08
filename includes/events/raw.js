const Discord = require('discord.js');
const Promise = require('bluebird');
const _ = require(`lodash`);

module.exports = (async function(client, helpers) {
    const exports = {};

    client.on('raw', packet => {
        // We don't want this to run on unrelated packets
        if (!['MESSAGE_DELETE'].includes(packet.t)) return;

        if (packet.t === 'MESSAGE_DELETE') {
            client.emit('messageDeleteRaw', {
                id: packet.d.id,
                channel: {
                    id: packet.d.channel_id
                }
            });
        }
    });

    return exports;
});
