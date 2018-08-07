const Discord = require('discord.js');
const Promise = require('bluebird');

module.exports = (async function(client, helpers) {
    const exports = {};

    const db = client.db;
    const Guild = db.model('Guild');

    client.on(`message`, async message => {
        client.helpers.log(`event`, `${message.id} → message received`);
        if (message.author.bot) {
            // Message author was a bot.
            client.helpers.log(`event`, `${message.id} → message author was a bot`);
            return;
        }

        if (message.channel.type === `dm`) {
            // At the moment do not respond to DM messages
            return;
        }

        let content = message.content.split(` `);
        let command = content.shift();
        let prefix = client.config.defaultPrefix;

        if (command.startsWith(prefix)) {
            let arg = content.join(` `);
            command = command.slice(prefix.length);

            // checks if message contains a command and runs it
            let commandfile = client.commands.get(command);
            if (commandfile) {
                let guild = await Guild.get(message.guild.id);
                if (guild.can(message.member).execute.command(commandfile).in(message.channel)) {
                    commandfile.run(client, message, arg);
                }
            }
        }
    });

    return exports;
});
