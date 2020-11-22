const sharp = require('sharp');
const Discord = require('discord.js');
const Promise = require('bluebird');
const moment = require('moment');
const _ = require('lodash');
const fs = Promise.promisifyAll(require('fs'));
const path = require(`path`);
const numeral = require('numeral');

module.exports = (async function(client, helpers) {
    const exports = {};

    exports.meta = {};
    exports.meta.name = `role-info`;
    exports.meta.aliases = [`role`, `roleinfo`];
    exports.meta.description = `Shows various information and data about the provided role.`;
    exports.meta.module = 'info';
    exports.meta.examples = ['role-info Moderator', 'role Member'];

    const roleColorIconSVG = await fs.readFileAsync(path.join(__dirname, `role-color-icon.svg`), 'utf-8');

    exports.run = async (client, message, arg) => {
        let { dbGuild, guild, author: sender } = message;

        let args = arg.trim().split(/[\s]+/gi);
        if (arg.length == 0 || args.length == 0) {
            throw new Error(`No arguments were provided.`);
        }

        var role = message.mentions.roles.first();
        if (!role) {
            role = await helpers.findRole(guild, args[0]);
        }
        if (!role) {
            throw new Error(`No valid role was provided.`);
        }

        var embed = client.helpers.generatePlainEmbed(client, message.member.user, undefined);

        let svgFile = roleColorIconSVG.replace(/\$\{role\.hexColor\}/gi, role.hexColor);
        let imageData = await sharp(Buffer.from(svgFile)).png().toBuffer();
        let svgFileAttachment = new Discord.MessageAttachment(imageData, 'roleColorIcon.png');
        embed = embed.attachFiles([svgFileAttachment]);
        embed = embed.setAuthor(`Role Information: ${role.name}`, `attachment://roleColorIcon.png`);

        embed = embed.setDescription('');
        embed = embed.addField(`ID:`, role.id, true);
        embed = embed.addField(`Name:`, role.name, true);
        embed = embed.addField(`Mention:`, `\`${role}\``, true);
        embed = embed.addField(`Colour / Color:`, role.hexColor, true);
        embed = embed.addField(`Members:`, numeral(role.members.size).format('0,0'), true);
        embed = embed.addField(`Created On:`, `${moment(role.createdAt).format('L')} (${moment(role.createdAt).fromNow()})`, true);
        embed = embed.addField('Position:', `${guild.roles.size - role.position}${client.helpers.mumberToOrdinal(guild.roles.size - role.position)} of ${guild.roles.size}`, true);
        embed = embed.addField('Hoisted:', `${role.hoist ? `Yes` : `No`}`, true);
        embed = embed.addField('Mentionable:', `${role.mentionable ? `Yes` : `No`}`, true);

        let permissions = client.helpers.joinCode(Object.entries(client.helpers.permissionsToHumanReadable).filter(e => role.permissions.has(e[0])).map(e => e[1]), ` ・ `) || `None`;
        embed = embed.addField('Permissions:', permissions, false);
        embed = client.helpers.addSenderToFooter(embed, message, 'requested this information');
        embed = embed.setTimestamp(message.createdAt);

        return message.channel.send({ embed });
    };

    return exports;
});
