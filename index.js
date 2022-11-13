// Require the necessary discord.js classes
const { Client, Events, GatewayIntentBits, ActivityType } = require('discord.js');
const { token } = require('./config.json');
const moneyhandler = require('./moneyhandler.js')

// Create a new client instance
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

// When the client is ready, run this code (only once)
// We use 'c' for the event parameter to keep it separate from the already defined 'client'
client.once(Events.ClientReady, c => {
	console.log(`Ready! Logged in as ${c.user.tag}`);
	
client.user.setActivity('new update!', { type: 0 });
});

// Log in to Discord with your client's token
client.login(token);

let errorCount = 0;

// commands
client.on(Events.InteractionCreate, async interaction => {
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
		case 'play':
			await interaction.reply({ content: 'Please wait...', ephemeral: false });
			await handleMusicOption(interaction);
			break;
	}
});


/* Music */
const { joinVoiceChannel, getVoiceConnection, AudioPlayer, createAudioPlayer, createAudioResource } = require('@discordjs/voice');
const ytdl = require('ytdl-core');
const isUrl = require('is-url');
const yts = require('yt-search');

let queue = [];
let queuers = [];
let isPlaying = false;
let subscription;
let player;

async function handleMusicOption(interaction) {
	let link = interaction.options.getString('link');
	switch (interaction.commandName) {
		case 'play':
			if (!isPlaying) await prepVoice(interaction);
			await queueMusic(link);
			await playMusic(interaction);
			break;
	}
}

async function prepVoice(interaction) {
	let channel = interaction.options.getChannel('channel');

	joinVoiceChannel({
		channelId: channel.id,
		guildId: interaction.guildId,
		adapterCreator: interaction.guild.voiceAdapterCreator
	});

	player = createAudioPlayer();

	const connection = getVoiceConnection(interaction.guildId);
	subscription = connection.subscribe(player);
}

async function queueMusic(link, user) {
	if (isUrl(link)) {
		queue.push(link);
	} else {
		let res = await yts(link);
		vid = res.videos.slice(0, 3);
		let flink = `https://youtube.com/watch?v=${vid[0].videoId}`;
		queue.push(flink);
		console.log(flink);
	}
	queuers.push(user);
}

async function playMusic(interaction) {
	const connection = getVoiceConnection(interaction.guildId);
	const stream = ytdl(queue[0], {filter:"audioonly"});
	console.log(queue[0]);
	let resource = createAudioResource(stream);
	
	connection.subscribe(player);
	player.play(resource);

	interaction.editReply('Trying to play...');
}

async function stopMusic(interaction) {
	const connection = getVoiceConnection(interaction.guildId);
	if (subscription) subscription.unsubscribe();
	connection.destroy();
	isPlaying = false;
}