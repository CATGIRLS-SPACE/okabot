const { SlashCommandBuilder, Routes, ChannelType } = require('discord.js');
const { REST } = require('@discordjs/rest');
const { clientId, token } = require('./config.json');

const commands = [
	new SlashCommandBuilder().setName('ping').setDescription('Replies with pong!'),
	new SlashCommandBuilder().setName('debug').setDescription('Replies with debug info!'),
	new SlashCommandBuilder().setName('daily').setDescription('Get your daily okash reward!'),
	new SlashCommandBuilder().setName('okash').setDescription('View your bank balance!'),

	new SlashCommandBuilder().setName('coinflip').setDescription('Flip a coin with a chance of doubling your amount!').addNumberOption(option => option.setName('amount').setDescription('The amount of OKASH you want to bet').setRequired(true)),

	//new SlashCommandBuilder().setName('play').setDescription('Play music in a voice channel').addChannelOption(option => option.setName('channel').addChannelTypes(ChannelType.GuildVoice).setDescription('The channel the bot should join').setRequired(true)).addStringOption(option => option.setName('link').setDescription('Name or link of YouTube video.').setRequired(true))
]
	.map(command => command.toJSON());

const rest = new REST({ version: '10' }).setToken(token);

rest.put(Routes.applicationCommands(clientId), { body: commands })
	.then(() => console.log('Successfully registered application commands.'))
	.catch(console.error);
