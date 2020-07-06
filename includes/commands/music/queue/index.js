module.exports = (async function(client, helpers) {
    let exports = {};

    exports.meta = {};
    exports.meta.name = 'queue';
    exports.meta.description = 'Displays the list of songs in the queue.';
    exports.meta.module = 'music';
    exports.meta.examples = ['queue'];
    exports.meta.aliases = ['upcoming'];

    exports.run = async (client, message, arg) => {
        const channel = message.member.voice.channel;
        if (!channel) {
            throw new Error('Please join a voice channel first.');
        }

        const manager = client.musicManagers.get(message.guild.id);
        if (!manager) {
            throw new Error('Not currently playing.');
        }

        const upcoming = manager.upcoming;
        let embed = client.helpers.generatePlainEmbed(client, client.user, '');
        embed = embed.setTitle(`Upcoming:`);
        embed = embed.setFooter(`Replying to: ${message.id}`);
        embed = embed.setColor(client.helpers.colors.info);

        const description = upcoming.length > 0 
            ? upcoming.map((s, i) => `${i+1}. ${s.title} queued by ${s.user}`).join('\n')
            : "No songs currently queued.";
        embed = embed.setDescription(description);
        return message.channel.send(embed);
    };

    return exports;
});
