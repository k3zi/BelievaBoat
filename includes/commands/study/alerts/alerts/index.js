const WhenType = require('./../whenType');

module.exports = async (client) => {
    let exports = {};

    exports.meta = {};
    exports.meta.name = 'alerts';
    exports.meta.description = 'Display alerts.';
    exports.meta.module = 'study';
    exports.meta.examples = ['alerts'];
    exports.meta.aliases = [];

    const Alert = client.db.model('Alert');

    exports.run = async (client, message, arg) => {
        const alerts = await Alert.find()
            .where('authorID').equals(message.author.id)
            .exec();

        let embed = client.helpers.generatePlainEmbed(client, client.user, '');
        embed = embed.setTitle(`Alerts:`);
        embed = embed.setFooter(`Replying to: ${message.id}`);
        embed = embed.setColor(client.helpers.colors.info);

        let descriptions = [];
        if (alerts.length === 0) {
            descriptions.push('No alerts.');
        } else {
            for (let alert of alerts) {
                let info = '';
                if (WhenType.isValid(alert.when)) {
                    info += ` when ${WhenType.toStatus(alert.when)}`;
                } else {
                    info = 'invalid';
                }
                descriptions.push(`\`${alert.id}\` ${info}: ${alert.message}`);
            }
        }
        embed = embed.setDescription(descriptions.join('\n'));
        return message.channel.send(embed);
    };

    return exports;
};
