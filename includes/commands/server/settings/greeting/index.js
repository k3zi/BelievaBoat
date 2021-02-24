module.exports = (async (client, helpers) => {
    const exports = {};

    exports.meta = {};
    exports.meta.name = `set-greeting`;
    exports.meta.aliases = [];
    exports.meta.description = `Sets a new greeting for new people who enter the server.`;
    exports.meta.module = 'setup';
    exports.meta.examples = ['set-greeting Hellllllllo this is yudai'];

    exports.run = async (client, message, arg) => {
        const { dbGuild, guild } = message;

        if (arg.length === 0) {
           throw new Error("No argument was provided.");
        }

        const cleanArg = arg.trim();

        dbGuild.settings.greeting = cleanArg;
        dbGuild.markModified(`settings`);
        await dbGuild.save();

        const embed = client.helpers.generateSuccessEmbed(client, message.member.user, `The bot greeting message has been changed to:\n\`\`\`${cleanArg}\`\`\``);
        return message.channel.send({ embed });
    };

    return exports;
});
