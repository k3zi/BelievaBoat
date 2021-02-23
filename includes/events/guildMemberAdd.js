const Discord = require('discord.js');
const Promise = require('bluebird');

module.exports = async function(client, helpers) {
    const exports = {};

    const db = client.db;
    const Guild = db.model(`Guild`);

    client.on(`guildMemberAdd`, async member => {
        const { guild } = member; 
        client.helpers.log(`event`, `new member joined`, member.id);
        const dbGuild = await Guild.get(guild.id);

        const { greetingChannelID, greeting } = dbGuild.settings;

        if (greeting.length == 0 || greetingChannelID.length == 0) {
            return;
        }

        const greetingModified = greeting.replace(/\{name\}/g, member.nickname || member.user.username);
        const channel = await client.channels.fetch(greetingChannelID);
        await channel.send(greetingModified);
    });

    return exports;
};
