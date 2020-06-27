const Discord = require('discord.js');
const Fuse = require('fuse.js');
const _ = require('lodash');
const dictionary = require('./entries.json');

module.exports = async (client) => {
    let exports = {};

    exports.meta = {};
    exports.meta.name = 'define';
    exports.meta.description = 'Searches for and displays the definition of the given word.';
    exports.meta.module = 'study';
    exports.meta.examples = ['define apple'];
    exports.meta.aliases = ['definition', 'meaning', 'word'];

    const options = {
        useExtendedSearch: true,
        keys: ['headword']
    };
    const fuse = new Fuse(dictionary, options);

    exports.run = async (client, message, arg) => {  
        const results = fuse.search(arg).slice(0, 3).map(x => x.item);

        let embed = new Discord.MessageEmbed();
        embed = embed.setTitle(`Search Results for "${arg}":`);
        embed = embed.setColor(client.helpers.colors.info);
        embed = embed.setTimestamp();

        const description = results.map(r => {
            const definitions = r.definitions.map((d, i) => {
                return `
                    ${d.senses.map(s => {
                        return `
                           ${i}. ${s.definition}
                           ${s.examples.slice(0, 3).map(e => '・' + e).join('\n')}
                        `.trim();
                    }).join('\n')}
                `.trim();
            });
            return `
                **${r.headword}**  ${r.pos.map(x => `\`${x}\``).join(', ')}
                🇺🇸: \`${r.americanIPA}\` ｜ 🇬🇧: \`${r.britishIPA}\`
                ${definitions.join('\n')}
            `.trim();
        }).join('\n--------------------\n');
        embed.setDescription(description);

        return message.channel.send(embed);
    };

    return exports;
};
