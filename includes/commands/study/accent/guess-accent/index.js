const Discord = require('discord.js');
const Promise = require('bluebird');
const moment = require('moment');
const _ = require('lodash');
const fs = Promise.promisifyAll(require('fs'));
const numeral = require('numeral');
const util = require('util');
const fetch = require('node-fetch');

const smallrowKatakana = 'ァィゥェォヵㇰヶㇱㇲㇳㇴㇵㇶㇷㇷ゚ㇸㇹㇺャュョㇻㇼㇽㇾㇿヮ';
const accentOutput = (word, accent) => {
    let output = '';
    let mora = 0;
    let i = 0;
    while (i < word.length) {
        output += word.charAt(i);

        i++;
        mora++;

        while (i < word.length && smallrowKatakana.includes(word.charAt(i))) {
            output += word.charAt(i);
            i++;
        }

        if (mora === accent) {
            output += "＼";
        }
    }

    return output;
};

const accentsForSimpleArray = (accents) => {
    const result = [];
    for (let accent of accents) {
        const output = accent.map(a =>
            accentOutput(a.pronunciation, a.pitchAccent)
        ).join('・');
        result.push(` ・［${accent.map(a => a.pitchAccent).join('・')}］${output}`);
    }
    return result;
};

module.exports = (async function(client, helpers) {
    const exports = {};

    exports.meta = {};
    exports.meta.name = `guess-accent`;
    exports.meta.aliases = ['gaccent'];
    exports.meta.description = `Looks up the pitch accent for the specified word via コツ.`;
    exports.meta.module = 'study';
    exports.meta.examples = ['guess-accent 昆布茶'];

    exports.run = async (client, message, arg) => {
        let { dbGuild, guild } = message;

        let args = arg.trim().split(/[\s]+/gi);
        if (arg.length == 0 || args.length == 0) {
            throw new Error(`No arguments were provided.`);
        }

        if (args.length !== 1) {
            throw new Error(`Only one argument is allowed.`);
        }

        const word = args[0].trim();
        const embed = new Discord.MessageEmbed().setTitle("Accent for: " + word).setTimestamp();
        if (client.config.kotuAPIKey && client.config.kotuAPIKey.length > 0) {
            const sentenceResponse = await fetch(`https://kotu.io/api/dictionary/parse`, {
                method: 'POST',
                body: word,
                headers: {
                    'Authorization': `Bearer ${client.config.kotuAPIKey}`
                }
            });
            let sentences = await sentenceResponse.json();
            const phrases = _.flatten(sentences.map(s => s.accentPhrases));
            const output = phrases.map(p => accentOutput(p.pronunciation, p.pitchAccent.mora)).join('　');

            embed.setDescription(`My Guess:\n${output}`);
            embed.setFooter('Drops are indicated by ＼. Phrases are seperated by spaces. Phrases without drops are flat.');
        }

        embed.setColor(client.helpers.colors.info);

        return message.channel.send({ embed });
    };

    return exports;
});
