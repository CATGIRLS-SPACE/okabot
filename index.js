// Require the necessary discord.js classes
const { Client, Events, GatewayIntentBits, ActivityType, Partials } = require('discord.js');
const { token } = require('./config.json');
const moneyhandler = require('./moneyhandler.js');
const {getWordleOnDay} = require('./wordle.js');
const { GetMostRecent } = require('./earthquakes.js');

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
	
	client.user.setActivity('DEVELOPMENT MODE', { type: 0 });
});

// Log in to Discord with your client's token
client.login(token);

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
			await interaction.reply({ content: moneyhandler.dailyRwd(interaction.user.id), ephemeral: false });
			break;
		case 'okash':
			await interaction.reply({ content: moneyhandler.getWallet(interaction.user.id), ephemeral: false });
			break;
		case 'coinflip':
			await moneyhandler.coinFlipV14(interaction);
			break;
        case 'wordlesolution':
            await interaction.deferReply();
            getWordleOnDay(interaction);
            break;
        case 'recent-eq':
            await interaction.deferReply();
            GetMostRecent(interaction);
	}
});

let last_cached_word = "";
let last_cached_date = "";

client.on(Events.MessageCreate, async message => {
    if (message.author.id == myId) return; // dont respond to myself
    if (message.guild.id != "1019089377705611294") return; // don't listen in channels that aren't in in my guild

    if (message.channel.id == "1310486655257411594") { // #wordle
        let d = new Date();
        const month = d.getMonth()+1<10?`0${d.getMonth()+1}`:d.getMonth()+1;
        const day = d.getDate()<10?`0${d.getDate()}`:d.getDate();
        let date = `${d.getFullYear()}-${month}-${day}`; // format date to match the wordle api

        let data, json, word;

        // prevents mass requests to wordle api
        if (date != last_cached_date) {
            data = await fetch(`https://nytimes.com/svc/wordle/v2/${date}.json`); // get wordle 
            json = await data.json();
            word = json.solution;

            last_cached_date = date;
            last_cached_word = word;
        } else {
            word = last_cached_word;
        }

        if (message.content.toLowerCase().includes(word)) { 
            message.delete();
            message.channel.send(`<@!${message.author.id}>, don't spoil today's word!!`);
        }
    }
});

// client.on(Events.MessageReactionAdd, async ev => {
//     if (ev.message.author.id == myId) return;
//     if (ev.message.guild.id != "1019089377705611294") return;

//     if (ev.emoji.name == '🚩') {
//         ev.message.guild.systemChannel.send(`<@!1278171743797907487> https://discord.com/channels/1019089377705611294/1019089378343137373/${ev.message.id}\nFlagged by <@!${ev.message.author.id}> by reaction.`)
//     }
// });