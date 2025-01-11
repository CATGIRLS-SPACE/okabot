const { SlashCommandBuilder, Routes, ChannelType } = require('discord.js');
const { REST } = require('@discordjs/rest');
const { clientId, token, devtoken, devclientId } = require('./config.json');
const config = require('./config.json');

const commands = [
	new SlashCommandBuilder()
        .setName('info').setNameLocalization('ja', 'インフォ')
        .setDescription('Get some info on the bot!').setDescriptionLocalization('ja', 'okabotのインフォを見る'),

	new SlashCommandBuilder().setName('debug').setDescription('Replies with debug info'),

	new SlashCommandBuilder()
        .setName('daily').setNameLocalization('ja', '日常の褒美')
        .setDescription('Get your daily okash reward').setDescriptionLocalization('ja', '日常の褒美をゲットする'),

	new SlashCommandBuilder()
        .setName('okash').setNameLocalization('ja', 'okash')
        .setDescription('See how much okash you have on you').setDescriptionLocalization('ja', 'ポケットにと銀行にokash持ち見ます'),

    new SlashCommandBuilder()
        .setName('pay')
        .setDescription('Pay someone some okash')
        .addUserOption(option => 
            option.setName('user')
            .setDescription('The person to pay')
            .setRequired(true)
        )
        .addNumberOption(option => 
            option.setName('amount')
            .setDescription('The amount to pay them')
            .setRequired(true)
        ),
    
    new SlashCommandBuilder()
        .setName('leaderboard')
        .setDescription('Get the leaderboard of a set category')
        .addStringOption(option => 
            option.setName('category')
            .setDescription('Which leaderboard category to display')
            .setRequired(true).addChoices(
            {name:'okash', value:'okash'},
            {name:'XP Levels', value:'levels'}
        )),

	new SlashCommandBuilder().setName('coinflip').setNameLocalization('ja', 'コイントス')
        .setDescription('Flip a coin with a chance of doubling your amount')
        .addNumberOption(option => 
            option.setName('amount')
            .setDescription('The amount of okash you want to bet')
            .setRequired(true).setMinValue(1).setMaxValue(10_000)
        )
        .addStringOption(option => 
            option.setName('side')
            .setDescription('Optionally, pick heads or tails')
            .addChoices(
            {name:'heads', value:'heads'},
            {name:'tails', value:'tails'}
        ).setRequired(false)),

    new SlashCommandBuilder()
        .setName('recent-eq').setNameLocalization('ja', '地震')
        .setDescription('Get the most recent earthquake data from the Japan Meteorological Agency').setDescriptionLocalization('ja', '気象庁から最近の地震データを見る'),

    new SlashCommandBuilder()
        .setName('use').setNameLocalization('ja', '使う')
        .setDescription('Use an item from your pockets!').setDescriptionLocalization('ja', 'ポケットでアイテムを使う')
        .addStringOption(option => 
            option.setName('item').setNameLocalization('ja', 'アイテム')
            .setDescription('The item to use').setDescriptionLocalization('ja', 'どのアイテムを使う')
            .setRequired(true)
        ),

    new SlashCommandBuilder()
        .setName('buy').setNameLocalization('ja', '買い')
        .setDescription('Buy an item from the shop').setDescriptionLocalization('ja', 'アイテムを買います')
        .addStringOption(option => option
            .setName('item').setNameLocalization('ja', 'アイテム')
            .setDescription('The item to buy').setDescriptionLocalization('ja', 'ja localization')
            .setRequired(true)
        )
        .addStringOption(option => option
            .setName('voucher')
            .setDescription('Use a shop voucher (if you have one)?')
            .setRequired(false)
            .addChoices(
                {name: 'Heck yeah!!', value: 'true'},
                {name: 'No thanks', value: 'false'},
            )
        ),

    new SlashCommandBuilder()
        .setName('sell').setNameLocalization('ja', '売り')
        .setDescription('Sell an item from your pockets').setDescriptionLocalization('ja', 'ポケットでアイテムを売り')
        .addStringOption(option => option.setName('item').setDescription('The item to sell').setRequired(true)),

    new SlashCommandBuilder()
        .setName('shop').setNameLocalization('ja', 'カタログ')
        .setDescription('Get the shop item and price listings').setDescriptionLocalization('ja', 'アイテムのカタログを見る')
        .addStringOption(option => option.setName('page').setDescription('The shop category to display').addChoices(
            {name:'Items', value: 'gems', name_localizations:{ja:'アイテム'}},
            {name:'Customization - Coinflip', value:'customization.coin', name_localizations:{ja:'コイントスのカスタマイズ'}},
            {name:'Customization - Profile', value:'customization.profile', name_localizations:{ja:'プロフィールのカスタマイズ'}},
        ).setRequired(true)),

    new SlashCommandBuilder()
        .setName('pockets').setNameLocalization('ja', 'ポケット')
        .setDescription('See what you\'ve got on you!').setDescriptionLocalization('ja', 'ポケットにアイテムとカスタマイズ化を見る')
        .addStringOption(option => option
            .setName('page').setNameLocalization('ja', 'カテゴリー')
            .setDescription('The pockets category to display').setDescriptionLocalization('ja', 'ポケットのカテゴリー')
            .addChoices(
                {name:'Items', value:'items', name_localizations:{ja:'アイテム'}},
                {name:'Customization Unlocks', value:'customize', name_localizations:{ja:'カスタマイズ化'}}
        ).setRequired(true)),

    new SlashCommandBuilder()
        .setName('customize').setNameLocalization('ja', 'カスタマイズ')
        .setDescription('Customize your experience with your unlocked customizations').setDescriptionLocalization('ja', 'okabotをカスタマイズするであなたのカスタマイズ化')
        .addSubcommand(subcommand => 
            subcommand
                .setName('coinflip')
                .setDescription('Customize your coinflip experience')
                .addStringOption(option => option
                    .setName('coin')
                    .setDescription('The coin you want to use when flipping')
                    .setRequired(true))
                )
        .addSubcommand(subcommand =>
            subcommand
                .setName('levelbar')
                .setDescription('Customize the colors of your level banner\'s XP bar')
                .addStringOption(option => 
                    option
                        .setName('background')
                        .setDescription('The background color of the bar. Must be a valid hex code, like #abcdef')
                        .setRequired(true))
                .addStringOption(option => 
                    option
                        .setName('foreground')
                        .setDescription('The foreground color of the bar. Must be a valid hex code, like #abcdef')
                        .setRequired(true))
                .addStringOption(option => 
                    option
                        .setName('xptext')
                        .setDescription('The text color of the bar (100 XP, 500 XP). Must be a valid hex code, like #abcdef')
                        .setRequired(true))
        ),

    new SlashCommandBuilder()
        .setName('toggle')
        .setDescription('Change a toggleable okabot setting!')
        .addStringOption(option => option.setName('setting')
            .setDescription('The toggle to change')
            .setRequired(true)
            .addChoices(
                { name:'okash notifications when money is transferred/received on your account', value: 'okash_notifications' }
            ))
        .addStringOption(option => option.setName('active')
            .setDescription('whether you want the option on or off')
            .setRequired(true)
            .addChoices(
                {name:'ON', value:'on'},
                {name:'OFF', value:'off'}
            )),
        

    new SlashCommandBuilder().setName('level').setDescription('Get information on your current level!')
        .addUserOption(option => option.setName('user').setDescription('Get another user\'s level info').setRequired(false)),


    new SlashCommandBuilder().setName('blackjack').setDescription('Play a game of blackjack for a chance at increasing your money!')
        .addNumberOption(option => option.setName('bet').setRequired(true).setDescription('The amount of okash to bet').setMaxValue(5_000).setMinValue(1)),

    new SlashCommandBuilder()
        .setName('render')
        .setDescription('Render data')
        .addSubcommand(sc => sc
            .setName('coinflip')
            .setDescription('Render coinflip data')
            .addNumberOption(option => option.setName('length').setDescription('how many of the last coinflips to render').setRequired(false)),
        )
        .addSubcommand(sc => sc
            .setName('stocks')
            .setDescription('Render stocks graphs')
            .addStringOption(option => option
                .setName('stock')
                .setDescription('the stock to render')
                .addChoices(
                    {name:'Catgirl - NEKO', value:'catgirl'},
                    {name:'Doggirl - DOGY', value:'doggirl'},
                    {name:'Foxgirl - FXGL', value:'foxgirl'},
                )
                .setRequired(true)
            )
        ),


    new SlashCommandBuilder().setName('stock')
        .setDescription('Manage stocks')
        .addSubcommand(sc => sc
            .setName('purchase')
            .setDescription('Purchase shares of a stock')
            .addStringOption(option => option
                .setName('stock')
                .setDescription('which stock to buy')
                .addChoices(
                    {name:'Foxgirl - FXGL', value:'foxgirl'},
                    {name:'Doggirl - DOGY', value:'doggirl'},
                    {name:'Catgirl - NEKO', value:'catgirl'},
                )
                .setRequired(true)
            )
            .addNumberOption(option => option
                .setName('amount')
                .setDescription('amount of shares to buy')
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(100)
            )
        )
        .addSubcommand(sc => sc
            .setName('sell')
            .setDescription('Sell shares of a stock')
            .addStringOption(option => option
                .setName('stock')
                .setDescription('which stock to sell')
                .addChoices(
                    {name:'Foxgirl - FXGL', value:'foxgirl'},
                    {name:'Doggirl - DOGY', value:'doggirl'},
                    {name:'Catgirl - NEKO', value:'catgirl'},
                )
                .setRequired(true)
            )
            .addNumberOption(option => option
                .setName('amount')
                .setDescription('amount of shares to sell')
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(100)
            )
        )
        .addSubcommand(sc => sc
            .setName('show')
            .setDescription('Show stock prices and how many shares you own')
        )

].map(command => command.toJSON());
 
const rest = new REST({ version: '10' }).setToken((config['extra'] && config['extra'].includes('use dev token'))?devtoken:token);

rest.put(Routes.applicationCommands((config['extra'] && config['extra'].includes('use dev token'))?devclientId:clientId), { body: commands })
	.then(() => console.log('Successfully registered application commands.'))
	.catch(console.error);
