const Discord = require('discord.js');
const Promise = require('bluebird');
const moment = require('moment');
const _ = require('lodash');
const fs = Promise.promisifyAll(require('fs'));
const numeral = require('numeral');
const util = require('util');

module.exports = (async function(client, helpers) {
    const exports = {};

    exports.meta = {};
    exports.meta.name = `ping`;
    exports.meta.aliases = [];
    exports.meta.description = `Shows the current bot ping and message round trip.`;
    exports.meta.module = 'info';
    exports.meta.examples = ['ping'];

    exports.run = async (client, message, arg) => {
        let { dbGuild, guild } = message;

        var t = process.hrtime();
        let result = await client.db.connection.db.admin().ping();
        t = process.hrtime(t);
        console.log('benchmark took %d seconds and %d nanoseconds', t[0], t[1]);
        console.log(result);

        var embed = client.helpers.generatePlainEmbed(client, client.user, '');
        embed = embed.setTitle(`Ping Results:`);
        embed = embed.setFooter(`Replying to: \`${message.id}\``);
        embed = embed.setColor(client.helpers.colors.warning);

        var description = ``;
        description += `${client.customEmojis.neutral} Message Round Trip: \`--ms\``;
        description += `\n${client.customEmojis.check} Discord Websocket Heartbeat: \`${client.ping}ms\``;
        description += `\n${client.customEmojis.check} Database: \`2ms\``;
        embed = embed.setDescription(description);

        const filter = m => true;
        const collector = message.channel.createMessageCollector(filter, { time: 15000 });
        var sentMessage;
        var alreadySent = false;
        var hasBeenEdited = false;
        var mewEmbed;
        collector.on('collect', async m => {
            let potentialT = process.hrtime(t);

            if (m.author.id !== client.user.id || m.content !== `` || m.embeds.length !== 1 || !m.embeds[0].footer || m.embeds[0].footer.text !== embed.footer.text) {
                return;
            }

            if (!hasBeenEdited) {
                t = potentialT;
                collector.stop();
                description = description.replace('--', util.format('%d', t[0] * 1000 +  t[1] / 1000000));
                description = description.replace(client.customEmojis.neutral, client.customEmojis.check);
                mewEmbed = embed.setDescription(description);
                embed = embed.setColor(client.helpers.colors.success);
                hasBeenEdited = true;

                if (sentMessage) {
                    alreadySent = true;
                    await sentMessage.edit({ embed });
                }

                return hasBeenEdited;
            }
        });

        t = process.hrtime();
        sentMessage = await message.channel.send({ embed });

        if (!alreadySent && hasBeenEdited) {
            alreadySent = true;
            await sentMessage.edit({ embed });
        }
        return sentMessage;
    };

    return exports;
});
