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

    function heartTimeToMs (t) {
        return util.format('%i', t[0] * 1000 +  t[1] / 1000000);
    }

    exports.run = async (client, message, arg) => {
        let { dbGuild, guild } = message;

        var t = process.hrtime();
        let result = await client.db.connection.db.admin().ping();
        let databasePing = process.hrtime(t);

        var embed = client.helpers.generatePlainEmbed(client, client.user, '');
        embed = embed.setTitle(`Ping Results:`);
        embed = embed.setFooter(`Replying to: ${message.id}`);
        embed = embed.setColor(client.helpers.colors.warning);

        var description = ``;
        description += `${client.customEmojis.loading} Message Round Trip: \`-- ms\``;
        description += `\n${client.customEmojis.check} Discord Heartbeat: \`${util.format('%i', client.ws.ping)} ms\``;
        description += `\n${client.customEmojis.check} Database: \`${heartTimeToMs(databasePing)} ms\``;
        embed = embed.setDescription(description);

        const filter = m => true;
        const collector = message.channel.createMessageCollector(filter, { time: 15000 });
        collector.on('collect', async m => {
            let potentialT = process.hrtime(t);

            if (m.author.id !== client.user.id || m.content !== `` || m.embeds.length !== 1 || !m.embeds[0].footer || m.embeds[0].footer.text !== embed.footer.text) {
                return;
            }

            t = potentialT;
            console.log('collector received message');
            description = description.replace('--', heartTimeToMs(t));
            description = description.replace(client.customEmojis.loading, client.customEmojis.check);
            embed = embed.setDescription(description);
            embed = embed.setColor(client.helpers.colors.success);
            console.log(await m.edit({ embed }));
            console.log('messaged has been edited');
            collector.stop();
        });

        t = process.hrtime();
        return message.channel.send({ embed });
    };

    return exports;
});
