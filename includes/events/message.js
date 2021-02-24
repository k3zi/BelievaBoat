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

        let dbGuild = await Guild.get(message.guild.id);
        message.dbGuild = dbGuild;
        const prefix = (dbGuild.settings.prefix || ``).trim().length > 0 ? dbGuild.settings.prefix : client.config.defaultPrefix;
        const delimeters = ['　', '、', ',', '。', '.']
            .filter(s => s != prefix);

        // This is a lot of hacking. I'm dissapointed in myself.
        const randomJoinChar = '↉';
        let content = message.content.split(' ').join(`${randomJoinChar} ${randomJoinChar}`);
        for (let delimeter of delimeters) {
            content = content.split(delimeter).join(`${randomJoinChar}${delimeter}${randomJoinChar}`);
        }
        content = content.split(randomJoinChar);

        let command = content.shift();
        while (command.length == 0 && content.length > 0) {
            command = content.shift();
        }
        content = content
            .join(randomJoinChar)
            .split(`${randomJoinChar} ${randomJoinChar}`)
            .join(' ')
            .split(`${randomJoinChar}`)
            .join('');
        for (let delimeter of delimeters) {
            content = content.split(`${randomJoinChar}${delimeter}${randomJoinChar}`).join(delimeter);
        }

        if (command.startsWith(prefix) || dbGuild.settings.disablePrefix) {
            const arg = content;
            command = command.startsWith(prefix) ? command.slice(prefix.length) : command;

            // checks if message contains a command and runs it
            const commandfile = client.helpers.innerSearchCommands(client, dbGuild, command);
            if (commandfile) {

                let sentMessage;
                try {
                    if (dbGuild.can(message.member).run(commandfile).in(message.channel)) {
                        sentMessage = await commandfile.run(client, message, arg);
                    } else {
                        throw new Error("You do not have permission to execute this command.");
                    }
                } catch (error) {
                    console.log(error);
                    let embed = client.helpers.generateErrorEmbed(client, undefined, error);
                    embed = client.helpers.addSenderToFooter(embed, message, 'executed this request');
                    sentMessage = await message.channel.send({ embed });
                }

                if (sentMessage) {
                    console.log('adding message delete watch');
                    await client.addDeleteWatchForMessage(commandfile.meta.name, message, sentMessage);
                }
            }
        }
    });

    return exports;
});
