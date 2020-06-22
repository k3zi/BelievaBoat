const Discord = require('discord.js');
const Promise = require('bluebird');
const moment = require('moment');
const _ = require('lodash');
const fs = Promise.promisifyAll(require('fs'));
const numeral = require('numeral');

module.exports = (async function(client, helpers) {
    const exports = {};

    exports.meta = {};
    exports.meta.name = `guild-info`;
    exports.meta.aliases = [`guild`, `guild-stats`, `guildinfo`, `server`, `server-stats`, `serverinfo`];
    exports.meta.description = `Shows various information and data of the guild.`;
    exports.meta.module = 'info';
    exports.meta.examples = ['guild-info', 'server-info', 'server'];

    exports.run = async (client, message, arg) => {
        let { dbGuild, guild } = message;

        let embed = new Discord.MessageEmbed();
        embed = embed.setTitle(guild.name);
        embed = embed.setImage(guild.iconURL);
        embed = embed.setColor(client.helpers.colors.info);
        embed = embed.addField(`Guild ID:`, guild.id, true);
        embed = embed.addField(`Owner:`, guild.owner, true);
        embed = embed.addField('Created', `${moment(guild.createdAt).format('L')} (${moment(guild.createdAt).fromNow()})`, true);
        embed = embed.addField('# of Bans', `\`${numeral(await guild.fetchBans().size).format('0,0')}\` banned members`, true);

        embed = embed.addField('\u200b', '\u200b');

        let users = ``;
        users += `All - \`${numeral(guild.memberCount).format('0,0')}\``;
        users += `\nHuman - \`${numeral(guild.members.cache.filter(m => !m.user.bot).size).format('0,0')}\``;
        users += `\nBot - \`${numeral(guild.members.cache.filter(m => m.user.bot).size).format('0,0')}\``;
        embed = embed.addField(`# of Members:`, users, true);

        let userStatuses = ``;
        const onlineCount = guild.presences.cache.filter(p => p.status === `online`).size;
        const idleCount = guild.presences.cache.filter(p => p.status === `idle`).size;
        const dndCount = guild.presences.cache.filter(p => p.status === `dnd`).size;
        const offlineCount = guild.memberCount - onlineCount - idleCount - dndCount;
        userStatuses += `${client.customEmojis.online} \`${numeral(onlineCount).format('0,0')}\``;
        userStatuses += `\n${client.customEmojis.offline} \`${numeral(offlineCount).format('0,0')}\``;
        userStatuses += `\n${client.customEmojis.idle} \`${numeral(idleCount).format('0,0')}\``;
        userStatuses += `\n${client.customEmojis.dnd} \`${numeral(dndCount).format('0,0')}\``;
        embed = embed.addField(`User Statuses:`, userStatuses, true);

        let channels = ``;
        channels += `All - \`${numeral(guild.channels.cache.size).format('0,0')}\``;
        channels += `\nText - \`${numeral(guild.channels.cache.filter(c => c.type === `text`).size).format('0,0')}\``;
        channels += `\nVoice - \`${numeral(guild.channels.cache.filter(c => c.type === `voice`).size).format('0,0')}\``;
        channels += `\nCategory - \`${numeral(guild.channels.cache.filter(c => c.type === `category`).size).format('0,0')}\``;
        embed = embed.addField(`Channels:`, channels, true);
        return message.channel.send({ embed });
    };

    return exports;
});
