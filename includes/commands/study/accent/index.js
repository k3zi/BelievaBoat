const Discord = require('discord.js');
const Promise = require('bluebird');
const moment = require('moment');
const _ = require('lodash');
const fs = Promise.promisifyAll(require('fs'));
const numeral = require('numeral');
const util = require('util');

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
            output += "＼"
        }
    }

    return output;
};

const accentsForArray = (accents) => {
    const result = [];
    for (let accent of accents) {
        const output = accent.accent.map(a =>
            accentOutput(a.pronunciation, a.pitchAccent)
        ).join('・');
        result.push(` ・［${accent.accent.map(a => a.pitchAccent).join('・')}］${output}`);
    }
    return result;
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
    exports.meta.name = `accent`;
    exports.meta.aliases = ['pitch', 'p'];
    exports.meta.description = `Looks up the pitch accent for the specified word via NHK 日本語発音アクセント新辞典（２０１６）.`;
    exports.meta.module = 'study';
    exports.meta.examples = ['accent こんにちは'];

    const nhk = require('./nhk.json');

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
        const results = nhk.filter(e => e.kana === word || e.kanji.includes(word));
        let embed = new Discord.MessageEmbed().setTitle("Accent for: " + word).setTimestamp();
        var combinedAccents = [];
        for (let result of results) {
            console.log(results);
            let i = 0;
            const accents = [
                ...(accentsForArray(result.accents)),
                ...(accentsForSimpleArray(result.conjugations.slice(1))),
                ...(result.subentries.slice(0, 25).map(e => accentsForArray(e.accents)).flat())
            ];

            const kanjiOutput = result.kanji.length ? `【 ${result.kanji.join('、')}】` : '';
            const usageOutput = result.usage ? `（${result.usage}）` : '';
            combinedAccents.push(`${result.kana}${kanjiOutput}${usageOutput}\n${accents.join('\n')}`)
        }
        console.log(combinedAccents);

        embed = embed.setDescription(combinedAccents.join('\n\n'));
        embed = embed.setColor(client.helpers.colors.info);

        return message.channel.send({ embed });
    };

    return exports;
});
