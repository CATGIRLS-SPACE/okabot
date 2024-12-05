// Require the necessary discord.js classes
const { Client, Events, GatewayIntentBits, ActivityType, Partials } = require('discord.js');
const { token, status } = require('./config.json');
const moneyhandler = require('./moneyhandler.js');
const {getWordleOnDay} = require('./wordle.js');
const { GetMostRecent, StartEarthquakeMonitoring } = require('./earthquakes.js');
const fs = require('fs')

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
    StartEarthquakeMonitoring(client);
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
			await interaction.reply({ content: moneyhandler.dailyReward(interaction.user.id), ephemeral: false });
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
            break;
        case 'pay':
            await interaction.deferReply();
            moneyhandler.payUser(client, interaction, interaction.user.id, interaction.options.getUser('user').id);
            break;
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

    if (message.author.id == "796201956255334452") {
        if (message.content.startsWith('oka dep ')) {
            const params = message.content.split(' ');
            if (params.length != 4) return message.react('❌');

            let receiver_bank_amount = parseInt(fs.readFileSync(`./money/wallet/${params[2]}.oka`, 'utf8'));
            receiver_bank_amount += parseInt(params[3]);
            fs.writeFileSync(`./money/wallet/${params[2]}.oka`, ''+receiver_bank_amount, 'utf8');
            message.react('✅');
            message.channel.send(`<@!${params[2]}>, your new balance is OKA${receiver_bank_amount}.`);
        }
        if (message.content.startsWith('oka reset ')) {
            const params = message.content.split(' ');
            if (params.length != 3) return message.react('❌');
            
            fs.writeFileSync(`./money/wallet/${params[2]}.oka`, '1500', 'utf8');
            message.react('✅');
            message.channel.send(`<@!${params[2]}>, your wallet has been reset.`);
        }
    }

    // random cash rolls for each message
    // 1 in 500 seems decent enough for 1-1000 i think...
    const small_roll = Math.floor(Math.random() * 500);
    console.log(small_roll);
    if (small_roll == 250) {
        const find_money_msg = await message.reply(':grey_question: ...oh? what\'s this..?');
        return setTimeout(() => {
            const found_amount = Math.floor(Math.random * 1000);

            let author_wallet = parseInt(fs.readFileSync(`./money/wallet/${find_money_msg.author.id}.oka`, 'utf8'));
            author_wallet += found_amount;
            fs.writeFileSync(`./money/wallet/${find_money_msg.author.id}.oka`, ''+author_wallet, 'utf8');

            find_money_msg.edit(`:scream_cat: **${message.author.username}**! You found OKA${found_amount}!`);
        }, 3000);
    }

    // 1 in 2500 for a BIG payout
    // arbitrary number 1561 cuz why not!
    if (Math.floor(Math.random() * 2500) == 1561) {
        const find_money_msg = await message.reply(':grey_question: ...oh? what\'s this..?');
        return setTimeout(() => {
            let max = 10000;
            let min = 5000;
            const found_amount = Math.random() * (max - min) + min;

            let author_wallet = parseInt(fs.readFileSync(`./money/wallet/${find_money_msg.author.id}.oka`, 'utf8'));
            author_wallet += found_amount;
            fs.writeFileSync(`./money/wallet/${find_money_msg.author.id}.oka`, ''+author_wallet, 'utf8');

            find_money_msg.edit(`:scream_cat: **${message.author.username}**, holy beans!! You found OKA${found_amount}!`);
        }, 3000);
    }
});