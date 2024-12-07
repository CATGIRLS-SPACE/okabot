const { SlashCommandBuilder, Routes, ChannelType } = require('discord.js');
const { REST } = require('@discordjs/rest');
const { clientId, token, devtoken, devclientId } = require('./config.json');
const config = require('./config.json');

const commands = [
	// new SlashCommandBuilder().setName('ping').setDescription('Replies with pong!'),
	new SlashCommandBuilder().setName('debug').setDescription('Replies with debug info!'),
	new SlashCommandBuilder().setName('daily').setDescription('Get your daily okash reward!'),
	new SlashCommandBuilder().setName('okash').setDescription('View your bank balance!'),
    new SlashCommandBuilder().setName('pay').setDescription('Pay someone some okash!')
        .addUserOption(option => option.setName('user').setDescription('The person to pay').setRequired(true))
        .addNumberOption(option => option.setName('amount').setDescription('The amount to pay them').setRequired(true)),
    new SlashCommandBuilder().setName('leaderboard').setDescription('Get the leaderboard of the biggest okash-holders in the server!'),

	new SlashCommandBuilder().setName('coinflip')
        .setDescription('Flip a coin with a chance of doubling your amount!')
        .addNumberOption(option => option.setName('amount').setDescription('The amount of OKASH you want to bet').setRequired(true)),

    new SlashCommandBuilder()
        .setName('recent-eq')
        .setDescription('Get the most recent earthquake data from the Japan Meteorological Agency!')
].map(command => command.toJSON());
 
const rest = new REST({ version: '10' }).setToken((config['extra'] && config['extra'].includes('use dev token'))?devtoken:token);

rest.put(Routes.applicationCommands((config['extra'] && config['extra'].includes('use dev token'))?devclientId:clientId), { body: commands })
	.then(() => console.log('Successfully registered application commands.'))
	.catch(console.error);
