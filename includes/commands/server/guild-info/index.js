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

        var embed = new Discord.RichEmbed();
        embed = embed.setTitle(guild.name);
        embed = embed.setImage(guild.iconURL);
        embed = embed.setColor(client.helpers.colors.info);/*
        var description =
        embed = embed.setDescription(description);*/
        embed = embed.addField(`Guild ID:`, guild.id, true);
        embed = embed.addField(`Owner:`, guild.owner, true);
        embed = embed.addField('Created', `${moment(guild.createdAt).format('L')} (${moment(guild.createdAt).fromNow()})`, true);
        embed = embed.addField('# of Bans', `\`${numeral(await guild.fetchBans().size).format('0,0')}\` banned members`, true);

        embed = embed.addBlankField();

        var users = ``;
        users += `All - \`${numeral(guild.members.size).format('0,0')}\``;
        users += `\nHuman - \`${numeral(guild.members.filter(m => !m.user.bot).size).format('0,0')}\``;
        users += `\nBot - \`${numeral(guild.members.filter(m => m.user.bot).size).format('0,0')}\``;
        embed = embed.addField(`# of Members:`, users, true);

        var userStatuses =  ``;
        userStatuses += `${client.customEmojis.online} \`${numeral(guild.members.filter(m => m.user.presence.status === `online`).size).format('0,0')}\``;
        userStatuses += `\n${client.customEmojis.offline} \`${numeral(guild.members.filter(m => m.user.presence.status === `offline`).size).format('0,0')}\``;
        userStatuses += `\n${client.customEmojis.idle} \`${numeral(guild.members.filter(m => m.user.presence.status === `idle`).size).format('0,0')}\``;
        userStatuses += `\n${client.customEmojis.dnd} \`${numeral(guild.members.filter(m => m.user.presence.status === `dnd`).size).format('0,0')}\``;
        embed = embed.addField(`User Statuses:`, userStatuses, true);

        var channels = ``;
        channels += `All - \`${numeral(guild.channels.size).format('0,0')}\``;
        channels += `\nText - \`${numeral(guild.channels.filter(c => c.type === `text`).size).format('0,0')}\``;
        channels += `\nVoice - \`${numeral(guild.channels.filter(c => c.type === `voice`).size).format('0,0')}\``;
        channels += `\nCategory - \`${numeral(guild.channels.filter(c => c.type === `category`).size).format('0,0')}\``;
        embed = embed.addField(`Channels:`, channels, true);
        return message.channel.send({ embed });
    };

    return exports;
});
