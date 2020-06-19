const Discord = require('discord.js');
const Promise = require('bluebird');

module.exports = async function(client, helpers) {
    const exports = {};

    const db = client.db;
    const Guild = db.model(`Guild`);

    client.on(`guildCreate`, async rawGuild => {
        client.helpers.log(`event`, `guild added`, rawGuild.id);
    });

    return exports;
};
