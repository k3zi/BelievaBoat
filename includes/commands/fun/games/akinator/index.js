const api = require('./game');
const Discord = require('discord.js');
const Promise = require('bluebird');
const moment = require('moment');
const _ = require('lodash');
const fs = Promise.promisifyAll(require('fs'));
const numeral = require('numeral');
const util = require('util');

module.exports = (async function(client, helpers) {
    const exports = {};

    exports.meta = {};
    exports.meta.name = `akinator`;
    exports.meta.aliases = ['actor-guess', 'character-guess', 'guess-who'];
    exports.meta.description = `Play a game of akinator.`;
    exports.meta.module = 'fun';
    exports.meta.examples = ['akinator japanese', 'guess-who spanish'];

    const numberReactions = '1⃣ 2⃣ 3⃣ 4⃣ 5⃣'.split(' ');
    const secondsForResponse = 60;

    exports.run = async (client, message, arg) => {
        let { dbGuild, guild } = message;

        var language = 'english';
        let singlePlayStyle = guild.me.hasPermission('MANAGE_MESSAGES') ? true : false;
        if (arg.length > 0) {
            arg = arg.toLowerCase();
            if (api.regions.includes(arg)) {
                language = arg;
            } else {
                throw new Error(`Invalid language provided. Possible languages include: ${client.helpers.joinCode(api.regions, `・`)}`);
            }
        }

        var embed = client.helpers.generatePlainEmbed(client, undefined, '');
        embed = embed.setTitle(`Game of Akinator:`);
        embed = embed.setDescription(`The game will be starting momentarily. You have ${secondsForResponse} seconds to respond to each question. ${singlePlayStyle ? 'Use the reactions below to navigate the questions.' : `Respond \`quit\` or \`cancel\` or \`stop\` to put an end to this game.`}`);
        embed = client.helpers.addSenderToFooter(embed, message, 'can play this game instance');
        embed = embed.setColor(client.helpers.colors.warning);

        sentMessage = await message.channel.send({ embed });
        Promise.mapSeries(numberReactions, async r => {
            await sentMessage.react(r);
            await Promise.delay(450);
        }).then(() => {
            return sentMessage.react(client.customEmojis.xmark);
        });
        let initialGameData = await api.start(language);
        var gameData = initialGameData;
        await Promise.delay(3000);

        if (singlePlayStyle) {
            let filter = (reaction, user) => {
                return user.id === message.author.id;
            };
            let collector = sentMessage.createReactionCollector(filter);

            var timer;
            var isPlaying = true;
            var step = 0;
            var determineCont = async () => {
                if (!isPlaying) {
                    return;
                }

                collector.stop();
                if (!sentMessage.deleted) {
                    embed = embed.setColor(client.helpers.colors.error);
                    embed = embed.addField('Game Over.', 'The game has ended due to the lack of response in the allotted time.');
                    sentMessage = await sentMessage.edit({ embed });
                }
            };
            timer = setTimeout(determineCont, secondsForResponse * 1000);

            var collectorEnded = false;
            var allocatedDispatcher;
            var currentStep = step;
            var checkData = false;
            collector.on('collect', async r => {
                if (!checkData) {
                    if (currentStep != step) {
                        return;
                    }
                    step += 1;
                }

                if (r.emoji.id === client.customEmojis.xmark.id) {
                    isPlaying = false;
                    collector.stop();
                    if (!sentMessage.deleted) {
                        embed = embed.setColor(client.helpers.colors.error);
                        embed = embed.addField('Game Over.', 'The game has been ended.');
                        embed.fields.splice(embed.fields.length - 1, 1);
                        sentMessage = await sentMessage.edit({ embed });
                        await sentMessage.clearReactions();
                    }

                    return;
                }

                const reactionNumber = numberReactions.indexOf(r.emoji.name);
                if (reactionNumber < 0 || reactionNumber > gameData.answers.length) {
                    return;
                }

                clearTimeout(timer);
                timer = setTimeout(determineCont, secondsForResponse * 1000);
                embed.fields.splice(embed.fields.length - 1, 1);
                await Promise.map(r.message.reactions.array(), x => {
                    return Promise.map(x.users.filter(u => u.id != guild.me.id).array(), u => {
                        return x.remove(u).catch(console.log);
                    })
                });

                if (!checkData) {
                    gameData = await api.answer(language, initialGameData.session, initialGameData.signature, reactionNumber, currentStep).catch(async (error) => {
                        if (!sentMessage.deleted) {
                            embed = embed.setColor(client.helpers.colors.error);
                            embed = embed.addField('Game Over.', error);
                            sentMessage = await sentMessage.edit({ embed });
                            await sentMessage.clearReactions();
                        }

                        return false;
                    });
                }

                if (gameData && !sentMessage.deleted) {
                    if (checkData) {
                        if (reactionNumber === 0) {
                            embed = embed.setColor(client.helpers.colors.success);
                            embed = embed.setDescription(`Answer: **${checkData.name}** (${checkData.description})`);
                            embed = embed.addField('Game Over!', 'I enjoyed playing with you :)');
                            sentMessage = await sentMessage.edit({ embed });
                            await sentMessage.clearReactions();
                            isPlaying = false;
                            collector.stop();
                            return;
                        } else if (reactionNumber === 1) {
                            embed.fields.splice(embed.fields.length - 1, 1);
                            delete embed.thumbnail;
                            checkData = false;
                        } else {
                            return;
                        }
                    } else if (gameData.progress > 85) {
                        let tempCheckData = await api.list(language, initialGameData.session, initialGameData.signature, step).catch(async (error) => {
                            if (!sentMessage.deleted) {
                                embed = embed.setColor(client.helpers.colors.error);
                                embed = embed.addField('Game Over.', error);
                                sentMessage = await sentMessage.edit({ embed });
                                await sentMessage.clearReactions();
                            }
                        });

                        if (tempCheckData.length) {
                            checkData = tempCheckData[0].element;
                            let parsedAnswers = [`1 - Yes`, `2 - No`];
                            embed = embed.setTitle(`Game of Akinator (Progress: ${util.format('%i', gameData.progress)}%):`);
                            embed = embed.addField(`Is your character **${checkData.name}** (${checkData.description})?`, parsedAnswers.join("\n"));
                            embed = embed.setThumbnail(checkData.absolute_picture_path);
                            sentMessage = await sentMessage.edit({ embed });
                            return;
                        }
                    }

                    let parsedAnswers = gameData.answers.map((a, i) => {
                        return a.replace(i, i + 1);
                    });
                    embed = embed.addField(`${step}. ${gameData.question}`, parsedAnswers.join("\n"));
                    embed = embed.setTitle(`Game of Akinator (Progress: ${util.format('%i', gameData.progress)}%):`);
                    sentMessage = await sentMessage.edit({ embed });
                } else {
                    collector.stop();
                }

                currentStep += 1;
            });

            if (!sentMessage.deleted) {
                let parsedAnswers = gameData.answers.map((a, i) => {
                    return a.replace(i, i + 1);
                });
                delete embed.description;
                embed = embed.addField(`${step}. ${gameData.question}`, parsedAnswers.join("\n"));
                sentMessage = await sentMessage.edit({ embed });
            }

            return sentMessage;
        }
    };

    return exports;
});
