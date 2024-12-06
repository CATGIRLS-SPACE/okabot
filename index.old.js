// Require the necessary discord.js classes
const { Client, Events, GatewayIntentBits, ActivityType, Partials } = require('discord.js');
const { token, devtoken, status } = require('./config.json');
const config = require('./config.json');
const {getWordleOnDay, WordleCheck} = require('./modules/extra/wordle');
const { GetMostRecent, StartEarthquakeMonitoring } = require('./modules/earthquakes/earthquakes');
const fs = require('fs');
const {HandleCommandOkash} = require('./modules/interactions/okash');
const {HandleCommandDaily} = require('./modules/interactions/daily');
const {HandleCommandCoinflip} = require('./modules/interactions/coinflip');
const {HandleCommandPay} = require('./modules/interactions/pay');
const {CheckAdminShorthands, DoRandomOkashRolls} = require('./modules/passive/onMessage');

const BASE_DIRNAME = __dirname;
module.exports = { BASE_DIRNAME };

// Create a new client instance
const client = new Client({ intents: [
    GatewayIntentBits.Guilds, 
    GatewayIntentBits.MessageContent, 
    GatewayIntentBits.GuildMessages, 
    GatewayIntentBits.GuildVoiceStates, 
    GatewayIntentBits.GuildMessageReactions
], partials: [
    Partials.Message, 
    Partials.Channel, 
    Partials.Reaction
], });
let myId;

// When the client is ready, run this code (only once)
// We use 'c' for the event parameter to keep it separate from the already defined 'client'
client.once(Events.ClientReady, c => {
	console.log(`Ready! Logged in as ${c.user.tag}`);
    myId = c.user.id;
	
	client.user.setActivity(status.activity, { type: status.type });
    if (config['extra'] && config['extra'].includes('disable jma fetching')) return;
    StartEarthquakeMonitoring(client);
});

// Log in to Discord with your client's token
client.login((config['extra'] && config['extra'].includes('use dev token'))?devtoken:token);

let errorCount = 0;

// commands
client.on(Events.InteractionCreate, async interaction => {
	if (!interaction.isChatInputCommand()) return;
	console.log(interaction.commandName);
	
	switch(interaction.commandName) {
		case 'ping':
			await interaction.reply({ content: 'Pong', ephemeral: true });
			break;
		case 'debug':
			await interaction.reply({ content: `:information_source: Debug info\n\n:signal_strength: Uptime: ${Math.floor(process.uptime())}s\n:infinity: Shard uptime: Unsharded\n:x: Errors: ${errorCount}\n:sos: Caught critical errors: 0`, ephemeral: true });
			break;
		case 'daily':
			await HandleCommandDaily(interaction);
			break;
		case 'okash':
			await HandleCommandOkash(interaction);
			break;
		case 'coinflip':
			await HandleCommandCoinflip(interaction);
			break;
        case 'wordlesolution':
            await interaction.deferReply();
            getWordleOnDay(interaction);
            break;
        case 'recent-eq':
            await interaction.deferReply();
            GetMostRecent(interaction);
            break;
        case 'pay':
            HandleCommandPay(interaction, client);
            break;
	}
});

client.on(Events.MessageCreate, async message => {
    if (message.author.id == myId) return; // dont respond to myself
    if (message.guild.id != "1019089377705611294") return; // don't listen in channels that aren't in in my guild

    WordleCheck(message);

    CheckAdminShorthands(message);

    DoRandomOkashRolls(message);
});