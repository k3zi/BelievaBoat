module.exports = (async function(client, helpers) {
    const exports = {};

    exports.meta = {};
    exports.meta.name = `set-greeting-channel`;
    exports.meta.aliases = [];
    exports.meta.description = `Defines which channel the greeting message will be posted in.`;
    exports.meta.module = 'setup';
    exports.meta.examples = ['set-greeting-channel general'];

    exports.run = async (client, message, arg) => {
        const { dbGuild, guild } = message;
        const channel = await client.helpers.findChannel(guild, arg);

        if (!channel) {
            throw new Error("Channel doesn't exist");
        }

        dbGuild.settings.greetingChannelID = channel.id;

        dbGuild.markModified(`settings`);
        await dbGuild.save();

        const embed = client.helpers.generateSuccessEmbed(client, message.member.user, `The bot greeting message channel has been changed to \`${channel.name}\`.`);
        return message.channel.send({ embed });
    };

    return exports;
});
