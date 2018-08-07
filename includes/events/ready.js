const Discord = require('discord.js');
const Promise = require('bluebird');

module.exports = (async function(client, helpers) {
    const exports = {};

    const db = client.db;
    const emojis = {
        online: `476143357853302796`,
        offline: `476143358134190081`,
        idle: `476143357715021855`,
        dnd: `476143357895245846`,
        check: `476144832138444800`,
        neutral: `476178341662031892`,
        xmark: `476144164161978368`,
        empty: `476143357618290700`,
        typing: `476144164287807498`,
        loading: `476144164095131668`,
    };

    client.on(`ready`, () => {
        for (const [key, value] of Object.entries(emojis)) {
            client.customEmojis[key] = client.emojis.get(value);
        }

        client.helpers.log(`startup`, `main client: ${client.user.username} is online`);
        client.user.setActivity(`.help for help!`);
    });

    return exports;
});
