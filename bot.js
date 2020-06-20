const config = require(`./config.json`);
const Discord = require(`discord.js`)
const fs = require(`fs`);
const helpers = require(`./helpers`);
const mongoose = require(`mongoose`);
const Promise = require(`bluebird`);
const util = require(`util`);

const glob = util.promisify(require(`glob`));
const client = new Discord.Client();

mongoose.Promise = Promise;
mongoose.connect(`mongodb://localhost:27017/BelievaBoat`, {
    useNewUrlParser: true
});

helpers.log(`startup`, `loaded mongodb`);

client.db = mongoose;
client.config = config;
client.helpers = helpers;
client.startTime = new Date();
client.commands = new Discord.Collection();
client.privateVoiceChannels = new Discord.Collection();
client.musicManagers = new Discord.Collection();
client.customEmojis = {};
client.potentialBots = config.extraTokens.map((token, i) => {
    const helperBot = new Discord.Client();
    helperBot.configToken = token;
    helperBot.on(`ready`, () => {
        console.log(`startup → Voice helper client: ${helperBot.user.username} is online.`);
    });
    return helperBot;
});

client.loopUntilBotAvailable = async function(guild) {
    let availableBots = client.potentialBots.filter(b => b.guilds.cache.has(guild.id) && !b.voice.connections.map(c => c.channel.guild.id).includes(guild.id));
    console.log(`Available Bots: `, availableBots.map(b => b.user.username));
    if (!availableBots.length) {
        console.log(`Waiting 0.5 seconds for VC client.`);
        await Promise.delay(500);
        await client.loopUntilBotAvailable(guild);
    }
    return availableBots;
};

(async () => {
    helpers.log(`startup`, `starting async function`);

    const modelFiles = await glob(`./includes/models/*.js`);
    const startupFiles = await glob(`./includes/startup/*.js`);
    const eventFiles = await glob(`./includes/events/*.js`);
    const commandFiles = await glob(`./includes/commands/**/index.js`);

    await Promise.map(modelFiles, async (f) => {
        let source = require(f);
        await source(client, helpers);
        helpers.log(`startup`, `loaded model file at ${f}`);
    });

    await Promise.map(startupFiles, async (f) => {
        let source = require(f);
        await source(client, helpers);
        helpers.log(`startup`, `loaded startup file at ${f}`);
    });

    await Promise.map(eventFiles, async (f) => {
        let source = require(f);
        await source(client, helpers);
        helpers.log(`startup`, `ran event at ${f}`);
    });

    await Promise.map(commandFiles, async (f) => {
        let source = require(f);
        let props = await source(client, helpers);
        helpers.log(`startup`, `loaded ${props.meta.name} command at ${f}`);
        client.commands.set(props.meta.name, props);
    });

    helpers.log(`startup`, `loaded all includes`);

    client.potentialBots.unshift(client);

    await Promise.mapSeries(client.potentialBots, potentialBot => {
        return potentialBot.login(potentialBot.configToken || config.token);
    });
})().catch(e => {
    console.log(`Caught Error: ${e}`);
});
